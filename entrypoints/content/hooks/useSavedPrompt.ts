import { useState, useEffect, useCallback } from "react";
import type { SavedImagePrompt } from "../../../lib/types";

export function useSavedPrompt() {
  const [savedPrompt, setSavedPrompt] = useState<SavedImagePrompt | null>(null);

  // 初始加载
  useEffect(() => {
    browser.storage.local.get("savedPrompt").then((result) => {
      setSavedPrompt((result.savedPrompt as SavedImagePrompt) ?? null);
    });

    // 实时监听 storage 变化（跨 context 同步）
    const listener = (
      changes: Record<string, browser.storage.StorageChange>
    ) => {
      if ("savedPrompt" in changes) {
        setSavedPrompt(changes.savedPrompt.newValue ?? null);
      }
    };
    browser.storage.onChanged.addListener(listener);
    return () => browser.storage.onChanged.removeListener(listener);
  }, []);

  const savePrompt = useCallback(async (data: SavedImagePrompt) => {
    await browser.storage.local.set({ savedPrompt: data });
    // listener 会自动触发 setSavedPrompt
  }, []);

  const clearPrompt = useCallback(async () => {
    await browser.storage.local.remove("savedPrompt");
  }, []);

  return { savedPrompt, savePrompt, clearPrompt };
}
