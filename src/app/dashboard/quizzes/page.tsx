"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Play, Edit3, Copy, Trash2, BookOpen, Clock, Users, Search, Trophy, Link2, Check, RefreshCw } from "lucide-react";
import SafeImage from "@/components/SafeImage";

export default function MyQuizzesPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hostingId, setHostingId] = useState<string | null>(null);
  const [challengeModalQuiz, setChallengeModalQuiz] = useState<any | null>(null);
  const [durationMode, setDurationMode] = useState<string>("180"); // 180 min = 3 hours default
  const [customDurationValue, setCustomDurationValue] = useState<number>(15);
  const [customDurationUnit, setCustomDurationUnit] = useState<"minutes" | "hours" | "days">("minutes");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [isGeneratingChallenge, setIsGeneratingChallenge] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  // Standings / Ranks modal for non-hosted / challenge quizzes
  const [ranksModalQuiz, setRanksModalQuiz] = useState<any | null>(null);
  const [quizChallenges, setQuizChallenges] = useState<any[]>([]);
  const [combinedChallenge, setCombinedChallenge] = useState<any | null>(null);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(false);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  const [ranksSearchQuery, setRanksSearchQuery] = useState("");
  const [copiedChallengeId, setCopiedChallengeId] = useState<string | null>(null);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const handleOpenRanksModal = async (quiz: any) => {
    setRanksModalQuiz(quiz);
    setLoadingChallenges(true);
    setRanksSearchQuery("");
    try {
      const res = await fetch(`/api/challenges?quizId=${quiz.id}`);
      const data = await res.json();
      const list = data.challenges || [];
      const combined = data.combinedChallenge || null;
      const live = data.liveSessions || [];
      setQuizChallenges(list);
      setCombinedChallenge(combined);
      setLiveSessions(live);

      if (combined && (list.length > 1 || combined.totalParticipants > (list[0]?.totalParticipants || 0))) {
        setSelectedChallengeId("all-combined");
      } else if (list.length > 0) {
        setSelectedChallengeId(list[0].id);
      } else if (live.length > 0) {
        setSelectedChallengeId("live-games");
      } else {
        setSelectedChallengeId(null);
      }
    } catch (err) {
      console.error("Failed to load quiz challenges:", err);
      setQuizChallenges([]);
      setCombinedChallenge(null);
      setLiveSessions([]);
    } finally {
      setLoadingChallenges(false);
    }
  };

  const handleOpenChallengeModal = (quiz: any) => {
    setChallengeModalQuiz(quiz);
    setGeneratedLink(null);
    setHasCopied(false);
    setDurationMode("180");
    setCustomDurationValue(15);
    setCustomDurationUnit("minutes");
  };

  const getTotalDurationMinutes = () => {
    if (durationMode === "custom") {
      const val = Math.max(1, Number(customDurationValue) || 1);
      if (customDurationUnit === "minutes") return val;
      if (customDurationUnit === "hours") return val * 60;
      if (customDurationUnit === "days") return val * 1440;
      return val;
    }
    return parseInt(durationMode, 10);
  };

  const handleGenerateChallengeLink = async () => {
    if (!challengeModalQuiz) return;
    try {
      setIsGeneratingChallenge(true);
      const totalMinutes = getTotalDurationMinutes();
      const res = await fetch("/api/challenges/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: challengeModalQuiz.id,
          durationMinutes: totalMinutes,
        }),
      });
      const data = await res.json();
      if (data.shareUrl || data.challenge?.id) {
        const origin = typeof window !== "undefined" && window.location.origin ? window.location.origin : "";
        const finalUrl = (origin && data.challenge?.id)
          ? `${origin}/challenge/${data.challenge.id}`
          : (data.shareUrl || "");
        setGeneratedLink(finalUrl);
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingChallenge(false);
    }
  };

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2500);
    }
  };

  const fetchQuizzes = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/quizzes?authorOnly=true");
      const data = await res.json();
      if (data.quizzes) setQuizzes(data.quizzes);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHost = async (quizId: string) => {
    try {
      setHostingId(quizId);
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
    } finally {
      setHostingId(null);
    }
  };

  const handleDuplicate = async (quizId: string) => {
    try {
      const res = await fetch(`/api/quizzes/${quizId}/duplicate`, { method: "POST" });
      if (res.ok) {
        fetchQuizzes();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (quizId: string) => {
    if (!confirm("Are you sure you want to delete this quiz? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/quizzes/${quizId}`, { method: "DELETE" });
      if (res.ok) {
        setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <main className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            My Quizzes
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Create, edit, duplicate, and host your interactive multiplayer quizzes.
          </p>
        </div>
        <Link href="/dashboard/quizzes/create">
          <button className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-2 transition active:scale-95">
            <Plus className="w-4 h-4" />
            Create Quiz
          </button>
        </Link>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-slate-400 font-bold animate-pulse">
          Loading your quizzes...
        </div>
      ) : quizzes.length === 0 ? (
        <div className="bg-white border border-slate-200 p-12 rounded-3xl text-center space-y-4 max-w-lg mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto text-3xl">
            📚
          </div>
          <h3 className="text-xl font-bold text-slate-900">No Quizzes Found</h3>
          <p className="text-sm text-slate-500">
            You haven&apos;t created any quizzes yet. Create your first interactive quiz or explore the public library!
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link href="/dashboard/quizzes/create">
              <button className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md transition">
                Create Quiz
              </button>
            </Link>
            <Link href="/explore">
              <button className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition">
                Explore Library
              </button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="bg-white rounded-3xl border border-slate-200 overflow-hidden flex flex-col justify-between group shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                <SafeImage
                  src={quiz.coverImage || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60"}
                  alt={quiz.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
                <div className="absolute top-3 left-3 flex gap-2">
                  <span className="px-2.5 py-1 bg-indigo-600/90 backdrop-blur-md text-white text-xs font-bold rounded-lg shadow-sm">
                    {quiz.category?.name || "Trivia"}
                  </span>
                  <span className="px-2.5 py-1 bg-white/90 backdrop-blur-md text-slate-700 text-xs font-bold rounded-lg shadow-sm">
                    {quiz.isPublic ? "Public" : "Private"}
                  </span>
                </div>
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white font-bold">
                  <span>{quiz._count?.questions || quiz.questions?.length || 0} Questions</span>
                  <span>{quiz.playsCount || 0} Plays</span>
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <h3 className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                    {quiz.title}
                  </h3>
                  <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed font-medium">
                    {quiz.description || "Interactive multiplayer quiz"}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleHost(quiz.id)}
                    disabled={hostingId === quiz.id}
                    className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    {hostingId === quiz.id ? "Launching..." : "Host Live"}
                  </button>
                  <button
                    onClick={() => handleOpenRanksModal(quiz)}
                    title="View Challenge Leaderboard & Player Ranks"
                    className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl transition flex items-center gap-1 border border-amber-200"
                  >
                    🏆 Ranks
                  </button>
                  <button
                    onClick={() => handleOpenChallengeModal(quiz)}
                    title="Share Challenge Link (No login required for players)"
                    className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition flex items-center gap-1"
                  >
                    🔗 Share
                  </button>
                  <Link href={`/dashboard/quizzes/${quiz.id}/edit`}>
                    <button className="p-2 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition" title="Edit Quiz">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </Link>
                  <button
                    onClick={() => handleDuplicate(quiz.id)}
                    title="Duplicate Quiz"
                    className="p-2 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(quiz.id)}
                    title="Delete Quiz"
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition border border-rose-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CHALLENGE STANDINGS & PLAYER RANKS MODAL */}
      {ranksModalQuiz && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-5 sm:p-7 text-slate-900 max-w-2xl w-full max-h-[90vh] flex flex-col justify-between shadow-2xl space-y-4 border border-slate-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl font-black shadow-sm">
                  🏆
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-900">Challenge Leaderboards & Participant Ranks</h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Live
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium truncate max-w-md">
                    {ranksModalQuiz.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setRanksModalQuiz(null);
                  setRanksSearchQuery("");
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            {loadingChallenges ? (
              <div className="py-16 text-center text-slate-400 font-bold animate-pulse text-sm">
                Loading challenge leaderboards and participant ranks...
              </div>
            ) : quizChallenges.length === 0 ? (
              <div className="py-12 text-center space-y-3 bg-slate-50 rounded-2xl border border-slate-100 p-6 my-auto">
                <span className="text-3xl block">🔗</span>
                <h3 className="text-base font-black text-slate-900">No Challenge Links Created Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Create a shareable challenge link to let participants play at their own pace and record their ranks.
                </p>
                <button
                  onClick={() => {
                    const q = ranksModalQuiz;
                    setRanksModalQuiz(null);
                    setRanksSearchQuery("");
                    handleOpenChallengeModal(q);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition inline-flex items-center gap-1.5"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Create Challenge Link Now</span>
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col space-y-3 min-h-0 overflow-hidden">
                {/* Challenge Selector tabs */}
                {(quizChallenges.length > 1 || liveSessions.length > 0) && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0">
                    {combinedChallenge && (
                      <button
                        key="all-combined"
                        onClick={() => setSelectedChallengeId("all-combined")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition shrink-0 flex items-center gap-1.5 ${
                          selectedChallengeId === "all-combined"
                            ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300"
                            : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                        }`}
                      >
                        <span>🌟 All Combined</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                          selectedChallengeId === "all-combined" ? "bg-white/25 text-white" : "bg-indigo-200/80 text-indigo-900"
                        }`}>
                          {combinedChallenge.totalParticipants} players
                        </span>
                      </button>
                    )}

                    {quizChallenges.map((c, i) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedChallengeId(c.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
                          selectedChallengeId === c.id
                            ? "bg-slate-900 text-white shadow-sm"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                        }`}
                      >
                        <span>Challenge #{i + 1}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                          selectedChallengeId === c.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                        }`}>
                          {c.totalParticipants}
                        </span>
                      </button>
                    ))}

                    {liveSessions.length > 0 && (
                      <button
                        key="live-games"
                        onClick={() => setSelectedChallengeId("live-games")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
                          selectedChallengeId === "live-games"
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                        }`}
                      >
                        <span>🎮 Live Host Games</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                          selectedChallengeId === "live-games" ? "bg-white/20 text-white" : "bg-emerald-200 text-emerald-900"
                        }`}>
                          {liveSessions.reduce((sum, s) => sum + s.totalPlayers, 0)} players
                        </span>
                      </button>
                    )}
                  </div>
                )}

                {(() => {
                  if (selectedChallengeId === "live-games") {
                    const allLivePlayers = liveSessions.flatMap((s) =>
                      (s.players || []).map((p: any) => ({ ...p, sessionPin: s.pin, sessionStatus: s.status }))
                    );
                    allLivePlayers.sort((a, b) => (b.score || 0) - (a.score || 0));
                    const filteredLive = ranksSearchQuery.trim()
                      ? allLivePlayers.filter((p: any) => (p.nickname || "").toLowerCase().includes(ranksSearchQuery.trim().toLowerCase()))
                      : allLivePlayers;

                    return (
                      <div className="flex-1 flex flex-col space-y-3 min-h-0 overflow-hidden">
                        <div className="grid grid-cols-3 gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl p-3 shrink-0 text-center text-xs">
                          <div>
                            <span className="text-emerald-600 block font-semibold text-[10px] uppercase">Live Sessions</span>
                            <span className="font-black text-slate-900 text-sm">{liveSessions.length}</span>
                          </div>
                          <div>
                            <span className="text-emerald-600 block font-semibold text-[10px] uppercase">Total Players</span>
                            <span className="font-black text-slate-900 text-sm">{allLivePlayers.length}</span>
                          </div>
                          <div>
                            <span className="text-emerald-600 block font-semibold text-[10px] uppercase">Top Live Score</span>
                            <span className="font-mono font-black text-emerald-700 text-sm">
                              {allLivePlayers.length > 0 ? `${Math.max(...allLivePlayers.map(p => p.score || 0)).toLocaleString()} pts` : "0 pts"}
                            </span>
                          </div>
                        </div>

                        {/* Search Bar */}
                        <div className="relative shrink-0">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={ranksSearchQuery}
                            onChange={(e) => setRanksSearchQuery(e.target.value)}
                            placeholder="Filter live participant by nickname..."
                            className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition"
                          />
                        </div>

                        <div className="flex-1 flex flex-col space-y-1.5 min-h-0 overflow-y-auto pr-1">
                          {filteredLive.length === 0 ? (
                            <div className="py-8 text-center text-slate-400 text-xs font-semibold bg-slate-50 rounded-2xl border border-slate-100 my-auto">
                              No live players found.
                            </div>
                          ) : (
                            filteredLive.map((p: any, idx: number) => (
                              <div key={p.id || idx} className="p-2.5 sm:p-3 rounded-2xl border bg-white border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <span className="font-black text-sm w-7 text-center shrink-0 text-slate-700">
                                    #{idx + 1}
                                  </span>
                                  <span className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-lg shadow-sm shrink-0">
                                    {p.avatar || "🦊"}
                                  </span>
                                  <div className="flex flex-col min-w-0 flex-1 text-left">
                                    <span className="font-black text-xs sm:text-sm text-slate-900 truncate">
                                      {p.nickname}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-semibold">
                                      PIN {p.sessionPin} • {p.sessionStatus}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="font-mono font-black text-sm text-emerald-600 block">
                                    {p.score?.toLocaleString()} pts
                                  </span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  }

                  const activeChallenge = selectedChallengeId === "all-combined"
                    ? combinedChallenge
                    : (quizChallenges.find((c) => c.id === selectedChallengeId) || combinedChallenge || quizChallenges[0]);

                  if (!activeChallenge) return null;

                  const isCombined = selectedChallengeId === "all-combined" || activeChallenge.id === "all-combined";
                  const isExpired = activeChallenge.isExpired;
                  const ranks = activeChallenge.rankings || [];
                  const filteredRanks = ranksSearchQuery.trim()
                    ? ranks.filter((p: any) =>
                        (p.nickname || "").toLowerCase().includes(ranksSearchQuery.trim().toLowerCase())
                      )
                    : ranks;

                  const origin = typeof window !== "undefined" && window.location.origin ? window.location.origin : "";
                  const shareUrl = isCombined ? "" : `${origin}/challenge/${activeChallenge.id}`;

                  return (
                    <div className="flex-1 flex flex-col space-y-3 min-h-0 overflow-hidden">
                      {/* Challenge Summary Stats Card */}
                      <div className="grid grid-cols-4 gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-3 shrink-0 text-center text-xs">
                        <div>
                          <span className="text-slate-400 block font-semibold text-[10px] uppercase">
                            {isCombined ? "Total Players" : "Participants"}
                          </span>
                          <span className="font-black text-slate-900 text-sm">{activeChallenge.totalParticipants}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold text-[10px] uppercase">Top Score</span>
                          <span className="font-mono font-black text-emerald-600 text-sm">{activeChallenge.highestScore?.toLocaleString()} pts</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold text-[10px] uppercase">Avg Accuracy</span>
                          <span className="font-black text-indigo-600 text-sm">{activeChallenge.avgAccuracy || 0}%</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-semibold text-[10px] uppercase">Scope</span>
                          <span className={`inline-block font-extrabold text-[11px] px-2 py-0.5 rounded-full ${
                            isCombined
                              ? "bg-indigo-100 text-indigo-800"
                              : isExpired
                              ? "bg-rose-100 text-rose-700"
                              : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {isCombined ? "All Links" : isExpired ? "Closed" : "Active"}
                          </span>
                        </div>
                      </div>

                      {/* Search Bar & Copy Link Header */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="relative flex-1">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={ranksSearchQuery}
                            onChange={(e) => setRanksSearchQuery(e.target.value)}
                            placeholder="Filter participant by nickname..."
                            className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition"
                          />
                          {ranksSearchQuery && (
                            <button
                              onClick={() => setRanksSearchQuery("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        {!isCombined && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(shareUrl);
                              setCopiedChallengeId(activeChallenge.id);
                              setTimeout(() => setCopiedChallengeId(null), 2500);
                            }}
                            className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-indigo-200 shrink-0"
                            title="Copy Challenge URL"
                          >
                            {copiedChallengeId === activeChallenge.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Link</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Ranked Leaderboard Table */}
                      <div className="flex-1 flex flex-col space-y-1.5 min-h-0 overflow-y-auto pr-1">
                        {ranks.length === 0 ? (
                          <div className="py-10 text-center text-slate-400 text-xs font-semibold bg-slate-50 rounded-2xl border border-dashed border-slate-200 my-auto">
                            No players have submitted answers for this challenge yet. Share the link to invite participants!
                          </div>
                        ) : filteredRanks.length === 0 ? (
                          <div className="py-8 text-center text-slate-400 text-xs font-semibold bg-slate-50 rounded-2xl border border-slate-100 my-auto">
                            No participants matching &quot;{ranksSearchQuery}&quot;.
                          </div>
                        ) : (
                          filteredRanks.map((p: any, idx: number) => {
                            const originalRank = ranks.findIndex((x: any) => x.id === p.id) + 1;
                            const rankNum = p.rank || (originalRank > 0 ? originalRank : idx + 1);
                            const medalIcons = ["🥇", "🥈", "🥉"];
                            const isTop3 = rankNum <= 3;

                            return (
                              <div
                                key={p.id || idx}
                                className={`p-2.5 sm:p-3 rounded-2xl border flex items-center justify-between transition ${
                                  isTop3
                                    ? rankNum === 1
                                      ? "bg-amber-50/80 border-amber-200 shadow-sm"
                                      : rankNum === 2
                                      ? "bg-slate-50 border-slate-200"
                                      : "bg-amber-50/40 border-amber-100"
                                    : "bg-white border-slate-100 hover:bg-slate-50"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <span className="font-black text-sm w-7 text-center shrink-0 text-slate-700">
                                    {isTop3 ? medalIcons[rankNum - 1] : `#${rankNum}`}
                                  </span>
                                  <span className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-lg shadow-sm shrink-0">
                                    {p.avatar || "🦊"}
                                  </span>
                                  <div className="flex flex-col min-w-0 flex-1 text-left">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-black text-xs sm:text-sm text-slate-900 truncate">
                                        {p.nickname}
                                      </span>
                                      {isCombined && p.challengeTitle && (
                                        <span className="px-1.5 py-0.2 bg-slate-100 border border-slate-200 text-slate-600 font-extrabold text-[9px] rounded-md uppercase tracking-wider">
                                          {p.challengeTitle}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-semibold">
                                      {p.totalCorrect !== undefined ? `${p.totalCorrect}/${p.totalQuestions || activeChallenge.totalQuestions} correct` : ""}
                                      {p.completedAt ? ` • ${new Date(p.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ""}
                                    </span>
                                  </div>
                                </div>

                                <div className="text-right shrink-0 pl-2">
                                  <span className="font-mono font-black text-sm text-indigo-600 block">
                                    {p.score?.toLocaleString()} pts
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-500">
                                    Rank #{rankNum} {p.accuracy !== undefined ? `• ${p.accuracy}% acc` : ""}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-400 font-medium">
                Live participant leaderboard and rankings
              </span>
              <button
                onClick={() => {
                  setRanksModalQuiz(null);
                  setRanksSearchQuery("");
                }}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHARE CHALLENGE MODAL */}
      {challengeModalQuiz && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 text-slate-900 max-w-lg w-full space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl">
                  🔗
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">Share Quiz Challenge</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {challengeModalQuiz.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setChallengeModalQuiz(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Select Open Window Duration
                </label>
                <select
                  value={durationMode}
                  onChange={(e) => {
                    setDurationMode(e.target.value);
                    setGeneratedLink(null);
                  }}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
                >
                  <option value="15">15 Minutes</option>
                  <option value="30">30 Minutes</option>
                  <option value="60">1 Hour</option>
                  <option value="180">3 Hours (Recommended)</option>
                  <option value="360">6 Hours</option>
                  <option value="720">12 Hours</option>
                  <option value="1440">24 Hours (1 Day)</option>
                  <option value="4320">3 Days</option>
                  <option value="10080">7 Days</option>
                  <option value="custom">⚙️ Custom Duration (Minutes / Hours / Days)...</option>
                  <option value="0">No Time Limit (Permanent)</option>
                </select>

                {/* CUSTOM DURATION CONTROLS */}
                {durationMode === "custom" && (
                  <div className="mt-3 p-4 bg-indigo-50/60 border border-indigo-200 rounded-2xl space-y-2 animate-fade-in">
                    <span className="text-xs font-bold text-indigo-900 block">
                      Enter Custom Duration:
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        value={customDurationValue}
                        onChange={(e) => {
                          setCustomDurationValue(Math.max(1, parseInt(e.target.value, 10) || 1));
                          setGeneratedLink(null);
                        }}
                        className="w-28 px-3.5 py-2.5 bg-white border border-indigo-300 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <select
                        value={customDurationUnit}
                        onChange={(e: any) => {
                          setCustomDurationUnit(e.target.value);
                          setGeneratedLink(null);
                        }}
                        className="flex-1 px-3.5 py-2.5 bg-white border border-indigo-300 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                      </select>
                    </div>
                    <p className="text-[11px] text-indigo-700 font-semibold">
                      ⏱️ Challenge will stay open for {customDurationValue} {customDurationUnit}.
                    </p>
                  </div>
                )}

                <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                  Anyone with this link can enter a unique nickname and take the quiz at their own pace without creating an account.
                </p>
              </div>

              {!generatedLink ? (
                <button
                  type="button"
                  onClick={handleGenerateChallengeLink}
                  disabled={isGeneratingChallenge}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition active:scale-95"
                >
                  {isGeneratingChallenge ? "Generating Link..." : "Generate Challenge Link"}
                </button>
              ) : (
                <div className="space-y-3 pt-2">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-indigo-700 truncate select-all">
                      {generatedLink}
                    </span>
                    <button
                      onClick={handleCopyLink}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition flex-shrink-0"
                    >
                      {hasCopied ? "✓ Copied!" : "Copy Link"}
                    </button>
                  </div>
                  <p className="text-xs text-emerald-600 font-semibold text-center">
                    ✓ Link ready! Share it with your students or participants.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setChallengeModalQuiz(null)}
                className="px-5 py-2 text-xs font-bold text-slate-500 hover:text-slate-900"
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
