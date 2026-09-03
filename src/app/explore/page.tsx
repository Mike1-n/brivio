"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Play, Copy, BookOpen, Clock, Award, Filter, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default function ExplorePage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [hostingQuizId, setHostingQuizId] = useState<string | null>(null);
  const [duplicatedId, setDuplicatedId] = useState<string | null>(null);
  const [challengeModalQuiz, setChallengeModalQuiz] = useState<any | null>(null);
  const [durationMode, setDurationMode] = useState<string>("180");
  const [customDurationValue, setCustomDurationValue] = useState<number>(15);
  const [customDurationUnit, setCustomDurationUnit] = useState<"minutes" | "hours" | "days">("minutes");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [isGeneratingChallenge, setIsGeneratingChallenge] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  useEffect(() => {
    fetchQuizzes();
    fetchCategories();
  }, []);

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

  useEffect(() => {
    fetchQuizzes();
  }, [search, selectedCategory, selectedDifficulty]);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (data.categories) setCategories(data.categories);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchQuizzes = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      if (selectedDifficulty !== "all") params.set("difficulty", selectedDifficulty);

      const res = await fetch(`/api/quizzes?${params.toString()}`);
      const data = await res.json();
      if (data.quizzes) setQuizzes(data.quizzes);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHostGame = async (quizId: string) => {
    try {
      setHostingQuizId(quizId);
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
      setHostingQuizId(null);
    }
  };

  const handleDuplicate = async (quizId: string) => {
    try {
      setDuplicatedId(quizId);
      const res = await fetch(`/api/quizzes/${quizId}/duplicate`, { method: "POST" });
      if (res.ok) {
        setTimeout(() => setDuplicatedId(null), 2000);
      } else {
        router.push("/login");
      }
    } catch {
      router.push("/login");
    }
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
          Explore Quizzes
        </h1>
        <p className="text-slate-400 text-base max-w-2xl font-medium">
          Discover ready-to-play interactive multiplayer quizzes. Host instantly with one click or duplicate to your personal studio.
        </p>
      </div>

      {/* Search Bar */}
      <div className="glass-panel p-4 md:p-6 rounded-3xl shadow-xl">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by quiz title, description, or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-slate-900/80 border border-slate-700/80 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition text-sm font-medium"
          />
        </div>
      </div>

      {/* Quizzes Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400 font-bold animate-pulse">
          Loading quizzes...
        </div>
      ) : quizzes.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center space-y-3">
          <p className="text-lg font-bold text-slate-300">No quizzes found.</p>
          <p className="text-sm text-slate-500">Try adjusting your search terms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="glass-card rounded-3xl overflow-hidden flex flex-col justify-between group"
            >
              {/* Cover Image */}
              <div className="relative h-48 w-full bg-slate-900 overflow-hidden">
                <img
                  src={quiz.coverImage || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60"}
                  alt={quiz.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-slate-300 font-bold">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                    {quiz._count?.questions || 0} Questions
                  </span>
                  <span>{quiz.playsCount || 0} Plays</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                    {quiz.title}
                  </h3>
                  <p className="text-slate-400 text-sm line-clamp-2 leading-relaxed">
                    {quiz.description || "No description provided."}
                  </p>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                  <Button
                    variant="gradient"
                    size="md"
                    className="flex-1"
                    onClick={() => handleHostGame(quiz.id)}
                    isLoading={hostingQuizId === quiz.id}
                  >
                    <Play className="w-4 h-4 mr-1.5 fill-white" />
                    Host Live
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => handleOpenChallengeModal(quiz)}
                    title="Share Challenge Link (No login required for players)"
                    className="bg-indigo-900/40 hover:bg-indigo-800/60 text-indigo-300 border border-indigo-500/30"
                  >
                    🔗 Share
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => handleDuplicate(quiz.id)}
                    title="Duplicate to My Quizzes"
                  >
                    {duplicatedId === quiz.id ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-300" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SHARE CHALLENGE MODAL */}
      {challengeModalQuiz && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0B0E23] border border-white/10 rounded-3xl p-6 sm:p-8 text-white max-w-lg w-full space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-xl">
                  🔗
                </div>
                <div>
                  <h2 className="text-lg font-black">Share Quiz Challenge</h2>
                  <p className="text-xs text-slate-400 font-medium">
                    {challengeModalQuiz.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setChallengeModalQuiz(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Select Open Window Duration
                </label>
                <select
                  value={durationMode}
                  onChange={(e) => {
                    setDurationMode(e.target.value);
                    setGeneratedLink(null);
                  }}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
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
                  <div className="mt-3 p-4 bg-slate-900/90 border border-indigo-500/40 rounded-2xl space-y-2 animate-fade-in">
                    <span className="text-xs font-bold text-indigo-300 block">
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
                        className="w-28 px-3.5 py-2.5 bg-slate-800 border border-indigo-400/40 rounded-xl text-sm font-black text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <select
                        value={customDurationUnit}
                        onChange={(e: any) => {
                          setCustomDurationUnit(e.target.value);
                          setGeneratedLink(null);
                        }}
                        className="flex-1 px-3.5 py-2.5 bg-slate-800 border border-indigo-400/40 rounded-xl text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                      </select>
                    </div>
                    <p className="text-[11px] text-indigo-300 font-semibold">
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
                  <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-indigo-300 truncate select-all">
                      {generatedLink}
                    </span>
                    <button
                      onClick={handleCopyLink}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition flex-shrink-0"
                    >
                      {hasCopied ? "✓ Copied!" : "Copy Link"}
                    </button>
                  </div>
                  <p className="text-xs text-emerald-400 font-semibold text-center">
                    ✓ Link ready! Anyone with this link can play without logging in.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-white/5 flex justify-end">
              <button
                onClick={() => setChallengeModalQuiz(null)}
                className="px-5 py-2 text-xs font-bold text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
