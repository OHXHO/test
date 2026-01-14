import { NextRequest, NextResponse } from "next/server";
import { createCaptcha, CaptchaPurpose } from "@/lib/captcha";

export const runtime = "nodejs";

const isValidPurpose = (value: string | null): value is CaptchaPurpose =>
  value === "login" || value === "register";

export async function GET(req: NextRequest) {
  const purposeParam = req.nextUrl.searchParams.get("purpose");
  if (!isValidPurpose(purposeParam)) {
    return NextResponse.json({ error: "无效的验证码用途" }, { status: 400 });
  }

  const captcha = createCaptcha(purposeParam);
  return NextResponse.json(captcha);
}
