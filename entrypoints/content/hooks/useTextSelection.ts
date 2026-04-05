import { useState, useEffect } from "react";
import type { TextSelection } from "../../../lib/types";

export function useTextSelection() {
  const [selection, setSelection] = useState<TextSelection | null>(null);

  useEffect(() => {
    function onMouseUp(e: MouseEvent) {
      console.log("🖱️ mouseup event!", { clientX: e.clientX, clientY: e.clientY });
      // 延迟一帧等 selection 更新
      setTimeout(() => {
        const sel = window.getSelection();
        const text = sel?.toString().trim() ?? "";
        console.log("📝 Selected text:", { text, length: text.length });
        if (!text || text.length < 3) {
          setSelection(null);
          return;
        }
        // 记录鼠标松开时的坐标（用于工具栏定位）
        // 每次都创建新对象，确保即使同一文本也会重新触发
        const newSelection: TextSelection = {
          text,
          x: e.clientX,
          y: e.clientY,
        };
        console.log("✅ Setting selection:", newSelection);
        // 先设为 null 再设新值，强制 re-render
        setSelection(null);
        setTimeout(() => {
          setSelection(newSelection);
        }, 0);
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
