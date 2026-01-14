import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { getSessionUser } from "@/lib/serverAuth";
import { deleteKnowledgeFile, getKnowledgeFileById } from "@/lib/knowledge";

export const runtime = "nodejs";

const KNOWLEDGE_BASE_DIR = path.join(process.cwd(), "data", "knowledge");

const resolveStoragePath = (storagePath: string) => {
  const baseDir = path.resolve(KNOWLEDGE_BASE_DIR);
  const resolved = path.resolve(baseDir, storagePath);
  if (!resolved.startsWith(baseDir + path.sep) && resolved !== baseDir) {
    throw new Error("非法文件路径");
  }
  return resolved;
};

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const id = Number(params.id);
  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "无效的文件 ID" }, { status: 400 });
  }

  const record = getKnowledgeFileById(user.id, id);
  if (!record) {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }

  const filePath = resolveStoragePath(record.storage_path);
  try {
    await fs.unlink(filePath);
  } catch (error: any) {
    if (error?.code !== "ENOENT") {
      return NextResponse.json({ error: "删除文件失败" }, { status: 500 });
    }
  }

  deleteKnowledgeFile(user.id, id);
  return NextResponse.json({ success: true });
}
