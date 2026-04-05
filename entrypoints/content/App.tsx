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
