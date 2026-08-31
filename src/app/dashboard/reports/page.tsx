"use client";

import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { BarChart3, Users, Trophy, Clock, Award } from "lucide-react";

export default function ReportsPage() {
  const [stats, setStats] = useState<any>({
    totalQuizzes: 0,
    totalGamesHosted: 0,
    totalParticipants: 0,
    averageScore: 0,
  });
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((res) => res.json())
      .then((data) => {
        if (data.stats) setStats(data.stats);
        if (data.recentSessions) setRecentSessions(data.recentSessions);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const chartData = recentSessions.map((s) => ({
    name: s.quiz?.title?.substring(0, 15) || `PIN ${s.pin}`,
    participants: s.gameAnalytics?.totalParticipants || 0,
    avgScore: s.gameAnalytics?.averageScore || 0,
  }));

  return (
    <main className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto">
      {/* Top Header */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider">
          <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
          Analytics & Performance
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Game Reports & Insights
        </h1>
        <p className="text-sm text-slate-500 font-medium">
          Review participant engagement, average accuracy, and historical live game sessions.
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-1 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Games</span>
          <p className="text-3xl font-black text-slate-900">{stats.totalGamesHosted}</p>
        </div>
        <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-1 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Participants</span>
          <p className="text-3xl font-black text-slate-900">{stats.totalParticipants}</p>
        </div>
        <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-1 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Score</span>
          <p className="text-3xl font-black text-slate-900">{Number(stats.averageScore || 0).toLocaleString()} pts</p>
        </div>
        <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-1 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Quizzes</span>
          <p className="text-3xl font-black text-slate-900">{stats.totalQuizzes}</p>
        </div>
      </div>

      {/* Analytics Chart */}
      <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-3xl space-y-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900">Recent Session Turnout</h2>
            <p className="text-xs text-slate-500 font-medium">Participant counts per session</p>
          </div>
          <BarChart3 className="w-5 h-5 text-indigo-600" />
        </div>

        {recentSessions.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-400 font-bold text-sm">
            No live game sessions hosted yet. Launch a quiz to see live reports!
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    borderColor: "#E2E8F0",
                    borderRadius: "1rem",
                    color: "#0F172A",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Bar dataKey="participants" fill="#4F46E5" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* History Table */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
        <h2 className="text-lg font-black text-slate-900">Session History</h2>
        {recentSessions.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm font-semibold">
            No live game sessions found.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase text-slate-400 font-bold">
                  <th className="pb-3">Quiz</th>
                  <th className="pb-3">PIN</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Participants</th>
                  <th className="pb-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentSessions.map((s) => (
                  <tr key={s.id} className="text-slate-700 font-medium">
                    <td className="py-3.5 font-bold text-slate-900">{s.quiz?.title || "Quiz"}</td>
                    <td className="py-3.5 font-mono text-indigo-600 font-bold">{s.pin}</td>
                    <td className="py-3.5">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3.5 font-bold">{s.gameAnalytics?.totalParticipants || 0}</td>
                    <td className="py-3.5 text-xs text-slate-400">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
