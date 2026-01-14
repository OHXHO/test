import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "智语 AI - 智能助手",
  description: "一个支持 Gemini 模型的智能对话应用，提供多会话管理与参考资料上传。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-gray-50 text-gray-900 h-screen overflow-hidden">
        {children}
      </body>
    </html>
  );
}
