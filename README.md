# AI Image Generator Browser Extension

一个 Chrome/Edge 浏览器扩展，可以分析网页图片生成 AI 绘画 prompt，并结合用户划选的文字生成新图片。

## 功能特性

### 🔗 链路 A — 图片分析
- 悬停页面任意图片时显示分析按钮
- 点击按钮使用 Claude Vision 分析图片
- 自动生成英文 prompt（≤80词）
- 保存 prompt 到本地存储
- 已分析图片显示绿色勾标记

### 🔗 链路 B — 划词生成图片
- 选中文字后在鼠标位置显示工具栏
- 合并图片 prompt + 选中文字
- 生成新图片（当前为 Mock，可替换真实 API）
- 支持下载生成的图片

### ⚙️ Popup 设置页
- 配置 Anthropic API Key
- 查看最新保存的 image prompt
- 清除已保存的 prompt

## 技术栈

- **运行时**: Bun 1.x
- **框架**: WXT 0.20.x + React 19
- **UI**: HeroUI v3 + Tailwind CSS v4
- **定位**: Floating UI
- **类型**: TypeScript 6.x (strict mode)
- **AI**: Anthropic SDK (claude-sonnet-4-5)

## 快速开始

### 安装依赖

```bash
bun install
```

### 开发模式

```bash
bun run dev
```

自动打开 Chrome 并加载扩展。

### 生产构建

```bash
bun run build
```

### 打包扩展

```bash
bun run zip
```

生成 `.zip` 文件用于上传 Chrome Web Store。

## 使用说明

### 1. 配置 API Key

1. 点击浏览器工具栏的扩展图标
2. 输入你的 Anthropic API Key（格式：`sk-ant-...`）
3. 点击 "Save API Key"

> API Key 仅保存在本地，不会发送到任何第三方服务器（除 api.anthropic.com）

### 2. 分析图片

1. 访问任意包含图片的网页
2. 悬停在图片上（图片尺寸 ≥ 60×60）
3. 点击右下角的紫色魔法棒图标
4. 等待分析完成（图标变为绿色勾）

### 3. 生成图片

1. 在网页上选中任意文字（≥3个字符）
2. 松开鼠标后出现工具栏
3. 点击 "生成图片"
4. 查看合并后的 prompt 并点击 "生成图片"
5. 生成完成后可点击 "下载图片"

## 项目结构

```
image2prompt/
├── assets/
│   └── style.css              # Tailwind + HeroUI 全局样式
├── public/
│   └── icon.svg               # 扩展图标
├── lib/
│   ├── types.ts               # TypeScript 类型定义
│   └── api.ts                 # Claude API + 图像生成
├── entrypoints/
│   ├── background.ts          # Service Worker
│   ├── popup/
│   │   ├── index.html
│   │   └── main.tsx           # Popup 页面
│   └── content/
│       ├── index.tsx          # Shadow DOM 入口
│       ├── App.tsx            # 主应用
│       ├── hooks/
│       │   ├── useImageHover.ts
│       │   ├── useTextSelection.ts
│       │   └── useSavedPrompt.ts
│       └── components/
│           ├── ImageAnalyzeButton.tsx
│           ├── SelectionToolbar.tsx
│           └── GenerationPanel.tsx
├── package.json
├── wxt.config.ts
├── tsconfig.json
└── README.md
```

## 替换图像生成 API

当前 `lib/api.ts` 中的 `generateImage()` 是 mock 实现。替换为真实 API 示例：

### Together AI (Flux)

```typescript
export async function generateImage(prompt: string): Promise<string> {
  const apiKey = await getApiKey();
  const res = await fetch("https://api.together.xyz/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "black-forest-labs/FLUX.1-schnell",
      prompt,
      n: 1,
    }),
  });
  const data = await res.json();
  return data.data[0].url;
}
```

### OpenAI (DALL-E 3)

```typescript
export async function generateImage(prompt: string): Promise<string> {
  const apiKey = await getApiKey();
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt,
      size: "1024x1024",
    }),
  });
  const data = await res.json();
  return data.data[0].url;
}
```

## 注意事项

- **CORS**: 图片 fetch 在 Background Service Worker 中执行，无 CORS 限制
- **Shadow DOM**: 所有 UI 在 Shadow DOM 内渲染，不污染宿主页面样式
- **图片尺寸**: 小于 60×60 的图片会被忽略
- **存储**: 每次只保存最新一张图片的 prompt，新分析会覆盖旧的

## 开发规范

参考 [Claude.md](./Claude.md) 了解详细的开发规范和技术约束。

## License

MIT
