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
