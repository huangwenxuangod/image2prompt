import React, { useState, useRef, useEffect } from "react";
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
} from "@floating-ui/react";
import { Wand2, Loader2, Check, AlertCircle } from "lucide-react";
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
  const [virtualEl, setVirtualEl] = useState<any>(null);

  // 实时更新虚拟元素位置
  useEffect(() => {
    const updateVirtualEl = () => {
      const rect = image.rect;
      setVirtualEl({
        getBoundingClientRect: () => rect,
        contextElement: image.element,
      });
    };

    updateVirtualEl();

    // 监听滚动和resize更新位置
    const update = () => {
      const newRect = image.element.getBoundingClientRect();
      setVirtualEl({
        getBoundingClientRect: () => newRect,
        contextElement: image.element,
      });
    };

    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [image]);

  // Floating UI 定位：bottom-end + offset 把按钮拉回图片内部
  const { refs, floatingStyles } = useFloating({
    elements: { reference: virtualEl },
    strategy: "fixed",
    placement: "bottom-end",
    middleware: [
      offset({ mainAxis: -40, crossAxis: -20 }), // 向左20px，向上40px
      flip(),
      shift({ padding: 4 }),
    ],
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

  const getIcon = () => {
    if (status === "loading") return <Loader2 className="w-4 h-4 animate-spin" />;
    if (status === "done") return <Check className="w-4 h-4" />;
    if (status === "error") return <AlertCircle className="w-4 h-4" />;
    return <Wand2 className="w-4 h-4" />;
  };

  const getButtonColor = () => {
    if (status === "done") return "#10b981"; // green-500
    if (status === "error") return "#ef4444"; // red-500
    return "#3b82f6"; // blue-500
  };

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
        title={status === "done" ? "已分析 — 点击重新分析" : status === "error" ? errorMsg : "使用豆包视觉模型分析图片"}
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "9999px",
          border: "none",
          backgroundColor: getButtonColor(),
          color: "white",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          pointerEvents: "auto",
        }}
        disabled={status === "loading"}
      >
        {getIcon()}
      </button>
    </div>
  );
}
