import { db } from "@/lib/db";

export type UserRole = "admin" | "user";

export interface UserRecord {
  id: number;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: string;
}

export interface PublicUser {
  id: number;
  email: string;
  role: UserRole;
  created_at: string;
}

const mapPublicUser = (row: UserRecord): PublicUser => ({
  id: row.id,
  email: row.email,
  role: row.role,
  created_at: row.created_at,
});

export const countUsers = (): number => {
  const row = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  return row?.count ?? 0;
};

export const countAdmins = (): number => {
  const row = db
    .prepare("SELECT COUNT(*) as count FROM users WHERE role = ?")
    .get("admin") as { count: number };
  return row?.count ?? 0;
};

export const getUserByEmail = (email: string): UserRecord | undefined => {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email) as UserRecord | undefined;
};

export const getUserById = (id: number): UserRecord | undefined => {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRecord | undefined;
};

export const listUsers = (): PublicUser[] => {
  const rows = db.prepare("SELECT id, email, role, created_at FROM users ORDER BY created_at DESC").all() as PublicUser[];
  return rows;
};

export const createUser = (email: string, passwordHash: string, role: UserRole): UserRecord => {
  const now = new Date().toISOString();
  const result = db
    .prepare("INSERT INTO users (email, password_hash, role, created_at) VALUES (?, ?, ?, ?)")
    .run(email, passwordHash, role, now);
  const user = getUserById(Number(result.lastInsertRowid));
  if (!user) {
    throw new Error("用户创建失败");
  }
  return user;
};

export const updateUserRole = (id: number, role: UserRole): PublicUser | undefined => {
  db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id);
  const user = getUserById(id);
  return user ? mapPublicUser(user) : undefined;
};

export const deleteUserById = (id: number) => {
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
};

export const toPublicUser = (user: UserRecord): PublicUser => mapPublicUser(user);
