import React, { useState, useEffect } from "react";
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
} from "@floating-ui/react";
import type { SavedImagePrompt, GenerationRequest, ExtensionMessage, ImageSize } from "../../../lib/types";
import { IMAGE_SIZE_OPTIONS } from "../../../lib/types";

interface Props {
  selection: { text: string; x: number; y: number };
  savedPrompt: SavedImagePrompt | null;
  onClose: () => void;
}

type GenStatus = "idle" | "fusing" | "generating" | "done" | "error";

export function GenerationPanel({ selection, savedPrompt, onClose }: Props) {
  const [status, setStatus] = useState<GenStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedSize, setSelectedSize] = useState<ImageSize>("1024x1024");
  const [editablePrompt, setEditablePrompt] = useState("");

  // 初始合并 prompt
  const rawMergedPrompt = [savedPrompt?.prompt, selection.text]
    .filter(Boolean)
    .join("\n\n");

  // 当 rawMergedPrompt 变化时，更新 editablePrompt
  useEffect(() => {
    setEditablePrompt(rawMergedPrompt);
  }, [rawMergedPrompt]);

  // 面板锚定在工具栏正下方（同一个虚拟坐标，但 placement="bottom-start"）
  const virtualRef = {
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
  };

  const { refs, floatingStyles } = useFloating({
    elements: { reference: virtualRef },
    strategy: "fixed",
    placement: "bottom-start",
    middleware: [
      offset({ mainAxis: 44 }), // 工具栏高度约 36px + 8px 间距
      flip({ fallbackPlacements: ["top-start"] }),
      shift({ padding: 12 }),
    ],
    whileElementsMounted: autoUpdate,
  });

  async function handleGenerate() {
    setStatus("fusing");
    setProgress(10);
    setResultUrl(null);
    setErrorMsg("");

    try {
      // 第一步：fuse prompt
      setStatus("fusing");
      setProgress(30);

      // 先发送消息给 background 进行完整的生成流程
      const request: GenerationRequest = {
        imagePrompt: savedPrompt?.prompt ?? null,
        textContext: selection.text,
        mergedPrompt: rawMergedPrompt,
        finalPrompt: editablePrompt, // 使用用户编辑后的 prompt
        size: selectedSize,
      };

      setStatus("generating");
      setProgress(60);

      const response = (await browser.runtime.sendMessage({
        type: "GENERATE_IMAGE",
        request,
      } satisfies ExtensionMessage)) as ExtensionMessage;

      setProgress(100);

      if (response.type === "GENERATE_IMAGE_RESULT") {
        setResultUrl(response.dataUrl);
        setStatus("done");
      } else if (response.type === "GENERATE_IMAGE_ERROR") {
        throw new Error(response.error);
      }
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  }

  function handleDownload() {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `generated-${Date.now()}.png`;
    a.click();
  }

  return (
    <div
      ref={refs.setFloating}
      style={{ ...floatingStyles, pointerEvents: "auto" }}
      className="z-[2147483647] w-96 rounded-xl border border-default-200
        bg-background shadow-xl overflow-hidden"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-default-100 px-3 py-2">
        <span className="text-xs font-medium text-default-700">合并生成图片</span>
        <button
          onClick={onClose}
          className="rounded-md p-0.5 text-default-400 hover:bg-default-100
            hover:text-default-600 transition"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 4l8 8M12 4l-8 8"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className="p-3 flex flex-col gap-2.5">
        {/* 图片 prompt 来源 */}
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-default-400">
            图片描述
          </p>
          <p className="rounded-lg bg-default-50 px-2.5 py-1.5 text-xs text-default-600 leading-relaxed">
            {savedPrompt?.prompt ?? (
              <span className="text-default-400 italic">未分析图片，仅使用文字选段</span>
            )}
          </p>
        </div>

        {/* 文字选段 */}
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-default-400">
            文字选段
          </p>
          <p className="rounded-lg bg-default-50 px-2.5 py-1.5 text-xs text-default-700 leading-relaxed">
            {selection.text.length > 120
              ? selection.text.slice(0, 120) + "…"
              : selection.text}
          </p>
        </div>

        {/* 合并 prompt（可编辑）*/}
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-default-400">
            最终 Prompt（可编辑）
          </p>
          <textarea
            value={editablePrompt}
            onChange={(e) => setEditablePrompt(e.target.value)}
            className="w-full rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1.5
              text-xs text-default-800 leading-relaxed min-h-[80px] resize-y
              focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="在此编辑最终发送给图像生成模型的 prompt..."
          />
        </div>

        {/* 尺寸选择 */}
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-default-400">
            图片尺寸
          </p>
          <select
            value={selectedSize}
            onChange={(e) => setSelectedSize(e.target.value as ImageSize)}
            className="w-full rounded-lg border border-default-200 bg-default-50 px-2.5 py-1.5
              text-xs text-default-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {IMAGE_SIZE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} ({option.width}×{option.height})
              </option>
            ))}
          </select>
        </div>

        {/* 进度条（生成中显示）*/}
        {(status === "fusing" || status === "generating") && (
          <div className="flex flex-col gap-1">
            <div className="h-1 w-full overflow-hidden rounded-full bg-default-100">
              <div
                className="h-full rounded-full bg-primary transition-all duration-200"
                style={{ width: `${Math.min(Math.round(progress), 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-default-400">
              {status === "fusing" ? "优化 prompt 中…" : "生成图片中…"}
            </p>
          </div>
        )}

        {/* 错误 */}
        {status === "error" && (
          <p className="rounded-lg bg-danger-50 px-2.5 py-1.5 text-xs text-danger-600">
            {errorMsg}
          </p>
        )}

        {/* 生成结果图片 */}
        {status === "done" && resultUrl && (
          <div className="overflow-hidden rounded-lg border border-default-100">
            <img
              src={resultUrl}
              alt="Generated"
              className="w-full object-cover"
            />
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-2">
          {status === "done" ? (
            <>
              <button
                onClick={handleDownload}
                className="flex-1 rounded-lg border border-default-200 py-1.5 text-xs
                  font-medium text-default-700 transition hover:bg-default-50
                  active:scale-95"
              >
                下载图片
              </button>
              <button
                onClick={handleGenerate}
                className="flex-1 rounded-lg bg-primary py-1.5 text-xs font-medium
                  text-primary-foreground transition hover:bg-primary/90 active:scale-95"
              >
                重新生成
              </button>
            </>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={status === "fusing" || status === "generating"}
              className="w-full rounded-lg bg-primary py-1.5 text-xs font-medium
                text-primary-foreground transition hover:bg-primary/90 active:scale-95
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "fusing"
                ? "优化中…"
                : status === "generating"
                ? "生成中…"
                : "生成图片"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
