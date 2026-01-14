import { redirect } from "next/navigation";
import AdminUsers from "@/components/AdminUsers";
import { getSessionUser } from "@/lib/serverAuth";

export default async function AdminUsersPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/auth/login");
  }

  if (user.role !== "admin") {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white border border-gray-100 rounded-2xl shadow-md p-8 text-center">
          <h1 className="text-xl font-semibold text-gray-800 mb-2">无权限访问</h1>
          <p className="text-sm text-gray-500">请联系管理员开通权限。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <AdminUsers />
      </div>
    </div>
  );
}
