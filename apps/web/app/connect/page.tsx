"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { Button } from "@heroui/react";
import { CheckCircle2, Loader2, ExternalLink, Copy, Check } from "lucide-react";

export default function ConnectPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const [status, setStatus] = useState<"loading" | "ready" | "sent" | "error" | "copied">("loading");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      getToken().then((t) => {
        setToken(t);
        setStatus("ready");
      });
    } else if (isLoaded && !isSignedIn) {
      setStatus("error");
    }
  }, [isLoaded, isSignedIn, getToken]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "image2prompt:auth:success") {
        setStatus("sent");
        setTimeout(() => window.close(), 1500);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const sendTokenToExtension = async () => {
    if (!token || !user?.id) return;

    try {
      if (window.opener) {
        window.opener.postMessage(
          {
            type: "image2prompt:auth",
            token,
            userId: user.id,
          },
          "*"
        );
        setStatus("sent");
        setTimeout(() => window.close(), 2000);
      } else {
        setStatus("error");
      }
    } catch (e) {
      setStatus("error");
    }
  };

  const copyToken = async () => {
    if (!token || !user?.id) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify({ token, userId: user.id }));
      setStatus("copied");
      setTimeout(() => setStatus("ready"), 2000);
    } catch (e) {
      console.error("Copy failed:", e);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-zinc-200 p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-zinc-900 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-zinc-900 mb-2">连接浏览器插件</h1>
          <p className="text-zinc-500">
            {isSignedIn
              ? `已登录为 ${user?.primaryEmailAddress?.emailAddress || "用户"}`
              : "请先登录"}
          </p>
        </div>

        <div className="space-y-4">
          {status === "loading" && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
              <span className="ml-3 text-zinc-500">加载中...</span>
            </div>
          )}

          {status === "ready" && (
            <div className="space-y-3">
              <Button
                color="primary"
                size="lg"
                className="w-full bg-zinc-900 text-white hover:bg-zinc-800"
                onPress={sendTokenToExtension}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                连接插件
              </Button>
              <Button
                variant="bordered"
                size="lg"
                className="w-full"
                onPress={copyToken}
              >
                <Copy className="w-4 h-4 mr-2" />
                复制凭证（备用）
              </Button>
              {!window.opener && (
                <p className="text-xs text-amber-600 text-center">
                  提示：直接从插件点击「连接 Web 端」可自动完成连接
                </p>
              )}
            </div>
          )}

          {status === "copied" && (
            <div className="flex items-center justify-center py-4 text-emerald-600">
              <Check className="w-5 h-5 mr-2" />
              <span>已复制到剪贴板！</span>
            </div>
          )}

          {status === "sent" && (
            <div className="flex items-center justify-center py-4 text-emerald-600">
              <CheckCircle2 className="w-5 h-5 mr-2" />
              <span>连接成功！正在关闭...</span>
            </div>
          )}

          {status === "error" && (
            <div className="text-center py-4">
              <p className="text-red-600 mb-4">
                {isSignedIn
                  ? "无法连接到插件，请确保从插件打开此页面"
                  : "请先登录后再连接插件"}
              </p>
              {!isSignedIn && (
                <Button
                  color="primary"
                  size="lg"
                  className="w-full bg-zinc-900 text-white hover:bg-zinc-800"
                  onPress={() => (window.location.href = "/")}
                >
                  前往登录
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
