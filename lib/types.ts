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

// 持久化的图片分析结果（chrome.storage.local key: "savedPrompt"）
export interface SavedImagePrompt {
  prompt: string;               // 兼容旧格式：原始描述
  styleAnalysis: ImageStyleAnalysis | null;  // 新格式：结构化风格分析
  imageUrl: string;           // 原图 URL
  imageAlt: string;           // 原图 alt 文字（辅助上下文）
  analyzedAt: number;         // Unix ms 时间戳
  sourceUrl: string;          // 来源页面 URL
}

// 用户划词时捕获的信息
export interface TextSelection {
  text: string;           // 选中文字
  x: number;             // 鼠标松开时的 clientX
  y: number;             // 鼠标松开时的 clientY
}

// 图片尺寸类型（Seedream 要求：宽×高 ≥ 921600）
export type ImageSize =
  | "1024x1024"
  | "1600x640"
  | "1280x720"
  | "720x1280"
  | "1200x800";

// 图片尺寸选项配置
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

// 发送给图像生成 API 的请求体
export interface GenerationRequest {
  imagePrompt: string | null;           // 兼容旧格式
  styleAnalysis: ImageStyleAnalysis | null; // 新格式：结构化风格分析
  textContext: string;               // 用户选中的文字
  mergedPrompt: string;                // 合并后发给 promptFuse 的原始 prompt
  finalPrompt: string;                // 经过 fusePrompt 优化后的最终 prompt
  size: ImageSize;                   // 图像尺寸
}

// 当前生成任务状态（storage key: "currentGeneration"）
export type GenerationStatus = "idle" | "fusing" | "generating" | "done" | "error";

export interface CurrentGeneration {
  status: GenerationStatus;
  request: GenerationRequest | null;
  progress: number;                    // 0-100
  resultUrl: string | null;              // 生成的图片 dataUrl
  error: string | null;
  createdAt: number;
}

// 生成历史记录项
export interface GenerationHistoryItem {
  id: string;                         // UUID
  prompt: string;                     // 最终发出的 prompt
  size: ImageSize;                    // 图像尺寸
  createdAt: number;                   // Unix ms 时间戳
  imageDataUrl: string;               // base64 图片数据（永久保存）
  sourcePageUrl: string;              // 来源页面 URL
}

// Content Script ↔ Background 消息协议（exhaustive union）
export type ExtensionMessage =
  | { type: "ANALYZE_IMAGE"; imageUrl: string; imageAlt: string }
  | { type: "ANALYZE_IMAGE_RESULT"; prompt: string; styleAnalysis: ImageStyleAnalysis | null }
  | { type: "ANALYZE_IMAGE_ERROR"; error: string }
  | { type: "START_GENERATION"; request: Omit<GenerationRequest, "finalPrompt"> }
  | { type: "GENERATE_IMAGE"; request: GenerationRequest }
  | { type: "GENERATE_IMAGE_RESULT"; dataUrl: string; historyItem: GenerationHistoryItem }
  | { type: "GENERATE_IMAGE_ERROR"; error: string }
  | { type: "GET_SAVED_PROMPT" }
  | { type: "GET_SAVED_PROMPT_RESULT"; prompt: SavedImagePrompt | null }
  | { type: "GET_CURRENT_GENERATION" }
  | { type: "GET_CURRENT_GENERATION_RESULT"; current: CurrentGeneration | null }
  | { type: "GET_GENERATION_HISTORY" }
  | { type: "GET_GENERATION_HISTORY_RESULT"; history: GenerationHistoryItem[] }
  | { type: "CLEAR_GENERATION_HISTORY" }
  | { type: "CLEAR_GENERATION_HISTORY_RESULT" };
