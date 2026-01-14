import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSessionToken, getSessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth";
import { verifyCaptcha } from "@/lib/captcha";
import { getUserByEmail, toPublicUser } from "@/lib/users";

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

  if (!email || !password) {
    return NextResponse.json({ error: "请输入邮箱和密码" }, { status: 400 });
  }
  if (!captchaToken || !captchaCode) {
    return NextResponse.json({ error: "请输入验证码" }, { status: 400 });
  }
  const captchaValid = verifyCaptcha({
    token: captchaToken,
    code: captchaCode,
    purpose: "login",
  });
  if (!captchaValid) {
    return NextResponse.json({ error: "验证码错误或已过期" }, { status: 400 });
  }

  const user = getUserByEmail(email);
  if (!user) {
    return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
  }

  try {
    const token = await createSessionToken(user.id);
    const response = NextResponse.json({ user: toPublicUser(user) });
    response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "服务器认证配置异常，请确认已设置 AUTH_SECRET" },
      { status: 500 }
    );
  }
}
