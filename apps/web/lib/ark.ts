import type { ImageSize, ImageStyleAnalysis } from "./types";

const ARK_CONFIG = {
  baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
  models: {
    vision: "doubao-1-5-vision-pro-32k-250115",
    promptFuse: "doubao-seed-2-0-pro-260215",
    imageGen: "doubao-seedream-4-0-250828",
  },
};

function getApiKey(): string {
  const apiKey = process.env.VOLC_ARK_API_KEY;
  if (!apiKey) throw new Error("VOLC_ARK_API_KEY not configured");
  return apiKey;
}

export async function analyzeImageWithVision(
  imageBase64: string,
  mediaType: string,
  imageAlt: string
): Promise<{ prompt: string; styleAnalysis: ImageStyleAnalysis }> {
  const apiKey = getApiKey();

  const res = await fetch(`${ARK_CONFIG.baseUrl}/chat/completions`, {
    method: "POST",
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
              image_url: { url: `data:${mediaType};base64,${imageBase64}` },
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

export async function fusePrompt(
  styleAnalysis: ImageStyleAnalysis | null,
  textContext: string
): Promise<string> {
  const apiKey = getApiKey();

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

export async function generateImage(prompt: string, size: ImageSize = "1024x1024"): Promise<string> {
  const apiKey = getApiKey();

  const res = await fetch(`${ARK_CONFIG.baseUrl}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: ARK_CONFIG.models.imageGen,
      prompt,
      size,
      response_format: "b64_json",
      watermark: false,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Image generation API error: ${res.status} - ${errorText}`);
  }

  const data = await res.json();
  const b64Json = data.data?.[0]?.b64_json;
  if (!b64Json) throw new Error("No image data in response");

  return `data:image/png;base64,${b64Json}`;
}

export function generateId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
