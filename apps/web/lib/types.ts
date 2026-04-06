// 图片风格多维度分析结果
export interface ImageStyleAnalysis {
  backgroundMaterial: string;      // 背景材质与质感
  subjectStyle: string;          // 人物/主体渲染风格
  elementStyle: string;          // 周围元素风格
  composition: string;             // 构图结构
  colorTreatment: string;          // 色彩处理
  styleDNA: string;              // 风格 DNA（最重要）
  vibeMood: string;             // 整体氛围/情绪
  lighting: string;               // 光照风格
}

// 持久化的图片分析结果
export interface SavedImagePrompt {
  prompt: string;
  styleAnalysis: ImageStyleAnalysis | null;
  imageUrl: string;
  imageAlt: string;
  analyzedAt: number;
  sourceUrl: string;
}

// 图片尺寸类型（Seedream 要求：宽×高 ≥ 921600）
export type ImageSize =
  | "1024x1024"
  | "1600x640"
  | "1280x720"
  | "720x1280"
  | "1200x800";

export interface ImageSizeOption {
  id: ImageSize;
  label: string;
  width: number;
  height: number;
  default?: boolean;
}

export const IMAGE_SIZE_OPTIONS: ImageSizeOption[] = [
  { id: "1024x1024", label: "1:1 方形", width: 1024, height: 1024 },
  { id: "1600x640", label: "5:2 文章封面", width: 1600, height: 640, default: true },
  { id: "1280x720", label: "16:9 宽屏", width: 1280, height: 720 },
  { id: "720x1280", label: "9:16 竖版", width: 720, height: 1280 },
  { id: "1200x800", label: "3:2 摄影比", width: 1200, height: 800 },
];

// 生成历史记录项
export interface GenerationHistoryItem {
  id: string;
  prompt: string;
  size: ImageSize;
  createdAt: number;
  imageDataUrl: string;
  styleAnalysis?: ImageStyleAnalysis | null;
  sourcePageUrl?: string | null;
}

// 发送给图像生成 API 的请求体
export interface GenerationRequest {
  imagePrompt: string | null;
  styleAnalysis: ImageStyleAnalysis | null;
  textContext: string;
  mergedPrompt: string;
  finalPrompt: string;
  size: ImageSize;
}

export type GenerationStatus = "idle" | "fusing" | "generating" | "done" | "error";

export interface CurrentGeneration {
  status: GenerationStatus;
  request: GenerationRequest | null;
  progress: number;
  resultUrl: string | null;
  error: string | null;
  createdAt: number;
}
