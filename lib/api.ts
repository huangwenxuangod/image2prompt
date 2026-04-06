import type { ImageSize, GenerationHistoryItem, SavedImagePrompt, ImageStyleAnalysis } from "./types";

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
): Promise<{ prompt: string; styleAnalysis: ImageStyleAnalysis }> {
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

  // 2. 调用豆包视觉模型进行多维度风格分析
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
          role: "system",
          content: "你是一名专业视觉设计师和图像风格分析专家。请分析图片的风格特征，使用高信息密度的设计/艺术词汇描述。输出严格的 JSON 格式，不要包含任何 markdown 标记或额外说明文字。",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                "分析这张图片的风格特征，输出 JSON 格式，包含以下字段：",
                "1. backgroundMaterial: 背景材质与质感（如：折皱牛皮纸、水彩渲染纸、石版印刷底纹、素描本纸张、赛博朋克金属板、混凝土质感、胶片颗粒、纯色平涂、渐变噪点等）",
                "2. subjectStyle: 人物/主体渲染风格（如：少年漫画、青年漫画、吉卜力、新海诚风格、平面矢量插画、Risograph印刷风、丝网印刷、技术线描图、铜版画、木刻版画、素描速写等）",
                "3. elementStyle: 周围元素风格（如：蓝图技术草图、UML图、信息图表、Flat UI图标、等距像素风、科学插图、博物学手绘、蒸汽朋克机械图等）",
                "4. composition: 构图结构（如：三分法构图、黄金分割、对称轴线、放射状发散、蒙德里安网格、思维导图辐射、孤岛留白等）",
                "5. colorTreatment: 色彩处理（如：双色调、单色调、低饱和莫兰迪、高对比互补色、包豪斯原色系、复古CMYK偏色、日系清冷低饱和、赛博霓虹高饱和等）",
                "6. styleDNA: 风格DNA（用1-2个核心词组定义设计语言，如：少年漫画人物×蓝图技术草图×折皱牛皮纸底）",
                "7. vibeMood: 整体氛围/情绪",
                "8. lighting: 光照风格",
                `图片 Alt 文本提示："${imageAlt || "无"}"`,
              ].join("\n"),
            },
            {
              type: "image_url",
              image_url: { url: `data:image/${mediaType};base64,${base64}` },
            },
          ],
        },
      ],
      max_tokens: 1024,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Vision API error: ${res.status} - ${errorText}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Unexpected vision model response");

  // 解析 JSON 响应
  let parsedStyle: ImageStyleAnalysis;
  try {
    const parsed = JSON.parse(content);
    parsedStyle = {
      backgroundMaterial: parsed.backgroundMaterial || "",
      subjectStyle: parsed.subjectStyle || "",
      elementStyle: parsed.elementStyle || "",
      composition: parsed.composition || "",
      colorTreatment: parsed.colorTreatment || "",
      styleDNA: parsed.styleDNA || "",
      vibeMood: parsed.vibeMood || "",
      lighting: parsed.lighting || "",
    };
  } catch (e) {
    // 如果 JSON 解析失败，回退到旧格式
    parsedStyle = {
      backgroundMaterial: "",
      subjectStyle: "",
      elementStyle: "",
      composition: "",
      colorTreatment: "",
      styleDNA: "",
      vibeMood: "",
      lighting: "",
    };
  }

  // 生成一个完整的描述性 prompt（向后兼容）
  const fullPrompt = [
    parsedStyle.styleDNA && `风格DNA：${parsedStyle.styleDNA}`,
    parsedStyle.backgroundMaterial && `背景材质：${parsedStyle.backgroundMaterial}`,
    parsedStyle.subjectStyle && `主体风格：${parsedStyle.subjectStyle}`,
    parsedStyle.elementStyle && `元素风格：${parsedStyle.elementStyle}`,
    parsedStyle.composition && `构图：${parsedStyle.composition}`,
    parsedStyle.colorTreatment && `色彩：${parsedStyle.colorTreatment}`,
    parsedStyle.vibeMood && `氛围：${parsedStyle.vibeMood}`,
    parsedStyle.lighting && `光照：${parsedStyle.lighting}`,
  ].filter(Boolean).join("；");

  return {
    prompt: fullPrompt || content.trim(),
    styleAnalysis: parsedStyle,
  };
}

// ====================
// 2. 提示词融合优化
// ====================
export async function fusePrompt(
  styleAnalysis: ImageStyleAnalysis | null,
  textContext: string
): Promise<string> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error("No API key configured. Open the extension popup to set it.");

  // 构建风格约束部分
  let styleConstraints = "";
  if (styleAnalysis) {
    styleConstraints = [
      styleAnalysis.styleDNA && `【风格核心】${styleAnalysis.styleDNA}`,
      styleAnalysis.backgroundMaterial && `【背景材质】${styleAnalysis.backgroundMaterial}`,
      styleAnalysis.subjectStyle && `【主体渲染】${styleAnalysis.subjectStyle}`,
      styleAnalysis.elementStyle && `【元素风格】${styleAnalysis.elementStyle}`,
      styleAnalysis.composition && `【构图结构】${styleAnalysis.composition}`,
      styleAnalysis.colorTreatment && `【色彩处理】${styleAnalysis.colorTreatment}`,
      styleAnalysis.vibeMood && `【氛围情绪】${styleAnalysis.vibeMood}`,
      styleAnalysis.lighting && `【光照风格】${styleAnalysis.lighting}`,
    ].filter(Boolean).join("\n");
  }

  const userPrompt = styleConstraints
    ? `${styleConstraints}\n\n【创作内容】${textContext}`
    : textContext;

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
          content: `你是专业视觉设计师和图像生成提示词专家。

你的任务是：
1. 严格遵循用户提供的【风格核心】等风格约束，这是最高优先级
2. 根据【创作内容】进行视觉化演绎
3. 输出高质量、高表现力的 Seedream 图像生成提示词

输出规则：
- 只保留最终提示词，不解释、不废话
- 用中文描述，专业设计词汇
- 风格约束必须体现在最终提示词中
- 无任何文字、Logo、水印`,
        },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Prompt fuse API error: ${res.status} - ${errorText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || textContext;
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
