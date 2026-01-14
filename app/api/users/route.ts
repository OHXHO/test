import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/serverAuth";
import { listUsers } from "@/lib/users";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "无权限访问" }, { status: 403 });
  }
  return NextResponse.json({ users: listUsers() });
}
