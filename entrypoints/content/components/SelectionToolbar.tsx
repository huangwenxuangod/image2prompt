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
