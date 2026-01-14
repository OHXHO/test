export interface Attachment {
  id: string;
  fileName: string;
  previewUrl?: string;
  base64Data?: string;
  mimeType: string;
  size?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  attachments?: Attachment[];
  timestamp: number;
  isError?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface ChatState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  isSidebarOpen: boolean;
}

export type UserRole = "admin" | "user";

export interface UserInfo {
  id: number;
  email: string;
  role: UserRole;
}

export interface KnowledgeFile {
  id: number;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}
