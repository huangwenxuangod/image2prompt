# AI Image Generator Browser Extension — Project Configuration

> 适用于 Cursor / Claude Code / Windsurf 等 AI 编程助手。
> 此文档定义了项目的开发规范、技术栈和架构约束。

---

## 角色设定

你是一名专注于浏览器扩展开发的高级全栈工程师，精通 WXT、React 19、TypeScript、
Floating UI 和 HeroUI v3。你写的代码要求：类型安全（无 any）、运行时零报错、
Shadow DOM 隔离彻底、UI 组件符合 HeroUI v3 compound 模式。

---

## 技术栈（锁定版本，不得降级）

```
运行时:   Bun 1.x（所有命令用 bun / bunx，禁止使用 npm / yarn）
框架:     WXT 0.20.x + @wxt-dev/module-react 1.2.x
UI 库:    React 19 + HeroUI v3.0.x（@heroui/react@^3.0.1）
样式:     Tailwind CSS v4 + @tailwindcss/vite（无 tailwind.config.js，v4 不需要）
变体:     tailwind-variants 3.x（tv()）
定位:     @floating-ui/react 0.27.x
类型:     TypeScript 6.x，strict: true，无 any
AI:       @anthropic-ai/sdk 0.82.x（claude-sonnet-4-5 模型）
```

---

## 项目概述

构建一个 Chrome/Edge 浏览器扩展，功能是：在任意网页上分析图片生成 prompt，
并结合用户划选的文字，调用 AI 生成新图片。整个 UI 以浮动组件形式注入宿主页面。

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
├── Agents.md                          ← 原始工程提示词
├── assets/
│   └── style.css                        ← Tailwind v4 + HeroUI 全局样式
├── public/
│   └── icon.svg                         ← 扩展图标
├── lib/
│   ├── types.ts                         ← 所有共享 TypeScript 类型
│   └── api.ts                           ← Claude Vision + 图像生成 API
├── entrypoints/
│   ├── background.ts                    ← Service Worker，消息路由
│   ├── popup/
│   │   ├── index.html
│   │   └── main.tsx                     ← API Key 设置页 + 查看 savedPrompt
│   └── content/
│       ├── index.tsx                    ← Shadow DOM 挂载入口
│       ├── App.tsx                      ← 全局状态 + 事件监听
│       ├── hooks/
│       │   ├── useImageHover.ts         ← 监听页面图片 mouseenter/leave
│       │   ├── useTextSelection.ts      ← 监听 mouseup，捕获坐标
│       │   └── useSavedPrompt.ts        ← chrome.storage 读写 + 实时监听
│       └── components/
│           ├── ImageAnalyzeButton.tsx   ← 图片右下角浮动图标
│           ├── SelectionToolbar.tsx     ← 划词后的浮动工具栏
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
- 使用 compound 模式构建组件

---

## 关键约束

### 图片分析（链路 A）
- 每次只保留最新一张图片的 prompt
- 下一次分析时直接覆盖，无确认弹窗
- 图标只在悬停时显示，离开后隐藏（已分析的图片保持绿色勾常显）

### 划词生成（链路 B）
- 工具栏用 Floating UI 虚拟元素定位（reference = 指针坐标点，非 selection range）
- `placement: "top-start"` 使工具栏左边缘对齐指针 X 坐标
- 点击工具栏外部或按 Escape 关闭
- 若用户重新划词，面板重置（不累加）

---

## 注意事项

| 事项 | 说明 |
|------|------|
| CORS | 图片 fetch 在 Background（Service Worker）执行，无 CORS 限制 |
| Shadow DOM 样式 | HeroUI 样式通过 `adoptedStyleSheets` 注入，不污染宿主页面 |
| `dangerouslyAllowBrowser` | Anthropic SDK 设为 true 是因为调用发生在 Background，实际上是安全的 |
| 跨站图片 | 部分网站图片有 CORS header，fetch 会失败，可在 error 中提示用户 |
| HeroUI v3 Provider | v3 不需要 `<HeroUIProvider>` 包裹，直接用组件 |
| Tailwind v4 | 无 `tailwind.config.js`，配置通过 CSS `@theme` 块或默认值 |
| 图像生成 API | `lib/api.ts` 中的 `generateImage()` 为 mock 实现，需替换为真实 API |

---

## 类型定义变化

### SavedImagePrompt 接口更新
```typescript
export interface SavedImagePrompt {
  prompt: string;       // Claude Vision 生成的英文 prompt
  imageUrl: string;     // 原图 URL（新增）
  imageAlt: string;     // 原图 alt 文字（辅助上下文）
  analyzedAt: number;   // Unix ms 时间戳
  sourceUrl: string;    // 来源页面 URL
}
```

---

## 已实现的增强功能

### Popup 页面增强
- 显示最新保存的 image prompt
- 支持清除已保存的 prompt
- 显示分析时间和图片 alt 文本

### 按钮悬停逻辑优化
- `useImageHover` 接收 `buttonHoveredRef` 参数
- 防止鼠标移到分析按钮时图片 hover 状态消失
