'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

const LoginPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaImage, setCaptchaImage] = useState('');
  const [isCaptchaLoading, setIsCaptchaLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCaptcha = async () => {
    setIsCaptchaLoading(true);
    try {
      const response = await fetch('/api/auth/captcha?purpose=login', { cache: 'no-store' });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? '验证码获取失败');
      }
      const data = await response.json();
      setCaptchaToken(data.token || '');
      setCaptchaImage(data.image || '');
      setCaptchaCode('');
    } catch (error: any) {
      setStatus(error.message ?? '验证码获取失败，请稍后重试。');
    } finally {
      setIsCaptchaLoading(false);
    }
  };

  useEffect(() => {
    loadCaptcha();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password, captchaToken, captchaCode }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? '登录失败');
      }

      router.replace(redirect);
    } catch (error: any) {
      setStatus(error.message ?? '登录失败，请稍后重试。');
      loadCaptcha();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        <div className="mb-6 text-center">
          <div className="w-12 h-12 bg-blue-600 text-white rounded-xl mx-auto flex items-center justify-center text-lg font-bold">
            AI
          </div>
          <h1 className="text-2xl font-semibold text-gray-800 mt-4">欢迎回来</h1>
          <p className="text-sm text-gray-500 mt-1">登录后继续使用智语助手</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="请输入邮箱"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="请输入密码"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">验证码</label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={captchaCode}
                onChange={(e) => setCaptchaCode(e.target.value)}
                required
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="请输入验证码"
              />
              <button
                type="button"
                onClick={loadCaptcha}
                disabled={isCaptchaLoading}
                className="h-11 w-28 border border-gray-200 rounded-lg overflow-hidden bg-gray-50 hover:bg-gray-100 disabled:opacity-60"
                title="点击刷新验证码"
              >
                {captchaImage ? (
                  <img src={captchaImage} alt="验证码" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs text-gray-400">加载中</span>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">看不清？点击图片刷新</p>
          </div>

          {status && <div className="text-sm text-red-500">{status}</div>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '登录中...' : '登录'}
          </button>
        </form>

        <div className="text-sm text-gray-500 text-center mt-4">
          还没有账号？{' '}
          <Link href="/auth/register" className="text-blue-600 hover:underline">
            立即注册
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
