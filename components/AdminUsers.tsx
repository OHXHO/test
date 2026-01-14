'use client';

import React, { useEffect, useState } from 'react';

interface AdminUser {
  id: number;
  email: string;
  role: 'admin' | 'user';
  created_at: string;
}

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUsers = async () => {
    setStatus(null);
    setIsLoading(true);
    try {
      const response = await fetch('/api/users', { credentials: 'include' });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? '加载用户失败');
      }
      const data = await response.json();
      setUsers(data.users ?? []);
    } catch (error: any) {
      setStatus(error.message ?? '加载用户失败，请稍后重试。');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleChange = async (userId: number, role: AdminUser['role']) => {
    setStatus(null);
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ role }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? '更新角色失败');
      }
      const data = await response.json();
      setUsers((prev) => prev.map((user) => (user.id === userId ? data.user : user)));
    } catch (error: any) {
      setStatus(error.message ?? '更新角色失败，请稍后重试。');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">用户管理</h1>
          <p className="text-sm text-gray-500">管理用户角色与权限</p>
        </div>
        <button
          type="button"
          onClick={loadUsers}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          刷新
        </button>
      </div>

      {status && <div className="text-sm text-red-500 mb-4">{status}</div>}

      {isLoading ? (
        <div className="text-sm text-gray-500">加载中...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 font-medium">邮箱</th>
                <th className="py-2 font-medium">角色</th>
                <th className="py-2 font-medium">创建时间</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b last:border-0">
                  <td className="py-3 text-gray-700">{user.email}</td>
                  <td className="py-3">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as AdminUser['role'])}
                      className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="admin">管理员</option>
                      <option value="user">普通用户</option>
                    </select>
                  </td>
                  <td className="py-3 text-gray-500">{new Date(user.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-gray-400">
                    暂无用户
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
