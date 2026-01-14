'use client';

import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User, AlertCircle, FileText } from 'lucide-react';
import { Message } from '@/types';

interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
}

const MessageList: React.FC<MessageListProps> = ({ messages, isTyping }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const getImageSrc = (attachment: Message['attachments'][number]) => {
    if (!attachment) return '';
    if (attachment.base64Data) {
      return `data:${attachment.mimeType};base64,${attachment.base64Data}`;
    }
    if (attachment.previewUrl) return attachment.previewUrl;
    return '';
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-gray-50 scroll-smooth">
      {messages.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60 text-center">
          <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-6">
            <Bot size={48} className="text-gray-400" />
          </div>
          <h2 className="text-xl font-medium mb-2">有什么可以帮您的吗？</h2>
          <p className="text-sm">您可以上传图片或文档，或提供背景信息，开始与智能助手对话。</p>
        </div>
      )}

      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex gap-4 max-w-4xl mx-auto ${
            msg.role === 'user' ? 'flex-row-reverse' : ''
          }`}
        >
          <div
            className={`
            w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm
            ${msg.role === 'user' ? 'bg-blue-600' : 'bg-white border border-gray-200'}
          `}
          >
            {msg.role === 'user' ? (
              <User size={20} className="text-white" />
            ) : (
              <Bot size={20} className="text-blue-600" />
            )}
          </div>

          <div className="flex flex-col gap-2 max-w-[85%] md:max-w-[75%]">
            {msg.attachments && msg.attachments.length > 0 && (
              <div className={`flex flex-wrap gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.attachments.map((att) => (
                  <div key={att.id} className="relative group overflow-hidden rounded-lg border border-gray-200 shadow-sm bg-white">
                    {att.mimeType.startsWith('image/') ? (
                      <img
                        src={getImageSrc(att)}
                        alt={att.fileName}
                        className="h-32 w-auto object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-20 w-32 flex flex-col items-center justify-center bg-gray-100 p-2">
                        <FileText size={24} className="text-gray-500 mb-1" />
                        <span className="text-xs text-gray-500 truncate w-full text-center">{att.fileName}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {msg.text && (
              <div
                className={`
                px-5 py-3.5 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed break-words
                ${msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-sm'
                  : 'bg-white text-gray-800 border border-gray-200 rounded-tl-sm'}
                ${msg.isError ? 'border-red-500 bg-red-50 text-red-600' : ''}
              `}
              >
                {msg.isError ? (
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>{msg.text}</span>
                  </div>
                ) : (
                  <div className="markdown-body">
                    {msg.role === 'user' ? (
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    ) : (
                      <ReactMarkdown
                        components={{
                          p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                          ul: ({ node, ...props }) => <ul className="list-disc ml-4 mb-2" {...props} />,
                          ol: ({ node, ...props }) => <ol className="list-decimal ml-4 mb-2" {...props} />,
                          li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                          a: ({ node, ...props }) => (
                            <a className="text-blue-500 hover:underline" target="_blank" rel="noreferrer" {...props} />
                          ),
                          code: ({ node, ...props }) => (
                            <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-red-500" {...props} />
                          ),
                          pre: ({ node, ...props }) => (
                            <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto text-sm my-2 font-mono" {...props} />
                          ),
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}

      {isTyping && (
        <div className="flex gap-4 max-w-4xl mx-auto">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-white border border-gray-200 shadow-sm">
            <Bot size={20} className="text-blue-600" />
          </div>
          <div className="flex items-center">
            <div className="flex gap-1 bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm border border-gray-200">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} className="h-4" />
    </div>
  );
};

export default MessageList;
