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
