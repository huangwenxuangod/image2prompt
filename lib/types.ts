// 持久化的图片分析结果（chrome.storage.local key: "savedPrompt"）
export interface SavedImagePrompt {
  prompt: string;       // 视觉模型生成的描述
  imageUrl: string;     // 原图 URL
  imageAlt: string;     // 原图 alt 文字（辅助上下文）
  analyzedAt: number;   // Unix ms 时间戳
  sourceUrl: string;    // 来源页面 URL
}

// 用户划词时捕获的信息
export interface TextSelection {
  text: string;         // 选中文字
  x: number;            // 鼠标松开时的 clientX
  y: number;            // 鼠标松开时的 clientY
}

// 图片尺寸类型
export type ImageSize =
  | "1024x1024"
  | "1280x960"
  | "1280x720"
  | "720x1280"
  | "1152x768"
  | "1280x512";

// 图片尺寸选项配置
export interface ImageSizeOption {
  id: ImageSize;
  label: string;
  width: number;
  height: number;
  default?: boolean;
}

export const IMAGE_SIZE_OPTIONS: ImageSizeOption[] = [
  { id: "1024x1024", label: "1:1 方形", width: 1024, height: 1024, default: true },
  { id: "1280x512", label: "5:2 文章封面", width: 1280, height: 512 },
  { id: "1280x720", label: "16:9 宽屏", width: 1280, height: 720 },
  { id: "720x1280", label: "9:16 竖版", width: 720, height: 1280 },
  { id: "1152x768", label: "3:2 摄影比", width: 1152, height: 768 },
];

// 发送给图像生成 API 的请求体
export interface GenerationRequest {
  imagePrompt: string | null;  // savedPrompt.prompt，可能为空
  textContext: string;          // 用户选中的文字
  mergedPrompt: string;         // 合并后发给 promptFuse 的原始 prompt
  finalPrompt: string;          // 经过 fusePrompt 优化后的最终 prompt
  size: ImageSize;              // 图像尺寸
}

// 生成历史记录项
export interface GenerationHistoryItem {
  id: string;                    // UUID
  prompt: string;                // 最终发出的 prompt
  size: ImageSize;               // 图像尺寸
  createdAt: number;             // Unix ms 时间戳
  imageDataUrl: string;          // base64 图片数据（永久保存）
  sourcePageUrl: string;         // 来源页面 URL
}

// Content Script ↔ Background 消息协议（exhaustive union）
export type ExtensionMessage =
  | { type: "ANALYZE_IMAGE"; imageUrl: string; imageAlt: string }
  | { type: "ANALYZE_IMAGE_RESULT"; prompt: string }
  | { type: "ANALYZE_IMAGE_ERROR"; error: string }
  | { type: "GENERATE_IMAGE"; request: GenerationRequest }
  | { type: "GENERATE_IMAGE_RESULT"; dataUrl: string; historyItem: GenerationHistoryItem }
  | { type: "GENERATE_IMAGE_ERROR"; error: string }
  | { type: "GET_SAVED_PROMPT" }
  | { type: "GET_SAVED_PROMPT_RESULT"; prompt: SavedImagePrompt | null }
  | { type: "GET_GENERATION_HISTORY" }
  | { type: "GET_GENERATION_HISTORY_RESULT"; history: GenerationHistoryItem[] }
  | { type: "CLEAR_GENERATION_HISTORY" }
  | { type: "CLEAR_GENERATION_HISTORY_RESULT" };
