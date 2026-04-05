import React, { useState, useCallback, useEffect, useRef } from "react";
import { useImageHover } from "./hooks/useImageHover";
import { useTextSelection } from "./hooks/useTextSelection";
import { useSavedPrompt } from "./hooks/useSavedPrompt";
import { ImageAnalyzeButton } from "./components/ImageAnalyzeButton";
import { SelectionToolbar } from "./components/SelectionToolbar";
import type { SavedImagePrompt, ExtensionMessage, ImageSize } from "../../lib/types";

export default function App() {
  // 防止图片图标悬停时触发 hover 消失
  const buttonHovered = useRef(false);

  const hoveredImage = useImageHover(buttonHovered);
  const { selection, clearSelection } = useTextSelection();
  const { savedPrompt, savePrompt } = useSavedPrompt();

  // 已分析过的图片 src（用于显示绿色勾，session 内有效）
  const [analyzedImages, setAnalyzedImages] = useState<Set<string>>(new Set());

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

  const handleGenerate = useCallback(async () => {
    if (!selection) return;

    // 发送消息给 background 开始生成
    const defaultSize: ImageSize = "1024x1024";

    await browser.runtime.sendMessage({
      type: "START_GENERATION",
      request: {
        imagePrompt: savedPrompt?.prompt ?? null,
        textContext: selection.text,
        size: defaultSize,
      },
    } satisfies ExtensionMessage);

    // 关闭工具栏
    clearSelection();
  }, [selection, savedPrompt, clearSelection]);

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

      {/* 链路 B：划词工具栏（简洁版，只一行） */}
      {selection && (
        <SelectionToolbar
          selection={selection}
          onGenerate={handleGenerate}
          onDismiss={() => {
            clearSelection();
          }}
        />
      )}
    </>
  );
}
