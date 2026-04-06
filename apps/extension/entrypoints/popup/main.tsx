import "../../assets/style.css";
import React, { useEffect, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import * as Collapsible from "@radix-ui/react-collapsible";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  Download,
  Trash2,
  Link2,
  LogOut,
  ExternalLink,
} from "lucide-react";
import type {
  SavedImagePrompt,
  GenerationHistoryItem,
  ExtensionMessage,
  CurrentGeneration,
} from "../../lib/types";
import { isAuthenticated, clearAuthState, openConnectPage } from "../../lib/web-api";

const SpinStyle = () => (
  <style>{`
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `}</style>
);

function Popup() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [savedPrompt, setSavedPrompt] = useState<SavedImagePrompt | null>(null);
  const [history, setHistory] = useState<GenerationHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentGeneration, setCurrentGeneration] = useState<CurrentGeneration | null>(null);

  useEffect(() => {
    async function loadData() {
      const [authResult, promptResult, currentResult] = await Promise.all([
        isAuthenticated(),
        browser.storage.local.get("savedPrompt"),
        browser.storage.local.get("currentGeneration"),
      ]);
      setAuthenticated(authResult);
      if (promptResult.savedPrompt) setSavedPrompt(promptResult.savedPrompt as SavedImagePrompt);
      if (currentResult.currentGeneration) {
        setCurrentGeneration(currentResult.currentGeneration as CurrentGeneration);
      }
      setCheckingAuth(false);
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
      }
      if ("webAuthToken" in changes || "webUserId" in changes) {
        isAuthenticated().then(setAuthenticated);
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

  async function handleLogout() {
    await clearAuthState();
    setAuthenticated(false);
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

  if (checkingAuth) {
    return (
      <div className="w-[340px] h-[200px] flex items-center justify-center bg-white">
        <Loader2 className="w-6 h-6 text-zinc-400 animate-[spin_1s_linear_infinite]" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <>
        <SpinStyle />
        <div className="w-[340px] p-6 bg-white">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-zinc-900 rounded-xl flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-zinc-900 mb-2">Image2Prompt</h1>
            <p className="text-zinc-500 text-sm">连接 Web 端以开始使用</p>
          </div>

          <button
            onClick={openConnectPage}
            className="w-full py-3 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
          >
            <Link2 className="w-4 h-4" />
            连接 Web 端
          </button>

          <p className="text-xs text-zinc-400 text-center mt-4">
            点击上方按钮在新标签页中打开连接页面
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <SpinStyle />
      <div className="w-[340px] max-h-[600px] p-4 overflow-y-auto bg-white">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-white" />
            </div>
            AI Image Generator
          </h1>
          <button
            onClick={handleLogout}
            className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
            title="退出登录"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <p className="text-xs text-emerald-700 m-0">已连接 Web 端</p>
        </div>

        {(currentGeneration || savedPrompt) && (
          <div className="border border-zinc-200 rounded-xl p-4 mb-5 bg-white shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">✨</span>
              <span className="text-sm font-semibold text-zinc-900">当前生成</span>
              {currentGeneration && (
                <span className="ml-auto text-xs text-zinc-400">
                  {getStatusText(currentGeneration.status)}
                </span>
              )}
            </div>

            {(currentGeneration?.status === "fusing" || currentGeneration?.status === "generating") && (
              <div className="flex flex-col items-center gap-2 py-4">
                <Loader2 className="w-8 h-8 text-zinc-600 animate-[spin_1s_linear_infinite]" />
                <p className="text-sm text-zinc-600 m-0">
                  {currentGeneration.status === "fusing" ? "优化 prompt 中…" : "生成图片中…"}
                </p>
              </div>
            )}

            {currentGeneration?.status === "done" && currentGeneration.resultUrl && (
              <div className="mb-4">
                <img
                  src={currentGeneration.resultUrl}
                  alt="Generated"
                  className="w-full rounded-lg"
                />
              </div>
            )}

            {currentGeneration?.status === "error" && currentGeneration.error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 leading-relaxed m-0">
                  {currentGeneration.error}
                </p>
              </div>
            )}

            {currentGeneration?.status === "done" && (
              <div className="flex gap-2">
                <button
                  onClick={() => currentGeneration.resultUrl && handleDownload(currentGeneration.resultUrl)}
                  className="flex-1 py-2 border border-zinc-300 bg-white rounded-lg text-sm text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center justify-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  下载
                </button>
                <button
                  onClick={() => browser.storage.local.remove("currentGeneration")}
                  className="flex-1 py-2 border-none bg-zinc-900 text-white rounded-lg text-sm hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1"
                >
                  <X className="w-4 h-4" />
                  重置
                </button>
              </div>
            )}
          </div>
        )}

        <div className="border border-zinc-200 rounded-xl p-4 mb-5 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">🖼️</span>
              <span className="text-sm font-semibold text-zinc-900">最新图片描述</span>
            </div>
            {savedPrompt && (
              <button
                onClick={handleClearPrompt}
                className="px-2 py-1 border-none bg-red-50 text-red-500 rounded-md text-xs hover:bg-red-100 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                清除
              </button>
            )}
          </div>

          {savedPrompt ? (
            <div>
              {savedPrompt.styleAnalysis && (
                <div className="mb-4">
                  {savedPrompt.styleAnalysis.styleDNA && (
                    <div className="mb-3 p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                      <p className="text-xs font-medium text-zinc-600 mb-1 flex items-center gap-1">
                        <span>🎯</span>
                        风格 DNA
                      </p>
                      <p className="text-sm text-zinc-800 leading-relaxed m-0">
                        {savedPrompt.styleAnalysis.styleDNA}
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {savedPrompt.styleAnalysis.backgroundMaterial && (
                      <div>
                        <p className="text-xs text-zinc-400 mb-0.5">背景材质</p>
                        <p className="text-xs text-zinc-600 m-0">{savedPrompt.styleAnalysis.backgroundMaterial}</p>
                      </div>
                    )}
                    {savedPrompt.styleAnalysis.subjectStyle && (
                      <div>
                        <p className="text-xs text-zinc-400 mb-0.5">主体风格</p>
                        <p className="text-xs text-zinc-600 m-0">{savedPrompt.styleAnalysis.subjectStyle}</p>
                      </div>
                    )}
                    {savedPrompt.styleAnalysis.elementStyle && (
                      <div>
                        <p className="text-xs text-zinc-400 mb-0.5">元素风格</p>
                        <p className="text-xs text-zinc-600 m-0">{savedPrompt.styleAnalysis.elementStyle}</p>
                      </div>
                    )}
                    {savedPrompt.styleAnalysis.composition && (
                      <div>
                        <p className="text-xs text-zinc-400 mb-0.5">构图</p>
                        <p className="text-xs text-zinc-600 m-0">{savedPrompt.styleAnalysis.composition}</p>
                      </div>
                    )}
                    {savedPrompt.styleAnalysis.colorTreatment && (
                      <div>
                        <p className="text-xs text-zinc-400 mb-0.5">色彩</p>
                        <p className="text-xs text-zinc-600 m-0">{savedPrompt.styleAnalysis.colorTreatment}</p>
                      </div>
                    )}
                    {savedPrompt.styleAnalysis.vibeMood && (
                      <div>
                        <p className="text-xs text-zinc-400 mb-0.5">氛围</p>
                        <p className="text-xs text-zinc-600 m-0">{savedPrompt.styleAnalysis.vibeMood}</p>
                      </div>
                    )}
                    {savedPrompt.styleAnalysis.lighting && (
                      <div>
                        <p className="text-xs text-zinc-400 mb-0.5">光照</p>
                        <p className="text-xs text-zinc-600 m-0">{savedPrompt.styleAnalysis.lighting}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {!savedPrompt.styleAnalysis && (
                <p className="text-sm text-zinc-600 leading-relaxed mb-3">
                  {savedPrompt.prompt}
                </p>
              )}
              <div className="flex justify-between text-xs text-zinc-400">
                <span>
                  {savedPrompt.imageAlt ? `Alt: ${savedPrompt.imageAlt.slice(0, 30)}${savedPrompt.imageAlt.length > 30 ? "…" : ""}` : "无 Alt 文本"}
                </span>
                <span>{formatTime(savedPrompt.analyzedAt)}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-400 italic">
              在任意页面悬停图片并点击分析按钮，即可保存图片描述。
            </p>
          )}
        </div>

        <Collapsible.Root
          open={showHistory}
          onOpenChange={(open) => {
            setShowHistory(open);
            if (open) loadHistory();
          }}
        >
          <div className="border border-zinc-200 rounded-xl p-4 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-0">
              <span className="text-sm font-semibold text-zinc-900">生成历史</span>
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="px-2 py-1 border-none bg-red-50 text-red-500 rounded-md text-xs hover:bg-red-100 transition-colors"
                  >
                    清空
                  </button>
                )}
                <Collapsible.Trigger asChild>
                  <button
                    className="px-2 py-1 border-none bg-zinc-100 text-zinc-600 rounded-md text-xs hover:bg-zinc-200 transition-colors flex items-center gap-1"
                  >
                    {showHistory ? (
                      <>
                        <ChevronUp className="w-3 h-3" />
                        收起
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3" />
                        展开 ({history.length})
                      </>
                    )}
                  </button>
                </Collapsible.Trigger>
              </div>
            </div>

            <Collapsible.Content className="mt-3 overflow-hidden data-[state=closed]:animate-slideUp data-[state=open]:animate-slideDown">
              {history.length === 0 ? (
                <p className="text-sm text-zinc-400 italic py-2">
                  暂无生成历史。
                </p>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => (
                    <div key={item.id} className="border border-zinc-200 rounded-lg overflow-hidden">
                      <img
                        src={item.imageDataUrl}
                        alt="Generated"
                        className="w-full h-32 object-cover cursor-pointer"
                        onClick={() => handleDownload(item.imageDataUrl)}
                      />
                      <div className="p-2">
                        <p className="text-xs text-zinc-400 mb-1">
                          {item.size} · {formatTime(item.createdAt)}
                        </p>
                        <p className="text-xs text-zinc-600 leading-relaxed line-clamp-2">
                          {item.prompt}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Collapsible.Content>
          </div>
        </Collapsible.Root>
      </div>
    </>
  );
}

createRoot(document.getElementById("root")!).render(<Popup />);
