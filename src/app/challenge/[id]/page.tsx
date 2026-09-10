"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Play, Trophy, Check, X, Clock, Users, ArrowRight, CheckCircle2, RotateCcw, AlertCircle, Search, RefreshCw } from "lucide-react";
import confetti from "canvas-confetti";
import { soundEffects } from "@/lib/soundEffects";
import SafeImage from "@/components/SafeImage";

const AVATAR_OPTIONS = ["🦁", "🦊", "🚀", "💎", "⚡", "🐼", "🦄", "🎯", "🎓", "🌟"];

export default function ChallengeGamePage() {
  const params = useParams();
  const router = useRouter();
  const challengeId = params.id as string;

  // Challenge data
  const [challenge, setChallenge] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Ranks Modal State
  const [showRanksModal, setShowRanksModal] = useState(false);
  const [ranksScope, setRanksScope] = useState<"all" | "challenge">("all");
  const [ranksSearchQuery, setRanksSearchQuery] = useState("");
  const [isRefreshingRanks, setIsRefreshingRanks] = useState(false);

  const refreshRanksData = async () => {
    try {
      setIsRefreshingRanks(true);
      const res = await fetch(`/api/challenges/${challengeId}`);
      const data = await res.json();
      if (data.challenge) {
        setChallenge(data.challenge);
      }
    } catch (err) {
      console.error("Failed to refresh challenge ranks:", err);
    } finally {
      setIsRefreshingRanks(false);
    }
  };

  // Game Flow: "ENTRY" | "PREVIEW" | "PLAYING" | "FEEDBACK" | "FINISHED"
  const [stage, setStage] = useState<"ENTRY" | "PREVIEW" | "PLAYING" | "FEEDBACK" | "FINISHED">("ENTRY");
  const [previewSeconds, setPreviewSeconds] = useState(5);
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState("🦊");
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(20);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [answersRecorded, setAnswersRecorded] = useState<any[]>([]);
  const [lastQuestionResult, setLastQuestionResult] = useState<any>(null);
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [finalResult, setFinalResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [timeLeftToDeadline, setTimeLeftToDeadline] = useState<string | null>(null);
  const [isExpiredLive, setIsExpiredLive] = useState<boolean>(false);

  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<any>(null);
  const previewTimerRef = useRef<any>(null);

  useEffect(() => {
    fetch(`/api/challenges/${challengeId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else if (data.challenge) {
          setChallenge(data.challenge);
          if (data.challenge.isExpired) {
            setIsExpiredLive(true);
          }
        }
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load challenge.");
      })
      .finally(() => setLoading(false));
  }, [challengeId]);

  // Live Deadline Countdown & Real-Time Expiration Watcher
  useEffect(() => {
    if (!challenge?.deadline) return;

    const checkDeadline = () => {
      const now = Date.now();
      const deadlineMs = new Date(challenge.deadline).getTime();
      const diffMs = deadlineMs - now;

      if (diffMs <= 0) {
        setIsExpiredLive(true);
        setTimeLeftToDeadline("00:00");
      } else {
        const totalSecs = Math.floor(diffMs / 1000);
        const days = Math.floor(totalSecs / 86400);
        const hours = Math.floor((totalSecs % 86400) / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;

        if (days > 0) {
          setTimeLeftToDeadline(`${days}d ${hours}h ${mins}m`);
        } else if (hours > 0) {
          setTimeLeftToDeadline(`${hours}h ${mins.toString().padStart(2, "0")}m ${secs.toString().padStart(2, "0")}s`);
        } else {
          setTimeLeftToDeadline(`${mins.toString().padStart(2, "0")}m ${secs.toString().padStart(2, "0")}s`);
        }
      }
    };

    checkDeadline();
    const interval = setInterval(checkDeadline, 1000);
    return () => clearInterval(interval);
  }, [challenge]);

  // 5-Second Question Preview Timer before revealing answers
  useEffect(() => {
    if (stage === "PREVIEW" && challenge?.quiz?.questions?.[currentQIndex] && !isExpiredLive) {
      setPreviewSeconds(5);
      previewTimerRef.current = setInterval(() => {
        setPreviewSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(previewTimerRef.current);
            soundEffects.playPop();
            setStage("PLAYING");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (previewTimerRef.current) clearInterval(previewTimerRef.current);
      };
    }
  }, [stage, currentQIndex, challenge, isExpiredLive]);

  // Question Timer
  useEffect(() => {
    if (stage === "PLAYING" && challenge?.quiz?.questions?.[currentQIndex] && !isExpiredLive) {
      const q = challenge.quiz.questions[currentQIndex];
      const initialTime = q.timeLimit || 20;
      setTimeRemaining(initialTime);
      startTimeRef.current = Date.now();

      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleTimeExpired();
            return 0;
          }
          if (prev <= 5) soundEffects.playWarningTick();
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timerRef.current);
    }
  }, [stage, currentQIndex, challenge, isExpiredLive]);

  // LocalStorage Session Persistence
  const [savedSession, setSavedSession] = useState<{
    nickname: string;
    avatar: string;
    currentQIndex: number;
    score: number;
    streak: number;
    answersRecorded: any[];
    savedAt: number;
  } | null>(null);

  // Check and load saved in-progress session
  useEffect(() => {
    if (typeof window !== "undefined" && challengeId) {
      try {
        const raw = localStorage.getItem(`quizarena_challenge_session_${challengeId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.nickname && typeof parsed.currentQIndex === "number") {
            const alreadyCompleted = challenge?.attempts?.some(
              (a: any) => a.nickname.toLowerCase() === parsed.nickname.trim().toLowerCase()
            );
            if (alreadyCompleted) {
              localStorage.removeItem(`quizarena_challenge_session_${challengeId}`);
              setSavedSession(null);
            } else {
              setSavedSession(parsed);
              if (!nickname) setNickname(parsed.nickname);
              if (parsed.avatar) setAvatar(parsed.avatar);
            }
          }
        }
      } catch (e) {
        console.error("Failed to load saved challenge session", e);
      }
    }
  }, [challengeId, challenge]);

  // Helper to persist session to LocalStorage
  const persistSession = (data: {
    nickname: string;
    avatar: string;
    currentQIndex: number;
    score: number;
    streak: number;
    answersRecorded: any[];
  }) => {
    if (typeof window !== "undefined" && challengeId) {
      try {
        localStorage.setItem(
          `quizarena_challenge_session_${challengeId}`,
          JSON.stringify({
            ...data,
            savedAt: Date.now(),
          })
        );
      } catch (e) {
        console.error("Failed to save progress", e);
      }
    }
  };

  const clearSavedSession = () => {
    if (typeof window !== "undefined" && challengeId) {
      localStorage.removeItem(`quizarena_challenge_session_${challengeId}`);
    }
    setSavedSession(null);
  };

  const handleResumeChallenge = () => {
    if (!savedSession || !challenge) return;
    if (isExpiredLive || challenge?.isExpired || (challenge?.deadline && Date.now() >= new Date(challenge.deadline).getTime())) {
      setIsExpiredLive(true);
      setError("This quiz challenge has expired.");
      return;
    }

    soundEffects.init();
    setNickname(savedSession.nickname);
    setAvatar(savedSession.avatar || "🦊");
    setCurrentQIndex(savedSession.currentQIndex);
    setScore(savedSession.score || 0);
    setStreak(savedSession.streak || 0);
    setAnswersRecorded(savedSession.answersRecorded || []);
    setSelectedAnswerId(null);
    setSelectedAnswerIds([]);
    setOrderingSequence([]);
    setPreviewSeconds(5);
    setStage("PREVIEW");
  };

  const [selectedAnswerIds, setSelectedAnswerIds] = useState<string[]>([]);
  const [orderingSequence, setOrderingSequence] = useState<string[]>([]);
  const submittingRef = useRef<boolean>(false);

  const handleStartChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    if (isExpiredLive || challenge?.isExpired || (challenge?.deadline && Date.now() >= new Date(challenge.deadline).getTime())) {
      setIsExpiredLive(true);
      setError("This quiz challenge has expired and the open window has ended.");
      return;
    }

    const cleanNick = nickname.trim();
    if (!cleanNick) {
      setError("Please enter a nickname.");
      return;
    }
    if (cleanNick.length < 3) {
      setError("Nickname must be at least 3 characters.");
      return;
    }

    const alreadyTaken = challenge?.attempts?.some(
      (a: any) => a.nickname.toLowerCase() === cleanNick.toLowerCase()
    );
    if (alreadyTaken) {
      setError(`Nickname "${cleanNick}" has already completed this challenge. Each player can only submit once. Please enter a different nickname.`);
      return;
    }

    setError("");
    soundEffects.init();
    setCurrentQIndex(0);
    setScore(0);
    setStreak(0);
    setAnswersRecorded([]);
    setSelectedAnswerId(null);
    setSelectedAnswerIds([]);
    setOrderingSequence([]);
    setPreviewSeconds(5);
    setStage("PREVIEW");

    persistSession({
      nickname: cleanNick,
      avatar,
      currentQIndex: 0,
      score: 0,
      streak: 0,
      answersRecorded: [],
    });
  };

  const toggleMultiSelectId = (id: string) => {
    setSelectedAnswerIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleOrderingId = (id: string) => {
    setOrderingSequence((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAnswer = (ans: any, extraData: any = {}) => {
    if (selectedAnswerId) return;
    clearInterval(timerRef.current);

    const responseTimeMs = Date.now() - startTimeRef.current;
    const currentQ = challenge.quiz.questions[currentQIndex];
    setSelectedAnswerId(ans.id);

    // Verify correctness
    let isCorrect = false;
    let correctAnswerText = "";
    if (currentQ.type === "TYPE_ANSWER") {
      const textAnswer = (extraData.textAnswer || "").trim().toLowerCase();
      const accepted = (currentQ.answers[0]?.text || "").trim().toLowerCase();
      isCorrect = textAnswer.length > 0 && textAnswer === accepted;
      correctAnswerText = currentQ.answers[0]?.text || "";
    } else if (currentQ.type === "MULTI_SELECT") {
      const selectedIds = Array.isArray(extraData.answerIds) ? extraData.answerIds.map(String) : [];
      const correctAnswers = currentQ.answers.filter((a: any) => a.isCorrect);
      const correctIds = correctAnswers.map((a: any) => String(a.id));
      isCorrect = correctIds.length > 0 &&
        correctIds.every((id: string) => selectedIds.includes(id)) &&
        selectedIds.every((id: string) => correctIds.includes(id));
      correctAnswerText = correctAnswers.map((a: any) => a.text).join(", ");
    } else if (currentQ.type === "ORDERING") {
      const orderIds = Array.isArray(extraData.answerIds) ? extraData.answerIds.map(String) : [];
      const sorted = [...currentQ.answers].sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      const correctOrderedIds = sorted.map((a: any) => String(a.id));
      isCorrect = orderIds.length > 0 && JSON.stringify(orderIds) === JSON.stringify(correctOrderedIds);
      correctAnswerText = sorted.map((a: any) => a.text).join(" → ");
    } else if (currentQ.type === "POLL") {
      isCorrect = true;
      correctAnswerText = ans.text;
    } else {
      const chosenAnswer = currentQ.answers.find((a: any) => String(a.id) === String(ans.id));
      isCorrect = chosenAnswer ? Boolean(chosenAnswer.isCorrect) : false;
      const correctAns = currentQ.answers.find((a: any) => a.isCorrect);
      correctAnswerText = correctAns ? correctAns.text : (currentQ.explanation || "");
    }

    // Calculate question score and streak bonus
    let earnedPoints = 0;
    let newStreak = 0;
    if (isCorrect) {
      newStreak = streak + 1;
      const streakMultiplier = 1 + Math.min(newStreak - 1, 3) * 0.1;
      const timeLimitMs = (currentQ.timeLimit || 20) * 1000;
      const cappedResponseTime = Math.min(responseTimeMs, timeLimitMs);
      const speedFactor = 1 - (cappedResponseTime / (timeLimitMs * 2));
      earnedPoints = Math.round((currentQ.points || 1000) * speedFactor * streakMultiplier);
      soundEffects.playCorrect();
    } else {
      newStreak = 0;
      soundEffects.playIncorrect();
    }

    const newScore = score + earnedPoints;
    setScore(newScore);
    setStreak(newStreak);

    // Save answer
    const newAnswers = [
      ...answersRecorded,
      {
        questionId: currentQ.id,
        answerId: ans.id,
        responseTimeMs,
        ...extraData,
      },
    ];
    setAnswersRecorded(newAnswers);

    // Persist progress immediately
    persistSession({
      nickname: nickname.trim(),
      avatar,
      currentQIndex,
      score: newScore,
      streak: newStreak,
      answersRecorded: newAnswers,
    });

    setStage("FEEDBACK");
    setLastQuestionResult({
      isCorrect,
      selectedText: extraData.textAnswer || ans.text,
      correctAnswerText,
      explanation: currentQ.explanation || "",
      timedOut: false,
    });
  };

  const handleTimeExpired = () => {
    const currentQ = challenge.quiz.questions[currentQIndex];
    const newAnswers = [
      ...answersRecorded,
      {
        questionId: currentQ.id,
        answerId: null,
        responseTimeMs: (currentQ.timeLimit || 20) * 1000,
      },
    ];
    setAnswersRecorded(newAnswers);
    setStreak(0);
    soundEffects.playIncorrect();

    persistSession({
      nickname: nickname.trim(),
      avatar,
      currentQIndex,
      score,
      streak: 0,
      answersRecorded: newAnswers,
    });

    const correctAns = currentQ.answers.find((a: any) => a.isCorrect);
    const correctAnswerText = correctAns ? correctAns.text : (currentQ.explanation || "");
    setStage("FEEDBACK");
    setLastQuestionResult({
      isCorrect: false,
      selectedText: "Time Ran Out",
      correctAnswerText,
      explanation: currentQ.explanation || "",
      timedOut: true,
    });
  };

  const handleNextQuestion = () => {
    if (isSubmitting || submittingRef.current) return;
    setSelectedAnswerId(null);
    setSelectedAnswerIds([]);
    setOrderingSequence([]);
    if (currentQIndex + 1 < challenge.quiz.questions.length) {
      const nextIndex = currentQIndex + 1;
      setCurrentQIndex(nextIndex);
      setPreviewSeconds(5);
      setStage("PREVIEW");

      persistSession({
        nickname: nickname.trim(),
        avatar,
        currentQIndex: nextIndex,
        score,
        streak,
        answersRecorded,
      });
    } else {
      handleSubmitFinal();
    }
  };

  const handleSubmitFinal = async () => {
    if (submittingRef.current || isSubmitting) return;
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/challenges/${challengeId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: nickname.trim(),
          avatar,
          answers: answersRecorded,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit challenge.");
        return;
      }

      setFinalResult(data);
      setStage("FINISHED");
      clearSavedSession();
      soundEffects.playPodiumFanfare();
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    } catch (err) {
      console.error(err);
      setError("Failed to submit score.");
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0E23] flex items-center justify-center text-white font-bold">
        Loading Challenge Arena...
      </div>
    );
  }

  if (error && stage === "ENTRY" && !isExpiredLive && !challenge?.isExpired) {
    return (
      <div className="min-h-screen bg-[#0B0E23] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-2xl mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900">Challenge Notice</h2>
          <p className="text-sm font-semibold text-slate-600 leading-relaxed">{error}</p>
          <button
            onClick={() => router.push("/explore")}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-md"
          >
            Explore Public Quizzes
          </button>
        </div>
      </div>
    );
  }

  const isChallengeExpired = isExpiredLive || challenge?.isExpired;
  const currentQ = challenge?.quiz?.questions?.[currentQIndex];

  return (
    <div className={`h-[100dvh] max-h-[100dvh] ${
      stage === "PLAYING" || stage === "PREVIEW" ? "bg-[#46178F]" : "bg-[#0B0E23]"
    } flex flex-col justify-center items-center p-2.5 sm:p-4 font-sans text-white overflow-hidden relative`}>
      {/* 0. EXPIRED / CLOSED CHALLENGE VIEW (EXPIRES AT EXACT SECOND) */}
      {isChallengeExpired && stage !== "FINISHED" && (
        <div className="w-full max-w-md bg-white rounded-3xl p-6 md:p-8 text-slate-900 shadow-2xl space-y-5 text-center animate-fade-in max-h-[95vh] overflow-y-auto">
          <div className="space-y-3">
            <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
              ⏰
            </div>
            <div className="space-y-1">
              <span className="px-3 py-1 bg-rose-100 text-rose-800 text-xs font-black rounded-full uppercase tracking-wider">
                Challenge Closed
              </span>
              <h1 className="text-2xl font-black text-slate-900 pt-2">
                {challenge?.title || "Quiz Challenge"}
              </h1>
              <p className="text-xs font-bold text-slate-500">
                This challenge officially ended at {challenge?.deadline ? new Date(challenge.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "the deadline"}. New entries are now closed.
              </p>
            </div>
          </div>

          {/* Final Standings Leaderboard Preview */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-600">
                Final Leaderboard ({challenge?.totalQuizParticipants || challenge?.allQuizRankings?.length || challenge?.attempts?.length || 0} Players)
              </span>
              <button
                type="button"
                onClick={() => {
                  setRanksScope("all");
                  setShowRanksModal(true);
                }}
                className="text-xs font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span>Full Ranks</span>
              </button>
            </div>

            {(() => {
              const displayList = (challenge?.allQuizRankings && challenge.allQuizRankings.length > 0)
                ? challenge.allQuizRankings
                : (challenge?.attempts || []);

              if (displayList.length === 0) {
                return <p className="text-xs font-bold text-slate-400 text-center py-4">No participants joined this challenge.</p>;
              }

              return (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {displayList.map((att: any, idx: number) => {
                    const medalIcons = ["🥇", "🥈", "🥉"];
                    const rankNum = att.rank || idx + 1;
                    return (
                      <div
                        key={att.id || idx}
                        className={`p-2.5 rounded-xl flex items-center justify-between text-xs font-bold ${
                          rankNum <= 3 ? "bg-white shadow-sm border border-slate-200" : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 text-center font-black">
                            {rankNum <= 3 ? medalIcons[rankNum - 1] : `#${rankNum}`}
                          </span>
                          <span>{att.avatar || "🦊"}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-900 truncate max-w-[120px]">{att.nickname}</span>
                            {att.challengeTitle && (
                              <span className="text-[9px] px-1 py-0.2 bg-slate-200 text-slate-700 rounded font-bold">
                                {att.challengeTitle}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="font-mono font-black text-indigo-600">
                          {att.score?.toLocaleString()} pts
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setRanksScope("all");
                setShowRanksModal(true);
              }}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm rounded-2xl shadow-lg transition flex items-center justify-center gap-2"
            >
              <Trophy className="w-4 h-4 fill-slate-950" />
              View Complete Participant Ranks
            </button>
            <button
              onClick={() => router.push("/explore")}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
            >
              Explore Public Quizzes 🚀
            </button>
          </div>
        </div>
      )}

      {/* 1. ENTRY & NICKNAME REGISTRATION (ACTIVE CHALLENGE) */}
      {!isChallengeExpired && stage === "ENTRY" && challenge && (
        <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-7 text-slate-900 shadow-2xl space-y-4 animate-fade-in max-h-[96vh] overflow-y-auto">
          {/* Header Bar with Challenge Title & Ranks Trigger */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg font-black shadow-sm">
                🎮
              </div>
              <button
                type="button"
                onClick={() => {
                  setRanksScope("all");
                  setShowRanksModal(true);
                }}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-full font-black text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95"
                title="View All Participant Ranks"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                <span>Ranks ({challenge.totalQuizParticipants || challenge.allQuizRankings?.length || challenge.attempts?.length || 0})</span>
              </button>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
              {challenge.title}
            </h1>
            <p className="text-xs text-slate-500 font-semibold">
              Hosted by {challenge.quiz?.author?.name || "Quiz Arena Host"} • {challenge.quiz?.questions?.length || 10} Questions
            </p>

            {challenge.deadline && (
              <div className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold border ${
                timeLeftToDeadline && !timeLeftToDeadline.includes("d") && !timeLeftToDeadline.includes("h")
                  ? "bg-rose-50 border-rose-300 text-rose-800 animate-pulse"
                  : "bg-amber-50 border-amber-200 text-amber-900"
              }`}>
                <Clock className="w-3.5 h-3.5" />
                <span>
                  Ends: {new Date(challenge.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({timeLeftToDeadline ? `${timeLeftToDeadline} left` : "Active"})
                </span>
              </div>
            )}
          </div>

          {/* RESUME IN-PROGRESS CHALLENGE CARD */}
          {savedSession && savedSession.currentQIndex < (challenge.quiz?.questions?.length || 0) && (
            <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border-2 border-indigo-200 rounded-2xl p-3.5 text-slate-900 space-y-2.5 shadow-md animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-amber-400 border-2 border-white flex items-center justify-center text-lg shadow-md">
                    {savedSession.avatar || "🦊"}
                  </div>
                  <div className="text-left">
                    <h3 className="text-xs font-black text-slate-900 leading-tight">
                      Welcome back, {savedSession.nickname}!
                    </h3>
                    <p className="text-[10px] font-semibold text-slate-500">
                      Continue from where you left off
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-extrabold text-[9px] rounded-full uppercase tracking-wider border border-amber-200">
                  In Progress
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-white/90 rounded-xl p-2 border border-indigo-100 text-center text-xs">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Next Question</span>
                  <span className="font-black text-indigo-600 text-xs">
                    Q {savedSession.currentQIndex + 1} of {challenge.quiz?.questions?.length || 0}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Current Score</span>
                  <span className="font-mono font-black text-emerald-600 text-xs">
                    {savedSession.score?.toLocaleString()} pts
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={handleResumeChallenge}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  Resume Q{savedSession.currentQIndex + 1}
                </button>
                <button
                  type="button"
                  onClick={clearSavedSession}
                  title="Start over from Question 1"
                  className="px-2.5 py-2.5 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 font-bold text-xs rounded-xl transition flex items-center gap-1 border border-slate-200 shadow-sm"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">Start Over</span>
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleStartChallenge} className="space-y-4">
            {/* Nickname Input with Uniqueness Notice */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Choose Unique Nickname <span className="text-indigo-600 font-bold text-[10px]">(min 3 chars)</span>
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  if (error) setError("");
                }}
                placeholder="e.g. LionKing_23"
                minLength={3}
                maxLength={18}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none transition text-sm"
              />
              <span className="text-[10px] text-slate-400 block">
                Must be at least 3 characters and not taken by another player.
              </span>
            </div>

            {/* Avatar Picker */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Select Your Avatar
              </label>
              <div className="flex items-center justify-between gap-1 overflow-x-auto p-1">
                {AVATAR_OPTIONS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setAvatar(av)}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-base transition ${
                      avatar === av
                        ? "bg-indigo-600 text-white scale-110 shadow-md ring-2 ring-indigo-300"
                        : "bg-slate-100 hover:bg-slate-200"
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-xs font-bold text-rose-500 text-center">{error}</p>}

            <button
              type="submit"
              className="w-full py-3.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-black text-sm sm:text-base rounded-2xl shadow-xl shadow-indigo-600/30 transition transform active:scale-95 flex items-center justify-center gap-2"
            >
              Start Challenge <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Standings & Ranks Section */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600">
              <span className="flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  {challenge.totalQuizParticipants && challenge.totalQuizParticipants > (challenge.attempts?.length || 0)
                    ? `Quiz Standings (${challenge.totalQuizParticipants} players)`
                    : `Challenge Standings (${challenge.attempts?.length || 0})`}
                </span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setRanksScope("all");
                  setShowRanksModal(true);
                }}
                className="text-xs font-black text-indigo-600 hover:text-indigo-800 transition"
              >
                View All Ranks →
              </button>
            </div>

            {(() => {
              const previewList = (challenge.allQuizRankings && challenge.allQuizRankings.length > 0)
                ? challenge.allQuizRankings
                : (challenge.attempts || []);

              if (previewList.length === 0) {
                return (
                  <div
                    onClick={() => {
                      setRanksScope("all");
                      setShowRanksModal(true);
                    }}
                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-dashed border-slate-200 text-center cursor-pointer transition"
                  >
                    <p className="text-xs font-bold text-slate-500">
                      🏆 No submissions yet. Be the first to play and claim #1!
                    </p>
                  </div>
                );
              }

              return (
                <div
                  onClick={() => {
                    setRanksScope("all");
                    setShowRanksModal(true);
                  }}
                  className="space-y-1.5 cursor-pointer group"
                  title="Click to view full ranks and standings"
                >
                  {previewList.slice(0, 3).map((att: any, idx: number) => {
                    const rankNum = att.rank || idx + 1;
                    return (
                      <div key={att.id || idx} className="flex items-center justify-between p-2 bg-slate-50 group-hover:bg-indigo-50/50 rounded-xl text-xs font-bold border border-slate-100 transition">
                        <span className="flex items-center gap-2">
                          <span className="w-4 text-center">{["🥇", "🥈", "🥉"][idx] || `#${rankNum}`}</span>
                          <span>{att.avatar || "🦊"}</span>
                          <span className="font-extrabold text-slate-900 truncate max-w-[120px]">{att.nickname}</span>
                        </span>
                        <span className="font-mono text-indigo-600">{att.score?.toLocaleString()} pts</span>
                      </div>
                    );
                  })}

                  {previewList.length > 3 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRanksScope("all");
                        setShowRanksModal(true);
                      }}
                      className="w-full py-1.5 text-center text-xs font-black text-indigo-600 hover:text-indigo-800 bg-indigo-50/70 hover:bg-indigo-100/70 rounded-lg transition"
                    >
                      + View all {previewList.length} participants & ranks
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 2. PREVIEW PHASE (5 SECONDS QUESTION READ-IN BEFORE ANSWERS REVEAL) */}
      {stage === "PREVIEW" && currentQ && (
        <div className="h-full flex-1 flex flex-col justify-between w-full max-w-md mx-auto space-y-1.5 sm:space-y-2 animate-fade-in overflow-hidden">
          {/* Top Bar: Question Number Circle + Quiz Badge */}
          <div className="shrink-0 flex items-center justify-between px-1 pt-0.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/95 text-slate-900 font-black text-sm flex items-center justify-center shadow-lg border border-slate-200">
              {currentQIndex + 1}
            </div>

            <div className="px-3.5 py-1 bg-white/95 text-slate-900 font-black text-xs rounded-full shadow-md flex items-center gap-1.5 border border-white/60">
              <div className="grid grid-cols-2 gap-0.5 w-3.5 h-3.5">
                <span className="bg-[#E21B3C] rounded-[1px]" />
                <span className="bg-[#1368CE] rounded-[1px]" />
                <span className="bg-[#D89E00] rounded-[1px]" />
                <span className="bg-[#26890C] rounded-[1px]" />
              </div>
              <span className="tracking-tight text-slate-900 font-extrabold">Quiz</span>
            </div>

            <div className="px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] uppercase tracking-wider shadow-sm">
              Get Ready!
            </div>
          </div>

          {/* Question Media Card or Timer */}
          {currentQ.image ? (
            <div className="relative w-full flex-1 max-h-[22%] sm:max-h-[26%] min-h-[70px] sm:min-h-[85px] flex items-center justify-center my-auto">
              <div className="absolute left-0 sm:left-1 z-10 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-[#3B1278] border-2 border-purple-400/40 text-white font-black text-lg sm:text-2xl flex items-center justify-center shadow-2xl shrink-0">
                {previewSeconds}
              </div>
              <div className="w-full max-w-[74%] sm:max-w-[78%] h-full bg-white rounded-2xl sm:rounded-3xl p-2 shadow-2xl flex items-center justify-center overflow-hidden border border-white/30">
                <SafeImage
                  src={currentQ.image}
                  alt="Question illustration"
                  className="w-full h-full object-contain max-h-full rounded-xl"
                />
              </div>
            </div>
          ) : (
            <div className="w-full flex items-center justify-center py-1">
              <div className="w-12 h-12 rounded-full bg-[#3B1278] border-2 border-purple-400/40 text-white font-black text-xl flex items-center justify-center shadow-xl shrink-0">
                {previewSeconds}
              </div>
            </div>
          )}

          {/* Question Text Banner with Enlarged Typography */}
          <div className="w-full bg-[#ECECF1] text-slate-900 font-black text-center py-2.5 sm:py-3.5 px-3.5 sm:px-5 rounded-xl sm:rounded-2xl shadow-md border border-white/50 flex items-center justify-center overflow-hidden min-h-[55px] max-h-40 overflow-y-auto">
            {(() => {
              const textLen = (currentQ.text || "").length;
              const fontClass = currentQ.image
                ? textLen > 140
                  ? "text-xs sm:text-sm md:text-base"
                  : textLen > 80
                  ? "text-sm sm:text-base md:text-lg"
                  : textLen > 40
                  ? "text-base sm:text-lg md:text-xl"
                  : "text-lg sm:text-xl md:text-2xl"
                : textLen > 140
                ? "text-sm sm:text-base md:text-lg"
                : textLen > 80
                ? "text-base sm:text-lg md:text-xl"
                : textLen > 40
                ? "text-lg sm:text-xl md:text-2xl"
                : "text-xl sm:text-2xl md:text-3xl";
              return (
                <h2 className={`font-black leading-snug break-words [overflow-wrap:anywhere] text-slate-900 ${fontClass}`}>
                  {currentQ.text}
                </h2>
              );
            })()}
          </div>

          {/* Locked Answers Placeholder */}
          <div className="shrink-0 w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-center text-xs sm:text-sm font-bold text-purple-200 flex items-center justify-center gap-2 shadow-inner">
            <span className="text-base">🔒</span>
            <span>Options revealing in <strong className="text-amber-300 font-black font-mono text-sm">{previewSeconds}s</strong>...</span>
          </div>

          {/* Bottom Player Status Bar: Avatar + Nickname + Score Badge */}
          <div className="shrink-0 w-full flex items-center justify-between pt-1 border-t border-purple-400/20">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-400 border-2 border-white flex items-center justify-center text-xl sm:text-2xl shadow-md">
                {avatar}
              </div>
              <div className="flex flex-col text-left">
                <span className="font-black text-white text-xs sm:text-sm leading-tight max-w-[140px] truncate">
                  {nickname}
                </span>
                <span className="inline-block bg-[#3B1278] border border-purple-400/40 text-white font-mono font-black text-[11px] px-2 py-0.5 rounded-md mt-0.5 w-fit">
                  {score}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-200/80">
                Q {currentQIndex + 1}/{challenge.quiz.questions.length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. PLAYING QUESTION SCREEN */}
      {stage === "PLAYING" && currentQ && (
        <div className="h-full flex-1 flex flex-col justify-between w-full max-w-md mx-auto space-y-1.5 sm:space-y-2 animate-fade-in overflow-hidden">
          {/* Top Bar: Question Number Circle + Quiz Badge */}
          <div className="shrink-0 flex items-center justify-between px-1 pt-0.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/95 text-slate-900 font-black text-sm flex items-center justify-center shadow-lg border border-slate-200">
              {currentQIndex + 1}
            </div>

            <div className="px-3.5 py-1 bg-white/95 text-slate-900 font-black text-xs rounded-full shadow-md flex items-center gap-1.5 border border-white/60">
              <div className="grid grid-cols-2 gap-0.5 w-3.5 h-3.5">
                <span className="bg-[#E21B3C] rounded-[1px]" />
                <span className="bg-[#1368CE] rounded-[1px]" />
                <span className="bg-[#D89E00] rounded-[1px]" />
                <span className="bg-[#26890C] rounded-[1px]" />
              </div>
              <span className="tracking-tight text-slate-900 font-extrabold">Quiz</span>
            </div>

            <div className="w-8 sm:w-9" /> {/* Spacer */}
          </div>

          {/* Center Image / Media Card or Timer (Adaptive layout) */}
          {currentQ.image ? (
            <div className="relative w-full flex-1 max-h-[22%] sm:max-h-[26%] min-h-[70px] sm:min-h-[85px] flex items-center justify-center my-auto">
              {/* Floating circular countdown timer on the left */}
              <div className="absolute left-0 sm:left-1 z-10 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-[#3B1278] border-2 border-purple-400/40 text-white font-black text-lg sm:text-2xl flex items-center justify-center shadow-2xl shrink-0">
                {timeRemaining}
              </div>

              {/* Question Media Card */}
              <div className="w-full max-w-[74%] sm:max-w-[78%] h-full bg-white rounded-2xl sm:rounded-3xl p-2 shadow-2xl flex items-center justify-center overflow-hidden border border-white/30">
                <SafeImage
                  src={currentQ.image}
                  alt="Question illustration"
                  className="w-full h-full object-contain max-h-full rounded-xl"
                />
              </div>
            </div>
          ) : (
            <div className="w-full flex items-center justify-center py-1">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#3B1278] border-2 border-purple-400/40 text-white font-black text-xl sm:text-2xl flex items-center justify-center shadow-xl shrink-0">
                {timeRemaining}
              </div>
            </div>
          )}

          {/* Question Text Banner with Enlarged Typography */}
          <div className="w-full bg-[#ECECF1] text-slate-900 font-black text-center py-2.5 sm:py-3.5 px-3.5 sm:px-5 rounded-xl sm:rounded-2xl shadow-md border border-white/50 flex items-center justify-center overflow-hidden min-h-[55px] max-h-40 overflow-y-auto">
            {(() => {
              const textLen = (currentQ.text || "").length;
              const fontClass = currentQ.image
                ? textLen > 140
                  ? "text-xs sm:text-sm md:text-base"
                  : textLen > 80
                  ? "text-sm sm:text-base md:text-lg"
                  : textLen > 40
                  ? "text-base sm:text-lg md:text-xl"
                  : "text-lg sm:text-xl md:text-2xl"
                : textLen > 140
                ? "text-sm sm:text-base md:text-lg"
                : textLen > 80
                ? "text-base sm:text-lg md:text-xl"
                : textLen > 40
                ? "text-lg sm:text-xl md:text-2xl"
                : "text-xl sm:text-2xl md:text-3xl";
              return (
                <h2 className={`font-black leading-snug break-words [overflow-wrap:anywhere] text-slate-900 ${fontClass}`}>
                  {currentQ.text}
                </h2>
              );
            })()}
          </div>

          {/* 1. TYPE / SHORT ANSWER */}
          {currentQ.type === "TYPE_ANSWER" && (
            <div className="shrink-0 flex flex-col justify-center space-y-2 py-1">
              <input
                type="text"
                placeholder="Type your answer here..."
                id="challenge_text_answer_input"
                className="w-full p-3 bg-white border-2 border-indigo-200 rounded-xl text-slate-900 font-bold text-sm focus:border-indigo-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById("challenge_text_answer_input") as HTMLInputElement;
                  if (input && input.value.trim()) {
                    handleSelectAnswer({ id: "typed", text: input.value.trim() }, { textAnswer: input.value.trim() });
                  }
                }}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-xl shadow-lg transition active:scale-95"
              >
                Submit Answer 🚀
              </button>
            </div>
          )}

          {/* 2. MULTI-SELECT (CHECKBOX) */}
          {currentQ.type === "MULTI_SELECT" && (
            <div className="shrink-0 flex flex-col justify-between space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {currentQ.answers?.map((ans: any, idx: number) => {
                  const letter = ["A", "B", "C", "D"][idx];
                  const isChecked = selectedAnswerIds.includes(ans.id);
                  return (
                    <button
                      key={ans.id || idx}
                      type="button"
                      onClick={() => toggleMultiSelectId(ans.id)}
                      className={`w-full p-2.5 rounded-xl border-2 font-bold text-xs sm:text-sm flex items-center justify-between transition ${
                        isChecked
                          ? "bg-indigo-50 border-indigo-600 text-indigo-950 shadow-sm"
                          : "bg-white border-slate-200 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="text-[11px] font-black text-slate-400 shrink-0">{letter}</span>
                        <span className="break-words text-left flex-1 leading-snug">{ans.text}</span>
                      </div>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ml-1.5 ${
                        isChecked ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white"
                      }`}>
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (selectedAnswerIds.length > 0) {
                    handleSelectAnswer({ id: "multi", text: "Multi-Selection" }, { answerIds: selectedAnswerIds });
                  }
                }}
                disabled={selectedAnswerIds.length === 0}
                className="shrink-0 w-full py-2.5 bg-indigo-600 disabled:opacity-40 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg transition"
              >
                Submit Selected ({selectedAnswerIds.length})
              </button>
            </div>
          )}

          {/* 3. ORDERING / PUZZLE */}
          {currentQ.type === "ORDERING" && (
            <div className="shrink-0 flex flex-col justify-between space-y-2">
              <p className="text-[10px] sm:text-xs font-bold text-purple-200 text-center shrink-0">Tap items in sequence (1st to 4th)</p>
              <div className="grid grid-cols-2 gap-2">
                {currentQ.answers?.map((ans: any, idx: number) => {
                  const orderIndex = orderingSequence.indexOf(ans.id);
                  const isOrdered = orderIndex !== -1;
                  return (
                    <button
                      key={ans.id || idx}
                      type="button"
                      onClick={() => toggleOrderingId(ans.id)}
                      className={`w-full p-2.5 rounded-xl border-2 font-bold text-xs sm:text-sm flex items-center justify-between transition ${
                        isOrdered
                          ? "bg-purple-100 border-purple-500 text-purple-950 shadow-sm"
                          : "bg-white border-slate-200 text-slate-700"
                      }`}
                    >
                      <span className="break-words text-left flex-1 leading-snug">{ans.text}</span>
                      <span className={`w-5 h-5 rounded-full font-black text-[10px] flex items-center justify-center shrink-0 ml-1.5 ${
                        isOrdered ? "bg-purple-600 text-white" : "bg-slate-200 text-slate-500"
                      }`}>
                        {isOrdered ? orderIndex + 1 : "+"}
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (orderingSequence.length === currentQ.answers?.length) {
                    handleSelectAnswer({ id: "order", text: "Ordered Sequence" }, { answerIds: orderingSequence });
                  }
                }}
                disabled={orderingSequence.length !== currentQ.answers?.length}
                className="shrink-0 w-full py-2.5 bg-purple-600 disabled:opacity-40 hover:bg-purple-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg transition"
              >
                Lock In Sequence ({orderingSequence.length}/{currentQ.answers?.length})
              </button>
            </div>
          )}

          {/* 4. TRUE_FALSE, POLL, MULTIPLE_CHOICE (2x2 Grid) */}
          {(currentQ.type === "MULTIPLE_CHOICE" || currentQ.type === "TRUE_FALSE" || currentQ.type === "POLL" || !currentQ.type) && (
            <div className={`shrink-0 w-full grid gap-1.5 sm:gap-2 min-h-[110px] ${
              (currentQ.type === "TRUE_FALSE" || currentQ.answers?.length === 2)
                ? "grid-cols-2 grid-rows-1"
                : "grid-cols-2 grid-rows-2"
            }`}>
              {currentQ.answers?.map((ans: any, idx: number) => {
                const isTF = currentQ.type === "TRUE_FALSE" || currentQ.answers?.length === 2;
                const isTrue = (ans.text || "").toLowerCase().includes("true");

                const choiceShapes = [
                  { bg: "bg-[#E21B3C] hover:bg-[#c91835] border-b-4 border-[#9c1228] active:border-b-0 active:translate-y-1", icon: "▲" },
                  { bg: "bg-[#1368CE] hover:bg-[#1059b0] border-b-4 border-[#0d4a94] active:border-b-0 active:translate-y-1", icon: "◆" },
                  { bg: "bg-[#D89E00] hover:bg-[#bd8a00] border-b-4 border-[#9e7400] active:border-b-0 active:translate-y-1", icon: "●" },
                  { bg: "bg-[#26890C] hover:bg-[#1f7009] border-b-4 border-[#1a5e08] active:border-b-0 active:translate-y-1", icon: "■" },
                ];

                const style = isTF
                  ? (isTrue ? choiceShapes[1] : choiceShapes[0])
                  : choiceShapes[idx % choiceShapes.length];

                const textLen = (ans.text || "").length;
                const fontSizeClass = textLen > 60
                  ? "text-[9px] sm:text-[11px]"
                  : textLen > 35
                  ? "text-[10px] sm:text-xs"
                  : textLen > 20
                  ? "text-[11px] sm:text-sm"
                  : textLen > 10
                  ? "text-xs sm:text-base"
                  : "text-sm sm:text-lg";

                return (
                  <button
                    key={ans.id || idx}
                    onClick={() => handleSelectAnswer(ans)}
                    className={`w-full min-h-[50px] sm:min-h-[58px] px-2.5 sm:px-3 py-1.5 sm:py-2.5 rounded-xl text-white font-black flex items-center justify-center relative transition shadow-lg ${style.bg}`}
                  >
                    <span className="absolute left-2.5 sm:left-3 text-sm sm:text-base opacity-95">
                      {style.icon}
                    </span>
                    <span className={`text-center font-black tracking-wide uppercase leading-tight break-words px-5 sm:px-6 w-full ${fontSizeClass}`}>
                      {ans.text}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Bottom Player Status Bar: Avatar + Nickname + Score Badge */}
          <div className="shrink-0 flex items-center justify-between pt-1 border-t border-purple-400/20">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-400 border-2 border-white flex items-center justify-center text-xl sm:text-2xl shadow-md">
                {avatar}
              </div>
              <div className="flex flex-col text-left">
                <span className="font-black text-white text-xs sm:text-sm leading-tight max-w-[140px] truncate">
                  {nickname}
                </span>
                <span className="inline-block bg-[#3B1278] border border-purple-400/40 text-white font-mono font-black text-[11px] px-2 py-0.5 rounded-md mt-0.5 w-fit">
                  {score}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-200/80">
                Q {currentQIndex + 1}/{challenge.quiz.questions.length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. QUESTION FEEDBACK & ADVANCE */}
      {stage === "FEEDBACK" && (
        <div className="w-full max-w-md bg-white rounded-3xl p-6 text-slate-900 shadow-2xl flex flex-col justify-between space-y-6 text-center animate-fade-in">
          <div className="space-y-4 py-2">
            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-3xl mx-auto shadow-xl transition transform ${
              lastQuestionResult?.isCorrect ? "bg-emerald-500 text-white shadow-emerald-500/30" : "bg-rose-500 text-white shadow-rose-500/30"
            }`}>
              {lastQuestionResult?.isCorrect ? (
                <Check className="w-10 h-10 sm:w-12 sm:h-12 stroke-[3.5]" />
              ) : (
                <X className="w-10 h-10 sm:w-12 sm:h-12 stroke-[3.5]" />
              )}
            </div>

            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black">
                {lastQuestionResult?.isCorrect
                  ? "Awesome! Spot On! 🔥"
                  : lastQuestionResult?.timedOut
                  ? "Time's Up! ⏰"
                  : "Incorrect! ❌"}
              </h2>
              <p className="text-xs font-semibold text-slate-500">
                {lastQuestionResult?.isCorrect
                  ? "Great job! Keep the momentum going!"
                  : lastQuestionResult?.timedOut
                  ? "You didn't answer in time. Be quicker next round! 🚀"
                  : "Keep your head up, you can catch up on the next question! 💪"}
              </p>
            </div>

            {!lastQuestionResult?.isCorrect && lastQuestionResult?.correctAnswerText && (
              <div className="w-full bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs text-rose-900 font-bold">
                Correct answer was: <span className="underline font-black">{lastQuestionResult.correctAnswerText}</span>
              </div>
            )}

            {/* Answer Explanation Note (if available) */}
            {(lastQuestionResult?.explanation || challenge?.quiz?.questions?.[currentQIndex]?.explanation) && (
              <div className="w-full bg-amber-50/90 border border-amber-300 rounded-xl p-3 text-left space-y-1 shadow-sm">
                <div className="flex items-center gap-1.5 text-amber-900 font-black text-xs uppercase tracking-wider">
                  <span>💡</span>
                  <span>Answer Explanation</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed break-words [overflow-wrap:anywhere]">
                  {lastQuestionResult?.explanation || challenge?.quiz?.questions?.[currentQIndex]?.explanation}
                </p>
              </div>
            )}

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs font-bold text-slate-600">
              <span>Your Selection</span>
              <span className="font-extrabold text-slate-900 max-w-[65%] text-right break-words">{lastQuestionResult?.selectedText}</span>
            </div>
          </div>

          <button
            onClick={handleNextQuestion}
            disabled={isSubmitting}
            className="w-full py-4 bg-[#4F46E5] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#4338CA] text-white font-black text-base rounded-2xl shadow-xl transition"
          >
            {isSubmitting
              ? "Submitting Score..."
              : currentQIndex + 1 < challenge.quiz.questions.length
              ? "Next Question"
              : "View Final Results"}
          </button>
        </div>
      )}

      {/* 4. FINAL RESULTS & TOP 3 PODIUM + PLAYER POSITION */}
      {stage === "FINISHED" && finalResult && (
        <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-7 text-slate-900 shadow-2xl space-y-4 text-center max-h-[96vh] overflow-y-auto">
          <div className="space-y-1.5">
            <span className="text-4xl sm:text-5xl block animate-bounce">🏆</span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">Challenge Completed!</h1>
            <p className="text-xs font-semibold text-slate-500">
              Great job, {finalResult.attempt?.nickname}! Your score and final rank have been recorded.
            </p>
          </div>

          {(() => {
            const standingsList = (finalResult.allQuizRankings && finalResult.allQuizRankings.length > 0)
              ? finalResult.allQuizRankings
              : (finalResult.leaderboard || []);

            const myNick = (finalResult.attempt?.nickname || nickname || "").trim().toLowerCase();
            const myRankIndex = standingsList.findIndex((p: any) => (p.nickname || "").trim().toLowerCase() === myNick);
            const myOverallRank = finalResult.allQuizRank || (myRankIndex >= 0 ? (standingsList[myRankIndex].rank || myRankIndex + 1) : (finalResult.rank || 1));
            const totalPlayersCount = finalResult.totalQuizParticipants || standingsList.length || 1;

            const top3List = standingsList.slice(0, 3);
            const isPlayerInTop3 = myRankIndex >= 0 && myRankIndex < 3;

            return (
              <>
                {/* Player Score Stats Card with Exact Position Number */}
                <div className="grid grid-cols-3 gap-2 bg-indigo-50 border border-indigo-100 rounded-2xl p-3.5 text-center">
                  <div>
                    <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase block">Score</span>
                    <span className="text-base sm:text-lg font-black text-indigo-600 font-mono">
                      {finalResult.attempt?.score?.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase block">Correct</span>
                    <span className="text-base sm:text-lg font-black text-emerald-600">
                      {finalResult.attempt?.totalCorrect}/{finalResult.attempt?.totalQuestions}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase block">Your Position</span>
                    <span className="text-base sm:text-lg font-black text-purple-600">
                      #{myOverallRank} <span className="text-[10px] text-slate-400 font-bold font-sans">/ {totalPlayersCount}</span>
                    </span>
                  </div>
                </div>

                {/* Top 3 Podium + Player Position Section */}
                <div className="space-y-2 text-left bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">🏆</span>
                      <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                        Top 3 Podium
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRanksScope("all");
                        setShowRanksModal(true);
                      }}
                      className="text-xs font-black text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1"
                    >
                      <span>All Standings ({totalPlayersCount})</span>
                      <span>→</span>
                    </button>
                  </div>

                  {/* Top 3 List */}
                  <div className="space-y-1.5">
                    {top3List.map((att: any, idx: number) => {
                      const isMe = (att.nickname || "").trim().toLowerCase() === myNick;
                      const rankNum = att.rank || idx + 1;
                      const medalIcons = ["🥇", "🥈", "🥉"];

                      return (
                        <div
                          key={att.id || idx}
                          className={`flex items-center justify-between p-2.5 px-3 rounded-xl text-xs font-bold transition ${
                            isMe
                              ? "bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300"
                              : rankNum === 1
                              ? "bg-amber-50/90 border border-amber-300 shadow-sm"
                              : rankNum === 2
                              ? "bg-white border border-slate-200"
                              : "bg-amber-50/50 border border-amber-200"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="w-5 text-center text-sm font-black shrink-0">
                              {medalIcons[rankNum - 1] || `#${rankNum}`}
                            </span>
                            <span className="w-7 h-7 rounded-lg bg-white/20 border border-black/5 flex items-center justify-center text-sm shadow-sm shrink-0">
                              {att.avatar || "🦊"}
                            </span>
                            <div className="flex items-center gap-1.5 truncate">
                              <span className={`truncate max-w-[120px] ${isMe ? "text-white font-black" : "text-slate-900 font-extrabold"}`}>
                                {att.nickname}
                              </span>
                              {isMe && (
                                <span className="px-1.5 py-0.2 bg-white/25 text-white font-black text-[9px] rounded-md uppercase tracking-wider shrink-0">
                                  You
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0 pl-2">
                            <span className={`font-mono block ${isMe ? "text-white font-black" : "text-indigo-600 font-black"}`}>
                              {att.score?.toLocaleString()} pts
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* If player is outside top 3, show their position row */}
                  {!isPlayerInTop3 && (
                    <div className="pt-1.5 space-y-1.5">
                      <div className="flex items-center justify-center gap-1 text-slate-300 font-black text-xs py-0.5">
                        <span>•</span>
                        <span>•</span>
                        <span>•</span>
                      </div>

                      <div className="p-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl shadow-md ring-2 ring-indigo-300 flex items-center justify-between text-xs font-bold animate-fade-in">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="font-black text-xs sm:text-sm px-2 py-0.5 rounded-lg bg-white/20 text-white shadow-inner shrink-0">
                            #{myOverallRank}
                          </span>
                          <span className="w-7 h-7 rounded-lg bg-white/20 border border-white/30 flex items-center justify-center text-sm shrink-0">
                            {finalResult.attempt?.avatar || avatar || "🦊"}
                          </span>
                          <div className="flex flex-col text-left truncate">
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-white truncate max-w-[110px]">
                                {finalResult.attempt?.nickname || nickname}
                              </span>
                              <span className="px-1.5 py-0.2 bg-white/25 text-white font-black text-[9px] rounded-md uppercase tracking-wider shrink-0">
                                You
                              </span>
                            </div>
                            <span className="text-[10px] text-indigo-100 font-semibold">
                              Your Final Position
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0 pl-2">
                          <span className="font-mono font-black text-sm sm:text-base text-white block">
                            {finalResult.attempt?.score?.toLocaleString()} pts
                          </span>
                          <span className="text-[10px] font-bold text-indigo-200">
                            Rank #{myOverallRank} of {totalPlayersCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}

          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setRanksScope("all");
                setShowRanksModal(true);
              }}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 active:scale-95"
            >
              <Trophy className="w-4 h-4 fill-slate-950" />
              View Complete Participant Ranks
            </button>
            <button
              onClick={() => router.push("/explore")}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition"
            >
              Explore More Quizzes
            </button>
          </div>
        </div>
      )}

      {/* 🏆 COMPLETE PARTICIPANT RANKS & LEADERBOARD MODAL */}
      {showRanksModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in text-slate-900">
          <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-xl w-full max-h-[92vh] flex flex-col justify-between shadow-2xl space-y-3.5 border border-slate-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-2xl font-black shadow-sm">
                  🏆
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-900">Leaderboard & Participant Ranks</h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Live
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold truncate max-w-[260px] sm:max-w-md">
                    {challenge?.title || "Quiz Challenge"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowRanksModal(false);
                  setRanksSearchQuery("");
                }}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scope Switcher Tabs (All Quiz vs This Link) */}
            {challenge?.allQuizRankings && challenge.allQuizRankings.length > 0 && (
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5 shrink-0 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setRanksScope("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition shrink-0 flex items-center gap-1.5 ${
                    ranksScope === "all"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                  }`}
                >
                  <span>🌟 All Quiz Participants</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    ranksScope === "all" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}>
                    {challenge.totalQuizParticipants || challenge.allQuizRankings.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRanksScope("challenge")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition shrink-0 flex items-center gap-1.5 ${
                    ranksScope === "challenge"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                  }`}
                >
                  <span>🔗 This Challenge Link</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    ranksScope === "challenge" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}>
                    {challenge.attempts?.length || 0}
                  </span>
                </button>
              </div>
            )}

            {/* Metrics Ribbon */}
            {(() => {
              const currentList = (ranksScope === "all" && challenge?.allQuizRankings && challenge.allQuizRankings.length > 0)
                ? challenge.allQuizRankings
                : (challenge?.attempts || []);
              const currentScores = currentList.map((a: any) => a.score || 0);
              const currentTopScore = currentScores.length > 0 ? Math.max(...currentScores) : 0;
              const currentAvgAcc = currentList.length > 0
                ? Math.round(currentList.reduce((sum: number, a: any) => sum + (a.accuracy || 0), 0) / currentList.length)
                : 0;

              return (
                <div className="grid grid-cols-3 gap-2 bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 border border-slate-200/80 rounded-2xl p-3 shrink-0 text-center text-xs">
                  <div>
                    <span className="text-slate-400 block font-bold text-[10px] uppercase tracking-wider">
                      {ranksScope === "all" ? "Total Quiz Players" : "Link Players"}
                    </span>
                    <span className="font-black text-slate-900 text-sm sm:text-base">
                      {currentList.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold text-[10px] uppercase tracking-wider">Top Score</span>
                    <span className="font-mono font-black text-emerald-600 text-sm sm:text-base">
                      {currentTopScore.toLocaleString()} pts
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold text-[10px] uppercase tracking-wider">Avg Accuracy</span>
                    <span className="font-black text-indigo-600 text-sm sm:text-base">
                      {currentAvgAcc}%
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Search & Refresh Controls */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={ranksSearchQuery}
                  onChange={(e) => setRanksSearchQuery(e.target.value)}
                  placeholder="Search participant by nickname..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition"
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
              <button
                type="button"
                onClick={refreshRanksData}
                disabled={isRefreshingRanks}
                title="Refresh Standings"
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-slate-200"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingRanks ? "animate-spin text-indigo-600" : ""}`} />
                <span className="hidden sm:inline">{isRefreshingRanks ? "Refreshing..." : "Refresh"}</span>
              </button>
            </div>

            {/* Participant Rankings List */}
            <div className="flex-1 flex flex-col space-y-2 min-h-0 overflow-y-auto pr-1">
              {(() => {
                const list = (ranksScope === "all" && challenge?.allQuizRankings && challenge.allQuizRankings.length > 0)
                  ? challenge.allQuizRankings
                  : (challenge?.attempts || []);
                const filtered = ranksSearchQuery.trim()
                  ? list.filter((p: any) =>
                      (p.nickname || "").toLowerCase().includes(ranksSearchQuery.trim().toLowerCase())
                    )
                  : list;

                if (list.length === 0) {
                  return (
                    <div className="py-12 text-center space-y-2 bg-slate-50 rounded-2xl border border-dashed border-slate-200 my-auto p-4">
                      <span className="text-3xl block">🎯</span>
                      <p className="text-sm font-black text-slate-900">No participants yet</p>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto">
                        Enter your nickname on the home screen and complete the quiz to claim the #1 rank!
                      </p>
                    </div>
                  );
                }

                if (filtered.length === 0) {
                  return (
                    <div className="py-10 text-center space-y-1 bg-slate-50 rounded-2xl border border-slate-100 my-auto">
                      <p className="text-xs font-bold text-slate-500">No participants matching &quot;{ranksSearchQuery}&quot;</p>
                      <button
                        onClick={() => setRanksSearchQuery("")}
                        className="text-xs text-indigo-600 font-bold hover:underline"
                      >
                        Clear search filter
                      </button>
                    </div>
                  );
                }

                return filtered.map((p: any, idx: number) => {
                  const originalRank = list.findIndex((x: any) => x.id === p.id) + 1;
                  const rankNum = p.rank || (originalRank > 0 ? originalRank : idx + 1);
                  const isCurrentPlayer = nickname && p.nickname?.toLowerCase() === nickname.trim().toLowerCase();

                  const medalIcons = ["🥇", "🥈", "🥉"];
                  const isTop3 = rankNum <= 3;

                  return (
                    <div
                      key={p.id || idx}
                      className={`p-3 rounded-2xl border flex items-center justify-between transition ${
                        isCurrentPlayer
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-300"
                          : isTop3
                          ? rankNum === 1
                            ? "bg-amber-50/90 border-amber-300 shadow-sm"
                            : rankNum === 2
                            ? "bg-slate-50 border-slate-200"
                            : "bg-amber-50/50 border-amber-200"
                          : "bg-white border-slate-100 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Position Badge */}
                        <div className="flex items-center justify-center shrink-0 w-8">
                          {isTop3 ? (
                            <span className="text-xl" title={`Rank ${rankNum}`}>
                              {medalIcons[rankNum - 1]}
                            </span>
                          ) : (
                            <span className={`font-black text-xs sm:text-sm px-2 py-0.5 rounded-lg ${
                              isCurrentPlayer ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                            }`}>
                              #{rankNum}
                            </span>
                          )}
                        </div>

                        {/* Avatar */}
                        <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-sm shrink-0 border ${
                          isCurrentPlayer ? "bg-white/20 border-white/30" : "bg-white border-slate-200"
                        }`}>
                          {p.avatar || "🦊"}
                        </span>

                        {/* Nickname & Sub-stats */}
                        <div className="flex flex-col min-w-0 flex-1 text-left">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`font-black text-xs sm:text-sm truncate ${
                              isCurrentPlayer ? "text-white" : "text-slate-900"
                            }`}>
                              {p.nickname}
                            </span>
                            {isCurrentPlayer && (
                              <span className="px-1.5 py-0.2 bg-white/25 text-white font-extrabold text-[9px] rounded-md uppercase tracking-wider">
                                You
                              </span>
                            )}
                            {ranksScope === "all" && p.challengeTitle && (
                              <span className={`px-1.5 py-0.2 font-extrabold text-[9px] rounded-md uppercase tracking-wider border ${
                                isCurrentPlayer
                                  ? "bg-white/20 text-white border-white/30"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}>
                                {p.challengeTitle}
                              </span>
                            )}
                          </div>
                          <span className={`text-[10px] font-semibold ${
                            isCurrentPlayer ? "text-indigo-100" : "text-slate-400"
                          }`}>
                            {p.totalCorrect !== undefined ? `${p.totalCorrect}/${p.totalQuestions || challenge?.quiz?.questions?.length || 0} correct` : ""}
                            {p.accuracy !== undefined ? ` • ${p.accuracy}% acc` : ""}
                            {p.completedAt ? ` • ${new Date(p.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ""}
                          </span>
                        </div>
                      </div>

                      {/* Score Points */}
                      <div className="text-right shrink-0 pl-2">
                        <span className={`font-mono font-black text-sm sm:text-base block ${
                          isCurrentPlayer ? "text-white" : "text-indigo-600"
                        }`}>
                          {p.score?.toLocaleString()} pts
                        </span>
                        <span className={`text-[10px] font-bold ${
                          isCurrentPlayer ? "text-indigo-200" : "text-slate-400"
                        }`}>
                          Rank #{rankNum}
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-400 font-medium">
                {(() => {
                  const currentList = (ranksScope === "all" && challenge?.allQuizRankings && challenge.allQuizRankings.length > 0)
                    ? challenge.allQuizRankings
                    : (challenge?.attempts || []);
                  return `${currentList.length} total ${currentList.length === 1 ? "participant" : "participants"} recorded`;
                })()}
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowRanksModal(false);
                  setRanksSearchQuery("");
                }}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow transition"
              >
                Close Standings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
