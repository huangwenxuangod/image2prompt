import React, { useMemo, useState } from "react";
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
} from "@floating-ui/react";
import { Plus, X, ChevronDown } from "lucide-react";
import type { TextSelection, ImageSize } from "../../../lib/types";
import { IMAGE_SIZE_OPTIONS } from "../../../lib/types";

interface Props {
  selection: TextSelection;
  onGenerate: (size: ImageSize) => void;
  onDismiss: () => void;
}

export function SelectionToolbar({ selection, onGenerate, onDismiss }: Props) {
  console.log("🎨 SelectionToolbar rendering!", selection);

  const [selectedSize, setSelectedSize] = useState<ImageSize>("1600x640");
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);

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

  const selectedSizeLabel = IMAGE_SIZE_OPTIONS.find((opt) => opt.id === selectedSize)?.label || "尺寸";

  return (
    <div
      ref={refs.setFloating}
      style={{ ...floatingStyles, pointerEvents: "auto" }}
      className="z-[2147483647]"
      data-image2prompt-toolbar="true"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* 2026 极简工具栏：白色背景 + 细边框 + 微阴影 + 15px 圆角，更扁平 */}
      <div className="flex items-center gap-1 rounded-[15px] border border-gray-200 bg-white shadow-sm p-1.5 relative">
        {/* 尺寸选择下拉 */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowSizeDropdown(!showSizeDropdown);
            }}
            className="flex items-center gap-1 h-7 px-3 rounded-[12px] text-gray-700 hover:bg-gray-100 transition-colors text-xs font-medium"
          >
            {selectedSizeLabel}
            <ChevronDown className="w-3 h-3" />
          </button>

          {/* 下拉菜单 - 向下展开 */}
          {showSizeDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-[12px] shadow-lg overflow-hidden">
              {IMAGE_SIZE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSize(option.id);
                    setShowSizeDropdown(false);
                  }}
                  className={`block w-full text-left px-3 py-2 text-xs hover:bg-gray-100 transition-colors first:rounded-t-[11px] last:rounded-b-[11px] ${
                    selectedSize === option.id ? "bg-blue-50 text-blue-600" : "text-gray-700"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 分隔线 - 极细 */}
        <div className="w-px h-5 bg-gray-200" />

        {/* 生成按钮 - 28x28px，透明背景，悬停变浅灰 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onGenerate(selectedSize);
          }}
          className="w-7 h-7 flex items-center justify-center rounded-[12px] text-gray-700 hover:bg-gray-100 transition-colors"
          title="生成图片"
        >
          <Plus className="w-[15px] h-[15px]" />
        </button>

        {/* 分隔线 - 极细 */}
        <div className="w-px h-5 bg-gray-200" />

        {/* 关闭按钮 - 28x28px，透明背景，悬停变浅灰 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="w-7 h-7 flex items-center justify-center rounded-[12px] text-gray-700 hover:bg-gray-100 transition-colors"
          title="关闭"
        >
          <X className="w-[15px] h-[15px]" />
        </button>
      </div>
    </div>
  );
}
