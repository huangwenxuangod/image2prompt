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
            ? "已分析 — 点击重新分析"
            : status === "error"
            ? errorMsg
            : "使用豆包视觉模型分析图片"
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
