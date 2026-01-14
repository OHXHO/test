import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import type { Message, Attachment } from "@/types";
import { determineProvider, resolveModelName } from "@/lib/llmConfig";
import { getSessionUser } from "@/lib/serverAuth";
import { buildAttachmentDocumentText, truncateText } from "@/lib/documentText";
import { embedText } from "@/lib/embeddings";
import { searchKnowledgeByEmbedding } from "@/lib/knowledge";
import { getUserSettings } from "@/lib/userSettings";

export const runtime = "nodejs";

const MAX_KNOWLEDGE_RESULTS = 3;
const MAX_KNOWLEDGE_CHARS_PER_FILE = 2000;
const MAX_KNOWLEDGE_CONTEXT_CHARS = 8000;

const isImageAttachment = (attachment: Attachment) =>
  Boolean(attachment.base64Data) && attachment.mimeType?.startsWith("image/");

const getLatestUserQuery = (history: Message[]) => {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const msg = history[i];
    if (msg.role === "user" && msg.text?.trim()) {
      return msg.text.trim();
    }
  }
  return "";
};

const buildKnowledgeContext = (results: Array<{ originalName: string; content: string }>) => {
  if (results.length === 0) return "";
  const blocks = results.map(
    (result, index) => `【知识库文件 ${index + 1}：${result.originalName}】\n${result.content}`
  );
  const combined = `以下是系统从你的个人知识库中检索到的相关内容，仅供参考：\n\n${blocks.join("\n\n")}`;
  return truncateText(combined, MAX_KNOWLEDGE_CONTEXT_CHARS);
};

const injectKnowledgeContext = (history: Message[], context: string) => {
  if (!context) return history;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const msg = history[i];
    if (msg.role === "user") {
      const updatedText = msg.text ? `${msg.text}\n\n${context}` : context;
      return history.map((item, index) => (index === i ? { ...item, text: updatedText } : item));
    }
  }
  return history;
};

const prepareHistory = async (messages: Message[]) => {
  return Promise.all(
    messages.map(async (msg) => {
      const parts: any[] = [];

      if (msg.text) {
        parts.push({ text: msg.text });
      }

      if (msg.attachments && msg.attachments.length > 0) {
        for (const attachment of msg.attachments) {
          if (isImageAttachment(attachment)) {
            parts.push({
              inlineData: {
                mimeType: attachment.mimeType,
                data: attachment.base64Data,
              },
            });
            continue;
          }
          const docText = await buildAttachmentDocumentText(attachment);
          if (docText) {
            parts.push({ text: docText });
          }
        }
      }

      return {
        role: msg.role,
        parts,
      };
    })
  );
};

const buildOpenAIMessageContent = async (message: Message) => {
  const parts: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [];

  if (message.text) {
    parts.push({ type: "text", text: message.text });
  }

  if (message.attachments && message.attachments.length > 0) {
    for (const attachment of message.attachments) {
      if (isImageAttachment(attachment)) {
        const dataUrl = `data:${attachment.mimeType};base64,${attachment.base64Data}`;
        parts.push({ type: "image_url", image_url: { url: dataUrl } });
        continue;
      }
      const docText = await buildAttachmentDocumentText(attachment);
      if (docText) {
        parts.push({ type: "text", text: docText });
      }
    }
  }

  if (parts.length === 0) {
    return "";
  }

  return parts.length === 1 && parts[0].type === "text" ? parts[0].text : parts;
};

const prepareOpenAIMessages = async (messages: Message[]) => {
  return Promise.all(
    messages.map(async (msg) => ({
      role: msg.role === "model" ? "assistant" : "user",
      content: msg.role === "model" ? msg.text : await buildOpenAIMessageContent(msg),
    }))
  );
};

const extractTextFromOpenAIChunk = (chunk: any): string => {
  const choice = chunk?.choices?.[0];
  if (!choice) {
    return "";
  }

  const delta = choice.delta ?? {};

  const collectFromContentArray = (contentArray: any[]): string => {
    return contentArray
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }
        if (part?.text) {
          return part.text;
        }
        if (part?.content) {
          return part.content;
        }
        return "";
      })
      .filter(Boolean)
      .join("");
  };

  if (typeof delta.content === "string") {
    return delta.content;
  }

  if (Array.isArray(delta.content)) {
    return collectFromContentArray(delta.content);
  }

  if (typeof choice.message?.content === "string") {
    return choice.message.content;
  }

  if (Array.isArray(choice.message?.content)) {
    return collectFromContentArray(choice.message?.content);
  }

  if (typeof delta.text === "string") {
    return delta.text;
  }

  return "";
};

const buildOpenAIEndpoint = (baseUrl: string) => {
  const trimmed = baseUrl.replace(/\/*$/, "");
  if (trimmed.endsWith("/chat/completions")) {
    return trimmed;
  }
  return `${trimmed}/chat/completions`;
};

export async function POST(req: NextRequest) {
  let body: { history?: Message[] } | null = null;
  try {
    body = await req.json();
  } catch (error) {
    return NextResponse.json({ error: "请求解析失败" }, { status: 400 });
  }

  if (!body?.history || !Array.isArray(body.history)) {
    return NextResponse.json({ error: "缺少有效的对话记录" }, { status: 400 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const settings = getUserSettings(user.id);
  const apiKey = settings?.api_key || process.env.YOUR_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "未配置API Key" }, { status: 500 });
  }

  const baseUrl = settings?.base_url || process.env.YOUR_BASE_URL;
  const modelOverride = settings?.model || undefined;
  const history = body.history;
  const provider = determineProvider(baseUrl);
  const modelName = resolveModelName(provider, modelOverride, process.env.GEMINI_MODEL);
  const queryText = getLatestUserQuery(history);
  let enrichedHistory = history;
  if (queryText) {
    const queryEmbedding = await embedText({
      apiKey,
      baseUrl,
      provider,
      text: queryText,
    });
    const knowledgeResults = queryEmbedding
      ? searchKnowledgeByEmbedding(user.id, queryEmbedding, {
          limit: MAX_KNOWLEDGE_RESULTS,
          maxCharsPerFile: MAX_KNOWLEDGE_CHARS_PER_FILE,
        })
      : [];
    const knowledgeContext = buildKnowledgeContext(knowledgeResults);
    enrichedHistory = injectKnowledgeContext(history, knowledgeContext);
  }

  if (provider === "openai") {
    if (!baseUrl) {
      return NextResponse.json({ error: "当前配置缺少 Base URL" }, { status: 400 });
    }

    const endpoint = buildOpenAIEndpoint(baseUrl);
    const payload = {
      model: modelName,
      messages: await prepareOpenAIMessages(enrichedHistory),
      stream: true,
    };

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error("OpenAI 风格接口请求失败:", error);
      return NextResponse.json({ error: "与模型提供方通信失败，请检查网络或配置" }, { status: 502 });
    }

    if (!response.ok) {
      let errorText = "模型返回错误";
      try {
        const data = await response.json();
        errorText = data?.error?.message ?? errorText;
      } catch {
        try {
          errorText = await response.text();
        } catch {
          // ignore secondary error
        }
      }
      return NextResponse.json({ error: errorText || "模型返回错误" }, { status: response.status });
    }

    if (!response.body) {
      return NextResponse.json({ error: "模型响应为空" }, { status: 502 });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder("utf-8");

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        let buffer = "";

        const pump = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                break;
              }
              buffer += decoder.decode(value, { stream: true });

              let eventBoundary = buffer.indexOf("\n\n");
              while (eventBoundary !== -1) {
                const eventChunk = buffer.slice(0, eventBoundary);
                buffer = buffer.slice(eventBoundary + 2);

                const lines = eventChunk.split("\n");
                for (const rawLine of lines) {
                  const line = rawLine.trim();
                  if (!line.startsWith("data:")) {
                    continue;
                  }

                  const data = line.slice(5).trim();
                  if (!data) {
                    continue;
                  }
                  if (data === "[DONE]") {
                    controller.close();
                    return;
                  }

                  try {
                    const parsed = JSON.parse(data);
                    const text = extractTextFromOpenAIChunk(parsed);
                    if (text) {
                      controller.enqueue(encoder.encode(text));
                    }
                  } catch (parseError) {
                    console.error("解析模型流数据失败:", parseError);
                  }
                }

                eventBoundary = buffer.indexOf("\n\n");
              }
            }
            controller.close();
          } catch (error) {
            controller.error(error);
          } finally {
            reader.releaseLock();
          }
        };

        pump();
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Transfer-Encoding": "chunked",
      },
    });
  }

  const clientOptions: Record<string, unknown> = { apiKey };
  if (baseUrl) {
    clientOptions.baseUrl = baseUrl;
  }

  const ai = new GoogleGenAI(clientOptions);
  const contents = await prepareHistory(enrichedHistory);
  const encoder = new TextEncoder();

  const extractText = (chunk: any) => {
    if (!chunk) return "";
    if (typeof chunk.text === "function") {
      return chunk.text() ?? "";
    }
    if (typeof chunk.text === "string") {
      return chunk.text;
    }
    const candidates = chunk.candidates;
    if (Array.isArray(candidates) && candidates.length > 0) {
      const candidate = candidates[0];
      if (candidate?.content?.parts) {
        return candidate.content.parts
          .map((part: any) => part.text)
          .filter(Boolean)
          .join("");
      }
    }
    return "";
  };

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await ai.models.generateContentStream({
          model: modelName,
          contents,
        });

        for await (const chunk of result) {
          const text = extractText(chunk);
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }
        controller.close();
      } catch (error) {
        console.error("Gemini API 请求失败:", error);
        controller.error(error);
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "Transfer-Encoding": "chunked",
    },
  });
}
