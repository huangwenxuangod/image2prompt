import { analyzeImageWithVision, fusePrompt, generateImage, saveToHistory, generateId } from "../lib/api";
import type {
  ExtensionMessage,
  SavedImagePrompt,
  GenerationHistoryItem,
  CurrentGeneration,
  GenerationRequest,
} from "../lib/types";

// 更新当前生成状态到 storage
async function updateCurrentGeneration(current: CurrentGeneration | null): Promise<void> {
  if (current) {
    await browser.storage.local.set({ currentGeneration: current });
  } else {
    await browser.storage.local.remove("currentGeneration");
  }
}

// 获取当前生成状态
async function getCurrentGeneration(): Promise<CurrentGeneration | null> {
  const result = await browser.storage.local.get("currentGeneration");
  return (result.currentGeneration as CurrentGeneration) ?? null;
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(
    (
      message: ExtensionMessage,
      _sender: browser.runtime.MessageSender,
      sendResponse: (response: ExtensionMessage) => void
    ) => {
      // --- 图片分析 ---
      if (message.type === "ANALYZE_IMAGE") {
        analyzeImageWithVision(message.imageUrl, message.imageAlt)
          .then((prompt) => sendResponse({ type: "ANALYZE_IMAGE_RESULT", prompt }))
          .catch((err) =>
            sendResponse({ type: "ANALYZE_IMAGE_ERROR", error: String(err) })
          );
        return true;
      }

      // --- 开始生成（从 Content Script 触发）---
      if (message.type === "START_GENERATION") {
        (async () => {
          try {
            // 1. 读取 savedPrompt
            const savedPromptResult = await browser.storage.local.get("savedPrompt");
            const savedPrompt = savedPromptResult.savedPrompt as SavedImagePrompt | null;

            // 2. 构建初始 request
            const mergedPrompt = [savedPrompt?.prompt, message.request.textContext]
              .filter(Boolean)
              .join("\n\n");

            const request: GenerationRequest = {
              ...message.request,
              mergedPrompt,
              finalPrompt: mergedPrompt, // 初始值，后续会被 fuse 优化
            };

            // 3. 初始化当前生成状态
            const current: CurrentGeneration = {
              status: "fusing",
              request,
              progress: 30,
              resultUrl: null,
              error: null,
              createdAt: Date.now(),
            };
            await updateCurrentGeneration(current);

            // 4. 尝试打开 Popup
            try {
              // @ts-ignore - chrome.action.openPopup 是 MV3 API
              if (browser.action?.openPopup) {
                // @ts-ignore
                await browser.action.openPopup();
              }
            } catch (e) {
              console.log("Could not open popup automatically:", e);
              // Popup 打开失败没关系，用户可以手动点击
            }

            // 5. 异步执行完整生成流程
            (async () => {
              try {
                // 步骤 1: Fuse prompt
                const finalPrompt = await fusePrompt(mergedPrompt);
                request.finalPrompt = finalPrompt;

                // 更新状态为生成中
                await updateCurrentGeneration({
                  ...current,
                  status: "generating",
                  request,
                  progress: 60,
                });

                // 步骤 2: 生成图片
                const dataUrl = await generateImage(finalPrompt, request.size);

                // 步骤 3: 保存到历史记录
                const historyItem: GenerationHistoryItem = {
                  id: generateId(),
                  prompt: finalPrompt,
                  size: request.size,
                  createdAt: Date.now(),
                  imageDataUrl: dataUrl,
                  sourcePageUrl: _sender.tab?.url ?? "",
                };
                await saveToHistory(historyItem);

                // 更新状态为完成
                await updateCurrentGeneration({
                  ...current,
                  status: "done",
                  request,
                  progress: 100,
                  resultUrl: dataUrl,
                });
              } catch (err) {
                // 更新状态为错误
                await updateCurrentGeneration({
                  ...current,
                  status: "error",
                  progress: 0,
                  error: String(err),
                });
              }
            })();

            sendResponse({ type: "GET_SAVED_PROMPT_RESULT", prompt: savedPrompt });
          } catch (err) {
            sendResponse({ type: "ANALYZE_IMAGE_ERROR", error: String(err) });
          }
        })();
        return true;
      }

      // --- 读取当前生成状态 ---
      if (message.type === "GET_CURRENT_GENERATION") {
        getCurrentGeneration().then((current) =>
          sendResponse({ type: "GET_CURRENT_GENERATION_RESULT", current })
        );
        return true;
      }

      // --- 读取已保存的 prompt ---
      if (message.type === "GET_SAVED_PROMPT") {
        browser.storage.local.get("savedPrompt").then((result) =>
          sendResponse({
            type: "GET_SAVED_PROMPT_RESULT",
            prompt: (result.savedPrompt as SavedImagePrompt) ?? null,
          })
        );
        return true;
      }

      // --- 读取生成历史 ---
      if (message.type === "GET_GENERATION_HISTORY") {
        browser.storage.local.get("generationHistory").then((result) =>
          sendResponse({
            type: "GET_GENERATION_HISTORY_RESULT",
            history: (result.generationHistory as GenerationHistoryItem[]) ?? [],
          })
        );
        return true;
      }

      // --- 清除生成历史 ---
      if (message.type === "CLEAR_GENERATION_HISTORY") {
        browser.storage.local.remove("generationHistory").then(() =>
          sendResponse({ type: "CLEAR_GENERATION_HISTORY_RESULT" })
        );
        return true;
      }
    }
  );
});
