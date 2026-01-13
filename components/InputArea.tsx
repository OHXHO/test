import React, { useState, useRef, ChangeEvent } from 'react';
import { Send, Paperclip, X, Image as ImageIcon, File as FileIcon } from 'lucide-react';
import { Attachment } from '../types';
import { fileToBase64, isImageFile } from '../services/fileUtils';
import { v4 as uuidv4 } from 'uuid'; // We'll implement a simple ID generator if uuid package isn't available, but let's just use random string for now.

// Simple UUID generator since we don't have the uuid package in this environment
const generateId = () => Math.random().toString(36).substring(2, 15);

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
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newAttachments: Attachment[] = [];
      
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        
        // Basic validation: Only images for now to ensure smooth Gemini support in this demo
        // Though the prompt asked for "reference materials", images are the safest "multimodal" demo.
        // We can add text file reading later if needed, but let's support images primarily.
        
        try {
          const base64 = await fileToBase64(file);
          newAttachments.push({
            id: generateId(),
            file,
            previewUrl: URL.createObjectURL(file),
            base64Data: base64,
            mimeType: file.type
          });
        } catch (err) {
          console.error("Failed to read file", err);
        }
      }

      setAttachments(prev => [...prev, ...newAttachments]);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const handleSend = () => {
    if ((!text.trim() && attachments.length === 0) || disabled) return;
    
    onSend(text, attachments);
    setText('');
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
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
        
        {/* Attachment Previews */}
        {attachments.length > 0 && (
          <div className="flex gap-3 mb-3 overflow-x-auto pb-2 px-1">
            {attachments.map((att) => (
              <div key={att.id} className="relative group shrink-0">
                <div className="w-16 h-16 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                  {att.mimeType.startsWith('image/') ? (
                    <img src={att.previewUrl} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <FileIcon size={24} className="text-gray-400" />
                  )}
                </div>
                <button
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
          
          {/* File Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`
              p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors
              ${disabled ? 'cursor-not-allowed opacity-50' : ''}
            `}
            disabled={disabled}
            title="上传参考资料"
          >
            <Paperclip size={20} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            accept="image/*" // Restricting to images for best multimodal experience with basic config
            onChange={handleFileSelect}
          />

          {/* Text Input */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (Shift + Enter 换行)"
            className="flex-1 max-h-40 bg-transparent border-none focus:ring-0 p-2 resize-none outline-none text-gray-700 leading-relaxed custom-scrollbar"
            rows={1}
            disabled={disabled}
            style={{ minHeight: '44px' }}
          />

          {/* Send Button */}
          <button
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
           <p className="text-xs text-gray-400">Gemini 可能会犯错。请核查重要信息。</p>
        </div>
      </div>
    </div>
  );
};

export default InputArea;