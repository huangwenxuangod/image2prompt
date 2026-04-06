import type { ImageSize, ImageStyleAnalysis, GenerationHistoryItem } from "./types";

const WEB_BASE_URL = "http://localhost:3000";

interface AuthState {
  token: string | null;
  userId: string | null;
}

async function getAuthState(): Promise<AuthState> {
  const result = await browser.storage.local.get(["webAuthToken", "webUserId", "webBaseUrl"]);
  return {
    token: result.webAuthToken as string | null,
    userId: result.webUserId as string | null,
  };
}

export async function setAuthState(token: string, userId: string): Promise<void> {
  await browser.storage.local.set({
    webAuthToken: token,
    webUserId: userId,
  });
}

export async function clearAuthState(): Promise<void> {
  await browser.storage.local.remove(["webAuthToken", "webUserId"]);
}

export async function isAuthenticated(): Promise<boolean> {
  const { token } = await getAuthState();
  return !!token;
}

async function fetchWebAPI(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const { token } = await getAuthState();

  if (!token) {
    throw new Error("Please connect to Web app first");
  }

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${WEB_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `Web API error: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      try {
        errorMessage = await response.text();
      } catch {
        // ignore
      }
    }
    throw new Error(errorMessage);
  }

  return response;
}

export async function analyzeImageWithWebAPI(
  imageBase64: string,
  mediaType: string,
  imageAlt: string
): Promise<{ prompt: string; styleAnalysis: ImageStyleAnalysis }> {
  const response = await fetchWebAPI("/api/ark/analyze", {
    method: "POST",
    body: JSON.stringify({ imageBase64, mediaType, imageAlt }),
  });

  const data = await response.json();
  return {
    prompt: data.prompt,
    styleAnalysis: data.styleAnalysis,
  };
}

export async function generateImageWithWebAPI(
  styleAnalysis: ImageStyleAnalysis | null,
  textContext: string,
  size: ImageSize,
  sourcePageUrl: string
): Promise<{ finalPrompt: string; imageDataUrl: string; historyItem: GenerationHistoryItem }> {
  const response = await fetchWebAPI("/api/ark/generate", {
    method: "POST",
    body: JSON.stringify({ styleAnalysis, textContext, size, sourcePageUrl }),
  });

  const data = await response.json();
  return {
    finalPrompt: data.finalPrompt,
    imageDataUrl: data.imageDataUrl,
    historyItem: data.historyItem,
  };
}

export async function getHistoryFromWebAPI(): Promise<GenerationHistoryItem[]> {
  const response = await fetchWebAPI("/api/history", {
    method: "GET",
  });

  const data = await response.json();
  return data.history;
}

export async function deleteHistoryFromWebAPI(id?: string): Promise<void> {
  await fetchWebAPI("/api/history", {
    method: "DELETE",
    body: id ? JSON.stringify({ id }) : JSON.stringify({}),
  });
}

export function openConnectPage(): void {
  browser.tabs.create({
    url: `${WEB_BASE_URL}/connect`,
  });
}
