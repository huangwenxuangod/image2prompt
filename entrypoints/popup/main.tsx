import "../../assets/style.css";
import React, { useEffect, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import {
  Button,
  Input,
  Card,
  Tooltip,
  Select,
  ListBox,
  TextArea,
} from "@heroui/react";
import {
  Trash2,
  ChevronDown,
  ChevronUp,
  Save,
  Check,
  Image as ImageIcon,
  Download,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import type {
  SavedImagePrompt,
  GenerationHistoryItem,
  ExtensionMessage,
  CurrentGeneration,
  ImageSize,
  IMAGE_SIZE_OPTIONS,
} from "../../lib/types";

function Popup() {
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [savedPrompt, setSavedPrompt] = useState<SavedImagePrompt | null>(null);
  const [history, setHistory] = useState<GenerationHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentGeneration, setCurrentGeneration] = useState<CurrentGeneration | null>(null);
  const [selectedSize, setSelectedSize] = useState<ImageSize>("1024x1024");
  const [editablePrompt, setEditablePrompt] = useState("");

  // 加载数据
  useEffect(() => {
    async function loadData() {
      const [apiResult, promptResult, currentResult] = await Promise.all([
        browser.storage.local.get("dashscopeApiKey"),
        browser.storage.local.get("savedPrompt"),
        browser.storage.local.get("currentGeneration"),
      ]);
      if (apiResult.dashscopeApiKey) setApiKey(apiResult.dashscopeApiKey as string);
      if (promptResult.savedPrompt) setSavedPrompt(promptResult.savedPrompt as SavedImagePrompt);
      if (currentResult.currentGeneration) {
        setCurrentGeneration(currentResult.currentGeneration as CurrentGeneration);
        if (currentResult.currentGeneration.request) {
          setEditablePrompt(currentResult.currentGeneration.request.mergedPrompt);
          setSelectedSize(currentResult.currentGeneration.request.size);
        }
      }
    }
    loadData();

    const listener = (changes: Record<string, browser.storage.StorageChange>) => {
      if ("savedPrompt" in changes) {
        setSavedPrompt(changes.savedPrompt.newValue ?? null);
      }
      if ("generationHistory" in changes) {
        setHistory(changes.generationHistory.newValue ?? []);
      }
      if ("currentGeneration" in changes) {
        setCurrentGeneration(changes.currentGeneration.newValue ?? null);
        if (changes.currentGeneration.newValue?.request) {
          setEditablePrompt(changes.currentGeneration.newValue.request.mergedPrompt);
          setSelectedSize(changes.currentGeneration.newValue.request.size);
        }
      }
    };
    browser.storage.onChanged.addListener(listener);
    return () => browser.storage.onChanged.removeListener(listener);
  }, []);

  const loadHistory = useCallback(async () => {
    const response = (await browser.runtime.sendMessage({
      type: "GET_GENERATION_HISTORY",
    } satisfies ExtensionMessage)) as ExtensionMessage;
    if (response.type === "GET_GENERATION_HISTORY_RESULT") {
      setHistory(response.history);
    }
  }, []);

  async function handleSave() {
    await browser.storage.local.set({ dashscopeApiKey: apiKey });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleClearPrompt() {
    await browser.storage.local.remove("savedPrompt");
  }

  async function handleClearHistory() {
    if (!confirm("确定要清空所有生成历史吗？")) return;
    const response = (await browser.runtime.sendMessage({
      type: "CLEAR_GENERATION_HISTORY",
    } satisfies ExtensionMessage)) as ExtensionMessage;
    if (response.type === "CLEAR_GENERATION_HISTORY_RESULT") {
      setHistory([]);
    }
  }

  function handleDownload(dataUrl: string) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `generated-${Date.now()}.png`;
    a.click();
  }

  function formatTime(timestamp: number) {
    return new Date(timestamp).toLocaleString("zh-CN");
  }

  function getStatusText(status: string) {
    switch (status) {
      case "fusing":
        return "优化 Prompt 中…";
      case "generating":
        return "生成图片中…";
      case "done":
        return "生成完成";
      case "error":
        return "生成失败";
      default:
        return "等待生成";
    }
  }

  return (
    <div className="w-80 max-h-[600px] p-4 flex flex-col gap-4 overflow-y-auto">
      <h1 className="text-sm font-medium text-foreground">AI Image Generator</h1>

      {/* API Key Section */}
      <Card className="shadow-sm">
        <Card.Header className="pb-2">
          <p className="text-xs text-default-500">
            输入火山引擎 ARK API Key。仅保存在本地，仅发送至火山引擎 API。
          </p>
        </Card.Header>
        <Card.Content className="pt-0 flex flex-col gap-3">
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
          />
          <Button
            variant="solid"
            fullWidth
            onPress={handleSave}
          >
            {saved ? (
              <>
                <Check className="w-4 h-4 mr-1" />
                已保存
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1" />
                保存 API Key
              </>
            )}
          </Button>
        </Card.Content>
      </Card>

      {/* Current Generation Section */}
      {(currentGeneration || savedPrompt) && (
        <Card className="shadow-sm">
          <Card.Header className="pb-2 flex flex-row items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-xs font-medium text-default-700">当前生成</h2>
            {currentGeneration && (
              <span className="text-[10px] text-default-400 ml-auto">
                {getStatusText(currentGeneration.status)}
              </span>
            )}
          </Card.Header>
          <Card.Content className="pt-0 flex flex-col gap-3">
            {/* Prompt 编辑区 */}
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-default-400">
                Prompt
              </p>
              <TextArea
                value={editablePrompt}
                onChange={(e) => setEditablePrompt(e.target.value)}
                placeholder="在此输入或编辑 prompt..."
                rows={3}
                isDisabled={currentGeneration?.status === "fusing" || currentGeneration?.status === "generating"}
              />
            </div>

            {/* 尺寸选择 */}
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-default-400">
                图片尺寸
              </p>
              <Select
                selectedKey={selectedSize}
                onSelectionChange={(key) => setSelectedSize(key as ImageSize)}
                isDisabled={currentGeneration?.status === "fusing" || currentGeneration?.status === "generating"}
              >
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {IMAGE_SIZE_OPTIONS.map((option) => (
                      <ListBox.Item key={option.id}>{option.label}</ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            {/* 进度条（生成中） */}
            {(currentGeneration?.status === "fusing" || currentGeneration?.status === "generating") && (
              <div className="flex flex-col gap-1">
                <div className="h-1 w-full overflow-hidden rounded-full bg-default-100">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-200"
                    style={{ width: `${Math.min(Math.round(currentGeneration.progress), 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* 错误信息 */}
            {currentGeneration?.status === "error" && currentGeneration.error && (
              <p className="text-xs text-danger-600 bg-danger-50 rounded-lg px-2 py-1.5">
                {currentGeneration.error}
              </p>
            )}

            {/* 结果图片 */}
            {currentGeneration?.status === "done" && currentGeneration.resultUrl && (
              <div className="overflow-hidden rounded-lg border border-default-200">
                <img
                  src={currentGeneration.resultUrl}
                  alt="Generated"
                  className="w-full object-cover"
                />
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-2">
              {currentGeneration?.status === "done" ? (
                <>
                  <Tooltip>
                    <Tooltip.Trigger>
                      <Button
                        variant="bordered"
                        fullWidth
                        onPress={() => currentGeneration.resultUrl && handleDownload(currentGeneration.resultUrl)}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        下载
                      </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content>下载图片</Tooltip.Content>
                  </Tooltip>
                  <Tooltip>
                    <Tooltip.Trigger>
                      <Button
                        variant="solid"
                        fullWidth
                        onPress={() => {
                          // 清空当前生成状态，等待下一次
                          browser.storage.local.remove("currentGeneration");
                        }}
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        重置
                      </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content>重置，等待下一次生成</Tooltip.Content>
                  </Tooltip>
                </>
              ) : null}
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Saved Prompt Section */}
      <Card className="shadow-sm">
        <Card.Header className="pb-2 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-default-500" />
            <h2 className="text-xs font-medium text-default-700">最新图片描述</h2>
          </div>
          {savedPrompt && (
            <Tooltip>
              <Tooltip.Trigger>
                <Button
                  isIconOnly
                  variant="light"
                  color="danger"
                  onPress={handleClearPrompt}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content>清除</Tooltip.Content>
            </Tooltip>
          )}
        </Card.Header>
        <Card.Content className="pt-0">
          {savedPrompt ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-default-600 leading-relaxed">
                {savedPrompt.prompt}
              </p>
              <div className="flex items-center justify-between text-[10px] text-default-400">
                <span>
                  {savedPrompt.imageAlt ? `Alt: ${savedPrompt.imageAlt.slice(0, 30)}${savedPrompt.imageAlt.length > 30 ? "…" : ""}` : "无 Alt 文本"}
                </span>
                <span>{formatTime(savedPrompt.analyzedAt)}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-default-400 italic">
              在任意页面悬停图片并点击分析按钮，即可保存图片描述。
            </p>
          )}
        </Card.Content>
      </Card>

      {/* Generation History Section */}
      <Card className="shadow-sm">
        <Card.Header className="pb-2 flex flex-row items-center justify-between">
          <h2 className="text-xs font-medium text-default-700">生成历史</h2>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <Tooltip>
                <Tooltip.Trigger>
                  <Button
                    isIconOnly
                    variant="light"
                    color="danger"
                    onPress={handleClearHistory}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>清空</Tooltip.Content>
              </Tooltip>
            )}
            <Tooltip>
              <Tooltip.Trigger>
                <Button
                  isIconOnly
                  variant="light"
                  onPress={() => {
                    setShowHistory(!showHistory);
                    if (!showHistory) loadHistory();
                  }}
                >
                  {showHistory ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content>
                {showHistory ? "收起" : `展开 (${history.length})`}
              </Tooltip.Content>
            </Tooltip>
          </div>
        </Card.Header>
        {showHistory && (
          <Card.Content className="pt-0">
            <div className="flex flex-col gap-3">
              {history.length === 0 ? (
                <p className="text-xs text-default-400 italic">
                  暂无生成历史。
                </p>
              ) : (
                history.map((item) => (
                  <Card key={item.id} className="shadow-sm overflow-hidden">
                    <Card.Content className="p-0">
                      <img
                        src={item.imageDataUrl}
                        alt="Generated"
                        className="w-full h-32 object-cover cursor-pointer hover:opacity-90 transition"
                        onClick={() => handleDownload(item.imageDataUrl)}
                      />
                      <div className="p-2 flex flex-col gap-1">
                        <p className="text-[10px] text-default-400">
                          {item.size} · {formatTime(item.createdAt)}
                        </p>
                        <p className="text-xs text-default-600 line-clamp-2 leading-relaxed">
                          {item.prompt}
                        </p>
                      </div>
                    </Card.Content>
                  </Card>
                ))
              )}
            </div>
          </Card.Content>
        )}
      </Card>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Popup />);
