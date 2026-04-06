# AI Image Generator Browser Extension — Project Configuration

> 适用于 Cursor / Claude Code / Windsurf 等 AI 编程助手。
> 此文档定义了项目的开发规范、技术栈和架构约束。

---

## 角色设定

你是一名专注于浏览器扩展开发的高级全栈工程师，精通 WXT、React 19、TypeScript、
Floating UI。你写的代码要求：类型安全（无 any）、运行时零报错、
Shadow DOM 隔离彻底、UI 组件使用 2026 极简设计语言（黑白色系 + 圆角 + 微阴影）。

---

## 技术栈（锁定版本，不得降级）

```
运行时:   Bun 1.x（所有命令用 bun / bunx，禁止使用 npm / yarn）
框架:     WXT 0.20.x + @wxt-dev/module-react 1.2.x
UI 库:    React 19 + Tailwind CSS v4（无 HeroUI，使用原生 HTML + Tailwind）
图标:     lucide-react ^1.7.0
样式:     Tailwind CSS v4 + @tailwindcss/vite（无 tailwind.config.js，v4 不需要）
变体:     tailwind-variants 3.x（tv()）
定位:     @floating-ui/react 0.27.x
类型:     TypeScript 6.x，strict: true，无 any
AI:       火山引擎 ARK（豆包视觉模型 + Seedream 图像生成）
```

---

## 项目概述

构建一个 Chrome/Edge 浏览器扩展，功能是：在任意网页上分析图片生成 prompt，
并结合用户划选的文字，调用火山引擎 ARK AI 生成新图片。整个 UI 以浮动组件形式注入宿主页面。

---

## 最终目录结构

```
image2prompt/
├── package.json
├── wxt.config.ts
├── tsconfig.json
├── .gitignore
├── README.md                          ← 项目说明文档
├── Claude.md                          ← 本配置文件
├── assets/
│   └── style.css                        ← Tailwind v4 + HeroUI 全局样式
├── public/
│   └── icon.svg                         ← 扩展图标
├── lib/
│   ├── types.ts                         ← 所有共享 TypeScript 类型
│   └── api.ts                           ← 火山引擎 ARK API + 图像生成
├── entrypoints/
│   ├── background.ts                    ← Service Worker，消息路由
│   ├── popup/
│   │   ├── index.html
│   │   └── main.tsx                     ← API Key 设置页 + 查看 savedPrompt + 生成历史
│   └── content/
│       ├── index.tsx                    ← Shadow DOM 挂载入口
│       ├── App.tsx                      ← 全局状态 + 事件监听
│       ├── hooks/
│       │   ├── useImageHover.ts         ← 监听页面图片 mouseenter/leave
│       │   ├── useTextSelection.ts      ← 监听 mouseup，捕获坐标
│       │   └── useSavedPrompt.ts        ← chrome.storage 读写 + 实时监听
│       └── components/
│           ├── ImageAnalyzeButton.tsx   ← 图片右下角浮动图标
│           ├── SelectionToolbar.tsx     ← 划词后的浮动工具栏（带 Tooltip）
│           └── GenerationPanel.tsx      ← 生成面板（工具栏展开）
```

---

## 开发命令

```bash
# 启动开发服务器（自动打开 Chrome 并加载扩展）
bun run dev

# 生产构建
bun run build

# 打包为 .zip（上传 Chrome Web Store）
bun run zip
```

---

## 代码规范

### 类型安全
- 禁止使用 `any` 类型
- 所有函数参数和返回值必须有明确类型
- 使用 `satisfies` 确保类型匹配

### Shadow DOM 隔离
- 所有 Content Script UI 必须在 Shadow DOM 内渲染
- 样式通过 `adoptedStyleSheets` 注入
- 容器设置 `pointer-events: none`，组件内部按需设置 `pointer-events: auto`

### Floating UI 定位
- 使用虚拟元素（virtual element）进行坐标定位
- strategy: "fixed" 穿透 overflow
- 自动处理 flip 和 shift

### HeroUI v3
- v3 不需要 `<HeroUIProvider>` 包裹
- 直接使用组件
- 使用 compound 模式构建组件（如 Tooltip + Tooltip.Trigger + Tooltip.Content）
- Card 组件使用：Card.Header, Card.Content, Card.Footer
- Select 组件使用：Select.Trigger, Select.Value, Select.Popover, ListBox

### Lucide React 图标
- 使用 lucide-react 提供的图标组件
- 保持图标尺寸一致（h-3.5 w-3.5）

---

## 关键约束

### 图片分析（链路 A）
- 每次只保留最新一张图片的 prompt
- 下一次分析时直接覆盖，无确认弹窗
- 图标只在悬停时显示，离开后隐藏（已分析的图片保持绿色勾常显）
- 图片尺寸判断使用 `naturalWidth/naturalHeight`（适配 CSS 缩放的图片）
- 忽略小于 60×60 的图片
- **多维度风格分析**：分析包含 8 个维度（backgroundMaterial、subjectStyle、elementStyle、composition、colorTreatment、styleDNA、vibeMood、lighting）

### 划词生成（链路 B）
- 工具栏用 Floating UI 虚拟元素定位（reference = 指针坐标点，非 selection range）
- `placement: "top-start"` 使工具栏左边缘对齐指针 X 坐标
- 点击工具栏外部或按 Escape 关闭
- 若用户重新划词，面板重置（不累加）
- **风格优先生成**：使用风格分析结果作为主要约束，划词内容作为创作主题

### 当前生成状态
- 使用 `currentGeneration` 键存储在 `chrome.storage.local`
- 状态流转：idle → fusing → generating → done/error
- Popup 页面实时监听并显示当前生成状态
- 支持在 Popup 中编辑 Prompt、选择尺寸、下载结果、重置状态

### 生成历史
- 最多保存 20 条生成记录
- 新记录添加到前面
- 超出限制时自动删除最旧的记录
- 图片以 base64 格式永久保存（因为 URL 有时效性）

---

## 注意事项

| 事项 | 说明 |
|------|------|
| CORS | 图片 fetch 在 Background（Service Worker）执行，无 CORS 限制 |
| Shadow DOM 样式 | HeroUI 样式通过 `adoptedStyleSheets` 注入，不污染宿主页面 |
| 火山引擎 ARK | 使用豆包视觉模型分析图片，Seedream 4.0 生成图片 |
| 跨站图片 | 部分网站图片有 CORS header，fetch 会失败，可在 error 中提示用户 |
| HeroUI v3 Provider | v3 不需要 `<HeroUIProvider>` 包裹，直接用组件 |
| Tailwind v4 | 无 `tailwind.config.js`，配置通过 CSS `@theme` 块或默认值 |
| 图像生成 API | `lib/api.ts` 中的 `generateImage()` 已实现火山引擎 ARK |
| API Key 存储 | 使用 `dashscopeApiKey` 键名存储火山引擎 ARK API Key |

---

## 类型定义

### ImageStyleAnalysis 接口（多维度风格分析）
```typescript
export interface ImageStyleAnalysis {
  backgroundMaterial: string;  // 背景材质与质感
  subjectStyle: string;        // 人物/主体渲染风格
  elementStyle: string;        // 周围元素风格
  composition: string;         // 构图结构
  colorTreatment: string;      // 色彩处理
  styleDNA: string;            // 风格 DNA（最重要）
  vibeMood: string;           // 整体氛围/情绪
  lighting: string;            // 光照风格
}
```

### SavedImagePrompt 接口
```typescript
export interface SavedImagePrompt {
  prompt: string;                         // 兼容旧格式：原始描述
  styleAnalysis: ImageStyleAnalysis | null;  // 新格式：结构化风格分析
  imageUrl: string;                       // 原图 URL
  imageAlt: string;                       // 原图 alt 文字（辅助上下文）
  analyzedAt: number;                     // Unix ms 时间戳
  sourceUrl: string;                      // 来源页面 URL
}
```

### GenerationRequest 接口
```typescript
export interface GenerationRequest {
  imagePrompt: string | null;           // 兼容旧格式
  styleAnalysis: ImageStyleAnalysis | null; // 新格式：结构化风格分析
  textContext: string;                   // 用户选中的文字
  mergedPrompt: string;                  // 合并后发给 promptFuse 的原始 prompt
  finalPrompt: string;                   // 经过 fusePrompt 优化后的最终 prompt
  size: ImageSize;                       // 图像尺寸
}
```

### CurrentGeneration 接口
```typescript
export type GenerationStatus = "idle" | "fusing" | "generating" | "done" | "error";

export interface CurrentGeneration {
  status: GenerationStatus;
  request: GenerationRequest | null;
  progress: number;             // 0-100
  resultUrl: string | null;     // 生成的图片 dataUrl
  error: string | null;
  createdAt: number;
}
```

### GenerationHistoryItem 接口
```typescript
export interface GenerationHistoryItem {
  id: string;                    // UUID
  prompt: string;                // 最终发出的 prompt
  size: ImageSize;               // 图像尺寸
  createdAt: number;             // Unix ms 时间戳
  imageDataUrl: string;          // base64 图片数据（永久保存）
  sourcePageUrl: string;         // 来源页面 URL
}
```

### ImageSize 类型
```typescript
export type ImageSize =
  | "1024x1024"  // 1:1 方形
  | "1280x960"   // 4:3
  | "1280x720"   // 16:9 宽屏
  | "720x1280"   // 9:16 竖版
  | "1152x768"   // 3:2 摄影比
  | "1280x512";  // 5:2 文章封面
```

### ImageSizeOption 接口 & IMAGE_SIZE_OPTIONS 常量
```typescript
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
```

### TextSelection 接口
```typescript
export interface TextSelection {
  text: string;         // 选中文字
  x: number;            // 鼠标松开时的 clientX
  y: number;            // 鼠标松开时的 clientY
}
```

---

## 已实现的增强功能

### 多维度风格分析（核心功能）
- **ImageStyleAnalysis 接口**：8 个风格维度（backgroundMaterial、subjectStyle、elementStyle、composition、colorTreatment、styleDNA、vibeMood、lighting）
- **analyzeImageWithVision() 升级**：使用豆包视觉模型分析图片风格，输出结构化 JSON
- **fusePrompt() 升级**：接受风格分析 + 文字内容，风格约束优先
- **Popup 展示优化**：风格 DNA 高亮显示，各维度分栏展示
- **向后兼容**：保留旧格式 prompt 字段，平滑迁移

### 2026 极简 UI 设计（移除 HeroUI）
- **设计语言**：黑白色系 + 圆角（12px）+ 微阴影
- **ImageAnalyzeButton**：原生 button + Tailwind CSS，40x40px，10px 圆角
- **SelectionToolbar**：白色背景 + 浅灰边框 + 柔和阴影，40x40px 按钮
- **Popup**：纯原生 HTML + inline styles，无依赖，兼容性最佳

### Popup 页面增强
- **当前生成实时管理**：
  - 显示当前生成状态（fusing/generating/done/error）
  - 可编辑的 Prompt 文本框（支持自定义修改）
  - 图片尺寸下拉选择器
  - 生成进度条（0-100%）
  - 错误提示展示
  - 结果图片预览
  - 下载图片按钮
  - 重置生成状态功能
- **风格分析展示**：
  - 风格 DNA 蓝色高亮卡片
  - 8 个维度分两栏展示
  - 兼容旧格式 fallback
- 显示最新保存的 image prompt
- 支持清除已保存的 prompt
- 显示分析时间和图片 alt 文本
- 生成历史列表（可展开/收起）
- 支持清空生成历史
- 点击历史图片可下载

### SelectionToolbar 优化
- 原生 HTML button + Tailwind CSS
- Lucide React 图标（Plus、X）
- Floating UI 虚拟元素定位
- 极简工具栏设计：白色背景 + 细边框 + 微阴影

### ImageAnalyzeButton 优化
- 使用原生 button 组件 + Tailwind CSS（Shadow DOM 兼容性）
- **2026 极简设计**：40x40px，10px 圆角，微阴影
- **按钮样式**：
  - 默认：白色背景 + 灰色边框（`bg-white border border-gray-200`）
  - 已分析：翡翠绿（`bg-emerald-500 text-white`）
  - 错误：红色（`bg-red-500 text-white`）
- 图标尺寸：18px
- 动态更新虚拟元素位置（监听 scroll/resize）
- 使用 `naturalWidth/naturalHeight` 判断图片尺寸（适配 CSS 缩放图片）
- 按钮定位优化：使用 `offset({ mainAxis: -48, crossAxis: -20 })` 放置在图片内部右下角
- 添加 `useEffect` 监听 `image.src` 变化，自动重置状态
- App.tsx 中添加 `key={hoveredImage.src}` 确保图片切换时重新挂载组件

### 按钮悬停逻辑优化
- `useImageHover` 接收 `buttonHoveredRef` 参数
- 防止鼠标移到分析按钮时图片 hover 状态消失

### 火山引擎 ARK 集成
- 图片分析：`analyzeImageWithVision()` 使用豆包视觉模型
- Prompt 融合：`fusePrompt()` 使用 doubao-seed-2-0-pro 优化
- 图像生成：`generateImage()` 使用 Seedream 4.0
- 历史管理：`saveToHistory()`、`getGenerationHistory()`、`clearGenerationHistory()`
- 所有 API 请求添加 `mode: "cors"` 和 `credentials: "omit"`
