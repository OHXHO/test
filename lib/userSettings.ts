import { db } from "@/lib/db";

export interface UserSettingsRecord {
  user_id: number;
  api_key: string | null;
  base_url: string | null;
  model: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  apiKey?: string | null;
  baseUrl?: string | null;
  model?: string | null;
}

export const getUserSettings = (userId: number): UserSettingsRecord | undefined => {
  return db
    .prepare("SELECT * FROM user_settings WHERE user_id = ?")
    .get(userId) as UserSettingsRecord | undefined;
};

export const upsertUserSettings = (userId: number, input: UserSettings) => {
  const now = new Date().toISOString();
  db.prepare(
    `
    INSERT INTO user_settings (user_id, api_key, base_url, model, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      api_key = excluded.api_key,
      base_url = excluded.base_url,
      model = excluded.model,
      updated_at = excluded.updated_at
  `
  ).run(
    userId,
    input.apiKey ?? null,
    input.baseUrl ?? null,
    input.model ?? null,
    now,
    now
  );
};

export const clearUserApiKey = (userId: number) => {
  db.prepare("UPDATE user_settings SET api_key = NULL, updated_at = ? WHERE user_id = ?").run(
    new Date().toISOString(),
    userId
  );
};
