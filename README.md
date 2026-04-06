# AI Image Generator Browser Extension

Chrome/Edge 浏览器扩展，分析网页图片生成 prompt，结合划选文字生成新图片。

## 功能

- **图片分析**：悬停图片 → 点击分析 → 保存 prompt
- **划词生成**：选中文字 → 合并图片描述 → AI 生成新图
- **Popup 管理**：API Key 配置、生成历史、当前生成状态

## 技术栈

- Bun 1.x + WXT 0.20.x + React 19
- Tailwind CSS v4 + 2026 极简设计
- 火山引擎 ARK（豆包视觉模型 + Seedream 图像生成

## 快速开始

```bash
bun install
bun run dev
```

## 使用

1. 点击扩展图标配置火山引擎 ARK API Key
2. 悬停图片点击分析按钮
3. 划选文字点击生成

## 项目结构

```
image2prompt/
├── assets/style.css
├── lib/types.ts, api.ts
├── entrypoints/
│   ├── background.ts
│   ├── popup/main.tsx
│   └── content/
├── README.md
└── CLAUDE.md  # 开发配置
```

## License

MIT
