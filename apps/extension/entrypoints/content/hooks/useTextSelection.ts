import { useState, useEffect, useRef } from "react";
import type { TextSelection } from "../../../lib/types";

export function useTextSelection() {
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const lastMouseDownTarget = useRef<EventTarget | null>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      lastMouseDownTarget.current = e.target;
    }

    function onMouseUp(e: MouseEvent) {
      // 检查是否是点击了同一个元素（快速点击）
      const isQuickClick = lastMouseDownTarget.current === e.target;

      // 延迟一帧等 selection 更新
      setTimeout(() => {
        const sel = window.getSelection();
        const text = sel?.toString().trim() ?? "";

        // 更严格的触发条件
        if (
          !text ||
          text.length < 5 || // 最少5个字符
          isQuickClick || // 避免快速点击误触发
          sel?.rangeCount === 0 // 没有实际选区
        ) {
          setSelection(null);
          return;
        }

        // 检查选区是否真的有范围
        const range = sel?.getRangeAt(0);
        if (!range || range.collapsed) {
          setSelection(null);
          return;
        }

        // 记录鼠标松开时的坐标（用于工具栏定位）
        const newSelection: TextSelection = {
          text,
          x: e.clientX,
          y: e.clientY,
        };

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

    function onMouseDownOutside(e: MouseEvent) {
      // 点击工具栏外部时关闭
      const target = e.target as HTMLElement;
      if (selection && !target.closest('[data-image2prompt-toolbar]')) {
        setSelection(null);
      }
    }

    document.addEventListener("mousedown", onMouseDown, true);
    document.addEventListener("mouseup", onMouseUp, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("mousedown", onMouseDownOutside);

    return () => {
      document.removeEventListener("mousedown", onMouseDown, true);
      document.removeEventListener("mouseup", onMouseUp, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("mousedown", onMouseDownOutside);
    };
  }, [selection]);

  const clearSelection = () => {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  return { selection, clearSelection };
}
