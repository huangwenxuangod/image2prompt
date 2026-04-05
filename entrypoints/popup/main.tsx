import "../../assets/style.css";
import React, { useEffect, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import type {
  SavedImagePrompt,
  GenerationHistoryItem,
  ExtensionMessage,
  CurrentGeneration,
} from "../../lib/types";

function Popup() {
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [savedPrompt, setSavedPrompt] = useState<SavedImagePrompt | null>(null);
  const [history, setHistory] = useState<GenerationHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentGeneration, setCurrentGeneration] = useState<CurrentGeneration | null>(null);

  console.log("🚀 Popup rendering!");

  // 加载数据
  useEffect(() => {
    async function loadData() {
      console.log("📦 Loading data from storage...");
      const [apiResult, promptResult, currentResult] = await Promise.all([
        browser.storage.local.get("volcArkApiKey"),
        browser.storage.local.get("savedPrompt"),
        browser.storage.local.get("currentGeneration"),
      ]);
      console.log("📦 Data loaded:", { apiResult, promptResult, currentResult });
      if (apiResult.volcArkApiKey) setApiKey(apiResult.volcArkApiKey as string);
      if (promptResult.savedPrompt) setSavedPrompt(promptResult.savedPrompt as SavedImagePrompt);
      if (currentResult.currentGeneration) {
        setCurrentGeneration(currentResult.currentGeneration as CurrentGeneration);
      }
    }
    loadData();

    const listener = (changes: Record<string, browser.storage.StorageChange>) => {
      console.log("📦 Storage changed:", changes);
      if ("savedPrompt" in changes) {
        setSavedPrompt(changes.savedPrompt.newValue ?? null);
      }
      if ("generationHistory" in changes) {
        setHistory(changes.generationHistory.newValue ?? []);
      }
      if ("currentGeneration" in changes) {
        setCurrentGeneration(changes.currentGeneration.newValue ?? null);
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
    await browser.storage.local.set({ volcArkApiKey: apiKey });
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
    <div style={{ width: "320px", maxHeight: "600px", padding: "16px", overflowY: "auto" }}>
      <h1 style={{ fontSize: "14px", fontWeight: 500, marginBottom: "16px" }}>AI Image Generator</h1>

      {/* API Key Section */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px", marginBottom: "16px" }}>
        <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "12px" }}>
          输入火山引擎 ARK API Key。仅保存在本地，仅发送至火山引擎 API。
        </p>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="api-key-..."
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            marginBottom: "12px",
            fontSize: "14px",
          }}
        />
        <button
          onClick={handleSave}
          style={{
            width: "100%",
            padding: "8px 16px",
            backgroundColor: saved ? "#10b981" : "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          {saved ? "✓ 已保存" : "保存 API Key"}
        </button>
      </div>

      {/* Current Generation Section */}
      {(currentGeneration || savedPrompt) && (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <span>✨</span>
            <span style={{ fontSize: "12px", fontWeight: 500 }}>当前生成</span>
            {currentGeneration && (
              <span style={{ fontSize: "10px", color: "#9ca3af", marginLeft: "auto" }}>
                {getStatusText(currentGeneration.status)}
              </span>
            )}
          </div>

          {/* 结果图片 */}
          {currentGeneration?.status === "done" && currentGeneration.resultUrl && (
            <div style={{ marginBottom: "12px" }}>
              <img
                src={currentGeneration.resultUrl}
                alt="Generated"
                style={{ width: "100%", borderRadius: "8px" }}
              />
            </div>
          )}

          {/* 错误信息 */}
          {currentGeneration?.status === "error" && currentGeneration.error && (
            <p style={{ fontSize: "12px", color: "#ef4444", backgroundColor: "#fef2f2", padding: "8px", borderRadius: "6px", marginBottom: "12px" }}>
              {currentGeneration.error}
            </p>
          )}

          {/* 操作按钮 */}
          {currentGeneration?.status === "done" && (
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => currentGeneration.resultUrl && handleDownload(currentGeneration.resultUrl)}
                style={{
                  flex: 1,
                  padding: "8px",
                  border: "1px solid #d1d5db",
                  backgroundColor: "white",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                下载
              </button>
              <button
                onClick={() => browser.storage.local.remove("currentGeneration")}
                style={{
                  flex: 1,
                  padding: "8px",
                  border: "none",
                  backgroundColor: "#3b82f6",
                  color: "white",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                重置
              </button>
            </div>
          )}
        </div>
      )}

      {/* Saved Prompt Section */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span>🖼️</span>
            <span style={{ fontSize: "12px", fontWeight: 500 }}>最新图片描述</span>
          </div>
          {savedPrompt && (
            <button
              onClick={handleClearPrompt}
              style={{
                padding: "4px 8px",
                border: "none",
                backgroundColor: "#fee2e2",
                color: "#ef4444",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              清除
            </button>
          )}
        </div>

        {savedPrompt ? (
          <div>
            <p style={{ fontSize: "12px", color: "#4b5563", lineHeight: 1.5, marginBottom: "8px" }}>
              {savedPrompt.prompt}
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#9ca3af" }}>
              <span>
                {savedPrompt.imageAlt ? `Alt: ${savedPrompt.imageAlt.slice(0, 30)}${savedPrompt.imageAlt.length > 30 ? "…" : ""}` : "无 Alt 文本"}
              </span>
              <span>{formatTime(savedPrompt.analyzedAt)}</span>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: "12px", color: "#9ca3af", fontStyle: "italic" }}>
            在任意页面悬停图片并点击分析按钮，即可保存图片描述。
          </p>
        )}
      </div>

      {/* Generation History Section */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <span style={{ fontSize: "12px", fontWeight: 500 }}>生成历史</span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {history.length > 0 && (
              <button
                onClick={handleClearHistory}
                style={{
                  padding: "4px 8px",
                  border: "none",
                  backgroundColor: "#fee2e2",
                  color: "#ef4444",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                清空
              </button>
            )}
            <button
              onClick={() => {
                setShowHistory(!showHistory);
                if (!showHistory) loadHistory();
              }}
              style={{
                padding: "4px 8px",
                border: "none",
                backgroundColor: "#eff6ff",
                color: "#3b82f6",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              {showHistory ? "收起" : `展开 (${history.length})`}
            </button>
          </div>
        </div>

        {showHistory && (
          <div>
            {history.length === 0 ? (
              <p style={{ fontSize: "12px", color: "#9ca3af", fontStyle: "italic" }}>
                暂无生成历史。
              </p>
            ) : (
              history.map((item) => (
                <div key={item.id} style={{ border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden", marginBottom: "12px" }}>
                  <img
                    src={item.imageDataUrl}
                    alt="Generated"
                    style={{ width: "100%", height: "128px", objectFit: "cover", cursor: "pointer" }}
                    onClick={() => handleDownload(item.imageDataUrl)}
                  />
                  <div style={{ padding: "8px" }}>
                    <p style={{ fontSize: "10px", color: "#9ca3af", margin: 0, marginBottom: "4px" }}>
                      {item.size} · {formatTime(item.createdAt)}
                    </p>
                    <p style={{ fontSize: "12px", color: "#4b5563", margin: 0, lineHeight: 1.4 }}>
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
