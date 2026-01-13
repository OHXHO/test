import React from 'react';
import { Plus, MessageSquare, Trash2, Menu, X, Settings } from 'lucide-react';
import { ChatSession } from '../types';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string, e: React.MouseEvent) => void;
  onOpenSettings: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onOpenSettings,
  isOpen,
  onClose
}) => {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed md:relative inset-y-0 left-0 z-30
        w-72 bg-gray-900 text-white flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">AI</span>
            </div>
            <span>智语助手</span>
          </div>
          <button onClick={onClose} className="md:hidden p-1 hover:bg-gray-800 rounded">
            <X size={20} />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <button
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 768) onClose();
            }}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors shadow-sm font-medium"
          >
            <Plus size={20} />
            <span>新建对话</span>
          </button>
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => {
                onSelectChat(session.id);
                if (window.innerWidth < 768) onClose();
              }}
              className={`
                group flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors
                ${currentSessionId === session.id 
                  ? 'bg-gray-800 text-white' 
                  : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'}
              `}
            >
              <MessageSquare size={18} className="shrink-0" />
              <div className="flex-1 truncate text-sm">
                {session.title || '新对话'}
              </div>
              <button
                onClick={(e) => onDeleteChat(session.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded transition-all"
                title="删除对话"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          
          {sessions.length === 0 && (
             <div className="text-center text-gray-500 mt-10 text-sm">
               暂无历史对话
             </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-800">
           <button 
             onClick={() => {
               onOpenSettings();
               if (window.innerWidth < 768) onClose();
             }}
             className="w-full flex items-center gap-2 px-3 py-2 text-gray-400 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
           >
             <Settings size={18} />
             <span className="text-sm">设置</span>
           </button>
           <div className="mt-2 text-xs text-gray-600 text-center">
             Powered by Google Gemini
           </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;