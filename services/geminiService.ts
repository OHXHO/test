import { GoogleGenAI } from "@google/genai";
import { Message } from "../types";

const MODEL_NAME = 'gemini-3-flash-preview';

/**
 * Prepares the history for the API call.
 * Converts our internal Message format to the API's Content format.
 */
const prepareHistory = (messages: Message[]) => {
  return messages.map((msg) => {
    const parts: any[] = [];
    
    // Add text if present
    if (msg.text) {
      parts.push({ text: msg.text });
    }

    // Add attachments if present
    if (msg.attachments && msg.attachments.length > 0) {
      msg.attachments.forEach((att) => {
        if (att.base64Data) {
          parts.push({
            inlineData: {
              mimeType: att.mimeType,
              data: att.base64Data,
            },
          });
        }
      });
    }

    return {
      role: msg.role,
      parts: parts,
    };
  });
};

/**
 * Sends a message to the Gemini model with history and streams the response.
 */
export const streamGeminiResponse = async (
  history: Message[],
  onChunk: (text: string) => void
): Promise<string> => {
  try {
    // Dynamically initialize the client to support user-configured keys/urls
    const customApiKey = localStorage.getItem('custom_gemini_api_key');
    const customBaseUrl = localStorage.getItem('custom_gemini_base_url');
    
    // Fallback to process.env.API_KEY if no custom key is set
    const apiKey = customApiKey || process.env.API_KEY;

    // Construct options object
    const clientOptions: any = { apiKey };
    if (customBaseUrl) {
      clientOptions.baseUrl = customBaseUrl;
    }

    const ai = new GoogleGenAI(clientOptions);

    const contents = prepareHistory(history);
    
    // We strictly use generateContentStream for full control over history management (stateless REST style from client perspective)
    // allowing us to easily inject images at any point in the history.
    const result = await ai.models.generateContentStream({
      model: MODEL_NAME,
      contents: contents,
    });

    let fullText = "";

    for await (const chunk of result) {
      const text = chunk.text;
      if (text) {
        fullText += text;
        onChunk(text);
      }
    }

    return fullText;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};