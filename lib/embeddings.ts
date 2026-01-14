import { GoogleGenAI } from "@google/genai";
import { determineProvider, ProviderKind, resolveEmbeddingModel } from "@/lib/llmConfig";

const MAX_EMBEDDING_INPUT_CHARS = 8000;

const normalizeText = (text: string) => text.replace(/\u0000/g, "").trim();

const prepareEmbeddingInput = (text: string) => {
  const cleaned = normalizeText(text);
  if (!cleaned) return "";
  if (cleaned.length <= MAX_EMBEDDING_INPUT_CHARS) return cleaned;
  return cleaned.slice(0, MAX_EMBEDDING_INPUT_CHARS);
};

const buildOpenAIEmbeddingEndpoint = (baseUrl: string) => {
  const trimmed = baseUrl.replace(/\/*$/, "");
  if (trimmed.endsWith("/embeddings")) {
    return trimmed;
  }
  if (trimmed.endsWith("/chat/completions")) {
    return trimmed.replace(/\/chat\/completions$/, "/embeddings");
  }
  return `${trimmed}/embeddings`;
};

export const embedText = async (input: {
  apiKey: string;
  baseUrl?: string;
  provider?: ProviderKind;
  model?: string;
  text: string;
}): Promise<number[] | null> => {
  const prepared = prepareEmbeddingInput(input.text);
  if (!prepared) return null;

  const provider = input.provider ?? determineProvider(input.baseUrl);
  const model =
    input.model ??
    resolveEmbeddingModel(
      provider,
      undefined,
      provider === "google" ? process.env.GEMINI_EMBEDDING_MODEL : process.env.OPENAI_EMBEDDING_MODEL
    );

  try {
    if (provider === "google") {
      const clientOptions: Record<string, unknown> = { apiKey: input.apiKey };
      if (input.baseUrl) {
        clientOptions.baseUrl = input.baseUrl;
      }
      const ai = new GoogleGenAI(clientOptions);
      const response = await ai.models.embedContent({
        model,
        contents: prepared,
      });
      const values = response.embeddings?.[0]?.values;
      if (Array.isArray(values) && values.every((num) => typeof num === "number")) {
        return values;
      }
      return null;
    }

    if (!input.baseUrl) {
      throw new Error("Missing OpenAI base URL");
    }

    const endpoint = buildOpenAIEmbeddingEndpoint(input.baseUrl);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: prepared,
      }),
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null);
      const errorMessage = errorPayload?.error?.message || "Embedding request failed";
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const vector = data?.data?.[0]?.embedding;
    if (Array.isArray(vector) && vector.every((num: unknown) => typeof num === "number")) {
      return vector as number[];
    }
    return null;
  } catch (error) {
    console.error("Embedding generation failed:", error);
    return null;
  }
};
