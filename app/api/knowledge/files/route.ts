import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import { getSessionUser } from "@/lib/serverAuth";
import { createKnowledgeFile, listKnowledgeFiles } from "@/lib/knowledge";
import { extractTextFromBuffer, truncateText } from "@/lib/documentText";
import { embedText } from "@/lib/embeddings";
import { determineProvider } from "@/lib/llmConfig";
import { getUserSettings } from "@/lib/userSettings";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_FILES_PER_UPLOAD = 10;
const KNOWLEDGE_BASE_DIR = path.join(process.cwd(), "data", "knowledge");

const sanitizeFileName = (fileName: string) => {
  const baseName = path.basename(fileName);
  const extension = path.extname(baseName).slice(0, 16);
  const namePart = baseName.slice(0, baseName.length - extension.length);
  const safeName = namePart.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  return {
    base: safeName || "file",
    extension,
  };
};

const resolveStoragePath = (storagePath: string) => {
  const baseDir = path.resolve(KNOWLEDGE_BASE_DIR);
  const resolved = path.resolve(baseDir, storagePath);
  if (!resolved.startsWith(baseDir + path.sep) && resolved !== baseDir) {
    throw new Error("非法文件路径");
  }
  return resolved;
};

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const files = listKnowledgeFiles(user.id);
  return NextResponse.json({ files });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const settings = getUserSettings(user.id);
  const apiKey = settings?.api_key || process.env.YOUR_API_KEY;
  const baseUrl = settings?.base_url || process.env.YOUR_BASE_URL;
  const provider = determineProvider(baseUrl);

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (error) {
    return NextResponse.json({ error: "上传内容解析失败" }, { status: 400 });
  }

  let files = formData.getAll("files").filter((item): item is File => item instanceof File);
  if (files.length === 0) {
    const single = formData.get("file");
    if (single instanceof File) {
      files = [single];
    }
  }

  if (files.length === 0) {
    return NextResponse.json({ error: "未检测到上传文件" }, { status: 400 });
  }

  if (files.length > MAX_FILES_PER_UPLOAD) {
    return NextResponse.json({ error: `单次最多上传 ${MAX_FILES_PER_UPLOAD} 个文件` }, { status: 400 });
  }

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `文件 ${file.name} 超过大小限制（最大 ${MAX_FILE_SIZE / 1024 / 1024}MB）` },
        { status: 400 }
      );
    }
  }

  const uploaded = [];
  await fs.mkdir(path.join(KNOWLEDGE_BASE_DIR, String(user.id)), { recursive: true });

  for (const file of files) {
    const { base, extension } = sanitizeFileName(file.name || "file");
    const storedName = `${base}-${Date.now()}-${randomUUID()}${extension}`;
    const storagePath = path.join(String(user.id), storedName);
    const fullPath = resolveStoragePath(storagePath);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(fullPath, buffer);
    const rawText = await extractTextFromBuffer(
      buffer,
      file.type || "application/octet-stream",
      file.name || storedName
    );
    const extractedText = truncateText(rawText);
    let embeddingVector: number[] | undefined;
    if (rawText && apiKey) {
      embeddingVector = await embedText({
        apiKey,
        baseUrl,
        provider,
        text: rawText,
      });
    }

    const created = createKnowledgeFile({
      userId: user.id,
      originalName: file.name || storedName,
      storagePath,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      contentText: extractedText || undefined,
      embeddingVector,
    });
    uploaded.push(created);
  }

  return NextResponse.json({ files: uploaded });
}
