"use client";

import React, { useState, useEffect } from "react";
import { Shield, Users, BookOpen, Gamepad2, Layers, AlertTriangle, CheckCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>({
    totalUsers: 0,
    totalQuizzes: 0,
    totalSessions: 0,
    totalCategories: 0,
  });
  const [users, setUsers] = useState<any[]>([]);
  const [recentQuizzes, setRecentQuizzes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats || {});
        setUsers(data.users || []);
        setRecentQuizzes(data.recentQuizzes || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm("Are you sure as Admin you want to delete this quiz?")) return;
    try {
      const res = await fetch(`/api/quizzes/${quizId}`, { method: "DELETE" });
      if (res.ok) {
        setRecentQuizzes((prev) => prev.filter((q) => q.id !== quizId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="border-b border-white/10 pb-6 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold uppercase tracking-wider">
          <Shield className="w-3.5 h-3.5 text-rose-400" />
          Super Admin Control Center
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Platform Administration
        </h1>
        <p className="text-slate-400 text-sm font-medium">
          Manage system users, moderate global quizzes, monitor server health, and manage categories.
        </p>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="glass-card p-6 rounded-3xl space-y-2 border-rose-500/20">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Users</span>
            <Users className="w-5 h-5 text-rose-400" />
          </div>
          <p className="text-3xl font-black text-white">{stats.totalUsers}</p>
        </div>

        <div className="glass-card p-6 rounded-3xl space-y-2 border-purple-500/20">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Quizzes</span>
            <BookOpen className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-3xl font-black text-white">{stats.totalQuizzes}</p>
        </div>

        <div className="glass-card p-6 rounded-3xl space-y-2 border-indigo-500/20">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Game Sessions</span>
            <Gamepad2 className="w-5 h-5 text-indigo-400" />
          </div>
          <p className="text-3xl font-black text-white">{stats.totalSessions}</p>
        </div>

        <div className="glass-card p-6 rounded-3xl space-y-2 border-emerald-500/20">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Categories</span>
            <Layers className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-white">{stats.totalCategories}</p>
        </div>
      </div>

      {/* Users Management Table */}
      <div className="glass-panel p-6 rounded-3xl space-y-4 shadow-xl">
        <h3 className="text-xl font-bold text-white">Registered Users & Teachers</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 text-xs uppercase font-bold">
                <th className="pb-3 px-4">User</th>
                <th className="pb-3 px-4">Email</th>
                <th className="pb-3 px-4">Role</th>
                <th className="pb-3 px-4">Quizzes Created</th>
                <th className="pb-3 px-4">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-white/5 transition">
                  <td className="py-3.5 px-4 flex items-center gap-2 font-bold text-white">
                    <span className="text-xl">{u.avatar || "👤"}</span>
                    {u.name}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 font-mono text-xs">{u.email}</td>
                  <td className="py-3.5 px-4">
                    <Badge variant={u.role === "ADMIN" ? "danger" : "primary"}>{u.role}</Badge>
                  </td>
                  <td className="py-3.5 px-4 text-purple-300 font-bold">{u._count?.quizzes || 0}</td>
                  <td className="py-3.5 px-4 text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quizzes Moderation Table */}
      <div className="glass-panel p-6 rounded-3xl space-y-4 shadow-xl">
        <h3 className="text-xl font-bold text-white">Global Quizzes Moderation</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 text-xs uppercase font-bold">
                <th className="pb-3 px-4">Title</th>
                <th className="pb-3 px-4">Category</th>
                <th className="pb-3 px-4">Author</th>
                <th className="pb-3 px-4">Questions</th>
                <th className="pb-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recentQuizzes.map((q) => (
                <tr key={q.id} className="hover:bg-white/5 transition">
                  <td className="py-3.5 px-4 font-bold text-white">{q.title}</td>
                  <td className="py-3.5 px-4">
                    <Badge variant="purple">{q.category?.name || "General"}</Badge>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">{q.author?.name}</td>
                  <td className="py-3.5 px-4 text-slate-400">{q._count?.questions || 0}</td>
                  <td className="py-3.5 px-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteQuiz(q.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
