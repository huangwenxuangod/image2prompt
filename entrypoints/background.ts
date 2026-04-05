import { analyzeImageWithVision, fusePrompt, generateImage, saveToHistory, generateId } from "../lib/api";
import type { ExtensionMessage, SavedImagePrompt, GenerationHistoryItem } from "../lib/types";

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
        return true; // 异步响应必须 return true
      }

      // --- 图像生成 ---
      if (message.type === "GENERATE_IMAGE") {
        (async () => {
          try {
            const { request } = message;

            // 1. 使用用户编辑好的 prompt 进行 fuse 优化
            const finalPrompt = await fusePrompt(request.finalPrompt);

            // 2. 调用图像生成 API
            const dataUrl = await generateImage(finalPrompt, request.size);

            // 3. 保存到历史记录
            const historyItem: GenerationHistoryItem = {
              id: generateId(),
              prompt: finalPrompt,
              size: request.size,
              createdAt: Date.now(),
              imageDataUrl: dataUrl,
              sourcePageUrl: _sender.tab?.url ?? "",
            };
            await saveToHistory(historyItem);

            sendResponse({
              type: "GENERATE_IMAGE_RESULT",
              dataUrl,
              historyItem,
            });
          } catch (err) {
            sendResponse({
              type: "GENERATE_IMAGE_ERROR",
              error: String(err),
            });
          }
        })();
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
