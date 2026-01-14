import { Message } from "@/types";

interface StreamOptions {
  signal?: AbortSignal;
}

/**
 * Streams chat completion chunks from the backend API.
 */
export const streamGeminiResponse = async (
  history: Message[],
  onChunk: (text: string) => void,
  options: StreamOptions = {}
): Promise<string> => {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ history }),
    signal: options.signal,
  });

  if (!response.ok) {
    let errorText = "Gemini API 请求失败";
    try {
      const data = await response.json();
      if (data?.error) {
        errorText = data.error;
      }
    } catch (err) {
      // ignore JSON parse errors and fall back to default message
    }
    if (response.status === 401) {
      errorText = "未登录或登录已过期，请重新登录。";
    }
    throw new Error(errorText);
  }

  if (!response.body) {
    throw new Error("Gemini API 响应为空");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (chunk) {
      fullText += chunk;
      onChunk(chunk);
    }
  }

  return fullText;
};
