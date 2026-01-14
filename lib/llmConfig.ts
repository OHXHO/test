export type ProviderKind = "google" | "openai";

export const GOOGLE_DEFAULT_MODEL = "gemini-2.5-pro";
export const OPENAI_DEFAULT_MODEL = "gpt-4o-mini";
export const GOOGLE_DEFAULT_EMBEDDING_MODEL = "text-embedding-004";
export const OPENAI_DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

export const determineProvider = (baseUrl?: string): ProviderKind => {
  if (!baseUrl) {
    return "google";
  }
  const lower = baseUrl.toLowerCase();
  if (lower.includes("googleapis.com") || lower.includes("googleapis.cn") || lower.includes("vertex")) {
    return "google";
  }
  return "openai";
};

export const resolveDefaultModel = (provider: ProviderKind): string => {
  return provider === "google" ? GOOGLE_DEFAULT_MODEL : OPENAI_DEFAULT_MODEL;
};

export const resolveModelName = (
  provider: ProviderKind,
  customModel?: string,
  envModel?: string
): string => {
  const trimmedCustom = customModel?.trim();
  if (trimmedCustom) {
    return trimmedCustom;
  }

  const trimmedEnv = envModel?.trim();
  if (trimmedEnv) {
    return trimmedEnv;
  }

  return resolveDefaultModel(provider);
};

export const resolveEmbeddingModel = (
  provider: ProviderKind,
  customModel?: string,
  envModel?: string
): string => {
  const trimmedCustom = customModel?.trim();
  if (trimmedCustom) {
    return trimmedCustom;
  }

  const trimmedEnv = envModel?.trim();
  if (trimmedEnv) {
    return trimmedEnv;
  }

  return provider === "google" ? GOOGLE_DEFAULT_EMBEDDING_MODEL : OPENAI_DEFAULT_EMBEDDING_MODEL;
};
