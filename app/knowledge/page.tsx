'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Trash2, UploadCloud } from 'lucide-react';
import type { KnowledgeFile, UserInfo } from '@/types';

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
};

const KnowledgePage: React.FC = () => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  const loadFiles = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const response = await fetch('/api/knowledge/files', { credentials: 'include' });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? '加载知识库失败');
      }
      const data = await response.json();
      setFiles(Array.isArray(data.files) ? data.files : []);
    } catch (error: any) {
      setStatusMessage(error?.message ?? '加载知识库失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authChecked && currentUser) {
      loadFiles();
    }
  }, [authChecked, currentUser]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    setSelectedFiles(selected);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || isUploading) return;
    setIsUploading(true);
    setStatusMessage(null);
    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('/api/knowledge/files', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? '上传失败');
      }

      const data = await response.json();
      const uploaded = Array.isArray(data.files) ? data.files : [];
      setFiles((prev) => [...uploaded, ...prev]);
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setStatusMessage('上传成功');
    } catch (error: any) {
      setStatusMessage(error?.message ?? '上传失败');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (fileId: number) => {
    if (!window.confirm('确定删除该文件吗？')) return;
    setStatusMessage(null);
    try {
      const response = await fetch(`/api/knowledge/files/${fileId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? '删除失败');
      }
      setFiles((prev) => prev.filter((file) => file.id !== fileId));
    } catch (error: any) {
      setStatusMessage(error?.message ?? '删除失败');
    }
  };

  if (!authChecked || !currentUser) {
    return <div className="h-screen flex items-center justify-center text-gray-400">正在加载...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">个人知识库</h1>
              <p className="text-sm text-gray-500">上传文档以便后续检索和使用</p>
            </div>
          </div>
          <div className="text-sm text-gray-500">{currentUser.email}</div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start gap-4 flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-800">上传文件</h2>
              <p className="text-sm text-gray-500 mt-1">
                支持 PDF、Word、表格、文本及图片等格式，单文件最大 20MB。
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt,.md,.csv,.json,.xls,.xlsx,.ppt,.pptx,.rtf,.html,.htm,.xml,.yaml,.yml"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
              >
                选择文件
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || isUploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <UploadCloud size={16} />
                上传
              </button>
            </div>
          </div>

          {selectedFiles.length > 0 && (
            <div className="mt-4 border border-dashed border-gray-200 rounded-lg p-4 text-sm text-gray-600">
              <div className="font-medium mb-2">待上传文件</div>
              <div className="space-y-1">
                {selectedFiles.map((file) => (
                  <div key={`${file.name}-${file.size}`} className="flex items-center justify-between">
                    <span className="truncate">{file.name}</span>
                    <span className="text-xs text-gray-400">{formatBytes(file.size)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {statusMessage && (
            <div className="mt-4 text-sm text-blue-600">{statusMessage}</div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">已上传文件</h2>
            <button
              type="button"
              onClick={loadFiles}
              disabled={isLoading}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              刷新
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {files.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-500">
                {isLoading ? '加载中...' : '暂未上传任何文件'}
              </div>
            ) : (
              files.map((file) => (
                <div key={file.id} className="px-6 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                    <FileText size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{file.originalName}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {file.mimeType} · {formatBytes(file.size)} · {new Date(file.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(file.id)}
                    className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1"
                  >
                    <Trash2 size={16} />
                    删除
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgePage;
