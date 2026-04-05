import React, { useMemo, useEffect } from "react";
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
} from "@floating-ui/react";
import { Plus, X } from "lucide-react";
import type { TextSelection } from "../../../lib/types";

interface Props {
  selection: TextSelection;
  onGenerate: () => void;
  onDismiss: () => void;
}

export function SelectionToolbar({ selection, onGenerate, onDismiss }: Props) {
  console.log("🎨 SelectionToolbar rendering!", selection);

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

  return (
    <div
      ref={refs.setFloating}
      style={{ ...floatingStyles, pointerEvents: "auto" }}
      className="z-[2147483647]"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* 2026 极简工具栏：白色背景 + 细边框 + 微阴影 + 12px 圆角 */}
      <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white shadow-sm p-2">
        {/* 生成按钮 - 40x40px，透明背景，悬停变浅灰 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onGenerate();
          }}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          title="生成图片"
        >
          <Plus className="w-[18px] h-[18px]" />
        </button>

        {/* 分隔线 - 极细 */}
        <div className="w-px h-8 bg-gray-200" />

        {/* 关闭按钮 - 40x40px，透明背景，悬停变浅灰 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          title="关闭"
        >
          <X className="w-[18px] h-[18px]" />
        </button>
      </div>
    </div>
  );
}
