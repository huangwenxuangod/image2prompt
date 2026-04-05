import "../../assets/style.css";
import React, { useEffect, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import type { SavedImagePrompt, GenerationHistoryItem, ExtensionMessage } from "../../lib/types";

function Popup() {
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [savedPrompt, setSavedPrompt] = useState<SavedImagePrompt | null>(null);
  const [history, setHistory] = useState<GenerationHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    async function loadData() {
      const [apiResult, promptResult] = await Promise.all([
        browser.storage.local.get("dashscopeApiKey"),
        browser.storage.local.get("savedPrompt"),
      ]);
      if (apiResult.dashscopeApiKey) setApiKey(apiResult.dashscopeApiKey as string);
      if (promptResult.savedPrompt) setSavedPrompt(promptResult.savedPrompt as SavedImagePrompt);
    }
    loadData();

    const listener = (changes: Record<string, browser.storage.StorageChange>) => {
      if ("savedPrompt" in changes) {
        setSavedPrompt(changes.savedPrompt.newValue ?? null);
      }
      if ("generationHistory" in changes) {
        setHistory(changes.generationHistory.newValue ?? []);
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

  return (
    <div className="w-80 max-h-[600px] p-4 flex flex-col gap-3 overflow-y-auto">
      <h1 className="text-sm font-medium text-foreground">AI Image Generator</h1>

      {/* API Key Section */}
      <div className="flex flex-col gap-2">
        <p className="text-xs text-default-500">
          输入火山引擎 ARK API Key。仅保存在本地，仅发送至火山引擎 API。
        </p>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-..."
          className="w-full rounded-lg border border-default-200 bg-default-50 px-3 py-2
            text-sm text-foreground placeholder:text-default-400
            focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          onClick={handleSave}
          className="w-full rounded-lg bg-primary py-2 text-sm font-medium
            text-primary-foreground transition hover:bg-primary/90 active:scale-95"
        >
          {saved ? "已保存 ✓" : "保存 API Key"}
        </button>
      </div>

      {/* Saved Prompt Section */}
      <div className="border-t border-default-200 pt-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-medium text-default-700">最新图片描述</h2>
          {savedPrompt && (
            <button
              onClick={handleClearPrompt}
              className="text-[10px] text-default-400 hover:text-danger transition"
            >
              清除
            </button>
          )}
        </div>
        {savedPrompt ? (
          <div className="flex flex-col gap-2">
            <p className="rounded-lg bg-default-50 px-2.5 py-2 text-xs text-default-600 leading-relaxed">
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
      </div>

      {/* Generation History Section */}
      <div className="border-t border-default-200 pt-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-medium text-default-700">生成历史</h2>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="text-[10px] text-default-400 hover:text-danger transition"
              >
                清空
              </button>
            )}
            <button
              onClick={() => {
                setShowHistory(!showHistory);
                if (!showHistory) loadHistory();
              }}
              className="text-[10px] text-default-400 hover:text-primary transition"
            >
              {showHistory ? "收起" : `展开 (${history.length})`}
            </button>
          </div>
        </div>

        {showHistory && (
          <div className="flex flex-col gap-2">
            {history.length === 0 ? (
              <p className="text-xs text-default-400 italic">
                暂无生成历史。
              </p>
            ) : (
              history.map((item) => (
                <div key={item.id} className="rounded-lg border border-default-200 overflow-hidden">
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
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Popup />);
