import { db } from "@/lib/db";

export interface KnowledgeFileRecord {
  id: number;
  user_id: number;
  original_name: string;
  storage_path: string;
  mime_type: string;
  size: number;
  content_text?: string | null;
  embedding_vector?: string | null;
  created_at: string;
}

export interface KnowledgeFile {
  id: number;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface KnowledgeSearchResult {
  id: number;
  originalName: string;
  content: string;
}

const mapKnowledgeFile = (row: KnowledgeFileRecord): KnowledgeFile => ({
  id: row.id,
  originalName: row.original_name,
  mimeType: row.mime_type,
  size: row.size,
  createdAt: row.created_at,
});

export const listKnowledgeFiles = (userId: number): KnowledgeFile[] => {
  const rows = db
    .prepare(
      "SELECT id, original_name, mime_type, size, created_at FROM knowledge_files WHERE user_id = ? ORDER BY created_at DESC"
    )
    .all(userId) as Array<Omit<KnowledgeFileRecord, "user_id" | "storage_path">>;
  return rows.map((row) =>
    mapKnowledgeFile({
      id: row.id,
      user_id: userId,
      original_name: row.original_name,
      storage_path: "",
      mime_type: row.mime_type,
      size: row.size,
      created_at: row.created_at,
    })
  );
};

export const getKnowledgeFileById = (
  userId: number,
  id: number
): KnowledgeFileRecord | undefined => {
  return db
    .prepare("SELECT * FROM knowledge_files WHERE user_id = ? AND id = ?")
    .get(userId, id) as KnowledgeFileRecord | undefined;
};

export const createKnowledgeFile = (input: {
  userId: number;
  originalName: string;
  storagePath: string;
  mimeType: string;
  size: number;
  contentText?: string;
  embeddingVector?: number[];
}): KnowledgeFile => {
  const now = new Date().toISOString();
  const embeddingJson = input.embeddingVector?.length
    ? JSON.stringify(input.embeddingVector)
    : null;
  const result = db
    .prepare(
      "INSERT INTO knowledge_files (user_id, original_name, storage_path, mime_type, size, embedding_vector, content_text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .run(
      input.userId,
      input.originalName,
      input.storagePath,
      input.mimeType,
      input.size,
      embeddingJson,
      input.contentText ?? null,
      now
    );
  const row = db
    .prepare("SELECT id, original_name, mime_type, size, created_at FROM knowledge_files WHERE id = ?")
    .get(result.lastInsertRowid) as Omit<KnowledgeFileRecord, "user_id" | "storage_path"> | undefined;
  if (!row) {
    throw new Error("知识库文件写入失败");
  }
  return mapKnowledgeFile({
    id: row.id,
    user_id: input.userId,
    original_name: row.original_name,
    storage_path: input.storagePath,
    mime_type: row.mime_type,
    size: row.size,
    created_at: row.created_at,
  });
};

export const deleteKnowledgeFile = (userId: number, id: number) => {
  db.prepare("DELETE FROM knowledge_files WHERE user_id = ? AND id = ?").run(userId, id);
};

const parseEmbeddingVector = (value?: string | null): number[] | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every((num) => typeof num === "number")) {
      return parsed;
    }
  } catch (error) {
    // ignore malformed embeddings
  }
  return null;
};

const cosineSimilarity = (a: number[], b: number[]) => {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const valA = a[i];
    const valB = b[i];
    dot += valA * valB;
    magA += valA * valA;
    magB += valB * valB;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
};

const truncateContent = (text: string, maxChars: number) => {
  if (!text) return "";
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[内容已截断]`;
};

export const searchKnowledgeByEmbedding = (
  userId: number,
  queryEmbedding: number[],
  options: { limit?: number; maxCharsPerFile?: number; minScore?: number } = {}
): KnowledgeSearchResult[] => {
  if (!queryEmbedding || queryEmbedding.length === 0) return [];

  const rows = db
    .prepare(
      "SELECT id, original_name, content_text, embedding_vector FROM knowledge_files WHERE user_id = ? AND content_text IS NOT NULL AND content_text <> '' AND embedding_vector IS NOT NULL AND embedding_vector <> ''"
    )
    .all(userId) as Array<{
    id: number;
    original_name: string;
    content_text: string;
    embedding_vector: string;
  }>;

  const scored = rows
    .map((row) => {
      const embedding = parseEmbeddingVector(row.embedding_vector);
      if (!embedding) return null;
      const score = cosineSimilarity(queryEmbedding, embedding);
      return {
        id: row.id,
        originalName: row.original_name,
        content: row.content_text ?? "",
        score,
      };
    })
    .filter((item): item is { id: number; originalName: string; content: string; score: number } => Boolean(item));

  scored.sort((a, b) => b.score - a.score);

  const limit = options.limit ?? 3;
  const maxCharsPerFile = options.maxCharsPerFile ?? 2000;
  const minScore = options.minScore ?? 0.2;
  return scored
    .filter((item) => item.score >= minScore)
    .slice(0, limit)
    .map((item) => ({
      id: item.id,
      originalName: item.originalName,
      content: truncateContent(item.content, maxCharsPerFile),
    }));
};
