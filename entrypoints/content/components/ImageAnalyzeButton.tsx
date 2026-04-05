import React, { useState, useRef } from "react";
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
} from "@floating-ui/react";
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@heroui/react";
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

  const getTooltipContent = () => {
    if (status === "done") return "已分析 — 点击重新分析";
    if (status === "error") return errorMsg;
    return "使用豆包视觉模型分析图片";
  };

  const getIcon = () => {
    if (status === "loading") return <Loader2 className="w-4 h-4 animate-spin" />;
    if (status === "done") return <Check className="w-4 h-4" />;
    if (status === "error") return <AlertCircle className="w-4 h-4" />;
    return <Wand2 className="w-4 h-4" />;
  };

  const getButtonColor = () => {
    if (status === "done") return "success" as const;
    if (status === "error") return "danger" as const;
    return "primary" as const;
  };

  return (
    <div
      ref={refs.setFloating}
      style={{ ...floatingStyles, pointerEvents: "auto" }}
      onMouseEnter={onMouseEnterButton}
      onMouseLeave={onMouseLeaveButton}
      className="z-[2147483647]"
    >
      <Tooltip delay={0}>
        <TooltipTrigger>
          <Button
            isIconOnly
            size="sm"
            radius="full"
            color={getButtonColor()}
            onPress={handleClick}
            isLoading={status === "loading"}
          >
            {status !== "loading" && getIcon()}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{getTooltipContent()}</TooltipContent>
      </Tooltip>
    </div>
  );
}
