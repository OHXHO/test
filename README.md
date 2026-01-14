<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 智语 AI（SmartChat）

一个基于 Next.js 构建的 Gemini 智能助手，可以安全地在服务端调用 Gemini API，支持多会话管理、附件上传以及自定义 API Key/Base URL。

## 本地运行

**前置要求：** Node.js 18+

1. 安装依赖：`npm install`
2. 在项目根目录创建或更新 `.env.local`，配置至少以下内容：

   ```bash
   YOUR_API_KEY=你的_API_Key
   # 可选：自定义模型与基础地址
   # YOUR_MODEL=gemini-2.5-PRO
   # YOUR_BASE_URL=https://generativelanguage.googleapis.com
   ```

3. 启动开发服务器：`npm run dev`
4. 访问 `http://localhost:3000`

> 在界面右上方的“设置”中也可以为当前会话配置自定义 API Key 与 Base URL。该信息会以 HttpOnly Cookie 形式保存在服务端，不会暴露给前端。
