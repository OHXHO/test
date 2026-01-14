import { extname } from "path";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import * as xlsx from "xlsx";
import type { Attachment } from "@/types";

const MAX_DOCUMENT_CHARS = 120_000;
const MAX_BASE64_PREVIEW_CHARS = 8_000;
const TEXT_MIME_TYPES = new Set([
  "application/json",
  "application/xml",
  "application/xhtml+xml",
  "application/javascript",
  "application/x-javascript",
  "application/x-ndjson",
]);
const TEXT_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".markdown",
  ".csv",
  ".tsv",
  ".json",
  ".xml",
  ".html",
  ".htm",
  ".yaml",
  ".yml",
  ".log",
  ".rtf",
]);

const normalizeText = (text: string) => text.replace(/\u0000/g, "").trim();

export const truncateText = (text: string, maxChars = MAX_DOCUMENT_CHARS) => {
  const cleaned = normalizeText(text);
  if (!cleaned) return "";
  if (cleaned.length <= maxChars) return cleaned;
  return `${cleaned.slice(0, maxChars)}\n\n[内容已截断]`;
};

const getExtension = (fileName?: string) => (fileName ? extname(fileName).toLowerCase() : "");

const isTextAttachment = (mimeType: string, extension: string) => {
  if (mimeType.startsWith("text/")) return true;
  if (TEXT_MIME_TYPES.has(mimeType)) return true;
  if (TEXT_EXTENSIONS.has(extension)) return true;
  return false;
};

export const extractTextFromBuffer = async (
  buffer: Buffer,
  mimeType: string,
  fileName?: string
): Promise<string> => {
  const normalizedType = (mimeType || "").toLowerCase();
  const extension = getExtension(fileName);

  if (isTextAttachment(normalizedType, extension)) {
    return buffer.toString("utf-8");
  }

  if (normalizedType === "application/pdf" || extension === ".pdf") {
    try {
      const data = await pdfParse(buffer);
      return data.text ?? "";
    } catch (error) {
      console.error("PDF 解析失败:", error);
      return "";
    }
  }

  if (
    normalizedType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extension === ".docx"
  ) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value ?? "";
    } catch (error) {
      console.error("DOCX 解析失败:", error);
      return "";
    }
  }

  if (
    normalizedType === "application/vnd.ms-excel" ||
    normalizedType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    extension === ".xls" ||
    extension === ".xlsx"
  ) {
    try {
      const workbook = xlsx.read(buffer, { type: "buffer" });
      return workbook.SheetNames.map((name) => {
        const sheet = workbook.Sheets[name];
        const csv = xlsx.utils.sheet_to_csv(sheet).trim();
        return csv ? `# ${name}\n${csv}` : `# ${name}\n(空表)`;
      }).join("\n\n");
    } catch (error) {
      console.error("表格解析失败:", error);
      return "";
    }
  }

  return "";
};

export const buildAttachmentDocumentText = async (attachment: Attachment): Promise<string> => {
  const name = attachment.fileName || "attachment";
  const mimeType = attachment.mimeType || "application/octet-stream";
  const header = `【附件：${name} | ${mimeType}】`;

  if (!attachment.base64Data) {
    return `${header}\n（未能读取附件内容）`;
  }

  const buffer = Buffer.from(attachment.base64Data, "base64");
  const extracted = truncateText(await extractTextFromBuffer(buffer, mimeType, name));
  if (extracted) {
    return `${header}\n${extracted}`;
  }

  const preview = attachment.base64Data.slice(0, MAX_BASE64_PREVIEW_CHARS);
  if (!preview) {
    return `${header}\n（未能读取附件内容）`;
  }
  return `${header}\n（无法解析为文本，附带 base64 摘要）\n${preview}`;
};
