'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import MessageList from '@/components/MessageList';
import InputArea from '@/components/InputArea';
import SettingsModal from '@/components/SettingsModal';
import { ChatSession, Message, Attachment, UserInfo } from '@/types';
import { streamGeminiResponse } from '@/services/geminiService';

const STORAGE_KEY = 'smartchat_sessions';

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

const createEmptySession = (): ChatSession => ({
  id: generateId(),
  title: '新对话',
  messages: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const Page: React.FC = () => {
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        if (!response.ok) {
          throw new Error('未登录');
        }
        const data = await response.json();
        setCurrentUser(data.user ?? null);
      } catch (error) {
        router.replace('/auth/login');
      } finally {
        setAuthChecked(true);
      }
    };

    loadUser();
  }, [router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: ChatSession[] = JSON.parse(saved);
        setSessions(parsed);
        if (parsed.length > 0) {
          setCurrentSessionId(parsed[0].id);
          return;
        }
      } catch (error) {
        console.error('会话历史加载失败', error);
      }
    }
    const session = createEmptySession();
    setSessions([session]);
    setCurrentSessionId(session.id);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  const currentSession = useMemo(
    () => sessions.find((session) => session.id === currentSessionId) ?? null,
    [sessions, currentSessionId]
  );

  const updateCurrentSession = (updater: (session: ChatSession) => ChatSession) => {
    if (!currentSessionId) return;
    setSessions((prev) =>
      prev.map((session) => (session.id === currentSessionId ? updater(session) : session))
    );
  };

  const createNewSession = () => {
    const newSession = createEmptySession();
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions((prev) => {
      const filtered = prev.filter((session) => session.id !== id);
      if (filtered.length === 0) {
        const fallback = createEmptySession();
        setCurrentSessionId(fallback.id);
        return [fallback];
      }
      if (currentSessionId === id) {
        setCurrentSessionId(filtered[0].id);
      }
      return filtered;
    });
  };

  const handleSendMessage = async (text: string, attachments: Attachment[]) => {
    if (!currentSessionId) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      text,
      attachments,
      timestamp: Date.now(),
    };

    const historyBeforeSend = currentSession?.messages ?? [];
    const updatedHistory = [...historyBeforeSend, userMessage];

    updateCurrentSession((session) => ({
      ...session,
      messages: [...session.messages, userMessage],
      updatedAt: Date.now(),
      title: session.messages.length === 0 ? (text.slice(0, 20) || '图片对话') : session.title,
    }));

    setIsTyping(true);

    const botMessageId = generateId();
    const botMessage: Message = {
      id: botMessageId,
      role: 'model',
      text: '',
      timestamp: Date.now() + 1,
    };

    updateCurrentSession((session) => ({
      ...session,
      messages: [...session.messages, botMessage],
    }));

    try {
      await streamGeminiResponse(updatedHistory, (chunk) => {
        updateCurrentSession((session) => {
          const updatedMessages = session.messages.map((msg) =>
            msg.id === botMessageId ? { ...msg, text: (msg.text || '') + chunk } : msg
          );
          return {
            ...session,
            messages: updatedMessages,
            updatedAt: Date.now(),
          };
        });
      });
    } catch (error: any) {
      updateCurrentSession((session) => {
        const updatedMessages = session.messages.map((msg) =>
          msg.id === botMessageId
            ? {
                ...msg,
                text:
                  error?.message ||
                  '抱歉，调用服务失败，请检查网络或在“设置”里配置有效的 API Key。',
                isError: true,
              }
            : msg
        );
        return {
          ...session,
          messages: updatedMessages,
          updatedAt: Date.now(),
        };
      });
    } finally {
      setIsTyping(false);
    }
  };

  return (
    !authChecked || !currentUser ? (
      <div className="h-screen flex items-center justify-center text-gray-400">正在加载...</div>
    ) : (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onNewChat={createNewSession}
        onSelectChat={setCurrentSessionId}
        onDeleteChat={deleteSession}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={async () => {
          await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
          router.replace('/auth/login');
        }}
        user={currentUser}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col h-full w-full relative">
        <div className="md:hidden h-14 bg-white border-b border-gray-200 flex items-center px-4 shrink-0 justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu size={20} className="text-gray-700" />
            </button>
            <span className="font-medium text-gray-800 truncate max-w-[200px]">
              {currentSession?.title || '智语 AI'}
            </span>
          </div>
        </div>

        {currentSession ? (
          <>
            <MessageList messages={currentSession.messages} isTyping={isTyping} />
            <InputArea onSend={handleSendMessage} disabled={isTyping} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">加载中...</div>
        )}
      </div>
    </div>
    )
  );
};

export default Page;
