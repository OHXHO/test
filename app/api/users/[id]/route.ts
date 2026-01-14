import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/serverAuth";
import { countAdmins, getUserById, updateUserRole, UserRole } from "@/lib/users";

export const runtime = "nodejs";

const isValidRole = (role: string): role is UserRole => role === "admin" || role === "user";

export async function PATCH(req: NextRequest, context: { params: { id: string } }) {
  const operator = await getSessionUser();
  if (!operator) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  if (operator.role !== "admin") {
    return NextResponse.json({ error: "无权限访问" }, { status: 403 });
  }

  let body: { role?: string } = {};
  try {
    body = await req.json();
  } catch (error) {
    return NextResponse.json({ error: "请求解析失败" }, { status: 400 });
  }

  const role = body.role?.trim();
  if (!role || !isValidRole(role)) {
    return NextResponse.json({ error: "无效的角色" }, { status: 400 });
  }

  const userId = Number(context.params.id);
  if (!userId || Number.isNaN(userId)) {
    return NextResponse.json({ error: "无效的用户 ID" }, { status: 400 });
  }

  const target = getUserById(userId);
  if (!target) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  if (target.role === "admin" && role !== "admin" && countAdmins() <= 1) {
    return NextResponse.json({ error: "至少需要保留一名管理员" }, { status: 400 });
  }

  const updated = updateUserRole(userId, role);

  return NextResponse.json({ user: updated });
}
