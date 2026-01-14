import { NextRequest, NextResponse } from "next/server";
import { determineProvider, resolveModelName } from "@/lib/llmConfig";
import { getSessionUser } from "@/lib/serverAuth";
import { clearUserApiKey, getUserSettings, upsertUserSettings } from "@/lib/userSettings";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const settings = getUserSettings(user.id);
  const baseUrl = settings?.base_url ?? "";
  const model = settings?.model ?? "";
  const hasCustomApiKey = Boolean(settings?.api_key);
  const hasCustomModel = Boolean(settings?.model);
  const resolvedBaseUrl = baseUrl || process.env.YOUR_BASE_URL;
  const provider = determineProvider(resolvedBaseUrl);
  const defaultModel = resolveModelName(provider, undefined, process.env.GEMINI_MODEL);

  return NextResponse.json({
    baseUrl,
    model,
    hasCustomApiKey,
    hasCustomModel,
    defaultBaseUrl: process.env.YOUR_BASE_URL ?? "",
    defaultModel,
  });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  let body: { apiKey?: string; baseUrl?: string; model?: string } = {};
  try {
    body = await req.json();
  } catch (error) {
    return NextResponse.json({ error: "请求体解析失败" }, { status: 400 });
  }

  const existing = getUserSettings(user.id);

  let nextApiKey = existing?.api_key ?? null;
  if (typeof body.apiKey === "string") {
    const trimmed = body.apiKey.trim();
    if (trimmed) {
      nextApiKey = trimmed;
    }
  }

  let nextBaseUrl = existing?.base_url ?? null;
  if (typeof body.baseUrl === "string") {
    const trimmed = body.baseUrl.trim();
    nextBaseUrl = trimmed ? trimmed : null;
  }

  let nextModel = existing?.model ?? null;
  if (typeof body.model === "string") {
    const trimmed = body.model.trim();
    nextModel = trimmed ? trimmed : null;
  }

  upsertUserSettings(user.id, {
    apiKey: nextApiKey,
    baseUrl: nextBaseUrl,
    model: nextModel,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  clearUserApiKey(user.id);
  return NextResponse.json({ success: true });
}
