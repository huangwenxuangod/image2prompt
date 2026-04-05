import React, { useMemo } from "react";
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
} from "@floating-ui/react";
import { Button, Tooltip } from "@heroui/react";
import { Plus, X } from "lucide-react";
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
      className="z-[2147483647]"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-0 rounded-lg border border-default-200 bg-background shadow-md overflow-hidden">
        {/* 选中文字预览 */}
        <span className="max-w-[160px] truncate px-3 py-1.5 text-default-600 text-xs">
          {preview}
        </span>

        {/* 分隔线 */}
        <div className="h-5 w-px bg-default-200" />

        {/* 生成按钮 */}
        <Tooltip>
          <Tooltip.Trigger>
            <Button
              variant="light"
              color="primary"
              onPress={(e) => {
                e.stopPropagation();
                onGenerate();
              }}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content>生成图片</Tooltip.Content>
        </Tooltip>

        {/* 关闭按钮 */}
        <Tooltip>
          <Tooltip.Trigger>
            <Button
              variant="light"
              onPress={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content>关闭</Tooltip.Content>
        </Tooltip>
      </div>
    </div>
  );
}
