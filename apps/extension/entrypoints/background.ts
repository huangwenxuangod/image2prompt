import type {
  ExtensionMessage,
  SavedImagePrompt,
  GenerationHistoryItem,
  CurrentGeneration,
  GenerationRequest,
  ImageStyleAnalysis,
} from "../lib/types";
import {
  analyzeImageWithWebAPI,
  generateImageWithWebAPI,
  isAuthenticated,
} from "../lib/web-api";

function generateId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function updateCurrentGeneration(current: CurrentGeneration | null): Promise<void> {
  if (current) {
    await browser.storage.local.set({ currentGeneration: current });
  } else {
    await browser.storage.local.remove("currentGeneration");
  }
}

async function getCurrentGeneration(): Promise<CurrentGeneration | null> {
  const result = await browser.storage.local.get("currentGeneration");
  return (result.currentGeneration as CurrentGeneration) ?? null;
}

const MAX_HISTORY = 20;

async function getGenerationHistory(): Promise<GenerationHistoryItem[]> {
  const result = await browser.storage.local.get("generationHistory");
  return (result.generationHistory as GenerationHistoryItem[]) ?? [];
}

async function saveToHistory(item: GenerationHistoryItem): Promise<void> {
  const history = await getGenerationHistory();
  history.unshift(item);
  if (history.length > MAX_HISTORY) {
    history.pop();
  }
  await browser.storage.local.set({ generationHistory: history });
}

async function clearGenerationHistory(): Promise<void> {
  await browser.storage.local.remove("generationHistory");
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(
    (
      message: ExtensionMessage,
      _sender: browser.runtime.MessageSender,
      sendResponse: (response: ExtensionMessage) => void
    ) => {
      if (message.type === "ANALYZE_IMAGE") {
        (async () => {
          try {
            const authenticated = await isAuthenticated();
            if (!authenticated) {
              throw new Error("Please connect to Web app first");
            }

            const response = await fetch(message.imageUrl, {
              mode: "cors",
              credentials: "omit",
            });
            if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
            const blob = await response.blob();

            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });

            const rawType = blob.type || "image/png";
            const mediaType = rawType.startsWith("image/") ? rawType : "image/png";

            const result = await analyzeImageWithWebAPI(base64, mediaType, message.imageAlt);

            const savedPrompt: SavedImagePrompt = {
              prompt: result.prompt,
              styleAnalysis: result.styleAnalysis,
              imageUrl: message.imageUrl,
              imageAlt: message.imageAlt,
              analyzedAt: Date.now(),
              sourceUrl: _sender.tab?.url ?? "",
            };
            await browser.storage.local.set({ savedPrompt });

            sendResponse({
              type: "ANALYZE_IMAGE_RESULT",
              prompt: result.prompt,
              styleAnalysis: result.styleAnalysis,
            });
          } catch (err) {
            sendResponse({ type: "ANALYZE_IMAGE_ERROR", error: String(err) });
          }
        })();
        return true;
      }

      if (message.type === "START_GENERATION") {
        (async () => {
          try {
            const authenticated = await isAuthenticated();
            if (!authenticated) {
              throw new Error("Please connect to Web app first");
            }

            const savedPromptResult = await browser.storage.local.get("savedPrompt");
            const savedPrompt = savedPromptResult.savedPrompt as SavedImagePrompt | null;

            const request: GenerationRequest = {
              ...message.request,
              styleAnalysis: savedPrompt?.styleAnalysis ?? null,
              mergedPrompt: "",
              finalPrompt: "",
            };

            const current: CurrentGeneration = {
              status: "fusing",
              request,
              progress: 30,
              resultUrl: null,
              error: null,
              createdAt: Date.now(),
            };
            await updateCurrentGeneration(current);

            try {
              if (browser.action?.openPopup) {
                await (browser.action as any).openPopup();
              }
            } catch (e) {
              console.log("Could not open popup automatically:", e);
            }

            (async () => {
              try {
                await updateCurrentGeneration({
                  ...current,
                  status: "generating",
                  progress: 60,
                });

                const result = await generateImageWithWebAPI(
                  savedPrompt?.styleAnalysis ?? null,
                  message.request.textContext,
                  request.size,
                  _sender.tab?.url ?? ""
                );

                request.mergedPrompt = result.finalPrompt;
                request.finalPrompt = result.finalPrompt;

                await saveToHistory(result.historyItem);

                await updateCurrentGeneration({
                  ...current,
                  status: "done",
                  request,
                  progress: 100,
                  resultUrl: result.imageDataUrl,
                });
              } catch (err) {
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

      if (message.type === "GET_CURRENT_GENERATION") {
        getCurrentGeneration().then((current) =>
          sendResponse({ type: "GET_CURRENT_GENERATION_RESULT", current })
        );
        return true;
      }

      if (message.type === "GET_SAVED_PROMPT") {
        browser.storage.local.get("savedPrompt").then((result) =>
          sendResponse({
            type: "GET_SAVED_PROMPT_RESULT",
            prompt: (result.savedPrompt as SavedImagePrompt) ?? null,
          })
        );
        return true;
      }

      if (message.type === "GET_GENERATION_HISTORY") {
        getGenerationHistory().then((history) =>
          sendResponse({
            type: "GET_GENERATION_HISTORY_RESULT",
            history,
          })
        );
        return true;
      }

      if (message.type === "CLEAR_GENERATION_HISTORY") {
        clearGenerationHistory().then(() =>
          sendResponse({ type: "CLEAR_GENERATION_HISTORY_RESULT" })
        );
        return true;
      }
    }
  );

  browser.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
    if (message.type === "image2prompt:auth") {
      (async () => {
        const { setAuthState } = await import("../lib/web-api");
        await setAuthState(message.token, message.userId);
        sendResponse({ success: true });
      })();
      return true;
    }
  });
});
