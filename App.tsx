import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './components/Sidebar';
import MessageList from './components/MessageList';
import InputArea from './components/InputArea';
import SettingsModal from './components/SettingsModal';
import { ChatSession, Message, Attachment } from './types';
import { streamGeminiResponse } from './services/geminiService';

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

const STORAGE_KEY = 'smartchat_sessions';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSessions(parsed);
        if (parsed.length > 0) {
          setCurrentSessionId(parsed[0].id);
        } else {
          createNewSession();
        }
      } catch (e) {
        console.error("Failed to load sessions", e);
        createNewSession();
      }
    } else {
      createNewSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save to local storage whenever sessions change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
  }, [sessions]);

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: generateId(),
      title: '新对话',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    
    if (currentSessionId === id) {
      if (newSessions.length > 0) {
        setCurrentSessionId(newSessions[0].id);
      } else {
        // If all deleted, create a new one immediately, but we need to wait for state update
        // Easier: manually add one to state
        const emptySession: ChatSession = {
           id: generateId(),
           title: '新对话',
           messages: [],
           createdAt: Date.now(),
           updatedAt: Date.now(),
        };
        setSessions([emptySession]);
        setCurrentSessionId(emptySession.id);
      }
    }
  };

  const getCurrentSession = () => sessions.find(s => s.id === currentSessionId);

  const updateCurrentSession = (updater: (session: ChatSession) => ChatSession) => {
    setSessions(prev => prev.map(s => s.id === currentSessionId ? updater(s) : s));
  };

  const handleSendMessage = async (text: string, attachments: Attachment[]) => {
    if (!currentSessionId) return;

    // 1. Add User Message
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      text,
      attachments,
      timestamp: Date.now(),
    };

    updateCurrentSession(session => ({
      ...session,
      messages: [...session.messages, userMessage],
      updatedAt: Date.now(),
      // Auto-generate title if it's the first message
      title: session.messages.length === 0 ? (text.slice(0, 20) || '图片对话') : session.title
    }));

    setIsTyping(true);

    // 2. Prepare AI Placeholder
    const botMessageId = generateId();
    const botMessage: Message = {
      id: botMessageId,
      role: 'model',
      text: '',
      timestamp: Date.now() + 1,
    };

    updateCurrentSession(session => ({
      ...session,
      messages: [...session.messages, botMessage]
    }));

    // 3. Call API
    try {
      const currentSession = sessions.find(s => s.id === currentSessionId);
      // We need to construct history including the message just added
      // Note: currentSession is stale here, we need the updated one, but we can reconstruct local history easily
      const history = currentSession ? [...currentSession.messages, userMessage] : [userMessage];

      await streamGeminiResponse(history, (chunk) => {
        updateCurrentSession(session => {
          const updatedMessages = session.messages.map(msg => {
            if (msg.id === botMessageId) {
              return { ...msg, text: msg.text + chunk };
            }
            return msg;
          });
          return { ...session, messages: updatedMessages };
        });
      });

    } catch (error) {
      updateCurrentSession(session => {
        const updatedMessages = session.messages.map(msg => {
          if (msg.id === botMessageId) {
            return { 
              ...msg, 
              text: '抱歉，遇到了一些问题。请检查网络或在“设置”中配置正确的 API Key。',
              isError: true
            };
          }
          return msg;
        });
        return { ...session, messages: updatedMessages };
      });
    } finally {
      setIsTyping(false);
    }
  };

  const currentSession = getCurrentSession();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />

      {/* Sidebar */}
      <Sidebar 
        sessions={sessions}
        currentSessionId={currentSessionId}
        onNewChat={createNewSession}
        onSelectChat={setCurrentSessionId}
        onDeleteChat={deleteSession}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full w-full relative">
        {/* Mobile Header */}
        <div className="md:hidden h-14 bg-white border-b border-gray-200 flex items-center px-4 shrink-0 justify-between">
           <div className="flex items-center gap-3">
             <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg">
                <Menu size={20} className="text-gray-700" />
             </button>
             <span className="font-medium text-gray-800 truncate max-w-[200px]">
               {currentSession?.title || '智语 AI'}
             </span>
           </div>
        </div>

        {/* Chat Area */}
        {currentSession ? (
          <>
            <MessageList 
              messages={currentSession.messages} 
              isTyping={isTyping} 
            />
            <InputArea 
              onSend={handleSendMessage} 
              disabled={isTyping} 
            />
          </>
        ) : (
           <div className="flex-1 flex items-center justify-center text-gray-400">
             加载中...
           </div>
        )}
      </div>
    </div>
  );
};

export default App;