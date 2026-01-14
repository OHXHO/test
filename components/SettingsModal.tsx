'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ConfigResponse {
  baseUrl?: string;
  model?: string;
  hasCustomApiKey: boolean;
  hasCustomModel?: boolean;
  defaultBaseUrl?: string;
  defaultModel?: string;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [modelInput, setModelInput] = useState('');
  const [hasCustomApiKey, setHasCustomApiKey] = useState(false);
  const [defaultBaseUrl, setDefaultBaseUrl] = useState('');
  const [defaultModel, setDefaultModel] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const loadConfig = async () => {
      try {
        const response = await fetch('/api/config', { credentials: 'include' });
        if (!response.ok) {
          throw new Error('获取配置失败');
        }
        const data: ConfigResponse = await response.json();
        setBaseUrl(data.baseUrl ?? '');
        setModelInput(data.model ?? '');
        setHasCustomApiKey(data.hasCustomApiKey);
        setDefaultBaseUrl(data.defaultBaseUrl ?? '');
        setDefaultModel(data.defaultModel ?? '');
      } catch (error) {
        console.error(error);
        setStatusMessage('无法加载配置，请稍后重试。');
      }
    };

    loadConfig();
  }, [isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const payload: Record<string, unknown> = {
        baseUrl: baseUrl.trim(),
        model: modelInput.trim(),
      };
      if (apiKeyInput.trim()) {
        payload.apiKey = apiKeyInput.trim();
      }

      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? '保存失败');
      }

      setApiKeyInput('');
      setHasCustomApiKey(hasCustomApiKey || Boolean(payload.apiKey));
      setStatusMessage('配置已保存。');
      onClose();
    } catch (error: any) {
      setStatusMessage(error.message ?? '保存失败，请稍后重试。');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearApiKey = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const response = await fetch('/api/config', {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? '清除失败');
      }
      setHasCustomApiKey(false);
      setApiKeyInput('');
      setStatusMessage('已清除自定义 API Key。');
    } catch (error: any) {
      setStatusMessage(error.message ?? '清除失败，请稍后再试。');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">设置</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder={hasCustomApiKey ? '已在服务器保存（留空保持不变）' : '请填写API_KEY'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-gray-500">在此填写的配置将安全地保存在服务器的账户设置中。</p>
              {hasCustomApiKey && (
                <button
                  type="button"
                  onClick={handleClearApiKey}
                  disabled={isSaving}
                  className="text-xs text-red-500 hover:text-red-600"
                >
                  清除
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="例如：https://aihubmix.com/v1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
            <p className="text-xs text-gray-500 mt-1">
              留空则使用默认地址{defaultBaseUrl ? `：${defaultBaseUrl}` : ''}。
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">模型</label>
            <input
              type="text"
              value={modelInput}
              onChange={(e) => setModelInput(e.target.value)}
              placeholder="例如：gemini-2.5-pro 或 gpt-4o-mini"
              list="model-options"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
            <datalist id="model-options">
              <option value="gemini-3-pro-preview" />
              <option value="gemini-2.5-pro" />
              <option value="gpt-5.2-pro" />
              <option value="gpt-4o" />
              <option value="gpt-4o-mini" />
            </datalist>
            <p className="text-xs text-gray-500 mt-1">
              留空则使用默认模型{defaultModel ? `：${defaultModel}` : ''}。
            </p>
          </div>

          {statusMessage && (
            <div className="text-sm text-red-500">{statusMessage}</div>
          )}
        </div>

        <div className="p-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
