'use client';

import React, { useState, useRef, ChangeEvent } from 'react';
import { Send, Paperclip, X, File as FileIcon } from 'lucide-react';
import { Attachment } from '@/types';
import { fileToBase64 } from '@/services/fileUtils';

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

interface InputAreaProps {
  onSend: (text: string, attachments: Attachment[]) => void;
  disabled: boolean;
}

const InputArea: React.FC<InputAreaProps> = ({ onSend, disabled }) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const selected: Attachment[] = [];

    for (let i = 0; i < e.target.files.length; i += 1) {
      const file = e.target.files[i];
      try {
        const base64Data = await fileToBase64(file);
        const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
        selected.push({
          id: generateId(),
          fileName: file.name,
          base64Data,
          mimeType: file.type,
          size: file.size,
          previewUrl,
        });
      } catch (error) {
        console.error('读取文件失败', error);
      }
    }

    setAttachments((prev) => [...prev, ...selected]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    const target = attachments.find((att) => att.id === id);
    if (target?.previewUrl) {
      URL.revokeObjectURL(target.previewUrl);
    }
    setAttachments((prev) => prev.filter((att) => att.id !== id));
  };

  const handleSend = () => {
    if (disabled) return;
    if (!text.trim() && attachments.length === 0) return;

    onSend(text, attachments);
    attachments.forEach((att) => {
      if (att.previewUrl) {
        URL.revokeObjectURL(att.previewUrl);
      }
    });
    setText('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 bg-white border-t border-gray-200">
      <div className="max-w-4xl mx-auto">
        {attachments.length > 0 && (
          <div className="flex gap-3 mb-3 overflow-x-auto pb-2 px-1">
            {attachments.map((att) => (
              <div key={att.id} className="relative group shrink-0">
                <div className="w-16 h-16 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                  {att.mimeType.startsWith('image/') && att.previewUrl ? (
                    <img src={att.previewUrl} alt="attachment preview" className="w-full h-full object-cover" />
                  ) : (
                    <FileIcon size={24} className="text-gray-400" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  className="absolute -top-1.5 -right-1.5 bg-gray-800 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-3 bg-white rounded-xl border border-gray-300 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all p-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
            disabled={disabled}
            title="上传图片/文档"
          >
            <Paperclip size={20} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt,.md,.csv,.json,.xls,.xlsx,.ppt,.pptx"
            onChange={handleFileSelect}
          />

          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="输入消息...（Shift + Enter 换行）"
            className="flex-1 max-h-40 bg-transparent border-none focus:ring-0 p-2 resize-none outline-none text-gray-700 leading-relaxed custom-scrollbar"
            rows={1}
            disabled={disabled}
            style={{ minHeight: '44px' }}
          />

          <button
            type="button"
            onClick={handleSend}
            disabled={(!text.trim() && attachments.length === 0) || disabled}
            className={`
              p-2.5 rounded-lg transition-all mb-0.5
              ${(!text.trim() && attachments.length === 0) || disabled
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'}
            `}
          >
            <Send size={18} />
          </button>
        </div>

        <div className="text-center mt-2">
          <p className="text-xs text-gray-400">大语言模型可能会出错，请核对重要信息。</p>
        </div>
      </div>
    </div>
  );
};

export default InputArea;
