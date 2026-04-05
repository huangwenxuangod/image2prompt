import type { ImageSize, GenerationHistoryItem, SavedImagePrompt } from "./types";

// ====================
// ARK 配置
// ====================
const ARK_CONFIG = {
  get baseUrl() {
    return "https://ark.cn-beijing.volces.com/api/v3";
  },
  models: {
    vision: "doubao-1-5-vision-pro-32k-250115",
    promptFuse: "doubao-seed-2-0-pro-260215",
    imageGen: "doubao-seedream-4-0-250828",
  },
};

// ====================
// API Key 从 chrome.storage.local 读取
// ====================
async function getApiKey(): Promise<string> {
  const result = await browser.storage.local.get("volcArkApiKey");
  return (result.volcArkApiKey as string) ?? "";
}

// ====================
// 1. 图片分析（视觉模型）
// ====================
export async function analyzeImageWithVision(
  imageUrl: string,
  imageAlt: string
): Promise<string> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error("No API key configured. Open the extension popup to set it.");

  // 1. fetch 图片 → base64（Background context，无 CORS 限制）
  const response = await fetch(imageUrl, {
    mode: "cors",
    credentials: "omit",
  });
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
  const blob = await response.blob();

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const rawType = blob.type || "image/png";
  const mediaType = rawType.startsWith("image/") ? rawType.slice(6) : "png";

  // 2. 调用豆包视觉模型
  const res = await fetch(`${ARK_CONFIG.baseUrl}/chat/completions`, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: ARK_CONFIG.models.vision,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                "详细描述这张图片的内容、视觉风格、光照、构图、氛围和色调。",
                "用中文描述，适合作为 AI 图像生成的参考提示词。",
                `图片 Alt 文本提示："${imageAlt || "无"}"`,
              ].join(" "),
            },
            {
              type: "image_url",
              image_url: { url: `data:image/${mediaType};base64,${base64}` },
            },
          ],
        },
      ],
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Vision API error: ${res.status} - ${errorText}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Unexpected vision model response");
  return content.trim();
}

// ====================
// 2. 提示词融合优化
// ====================
export async function fusePrompt(raw: string): Promise<string> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error("No API key configured. Open the extension popup to set it.");

  const res = await fetch(`${ARK_CONFIG.baseUrl}/chat/completions`, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: ARK_CONFIG.models.promptFuse,
      messages: [
        {
          role: "system",
          content: `你是专业绘画提示词优化师。
用户输入一段参考描述和创作要求，你输出适合 Seedream 图像生成模型的高质量、高表现力提示词。
输出只保留最终提示词，不解释、不废话。`,
        },
        { role: "user", content: raw },
      ],
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Prompt fuse API error: ${res.status} - ${errorText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || raw;
}

// ====================
// 3. 图像生成（Seedream 4.0）
// ====================
export async function generateImage(prompt: string, size: ImageSize = "1024x1024"): Promise<string> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error("No API key configured. Open the extension popup to set it.");

  const res = await fetch(`${ARK_CONFIG.baseUrl}/images/generations`, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: ARK_CONFIG.models.imageGen,
      prompt,
      size,
      response_format: "url",
      watermark: false,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Image generation API error: ${res.status} - ${errorText}`);
  }

  const data = await res.json();
  const url = data.data?.[0]?.url;
  if (!url) throw new Error("No image URL in response");

  // 将 URL 转为 base64 保存（因为 URL 有时效性）
  const imageResponse = await fetch(url, {
    mode: "cors",
    credentials: "omit",
  });
  if (!imageResponse.ok) throw new Error(`Failed to fetch generated image: ${imageResponse.status}`);
  const imageBlob = await imageResponse.blob();

  const imageBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(imageBlob);
  });

  return imageBase64;
}

// ====================
// 4. 生成历史管理
// ====================
const MAX_HISTORY = 20;

export async function getGenerationHistory(): Promise<GenerationHistoryItem[]> {
  const result = await browser.storage.local.get("generationHistory");
  return (result.generationHistory as GenerationHistoryItem[]) ?? [];
}

export async function saveToHistory(item: GenerationHistoryItem): Promise<void> {
  const history = await getGenerationHistory();
  history.unshift(item); // 新的放前面
  if (history.length > MAX_HISTORY) {
    history.pop(); // 删除最旧的
  }
  await browser.storage.local.set({ generationHistory: history });
}

export async function clearGenerationHistory(): Promise<void> {
  await browser.storage.local.remove("generationHistory");
}

// 生成 UUID
export function generateId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
