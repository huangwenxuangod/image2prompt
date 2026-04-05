# AI Image Generator Browser Extension — 完整工程提示词

> 适用于 Cursor / Claude Code / Windsurf 等 AI 编程助手。
> 将此文档完整粘贴，AI 可直接实现整个插件，无需任何额外上下文。

---

## 角色设定

你是一名专注于浏览器扩展开发的高级全栈工程师，精通 WXT、React 19、TypeScript、
Floating UI 和 HeroUI v3。你写的代码要求：类型安全（无 any）、运行时零报错、
Shadow DOM 隔离彻底、UI 组件符合 HeroUI v3 compound 模式。

---

## 项目概述

构建一个 Chrome/Edge 浏览器扩展，功能是：在任意网页上分析图片生成 prompt，
并结合用户划选的文字，调用 AI 生成新图片。整个 UI 以浮动组件形式注入宿主页面。

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

## 产品交互规格

### 链路 A — 图片分析（prompt 持久化）

```
用户悬停页面内任意 <img>
  → 图片右下角出现浮动图标按钮（Floating UI placement="bottom-end"）
  → 用户点击图标
  → 图标变为 Spinner（分析中）
  → Content Script 发消息给 Background: { type: "ANALYZE_IMAGE", imageUrl, imageAlt }
  → Background 将图片 fetch → base64 → 调用 Claude Vision claude-sonnet-4-5
  → 生成英文 prompt（≤80词）返回给 Content Script
  → prompt 写入 chrome.storage.local（key: "savedPrompt"，覆盖上一条）
  → 图标变为绿色勾（已分析）
  → Popup 中实时显示最新分析的 prompt
```

**关键约束：**
- 每次只保留最新一张图片的 prompt
- 下一次分析时直接覆盖，无确认弹窗
- 图标只在悬停时显示，离开后隐藏（已分析的图片保持绿色勾常显）
- Popup 中显示最新 prompt，支持清除

---

### 链路 B — 划词生成图片

```
用户在页面上用鼠标选中文字并松开（mouseup）
  → 记录鼠标松开时的坐标 (mouseX, mouseY)
  → 在指针上方 10px 处弹出工具栏，工具栏左边缘对齐指针（placement="top-start"）
  → 工具栏内容：
      [选中文字预览，最多 22 字截断] [·] [生成图片 →]
  → 用户点击"生成图片"
  → 从 chrome.storage.local 读取 savedPrompt
  → 合并：mergedPrompt = `${savedPrompt.prompt}, ${selectedText}`
      （若 savedPrompt 为空则仅用 selectedText）
  → 工具栏下方展开生成面板（GenerationPanel）
  → 面板展示：图片 prompt 来源 ＋ 文字选段 ＋ 合并 prompt ＋ 生成按钮
  → 用户点击生成 → Progress 条 → 展示结果图片
  → 结果图片可下载（<a download>）
```

**关键约束：**
- 工具栏用 Floating UI 虚拟元素定位（reference = 指针坐标点，非 selection range）
- `placement: "top-start"` 使工具栏左边缘对齐指针 X 坐标
- 点击工具栏外部或按 Escape 关闭
- 若用户重新划词，面板重置（不累加）

---

## 最终目录结构

```
image-gen-plugin/
├── package.json
├── wxt.config.ts
├── tsconfig.json
├── assets/
│   └── style.css                        ← Tailwind v4 + HeroUI 全局样式
├── public/
│   └── icon-128.png                     ← 扩展图标（任意 128×128）
├── lib/
│   ├── types.ts                         ← 所有共享 TypeScript 类型
│   └── api.ts                           ← Claude Vision + 图像生成 API
├── entrypoints/
│   ├── background.ts                    ← Service Worker，消息路由
│   ├── popup/
│   │   ├── index.html
│   │   └── main.tsx                     ← API Key 设置 + 显示最新 prompt
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

## 每个文件的完整实现规格

---

### `package.json`

```json
{
  "name": "image-gen-plugin",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "wxt dev",
    "build": "wxt build",
    "zip": "wxt zip",
    "postinstall": "wxt prepare"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.82.0",
    "@floating-ui/react": "^0.27.19",
    "@heroui/react": "^3.0.1",
    "@heroui/styles": "^3.0.1",
    "@tailwindcss/vite": "^4.2.2",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "tailwind-variants": "^3.2.2",
    "tailwindcss": "^4.2.2",
    "wxt": "^0.20.20"
  },
  "devDependencies": {
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@wxt-dev/module-react": "^1.2.2",
    "typescript": "^6.0.2"
  }
}
```

---

### `wxt.config.ts`

```typescript
import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  srcDir: ".",
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "AI Image Generator",
    description: "Analyze page images and generate new ones from selected text",
    version: "1.0.0",
    permissions: ["storage", "activeTab", "scripting"],
    host_permissions: ["<all_urls>"],
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
```

---

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "paths": { "@/*": ["./*"] }
  },
  "include": ["./**/*.ts", "./**/*.tsx"],
  "exclude": ["node_modules", ".wxt", ".output"]
}
```

---

### `assets/style.css`

```css
@import "tailwindcss";
@import "@heroui/styles";
```

---

### `lib/types.ts`

```typescript
// 持久化的图片分析结果（chrome.storage.local key: "savedPrompt"）
export interface SavedImagePrompt {
  prompt: string;       // Claude Vision 生成的英文 prompt
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

// 发送给图像生成 API 的请求体
export interface GenerationRequest {
  imagePrompt: string | null;  // savedPrompt.prompt，可能为空
  textContext: string;          // 用户选中的文字
  mergedPrompt: string;         // 合并后发给 API 的完整 prompt
}

// Content Script ↔ Background 消息协议（exhaustive union）
export type ExtensionMessage =
  | { type: "ANALYZE_IMAGE"; imageUrl: string; imageAlt: string }
  | { type: "ANALYZE_IMAGE_RESULT"; prompt: string }
  | { type: "ANALYZE_IMAGE_ERROR"; error: string }
  | { type: "GENERATE_IMAGE"; request: GenerationRequest }
  | { type: "GENERATE_IMAGE_RESULT"; dataUrl: string }
  | { type: "GENERATE_IMAGE_ERROR"; error: string }
  | { type: "GET_SAVED_PROMPT" }
  | { type: "GET_SAVED_PROMPT_RESULT"; prompt: SavedImagePrompt | null };
```

---

### `lib/api.ts`

```typescript
import Anthropic from "@anthropic-ai/sdk";

// --- API Key 从 chrome.storage.local 读取 ---
async function getApiKey(): Promise<string> {
  const result = await browser.storage.local.get("apiKey");
  return (result.apiKey as string) ?? "";
}

// --- 链路 A：Claude Vision 图片分析 ---
export async function analyzeImageWithClaude(
  imageUrl: string,
  imageAlt: string
): Promise<string> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error("No API key configured. Open the extension popup to set it.");

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  // 1. fetch 图片 → base64（Background context，无 CORS 限制）
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
  const blob = await response.blob();

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const rawType = blob.type || "image/jpeg";
  const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
  type ValidMediaType = (typeof validTypes)[number];
  const mediaType: ValidMediaType = validTypes.includes(rawType as ValidMediaType)
    ? (rawType as ValidMediaType)
    : "image/jpeg";

  // 2. 调用 Claude Vision
  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 },
          },
          {
            type: "text",
            text: [
              "Analyze this image and write a concise English prompt (max 80 words) for an AI image generator.",
              "Cover: subject matter, visual style, lighting, composition, mood, color palette.",
              "Be specific and descriptive. Use comma-separated descriptive phrases.",
              `Alt text hint: "${imageAlt || "none"}"`,
              "Return ONLY the prompt text. No preamble, no explanation, no quotes.",
            ].join(" "),
          },
        ],
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected Claude response type");
  return content.text.trim();
}

// --- 链路 B：图像生成（当前为 mock，接口留好供替换）---
export async function generateImage(prompt: string): Promise<string> {
  // TODO: 替换为真实 API，例如：
  //   Flux:           https://api.together.xyz/v1/images/generations
  //   DALL-E 3:       https://api.openai.com/v1/images/generations
  //   Stable Diffusion: https://api.stability.ai/v1/generation/...
  //
  // 替换时保持函数签名不变：(prompt: string) => Promise<string>（返回图片 URL 或 dataURL）

  await new Promise((r) => setTimeout(r, 1800)); // 模拟网络延迟

  const escaped = prompt.slice(0, 60).replace(/[<>&"]/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#534AB7"/>
        <stop offset="100%" stop-color="#1D9E75"/>
      </linearGradient>
    </defs>
    <rect width="512" height="512" fill="url(#g)" rx="0"/>
    <text x="256" y="220" font-family="system-ui,sans-serif" font-size="18"
      font-weight="500" fill="white" opacity="0.95" text-anchor="middle">Generated Image</text>
    <text x="256" y="260" font-family="system-ui,sans-serif" font-size="12"
      fill="white" opacity="0.6" text-anchor="middle">${escaped}${prompt.length > 60 ? "…" : ""}</text>
    <text x="256" y="290" font-family="system-ui,sans-serif" font-size="11"
      fill="white" opacity="0.4" text-anchor="middle">Replace generateImage() with real API</text>
  </svg>`;

  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}
```

---

### `entrypoints/background.ts`

```typescript
import { analyzeImageWithClaude, generateImage } from "../lib/api";
import type { ExtensionMessage, SavedImagePrompt } from "../lib/types";

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(
    (
      message: ExtensionMessage,
      _sender: browser.runtime.MessageSender,
      sendResponse: (response: ExtensionMessage) => void
    ) => {
      // --- 图片分析 ---
      if (message.type === "ANALYZE_IMAGE") {
        analyzeImageWithClaude(message.imageUrl, message.imageAlt)
          .then((prompt) => sendResponse({ type: "ANALYZE_IMAGE_RESULT", prompt }))
          .catch((err) =>
            sendResponse({ type: "ANALYZE_IMAGE_ERROR", error: String(err) })
          );
        return true; // 异步响应必须 return true
      }

      // --- 图像生成 ---
      if (message.type === "GENERATE_IMAGE") {
        generateImage(message.request.mergedPrompt)
          .then((dataUrl) =>
            sendResponse({ type: "GENERATE_IMAGE_RESULT", dataUrl })
          )
          .catch((err) =>
            sendResponse({ type: "GENERATE_IMAGE_ERROR", error: String(err) })
          );
        return true;
      }

      // --- 读取已保存的 prompt ---
      if (message.type === "GET_SAVED_PROMPT") {
        browser.storage.local.get("savedPrompt").then((result) =>
          sendResponse({
            type: "GET_SAVED_PROMPT_RESULT",
            prompt: (result.savedPrompt as SavedImagePrompt) ?? null,
          })
        );
        return true;
      }
    }
  );
});
```

---

### `entrypoints/popup/index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AI Image Generator</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

---

### `entrypoints/popup/main.tsx`

```tsx
import "../../assets/style.css";
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { SavedImagePrompt } from "../../lib/types";

function Popup() {
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [savedPrompt, setSavedPrompt] = useState<SavedImagePrompt | null>(null);

  useEffect(() => {
    async function loadData() {
      const [apiResult, promptResult] = await Promise.all([
        browser.storage.local.get("apiKey"),
        browser.storage.local.get("savedPrompt"),
      ]);
      if (apiResult.apiKey) setApiKey(apiResult.apiKey as string);
      if (promptResult.savedPrompt) setSavedPrompt(promptResult.savedPrompt as SavedImagePrompt);
    }
    loadData();

    const listener = (changes: Record<string, browser.storage.StorageChange>) => {
      if ("savedPrompt" in changes) {
        setSavedPrompt(changes.savedPrompt.newValue ?? null);
      }
    };
    browser.storage.onChanged.addListener(listener);
    return () => browser.storage.onChanged.removeListener(listener);
  }, []);

  async function handleSave() {
    await browser.storage.local.set({ apiKey });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleClearPrompt() {
    await browser.storage.local.remove("savedPrompt");
  }

  function formatTime(timestamp: number) {
    return new Date(timestamp).toLocaleString();
  }

  return (
    <div className="w-72 p-4 flex flex-col gap-3">
      <h1 className="text-sm font-medium text-foreground">AI Image Generator</h1>

      {/* API Key Section */}
      <div className="flex flex-col gap-2">
        <p className="text-xs text-default-500">
          Enter your Anthropic API key. It is stored locally and never sent anywhere
          except api.anthropic.com.
        </p>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-ant-..."
          className="w-full rounded-lg border border-default-200 bg-default-50 px-3 py-2
            text-sm text-foreground placeholder:text-default-400
            focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          onClick={handleSave}
          className="w-full rounded-lg bg-primary py-2 text-sm font-medium
            text-primary-foreground transition hover:bg-primary/90 active:scale-95"
        >
          {saved ? "Saved ✓" : "Save API Key"}
        </button>
      </div>

      {/* Saved Prompt Section */}
      <div className="border-t border-default-200 pt-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-medium text-default-700">Latest Image Prompt</h2>
          {savedPrompt && (
            <button
              onClick={handleClearPrompt}
              className="text-[10px] text-default-400 hover:text-danger transition"
            >
              Clear
            </button>
          )}
        </div>
        {savedPrompt ? (
          <div className="flex flex-col gap-2">
            <p className="rounded-lg bg-default-50 px-2.5 py-2 text-xs text-default-600 leading-relaxed">
              {savedPrompt.prompt}
            </p>
            <div className="flex items-center justify-between text-[10px] text-default-400">
              <span>
                {savedPrompt.imageAlt ? `Alt: ${savedPrompt.imageAlt.slice(0, 30)}${savedPrompt.imageAlt.length > 30 ? "…" : ""}` : "No alt text"}
              </span>
              <span>{formatTime(savedPrompt.analyzedAt)}</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-default-400 italic">
            Hover over an image on any page and click the analyze button to save a prompt.
          </p>
        )}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Popup />);
```

---

### `entrypoints/content/index.tsx`

```tsx
// Shadow DOM 挂载入口。所有 UI 在 Shadow DOM 内，彻底隔离宿主页面样式。
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// 将编译后的 HeroUI + Tailwind CSS 注入 shadow root
import styleText from "../../assets/style.css?inline";

export default defineContentScript({
  matches: ["<all_urls>"],
  cssInjectionMode: "ui",

  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: "image-gen-plugin-root",
      position: "inline",
      anchor: "body",
      append: "last",

      onMount(container, shadow) {
        // 注入样式到 shadow root（HeroUI v3 支持 adoptedStyleSheets）
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(styleText);
        shadow.adoptedStyleSheets = [sheet];

        // pointer-events: none 在容器上，让点击事件穿透到宿主页面
        // 各浮动组件内部再设置 pointer-events: auto
        container.style.cssText =
          "position:fixed;inset:0;z-index:2147483647;pointer-events:none;";

        const root = createRoot(container);
        root.render(<App />);
        return root;
      },

      onRemove(root) {
        root?.unmount();
      },
    });

    ui.mount();
  },
});
```

---

### `entrypoints/content/hooks/useSavedPrompt.ts`

```typescript
import { useState, useEffect, useCallback } from "react";
import type { SavedImagePrompt } from "../../../lib/types";

export function useSavedPrompt() {
  const [savedPrompt, setSavedPrompt] = useState<SavedImagePrompt | null>(null);

  // 初始加载
  useEffect(() => {
    browser.storage.local.get("savedPrompt").then((result) => {
      setSavedPrompt((result.savedPrompt as SavedImagePrompt) ?? null);
    });

    // 实时监听 storage 变化（跨 context 同步）
    const listener = (
      changes: Record<string, browser.storage.StorageChange>
    ) => {
      if ("savedPrompt" in changes) {
        setSavedPrompt(changes.savedPrompt.newValue ?? null);
      }
    };
    browser.storage.onChanged.addListener(listener);
    return () => browser.storage.onChanged.removeListener(listener);
  }, []);

  const savePrompt = useCallback(async (data: SavedImagePrompt) => {
    await browser.storage.local.set({ savedPrompt: data });
    // listener 会自动触发 setSavedPrompt
  }, []);

  const clearPrompt = useCallback(async () => {
    await browser.storage.local.remove("savedPrompt");
  }, []);

  return { savedPrompt, savePrompt, clearPrompt };
}
```

---

### `entrypoints/content/hooks/useImageHover.ts`

```typescript
import { useState, useEffect, useRef } from "react";

export interface HoveredImage {
  element: HTMLImageElement;
  rect: DOMRect;
  src: string;
  alt: string;
}

export function useImageHover(buttonHoveredRef: React.MutableRefObject<boolean>) {
  const [hoveredImage, setHoveredImage] = useState<HoveredImage | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onEnter(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!(target instanceof HTMLImageElement)) return;
      if (target.width < 60 || target.height < 60) return; // 忽略小图标

      if (leaveTimer.current) clearTimeout(leaveTimer.current);
      setHoveredImage({
        element: target,
        rect: target.getBoundingClientRect(),
        src: target.src,
        alt: target.alt,
      });
    }

    function onLeave(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!(target instanceof HTMLImageElement)) return;
      // 延迟 200ms 隐藏，检查按钮是否被悬停
      leaveTimer.current = setTimeout(() => {
        if (!buttonHoveredRef.current) {
          setHoveredImage(null);
        }
      }, 200);
    }

    // 监听 scroll/resize 时更新 rect
    function onScroll() {
      setHoveredImage((prev) =>
        prev
          ? { ...prev, rect: prev.element.getBoundingClientRect() }
          : null
      );
    }

    document.addEventListener("mouseover", onEnter, true);
    document.addEventListener("mouseout", onLeave, true);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      document.removeEventListener("mouseover", onEnter, true);
      document.removeEventListener("mouseout", onLeave, true);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
    };
  }, [buttonHoveredRef]);

  return hoveredImage;
}
```

---

### `entrypoints/content/hooks/useTextSelection.ts`

```typescript
import { useState, useEffect } from "react";
import type { TextSelection } from "../../../lib/types";

export function useTextSelection() {
  const [selection, setSelection] = useState<TextSelection | null>(null);

  useEffect(() => {
    function onMouseUp(e: MouseEvent) {
      // 延迟一帧等 selection 更新
      setTimeout(() => {
        const sel = window.getSelection();
        const text = sel?.toString().trim() ?? "";
        if (!text || text.length < 3) {
          setSelection(null);
          return;
        }
        // 记录鼠标松开时的坐标（用于工具栏定位）
        setSelection({ text, x: e.clientX, y: e.clientY });
      }, 10);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSelection(null);
    }

    document.addEventListener("mouseup", onMouseUp, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("mouseup", onMouseUp, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, []);

  const clearSelection = () => {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  return { selection, clearSelection };
}
```

---

### `entrypoints/content/components/ImageAnalyzeButton.tsx`

```tsx
import React, { useState, useRef } from "react";
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
} from "@floating-ui/react";
import type { HoveredImage } from "../hooks/useImageHover";
import type { SavedImagePrompt } from "../../../lib/types";
import type { ExtensionMessage } from "../../../lib/types";

interface Props {
  image: HoveredImage;
  analyzedImages: Set<string>;
  onAnalyzed: (prompt: SavedImagePrompt) => void;
  onMouseEnterButton: () => void;
  onMouseLeaveButton: () => void;
}

type Status = "idle" | "loading" | "done" | "error";

export function ImageAnalyzeButton({
  image,
  analyzedImages,
  onAnalyzed,
  onMouseEnterButton,
  onMouseLeaveButton,
}: Props) {
  const [status, setStatus] = useState<Status>(
    analyzedImages.has(image.src) ? "done" : "idle"
  );
  const [errorMsg, setErrorMsg] = useState("");

  // 使用虚拟元素锚定到图片右下角（strategy: fixed 穿透 overflow）
  const virtualRef = useRef({
    getBoundingClientRect: () => image.rect,
  });

  const { refs, floatingStyles } = useFloating({
    elements: { reference: virtualRef.current },
    strategy: "fixed",
    placement: "bottom-end",
    middleware: [offset(4), flip(), shift({ padding: 4 })],
    whileElementsMounted: autoUpdate,
  });

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (status === "loading") return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const response = (await browser.runtime.sendMessage({
        type: "ANALYZE_IMAGE",
        imageUrl: image.src,
        imageAlt: image.alt,
      } satisfies ExtensionMessage)) as ExtensionMessage;

      if (response.type === "ANALYZE_IMAGE_RESULT") {
        const data: SavedImagePrompt = {
          prompt: response.prompt,
          imageUrl: image.src,
          imageAlt: image.alt,
          analyzedAt: Date.now(),
          sourceUrl: location.href,
        };
        await browser.storage.local.set({ savedPrompt: data });
        onAnalyzed(data);
        setStatus("done");
      } else if (response.type === "ANALYZE_IMAGE_ERROR") {
        throw new Error(response.error);
      }
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  return (
    <div
      ref={refs.setFloating}
      style={{ ...floatingStyles, pointerEvents: "auto" }}
      onMouseEnter={onMouseEnterButton}
      onMouseLeave={onMouseLeaveButton}
      className="z-[2147483647]"
    >
      <button
        onClick={handleClick}
        title={
          status === "done"
            ? "Analyzed — click to re-analyze"
            : status === "error"
            ? errorMsg
            : "Analyze image with Claude"
        }
        className={[
          "flex h-7 w-7 items-center justify-center rounded-full",
          "text-white text-xs font-medium transition-all duration-150",
          "shadow-sm border border-white/20",
          "active:scale-95",
          status === "done"
            ? "bg-success-600 hover:bg-success-500"
            : status === "error"
            ? "bg-danger-600 hover:bg-danger-500"
            : "bg-[#534AB7] hover:bg-[#7F77DD]",
        ].join(" ")}
      >
        {status === "loading" ? (
          // Inline SVG spinner（不依赖 HeroUI Spinner，避免 CSS 变量问题）
          <svg
            className="h-3.5 w-3.5 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12" cy="12" r="10"
              stroke="currentColor" strokeWidth="3" opacity="0.3"
            />
            <path
              d="M12 2a10 10 0 0 1 10 10"
              stroke="currentColor" strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        ) : status === "done" ? (
          // 勾
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 8l3.5 3.5L13 5"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
        ) : status === "error" ? (
          // 感叹号
          <span>!</span>
        ) : (
          // 魔法棒图标
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M13.5 1.5l1 1-1.5 1.5-1-1 1.5-1.5zm-9 9l1 1-1.5 1.5-1-1 1.5-1.5zM2 2l.75.75L1.25 4.25.5 3.5 2 2zm10 10l.75.75-1.5 1.5-.75-.75 1.5-1.5zM3.5 1l.5 2H2L3.5 1zm9 9l.5 2h-2l1.5-2zM1 3.5l2 .5v2L1 5.5V3.5zm9 9l2 .5v2l-1.5-1 -1.5.5.5-2zM5 3a6 6 0 0 1 8 8L5 3z"/>
          </svg>
        )}
      </button>
    </div>
  );
}
```

---

### `entrypoints/content/components/SelectionToolbar.tsx`

```tsx
import React, { useMemo } from "react";
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
} from "@floating-ui/react";
import type { TextSelection } from "../../../lib/types";

interface Props {
  selection: TextSelection;
  onGenerate: () => void;
  onDismiss: () => void;
}

export function SelectionToolbar({ selection, onGenerate, onDismiss }: Props) {
  // 虚拟元素：reference = 鼠标松开时的坐标点（宽高为 0）
  // placement="top-start" → 工具栏左边缘对齐指针 X，显示在指针上方
  const virtualReference = useMemo(
    () => ({
      getBoundingClientRect: () =>
        ({
          x: selection.x,
          y: selection.y,
          width: 0,
          height: 0,
          top: selection.y,
          left: selection.x,
          right: selection.x,
          bottom: selection.y,
        } as DOMRect),
    }),
    [selection.x, selection.y]
  );

  const { refs, floatingStyles } = useFloating({
    elements: { reference: virtualReference },
    strategy: "fixed",
    placement: "top-start",
    middleware: [
      offset({ mainAxis: 10, crossAxis: 0 }),
      flip({ fallbackPlacements: ["bottom-start", "top-end", "bottom-end"] }),
      shift({ padding: 10 }),
    ],
    whileElementsMounted: autoUpdate,
  });

  const preview =
    selection.text.length > 22
      ? selection.text.slice(0, 22) + "…"
      : selection.text;

  return (
    <div
      ref={refs.setFloating}
      style={{ ...floatingStyles, pointerEvents: "auto" }}
      className="z-[2147483647] flex items-center gap-0 rounded-lg
        border border-default-200 bg-background shadow-md
        overflow-hidden text-sm"
      // 点击工具栏本身不触发 dismiss
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* 选中文字预览 */}
      <span className="max-w-[160px] truncate px-3 py-1.5 text-default-600 text-xs">
        {preview}
      </span>

      {/* 分隔线 */}
      <div className="h-5 w-px bg-default-200" />

      {/* 生成按钮 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onGenerate();
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
          text-primary transition hover:bg-primary/8 active:scale-95
          whitespace-nowrap"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm3.5 7.75H8.75V11.5h-1.5V8.75H4.5v-1.5h2.75V4.5h1.5v2.75H11.5v1.5z"/>
        </svg>
        生成图片
      </button>

      {/* 关闭 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        className="px-2 py-1.5 text-default-400 transition
          hover:bg-default-100 hover:text-default-600"
        title="Dismiss"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
          <path
            d="M4 4l8 8M12 4l-8 8"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
```

---

### `entrypoints/content/components/GenerationPanel.tsx`

```tsx
import React, { useState } from "react";
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
} from "@floating-ui/react";
import type { SavedImagePrompt, GenerationRequest } from "../../../lib/types";
import type { ExtensionMessage } from "../../../lib/types";

interface Props {
  selection: { text: string; x: number; y: number };
  savedPrompt: SavedImagePrompt | null;
  onClose: () => void;
}

type GenStatus = "idle" | "loading" | "done" | "error";

export function GenerationPanel({ selection, savedPrompt, onClose }: Props) {
  const [status, setStatus] = useState<GenStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // 合并 prompt
  const mergedPrompt = [savedPrompt?.prompt, selection.text]
    .filter(Boolean)
    .join(", ");

  // 面板锚定在工具栏正下方（同一个虚拟坐标，但 placement="bottom-start"）
  const virtualRef = {
    getBoundingClientRect: () =>
      ({
        x: selection.x,
        y: selection.y,
        width: 0,
        height: 0,
        top: selection.y,
        left: selection.x,
        right: selection.x,
        bottom: selection.y,
      } as DOMRect),
  };

  const { refs, floatingStyles } = useFloating({
    elements: { reference: virtualRef },
    strategy: "fixed",
    placement: "bottom-start",
    middleware: [
      offset({ mainAxis: 44 }), // 工具栏高度约 36px + 8px 间距
      flip({ fallbackPlacements: ["top-start"] }),
      shift({ padding: 12 }),
    ],
    whileElementsMounted: autoUpdate,
  });

  async function handleGenerate() {
    setStatus("loading");
    setProgress(0);
    setResultUrl(null);
    setErrorMsg("");

    // 模拟进度条（真实 API 替换后可用流式响应更新）
    const iv = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) { clearInterval(iv); return p; }
        return p + Math.random() * 12 + 5;
      };
    }, 150);

    try {
      const request: GenerationRequest = {
        imagePrompt: savedPrompt?.prompt ?? null,
        textContext: selection.text,
        mergedPrompt,
      };
      const response = (await browser.runtime.sendMessage({
        type: "GENERATE_IMAGE",
        request,
      } satisfies ExtensionMessage)) as ExtensionMessage;

      clearInterval(iv);
      setProgress(100);

      if (response.type === "GENERATE_IMAGE_RESULT") {
        setResultUrl(response.dataUrl);
        setStatus("done");
      } else if (response.type === "GENERATE_IMAGE_ERROR") {
        throw new Error(response.error);
      }
    } catch (err) {
      clearInterval(iv);
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  }

  function handleDownload() {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `generated-${Date.now()}.png`;
    a.click();
  }

  return (
    <div
      ref={refs.setFloating}
      style={{ ...floatingStyles, pointerEvents: "auto" }}
      className="z-[2147483647] w-80 rounded-xl border border-default-200
        bg-background shadow-xl overflow-hidden"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-default-100 px-3 py-2">
        <span className="text-xs font-medium text-default-700">合并生成图片</span>
        <button
          onClick={onClose}
          className="rounded-md p-0.5 text-default-400 hover:bg-default-100
            hover:text-default-600 transition"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 4l8 8M12 4l-8 8"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className="p-3 flex flex-col gap-2.5">
        {/* 图片 prompt 来源 */}
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-default-400">
            图片 prompt
          </p>
          <p className="rounded-lg bg-default-50 px-2.5 py-1.5 text-xs text-default-600 leading-relaxed">
            {savedPrompt?.prompt ?? (
              <span className="text-default-400 italic">未分析图片，仅使用文字选段</span>
            )}
          </p>
        </div>

        {/* 文字选段 */}
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-default-400">
            文字选段
          </p>
          <p className="rounded-lg bg-default-50 px-2.5 py-1.5 text-xs text-default-700 leading-relaxed">
            {selection.text.length > 120
              ? selection.text.slice(0, 120) + "…"
              : selection.text}
          </p>
        </div>

        {/* 合并 prompt */}
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-default-400">
            合并 prompt
          </p>
          <p className="rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1.5
            text-xs text-default-800 leading-relaxed">
            {mergedPrompt}
          </p>
        </div>

        {/* 进度条（生成中显示）*/}
        {status === "loading" && (
          <div className="h-1 w-full overflow-hidden rounded-full bg-default-100">
            <div
              className="h-full rounded-full bg-primary transition-all duration-200"
              style={{ width: `${Math.min(Math.round(progress), 100)}%` }}
            />
          </div>
        )}

        {/* 错误 */}
        {status === "error" && (
          <p className="rounded-lg bg-danger-50 px-2.5 py-1.5 text-xs text-danger-600">
            {errorMsg}
          </p>
        )}

        {/* 生成结果图片 */}
        {status === "done" && resultUrl && (
          <div className="overflow-hidden rounded-lg border border-default-100">
            <img
              src={resultUrl}
              alt="Generated"
              className="w-full object-cover"
            />
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-2">
          {status === "done" ? (
            <>
              <button
                onClick={handleDownload}
                className="flex-1 rounded-lg border border-default-200 py-1.5 text-xs
                  font-medium text-default-700 transition hover:bg-default-50
                  active:scale-95"
              >
                下载图片
              </button>
              <button
                onClick={handleGenerate}
                className="flex-1 rounded-lg bg-primary py-1.5 text-xs font-medium
                  text-primary-foreground transition hover:bg-primary/90 active:scale-95"
              >
                重新生成
              </button>
            </>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={status === "loading"}
              className="w-full rounded-lg bg-primary py-1.5 text-xs font-medium
                text-primary-foreground transition hover:bg-primary/90 active:scale-95
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "loading" ? "生成中…" : "生成图片"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

### `entrypoints/content/App.tsx`

```tsx
import React, { useState, useCallback, useEffect, useRef } from "react";
import { useImageHover } from "./hooks/useImageHover";
import { useTextSelection } from "./hooks/useTextSelection";
import { useSavedPrompt } from "./hooks/useSavedPrompt";
import { ImageAnalyzeButton } from "./components/ImageAnalyzeButton";
import { SelectionToolbar } from "./components/SelectionToolbar";
import { GenerationPanel } from "./components/GenerationPanel";
import type { SavedImagePrompt } from "../../lib/types";

export default function App() {
  // 防止图片图标悬停时触发 hover 消失
  const buttonHovered = useRef(false);

  const hoveredImage = useImageHover(buttonHovered);
  const { selection, clearSelection } = useTextSelection();
  const { savedPrompt, savePrompt } = useSavedPrompt();

  // 已分析过的图片 src（用于显示绿色勾，session 内有效）
  const [analyzedImages, setAnalyzedImages] = useState<Set<string>>(new Set());

  // 面板开关：工具栏点击"生成图片"后展开
  const [panelOpen, setPanelOpen] = useState(false);

  const handleAnalyzed = useCallback(
    (data: SavedImagePrompt) => {
      savePrompt(data);
      setAnalyzedImages((prev) => {
        const next = new Set(prev);
        next.add(data.imageUrl);
        return next;
      });
    },
    [savePrompt]
  );

  // 点击页面空白区域关闭工具栏和面板
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      // 若点击发生在 shadow DOM 内部，事件会被 stopPropagation 拦截
      // 此处仅处理宿主页面点击
      if (!panelOpen) return;
      setPanelOpen(false);
      clearSelection();
    }
    document.addEventListener("mousedown", onMouseDown, true);
    return () => document.removeEventListener("mousedown", onMouseDown, true);
  }, [panelOpen, clearSelection]);

  return (
    <>
      {/* 链路 A：图片分析图标 */}
      {hoveredImage && (
        <ImageAnalyzeButton
          image={hoveredImage}
          analyzedImages={analyzedImages}
          onAnalyzed={handleAnalyzed}
          onMouseEnterButton={() => { buttonHovered.current = true; }}
          onMouseLeaveButton={() => { buttonHovered.current = false; }}
        />
      )}

      {/* 链路 B：划词工具栏 */}
      {selection && !panelOpen && (
        <SelectionToolbar
          selection={selection}
          onGenerate={() => setPanelOpen(true)}
          onDismiss={() => {
            clearSelection();
            setPanelOpen(false);
          }}
        />
      )}

      {/* 链路 B：生成面板（工具栏展开后显示） */}
      {selection && panelOpen && (
        <GenerationPanel
          selection={selection}
          savedPrompt={savedPrompt}
          onClose={() => {
            setPanelOpen(false);
            clearSelection();
          }}
        />
      )}
    </>
  );
}
```

---

## 本地开发命令

```bash
# 1. 创建项目并安装依赖（已有项目跳过）
bunx wxt@latest init image-gen-plugin --template react-ts
cd image-gen-plugin
bun install

# 2. 启动开发服务器（自动打开 Chrome 并加载扩展）
bun run dev

# 3. 生产构建
bun run build

# 4. 打包为 .zip（上传 Chrome Web Store）
bun run zip
```

---

## 首次运行配置

1. `bun run dev` 启动后，Chrome 会自动加载扩展
2. 点击浏览器工具栏的扩展图标 → 输入 Anthropic API Key → 点击 Save
3. 访问任意包含图片的网页
4. 悬停图片 → 右下角出现紫色图标 → 点击分析
5. 选中文章文字 → 工具栏出现在指针上方左侧 → 点击"生成图片"

---

## 替换真实图像生成 API（当前为 mock）

编辑 `lib/api.ts` 中的 `generateImage` 函数，保持签名不变：

```typescript
// 替换示例：Together AI Flux
export async function generateImage(prompt: string): Promise<string> {
  const apiKey = await getApiKey(); // 或单独存储 image gen API key
  const res = await fetch("https://api.together.xyz/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "black-forest-labs/FLUX.1-schnell", prompt, n: 1 }),
  });
  const data = await res.json();
  return data.data[0].url; // 返回图片 URL 即可，img src 直接用
}
```

---

## 已知注意事项

| 事项 | 说明 |
|------|------|
| CORS | 图片 fetch 在 Background（Service Worker）执行，无 CORS 限制 |
| Shadow DOM 样式 | HeroUI 样式通过 `adoptedStyleSheets` 注入，不污染宿主页面 |
| `dangerouslyAllowBrowser` | Anthropic SDK 设为 true 是因为调用发生在 Background，实际上是安全的 |
| 跨站图片 | 部分网站图片有 CORS header，fetch 会失败，可在 error 中提示用户 |
| HeroUI v3 Provider | v3 不需要 `<HeroUIProvider>` 包裹，直接用组件 |
| Tailwind v4 | 无 `tailwind.config.js`，配置通过 CSS `@theme` 块或默认值 |
