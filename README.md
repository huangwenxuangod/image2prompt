# AI Image Generator Browser Extension

一个 Chrome/Edge 浏览器扩展，可以分析网页图片生成 AI 绘画 prompt，并结合用户划选的文字生成新图片。

## 功能特性

### 🔗 链路 A — 图片分析
- 悬停页面任意图片时显示分析按钮
- 点击按钮使用豆包视觉模型分析图片
- 自动生成中文图片描述
- 保存 prompt 到本地存储
- 已分析图片显示绿色勾标记

### 🔗 链路 B — 划词生成图片
- 选中文字后在鼠标位置显示工具栏
- 合并图片描述 + 选中文字
- Prompt 智能融合优化
- 多种图片尺寸可选（1:1、16:9、9:16、5:2、3:2）
- 支持下载生成的图片
- 生成历史记录（最多保存 20 条）

### ⚙️ Popup 设置页
- 配置火山引擎 ARK API Key
- 查看最新保存的图片描述
- 清除已保存的 prompt
- 查看和管理生成历史
- **当前生成状态实时显示**：
  - Prompt 编辑区（支持自定义修改）
  - 图片尺寸选择
  - 生成进度条
  - 结果图片预览和下载
  - 重置功能

## 技术栈

- **运行时**: Bun 1.x
- **框架**: WXT 0.20.x + React 19
- **UI**: HeroUI v3 + Tailwind CSS v4
- **图标**: Lucide React
- **定位**: Floating UI
- **类型**: TypeScript 6.x (strict mode)
- **AI**: 火山引擎 ARK（豆包视觉模型 + Seedream 图像生成）

---

# 🚀 快速安装（无需编译，直接使用）

## 方式 1：从 Release 下载 ZIP 安装（推荐）
1. 前往项目 **Releases** 页面下载最新版本的 `extension.zip`
2. 打开 Chrome/Edge 浏览器
3. 进入扩展管理页面：
   - Chrome：`chrome://extensions/`
   - Edge：`edge://extensions/`
4. 打开右上角 **开发者模式**
5. **直接将下载好的 `extension.zip` 拖入页面**
6. 扩展会自动解压并安装完成

> 无需解压、无需命令行、无需构建，拖入即可使用。

## 方式 2：本地构建安装
```bash
bun install
bun run dev
```

自动打开 Chrome 并加载扩展。

---

## 生产构建
```bash
bun run build
```

## 打包扩展
```bash
bun run zip
```
生成 `.zip` 文件用于上传 Chrome Web Store 或手动安装。

---

# 使用说明

### 1. 配置 API Key
1. 点击浏览器工具栏的扩展图标
2. 输入你的火山引擎 ARK API Key（格式：`sk-...`）
3. 点击 "保存 API Key"

> API Key 仅保存在本地，不会发送到任何第三方服务器（除火山引擎 ARK API）

### 2. 分析图片
1. 访问任意包含图片的网页
2. 悬停在图片上（图片尺寸 ≥ 60×60）
3. 点击右下角的白色魔法棒图标
4. 等待分析完成（图标变为翡翠绿色勾）
5. 分析结果会自动保存到 Popup 页面

### 3. 生成图片
#### 方式一：在网页上直接生成
1. 在网页上选中任意文字（≥3个字符）
2. 松开鼠标后出现工具栏
3. 点击加号按钮打开生成面板
4. 查看合并后的 prompt（可编辑）
5. 选择图片尺寸
6. 点击 "生成图片"
7. 生成完成后可点击 "下载图片"

#### 方式二：在 Popup 中管理生成
1. 打开扩展 Popup 页面
2. 在 "当前生成" 区域可以：
   - 编辑 Prompt 文本
   - 选择图片尺寸
   - 查看生成进度
   - 预览结果图片
   - 下载图片或重置状态

---

## 项目结构
```
image2prompt/
├── assets/
│   └── style.css              # Tailwind + HeroUI 全局样式
├── public/
│   └── icon.svg               # 扩展图标
├── lib/
│   ├── types.ts               # TypeScript 类型定义
│   └── api.ts                 # 火山引擎 ARK API + 图像生成
├── entrypoints/
│   ├── background.ts          # Service Worker（消息路由 + API 调用）
│   ├── popup/
│   │   ├── index.html
│   │   └── main.tsx           # Popup 页面（API Key + 当前生成 + 历史）
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
├── README.md
├── CLAUDE.md                    # AI 开发配置
└── Agents.md                    # 原始工程提示词
```

## 火山引擎 ARK 配置
当前项目使用火山引擎 ARK API：
- **视觉模型**: doubao-1-5-vision-pro-32k-250115
- **Prompt 融合**: doubao-seed-2-0-pro-260215
- **图像生成**: doubao-seedream-4-0-250828

API 端点: `https://ark.cn-beijing.volces.com/api/v3`

## 注意事项
- **CORS**: 图片 fetch 在 Background Service Worker 中执行，无 CORS 限制
- **Shadow DOM**: 所有 UI 在 Shadow DOM 内渲染，不污染宿主页面样式
- **图片尺寸**: 小于 60×60 的图片会被忽略
- **存储**: 每次只保存最新一张图片的 prompt，新分析会覆盖旧的
- **生成历史**: 最多保存 20 条生成记录，超出后自动删除最旧的

## 开发规范
参考 [Claude.md](./Claude.md) 了解详细的开发规范和技术约束。

## License
MIT

