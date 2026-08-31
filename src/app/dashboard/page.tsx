"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, BookOpen, PlusCircle, History, BarChart2,
  HelpCircle, User, Settings, LogOut, Bell, Plus, Play,
  Users, Trophy, CheckCircle2, AlertCircle
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

function formatRelativeTime(dateString: string) {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return "Recent";
  }
}

export default function TeacherDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [user, setUser] = useState<{ name: string; email: string; avatar?: string } | null>(null);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [recentGames, setRecentGames] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    totalGamesHosted: 0,
    totalParticipants: 0,
    averageScore: 0,
    averageAccuracy: 0,
    totalAnswers: 0,
  });
  const [donutData, setDonutData] = useState([
    { name: "Correct", value: 0, color: "#4F46E5" },
    { name: "Incorrect", value: 100, color: "#E2E8F0" },
  ]);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch live user & analytics from Supabase
    fetch("/api/analytics")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        }
        if (data.stats) {
          setStats(data.stats);
        }
        if (data.recentSessions) {
          setRecentGames(data.recentSessions);
        }
        if (data.donut) {
          const total = (data.donut.correct || 0) + (data.donut.incorrect || 0);
          if (total > 0) {
            setDonutData([
              { name: "Correct", value: data.donut.correct, color: "#4F46E5" },
              { name: "Incorrect", value: data.donut.incorrect, color: "#E2E8F0" },
            ]);
          } else {
            setDonutData([
              { name: "Correct", value: 0, color: "#4F46E5" },
              { name: "Incorrect", value: 0, color: "#E2E8F0" },
            ]);
          }
        }
        if (data.performanceTrends) {
          setPerformanceData(data.performanceTrends);
        }
      })
      .catch((err) => console.error("Error loading analytics:", err))
      .finally(() => setLoading(false));

    // 2. Fetch only quizzes created by the logged-in user
    fetch("/api/quizzes?authorOnly=true")
      .then((res) => res.json())
      .then((data) => {
        if (data.quizzes) {
          setQuizzes(data.quizzes);
        } else {
          setQuizzes([]);
        }
      })
      .catch((err) => {
        console.error("Error loading quizzes:", err);
        setQuizzes([]);
      });
  }, []);

  const handleHost = async (quizId: string) => {
    try {
      const res = await fetch("/api/sessions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId }),
      });
      const data = await res.json();
      if (data.session?.pin) {
        router.push(`/host/${data.session.pin}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <main className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto">
      {/* Top Header - Completely Dynamic User Name */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
              Welcome back, {user?.name || "Teacher"}! 👋
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Here&apos;s what&apos;s happening with your quizzes today.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/dashboard/quizzes/create">
              <button className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-2 transition">
                <Plus className="w-4 h-4" />
                Create Quiz
              </button>
            </Link>
            <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 shadow-sm transition">
              <Bell className="w-4 h-4" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-xl shadow-sm">
              {user?.avatar || "👨‍🏫"}
            </div>
          </div>
        </div>

        {/* 4 Stat Cards from Supabase Database */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl font-bold">
              📚
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{stats.totalQuizzes}</p>
              <p className="text-xs font-semibold text-slate-500">Quizzes</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold">
              🎮
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{stats.totalGamesHosted}</p>
              <p className="text-xs font-semibold text-slate-500">Games Hosted</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold">
              👥
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{stats.totalParticipants.toLocaleString()}</p>
              <p className="text-xs font-semibold text-slate-500">Participants</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl font-bold">
              🎯
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{stats.averageScore.toLocaleString()} pts</p>
              <p className="text-xs font-semibold text-slate-500">Average Score</p>
            </div>
          </div>
        </div>

        {/* Middle Row: Dynamic Recent Quizzes + Dynamic Recent Games */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Quizzes Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">Recent Quizzes</h2>
              <Link href="/dashboard/quizzes" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
                View all
              </Link>
            </div>

            <div className="space-y-3">
              {quizzes.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs font-bold">
                  No quizzes found. Click &quot;Create Quiz&quot; above to add your first quiz!
                </div>
              ) : (
                quizzes.slice(0, 4).map((q) => (
                  <div key={q.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between hover:bg-slate-100 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                        📝
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 truncate max-w-[200px]">{q.title}</p>
                        <p className="text-xs text-slate-500">{q._count?.questions || 10} Questions</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        q.isPublic ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"
                      }`}>
                        {q.isPublic ? "Public" : "Private"}
                      </span>
                      <button
                        onClick={() => handleHost(q.id)}
                        className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm"
                        title="Host Live"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Games Card - Dynamic from Supabase */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">Recent Games</h2>
              <Link href="/dashboard/reports" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
                View all
              </Link>
            </div>

            <div className="space-y-3">
              {recentGames.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs font-bold">
                  No live game sessions hosted yet. Launch a quiz to start!
                </div>
              ) : (
                recentGames.slice(0, 4).map((g) => (
                  <div key={g.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900 truncate max-w-[200px]">{g.title}</p>
                      <p className="text-xs text-slate-500 font-mono">PIN: {g.pin}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 font-medium">
                        {formatRelativeTime(g.createdAt)}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-black text-xs flex items-center justify-center">
                        {g.playersCount}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Bottom Row: Dynamic Performance Overview Line Chart + Dynamic Donut Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Performance Overview (2 cols) */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">Performance Overview</h2>
                <p className="text-xs text-slate-500 font-medium">Monthly Average Player Score</p>
              </div>
              <span className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2.5 py-1 rounded-lg">Live DB Stats</span>
            </div>

            <div className="h-60 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData}>
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} />
                  <YAxis stroke="#94A3B8" fontSize={12} domain={[0, 'auto']} />
                  <Tooltip
                    formatter={(value: any) => [`${Number(value).toLocaleString()} pts`, "Avg Score"]}
                    contentStyle={{
                      backgroundColor: "#0F172A",
                      borderColor: "#4F46E5",
                      borderRadius: "12px",
                      color: "#FFF",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#4F46E5"
                    strokeWidth={3}
                    dot={{ fill: "#4F46E5", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Dynamic Average Score Donut Chart (1 col) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">Accuracy Overview</h2>
              <span className="text-xs font-bold text-slate-400">
                {stats.totalAnswers} {stats.totalAnswers === 1 ? "answer" : "answers"}
              </span>
            </div>

            <div className="relative h-44 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-900">{stats.averageAccuracy}%</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Avg Accuracy</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 text-xs font-bold text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-indigo-600" /> Correct ({donutData[0]?.value}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-slate-300" /> Incorrect ({donutData[1]?.value}%)
              </span>
            </div>
          </div>
        </div>
      </main>
    );
}
