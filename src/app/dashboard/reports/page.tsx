"use client";

import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { BarChart3, Users, Trophy, Clock, Award, Link2, ExternalLink, ChevronRight, CheckCircle2 } from "lucide-react";

export default function ReportsPage() {
  const [stats, setStats] = useState<any>({
    totalQuizzes: 0,
    totalGamesHosted: 0,
    totalParticipants: 0,
    averageScore: 0,
  });
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"live" | "challenges">("challenges");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChallenge, setSelectedChallenge] = useState<any | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/analytics").then((res) => res.json()),
      fetch("/api/challenges").then((res) => res.json()).catch(() => ({ challenges: [] })),
    ])
      .then(([analyticsData, challengesData]) => {
        if (analyticsData.stats) setStats(analyticsData.stats);
        if (analyticsData.recentSessions) setRecentSessions(analyticsData.recentSessions);
        if (challengesData.challenges) setChallenges(challengesData.challenges);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const chartData = activeTab === "live"
    ? recentSessions.map((s) => ({
        name: s.quiz?.title?.substring(0, 15) || `PIN ${s.pin}`,
        participants: s.gameAnalytics?.totalParticipants || 0,
        avgScore: s.gameAnalytics?.averageScore || 0,
      }))
    : challenges.map((c) => ({
        name: c.quizTitle?.substring(0, 15) || c.title?.substring(0, 15) || "Challenge",
        participants: c.totalParticipants || 0,
        avgScore: c.avgScore || 0,
      }));

  return (
    <main className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider">
            <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
            Analytics & Performance
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Game & Challenge Reports
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Review participant rankings, scores, accuracy, and performance across both live games and shared link challenges.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 shrink-0">
          <button
            onClick={() => setActiveTab("challenges")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
              activeTab === "challenges"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Shared Challenges ({challenges.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("live")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
              activeTab === "live"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Live Games ({recentSessions.length})</span>
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-1 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Quizzes</span>
          <p className="text-3xl font-black text-slate-900">{stats.totalQuizzes}</p>
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
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {activeTab === "challenges" ? "Active Challenges" : "Live Games Hosted"}
          </span>
          <p className="text-3xl font-black text-slate-900">
            {activeTab === "challenges" ? challenges.filter((c) => !c.isExpired).length : stats.totalGamesHosted}
          </p>
        </div>
      </div>

      {/* Analytics Chart */}
      <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-3xl space-y-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              {activeTab === "challenges" ? "Challenge Turnout & Player Participation" : "Recent Live Session Turnout"}
            </h2>
            <p className="text-xs text-slate-500 font-medium">Player participation numbers per quiz</p>
          </div>
          <BarChart3 className="w-5 h-5 text-indigo-600" />
        </div>

        {chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-400 font-bold text-sm">
            {activeTab === "challenges"
              ? "No challenge links created yet. Share a challenge to see participant ranks!"
              : "No live game sessions hosted yet."}
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

      {/* 1. SHARED CHALLENGES TABLE (FOR NON-HOSTED GAMES) */}
      {activeTab === "challenges" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">Shared Quiz Challenges & Participant Ranks</h2>
              <p className="text-xs text-slate-500 font-medium">
                Click on any challenge to see the full participant leaderboard, ranks, and detailed scores.
              </p>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
              {challenges.length} Challenges
            </span>
          </div>

          {challenges.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm font-semibold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              No quiz challenge links created yet. Go to <strong>My Quizzes</strong> and click <strong>Share</strong> to create one!
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase text-slate-400 font-bold">
                    <th className="pb-3">Quiz Title</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Participants</th>
                    <th className="pb-3">Top Score</th>
                    <th className="pb-3">Avg Accuracy</th>
                    <th className="pb-3">Created</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {challenges.map((c) => (
                    <tr key={c.id} className="text-slate-700 font-medium hover:bg-slate-50/70 transition">
                      <td className="py-3.5 font-bold text-slate-900">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-900">{c.quizTitle}</span>
                          <span className="text-[11px] text-slate-400 font-medium">{c.totalQuestions} Questions</span>
                        </div>
                      </td>
                      <td className="py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                          c.isExpired
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}>
                          {c.isExpired ? "Closed" : "Active"}
                        </span>
                      </td>
                      <td className="py-3.5 font-black text-slate-900">
                        {c.totalParticipants} {c.totalParticipants === 1 ? "player" : "players"}
                      </td>
                      <td className="py-3.5 font-mono font-black text-indigo-600">
                        {c.highestScore?.toLocaleString()} pts
                      </td>
                      <td className="py-3.5 font-bold text-slate-600">
                        {c.avgAccuracy}%
                      </td>
                      <td className="py-3.5 text-xs text-slate-400 font-semibold">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 text-right">
                        <button
                          onClick={() => setSelectedChallenge(c)}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition inline-flex items-center gap-1.5"
                        >
                          <Trophy className="w-3.5 h-3.5" />
                          <span>View Ranks ({c.totalParticipants})</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 2. LIVE SESSIONS TABLE */}
      {activeTab === "live" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
          <h2 className="text-lg font-black text-slate-900">Live Game Session History</h2>
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
      )}

      {/* CHALLENGE PARTICIPANT RANKS & LEADERBOARD MODAL */}
      {selectedChallenge && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-5 sm:p-7 text-slate-900 max-w-2xl w-full max-h-[90vh] flex flex-col justify-between shadow-2xl space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl font-black">
                  🏆
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    {selectedChallenge.quizTitle}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Leaderboard & Complete Participant Ranks
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedChallenge(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            {/* Challenge Summary Badges */}
            <div className="grid grid-cols-4 gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-3 shrink-0 text-center text-xs">
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Players</span>
                <span className="font-black text-slate-900 text-sm">{selectedChallenge.totalParticipants}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Top Score</span>
                <span className="font-mono font-black text-emerald-600 text-sm">{selectedChallenge.highestScore?.toLocaleString()} pts</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Avg Accuracy</span>
                <span className="font-black text-indigo-600 text-sm">{selectedChallenge.avgAccuracy}%</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Status</span>
                <span className={`inline-block font-extrabold text-[11px] px-2 py-0.5 rounded-full ${
                  selectedChallenge.isExpired ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-800"
                }`}>
                  {selectedChallenge.isExpired ? "Closed" : "Active"}
                </span>
              </div>
            </div>

            {/* Rankings List */}
            <div className="flex-1 flex flex-col space-y-2 min-h-0 overflow-y-auto pr-1">
              {(!selectedChallenge.rankings || selectedChallenge.rankings.length === 0) ? (
                <div className="py-12 text-center text-slate-400 text-xs font-semibold bg-slate-50 rounded-2xl border border-dashed border-slate-200 my-auto">
                  No player submissions recorded for this challenge yet.
                </div>
              ) : (
                selectedChallenge.rankings.map((p: any, idx: number) => {
                  const medalIcons = ["🥇", "🥈", "🥉"];
                  return (
                    <div
                      key={p.id || idx}
                      className={`p-3 rounded-2xl border flex items-center justify-between transition ${
                        idx === 0
                          ? "bg-amber-50/80 border-amber-200 shadow-sm"
                          : idx === 1
                          ? "bg-slate-50 border-slate-200"
                          : idx === 2
                          ? "bg-amber-50/40 border-amber-100"
                          : "bg-white border-slate-100 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="font-black text-sm w-6 text-center shrink-0 text-slate-700">
                          {idx < 3 ? medalIcons[idx] : `#${idx + 1}`}
                        </span>
                        <span className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-lg shadow-sm shrink-0">
                          {p.avatar || "🦊"}
                        </span>
                        <div className="flex flex-col min-w-0 flex-1 text-left">
                          <span className="font-black text-sm text-slate-900 truncate">
                            {p.nickname}
                          </span>
                          <span className="text-[11px] text-slate-400 font-semibold">
                            {p.totalCorrect !== undefined ? `${p.totalCorrect}/${p.totalQuestions || selectedChallenge.totalQuestions} correct` : ""}
                            {p.completedAt ? ` • ${new Date(p.completedAt).toLocaleDateString()} ${new Date(p.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ""}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-black text-base text-indigo-600 block">
                          {p.score?.toLocaleString()} pts
                        </span>
                        {p.accuracy !== undefined && (
                          <span className="text-[11px] font-bold text-slate-500">
                            {p.accuracy}% accuracy
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-400 font-medium">
                Official participant rankings for this challenge
              </span>
              <button
                onClick={() => setSelectedChallenge(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

