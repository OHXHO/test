import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSessionToken, getSessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth";
import { verifyCaptcha } from "@/lib/captcha";
import { countUsers, createUser, deleteUserById, getUserByEmail, toPublicUser } from "@/lib/users";

export const runtime = "nodejs";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string; captchaToken?: string; captchaCode?: string } = {};
  try {
    body = await req.json();
  } catch (error) {
    return NextResponse.json({ error: "请求解析失败" }, { status: 400 });
  }

  const email = normalizeEmail(body.email ?? "");
  const password = body.password ?? "";
  const captchaToken = body.captchaToken ?? "";
  const captchaCode = body.captchaCode ?? "";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "请输入有效的邮箱地址" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "密码长度至少为 6 位" }, { status: 400 });
  }
  if (!captchaToken || !captchaCode) {
    return NextResponse.json({ error: "请输入验证码" }, { status: 400 });
  }
  const captchaValid = verifyCaptcha({
    token: captchaToken,
    code: captchaCode,
    purpose: "register",
  });
  if (!captchaValid) {
    return NextResponse.json({ error: "验证码错误或已过期" }, { status: 400 });
  }

  const existing = getUserByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "该邮箱已注册" }, { status: 409 });
  }

  const role = countUsers() === 0 ? "admin" : "user";
  const passwordHash = await bcrypt.hash(password, 10);
  const user = createUser(email, passwordHash, role);

  try {
    const token = await createSessionToken(user.id);
    const response = NextResponse.json({ user: toPublicUser(user) }, { status: 201 });
    response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
    return response;
  } catch (error) {
    deleteUserById(user.id);
    return NextResponse.json(
      { error: "服务器认证配置异常，请确认已设置 AUTH_SECRET" },
      { status: 500 }
    );
  }
}
