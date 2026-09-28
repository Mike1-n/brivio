"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Play, Trophy, Check, X, Clock, Users, ArrowRight, CheckCircle2, RotateCcw, AlertCircle } from "lucide-react";
import confetti from "canvas-confetti";
import { soundEffects } from "@/lib/soundEffects";
import SafeImage from "@/components/SafeImage";

const AVATAR_OPTIONS = ["🦁", "🦊", "🐼", "🐯", "🐺"];

export default function ChallengeGamePage() {
  const params = useParams();
  const router = useRouter();
  const challengeId = params.id as string;

  // Challenge data
  const [challenge, setChallenge] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      const timeLimitMs = Math.max((currentQ.timeLimit || 20) * 1000, 1000);
      const cappedResponseTime = Math.min(Math.max(responseTimeMs, 0), timeLimitMs);
      const responseFraction = cappedResponseTime / timeLimitMs;
      const speedFactor = Math.max(0.2, 1 - (responseFraction * 0.8));
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
      pointsEarned: earnedPoints,
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
      pointsEarned: 0,
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
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-2xl mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900">Challenge Notice</h2>
          <p className="text-sm font-semibold text-slate-600 leading-relaxed">{error}</p>
          <button
            type="button"
            onClick={() => {
              setError("");
              setNickname("");
            }}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black rounded-xl shadow-md transition"
          >
            Enter Nickname Again
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

          {/* Top 3 Final Standings in this Class */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span>Top 3 Final Standings</span>
              </span>
            </div>

            {(() => {
              const displayList = (challenge?.attempts || []).slice(0, 3);

              if (displayList.length === 0) {
                return <p className="text-xs font-bold text-slate-400 text-center py-4">No participants joined this challenge.</p>;
              }

              const medalIcons = ["🥇", "🥈", "🥉"];
              return (
                <div className="space-y-2">
                  {displayList.map((att: any, idx: number) => {
                    const rankNum = att.rank || idx + 1;
                    return (
                      <div
                        key={att.id || idx}
                        className="p-2.5 rounded-xl flex items-center justify-between text-xs font-bold bg-white shadow-sm border border-slate-200"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 text-center font-black">
                            {medalIcons[idx] || `#${rankNum}`}
                          </span>
                          <span className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-sm shadow-sm">
                            {att.avatar || "🦊"}
                          </span>
                          <span className="font-extrabold text-slate-900 truncate max-w-[140px]">
                            {att.nickname}
                          </span>
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

          <div className="pt-1">
            <button
              onClick={() => router.push("/explore")}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md transition"
            >
              Explore Public Quizzes 🚀
            </button>
          </div>
        </div>
      )}

      {/* 1. ENTRY & NICKNAME REGISTRATION (ACTIVE CHALLENGE) */}
      {!isChallengeExpired && stage === "ENTRY" && challenge && (
        <div className="w-full max-w-md sm:max-w-lg bg-white rounded-3xl p-6 sm:p-8 text-slate-900 shadow-2xl space-y-5 sm:space-y-6 animate-fade-in max-h-[96vh] overflow-y-auto">
          {/* Header Bar with Challenge Title & Host */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-3xl font-black shadow-sm mx-auto mb-1">
              🎮
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug">
              {challenge.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-bold">
              Hosted by {challenge.quiz?.author?.name || "Quiz Arena Host"} • {challenge.quiz?.questions?.length || 10} Questions
            </p>

            {challenge.deadline && (
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-extrabold border ${
                timeLeftToDeadline && !timeLeftToDeadline.includes("d") && !timeLeftToDeadline.includes("h")
                  ? "bg-rose-50 border-rose-300 text-rose-800 animate-pulse"
                  : "bg-amber-50 border-amber-200 text-amber-900"
              }`}>
                <Clock className="w-4 h-4" />
                <span>
                  Ends: {new Date(challenge.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({timeLeftToDeadline ? `${timeLeftToDeadline} left` : "Active"})
                </span>
              </div>
            )}
          </div>

          {/* RESUME IN-PROGRESS CHALLENGE CARD */}
          {savedSession && savedSession.currentQIndex < (challenge.quiz?.questions?.length || 0) ? (
            <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border-2 border-indigo-200 rounded-2xl p-4 sm:p-5 text-slate-900 space-y-3.5 shadow-lg animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-400 border-2 border-white flex items-center justify-center text-2xl shadow-md">
                    {savedSession.avatar || "🦊"}
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                      Welcome back, {savedSession.nickname}!
                    </h3>
                    <p className="text-xs font-semibold text-slate-500">
                      Continue your quiz in progress
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-amber-100 text-amber-900 font-extrabold text-[11px] rounded-full uppercase tracking-wider border border-amber-200 shadow-sm">
                  In Progress
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-white/90 rounded-xl p-3 border border-indigo-100 text-center text-xs shadow-inner">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Next Question</span>
                  <span className="font-black text-indigo-600 text-sm sm:text-base">
                    Q {savedSession.currentQIndex + 1} of {challenge.quiz?.questions?.length || 0}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Current Score</span>
                  <span className="font-mono font-black text-emerald-600 text-sm sm:text-base">
                    {savedSession.score?.toLocaleString()} pts
                  </span>
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleResumeChallenge}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-sm sm:text-base rounded-2xl shadow-lg transition flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-white" />
                  Continue
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleStartChallenge} className="space-y-4 sm:space-y-5">
              {/* Nickname Input with Uniqueness Notice */}
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-extrabold text-slate-700 uppercase tracking-wider">
                  Choose Unique Nickname <span className="text-indigo-600 font-bold text-xs">(min 3 chars)</span>
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
                  className="w-full px-4 py-3 sm:py-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl sm:rounded-2xl font-black text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none transition text-base sm:text-lg"
                />
                <span className="text-xs text-slate-500 font-medium block">
                  Must be at least 3 characters and not taken by another player in this challenge.
                </span>
              </div>

              {/* Animal Avatar Picker (5 Big Animated Animals) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs sm:text-sm font-extrabold text-slate-700 uppercase tracking-wider">
                    Select Your Animal Avatar
                  </label>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-xs font-black text-indigo-700 shadow-xs">
                    <span className="text-lg inline-block animate-bounce">{avatar}</span>
                    <span>Selected</span>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2 sm:gap-3 p-2.5 bg-slate-50 border-2 border-slate-200/90 rounded-2xl sm:rounded-3xl">
                  {AVATAR_OPTIONS.map((av) => {
                    const isSelected = avatar === av;
                    return (
                      <button
                        key={av}
                        type="button"
                        onClick={() => {
                          setAvatar(av);
                          try {
                            soundEffects.playPop();
                          } catch (_) {}
                        }}
                        className={`h-14 sm:h-16 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl transition-all duration-300 transform hover:scale-125 hover:-translate-y-2 hover:rotate-6 active:scale-90 cursor-pointer ${
                          isSelected
                            ? "bg-indigo-600 text-white scale-110 shadow-xl ring-4 ring-indigo-300 z-10 animate-pulse"
                            : "bg-white hover:bg-indigo-50 border-2 border-slate-200/80 shadow-sm"
                        }`}
                        title={`Select ${av}`}
                      >
                        <span className={`inline-block transition-transform duration-300 ${
                          isSelected ? "animate-bounce" : "hover:scale-110"
                        }`}>
                          {av}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && <p className="text-xs sm:text-sm font-bold text-rose-500 text-center">{error}</p>}

              <button
                type="submit"
                className="w-full py-4 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-black text-base sm:text-lg rounded-2xl shadow-xl shadow-indigo-600/30 transition transform active:scale-95 flex items-center justify-center gap-2"
              >
                Start Challenge <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          )}
        </div>
      )}

      {/* 2. PREVIEW PHASE (5 SECONDS QUESTION READ-IN BEFORE ANSWERS REVEAL) */}
      {stage === "PREVIEW" && currentQ && (
        <div className="h-full flex-1 flex flex-col justify-between w-full max-w-md sm:max-w-lg mx-auto space-y-2 sm:space-y-3 animate-fade-in overflow-hidden">
          {/* Top Bar: Question Number Circle + Quiz Badge */}
          <div className="shrink-0 flex items-center justify-between px-1 pt-0.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/95 text-slate-900 font-black text-sm sm:text-base flex items-center justify-center shadow-lg border border-slate-200">
              {currentQIndex + 1}
            </div>

            <div className="px-4 py-1.5 bg-white/95 text-slate-900 font-black text-xs sm:text-sm rounded-full shadow-md flex items-center gap-1.5 border border-white/60">
              <div className="grid grid-cols-2 gap-0.5 w-3.5 h-3.5">
                <span className="bg-[#E21B3C] rounded-[1px]" />
                <span className="bg-[#1368CE] rounded-[1px]" />
                <span className="bg-[#D89E00] rounded-[1px]" />
                <span className="bg-[#26890C] rounded-[1px]" />
              </div>
              <span className="tracking-tight text-slate-900 font-extrabold">Quiz</span>
            </div>

            <div className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-sm">
              Get Ready!
            </div>
          </div>

          {/* Question Media Card or Timer */}
          {currentQ.image ? (
            <div className="relative w-full flex-1 max-h-[22%] sm:max-h-[26%] min-h-[75px] sm:min-h-[90px] flex items-center justify-center my-auto">
              <div className="absolute left-0 sm:left-1 z-10 w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#3B1278] border-2 border-purple-400/40 text-white font-black text-xl sm:text-3xl flex items-center justify-center shadow-2xl shrink-0">
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
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#3B1278] border-2 border-purple-400/40 text-white font-black text-2xl sm:text-3xl flex items-center justify-center shadow-xl shrink-0">
                {previewSeconds}
              </div>
            </div>
          )}

          {/* Question Text Banner with Enlarged Typography */}
          <div className="w-full bg-[#ECECF1] text-slate-900 font-black text-center py-3 sm:py-4 px-4 sm:px-6 rounded-2xl shadow-md border border-white/50 flex items-center justify-center overflow-hidden min-h-[60px] sm:min-h-[70px] max-h-44 overflow-y-auto">
            {(() => {
              const textLen = (currentQ.text || "").length;
              const fontClass = currentQ.image
                ? textLen > 140
                  ? "text-sm sm:text-base md:text-lg"
                  : textLen > 80
                  ? "text-base sm:text-lg md:text-xl"
                  : textLen > 40
                  ? "text-lg sm:text-xl md:text-2xl"
                  : "text-xl sm:text-2xl md:text-3xl"
                : textLen > 140
                ? "text-base sm:text-lg md:text-xl"
                : textLen > 80
                ? "text-lg sm:text-xl md:text-2xl"
                : textLen > 40
                ? "text-xl sm:text-2xl md:text-3xl"
                : "text-2xl sm:text-3xl md:text-4xl";
              return (
                <h2 className={`font-black leading-snug break-words [overflow-wrap:anywhere] text-slate-900 ${fontClass}`}>
                  {currentQ.text}
                </h2>
              );
            })()}
          </div>

          {/* Locked Answers Placeholder */}
          <div className="shrink-0 w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-center text-sm sm:text-base font-bold text-purple-200 flex items-center justify-center gap-2 shadow-inner">
            <span className="text-lg">🔒</span>
            <span>Options revealing in <strong className="text-amber-300 font-black font-mono text-base">{previewSeconds}s</strong>...</span>
          </div>

          {/* Bottom Player Status Bar: Avatar + Nickname + Score Badge */}
          <div className="shrink-0 w-full flex items-center justify-between pt-1 border-t border-purple-400/20">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-400 border-2 border-white flex items-center justify-center text-2xl sm:text-3xl shadow-md">
                {avatar}
              </div>
              <div className="flex flex-col text-left">
                <span className="font-black text-white text-sm sm:text-base leading-tight max-w-[160px] truncate">
                  {nickname}
                </span>
                <span className="inline-block bg-[#3B1278] border border-purple-400/40 text-white font-mono font-black text-xs sm:text-sm px-2.5 py-0.5 rounded-md mt-0.5 w-fit">
                  {score}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-extrabold uppercase tracking-wider text-purple-200">
                Q {currentQIndex + 1}/{challenge.quiz.questions.length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. PLAYING QUESTION SCREEN */}
      {stage === "PLAYING" && currentQ && (
        <div className="h-full flex-1 flex flex-col justify-between w-full max-w-md sm:max-w-lg mx-auto space-y-2 sm:space-y-3 animate-fade-in overflow-hidden">
          {/* Top Bar: Question Number Circle + Quiz Badge */}
          <div className="shrink-0 flex items-center justify-between px-1 pt-0.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/95 text-slate-900 font-black text-sm sm:text-base flex items-center justify-center shadow-lg border border-slate-200">
              {currentQIndex + 1}
            </div>

            <div className="px-4 py-1.5 bg-white/95 text-slate-900 font-black text-xs sm:text-sm rounded-full shadow-md flex items-center gap-1.5 border border-white/60">
              <div className="grid grid-cols-2 gap-0.5 w-3.5 h-3.5">
                <span className="bg-[#E21B3C] rounded-[1px]" />
                <span className="bg-[#1368CE] rounded-[1px]" />
                <span className="bg-[#D89E00] rounded-[1px]" />
                <span className="bg-[#26890C] rounded-[1px]" />
              </div>
              <span className="tracking-tight text-slate-900 font-extrabold">Quiz</span>
            </div>

            <div className="w-9 sm:w-10" /> {/* Spacer */}
          </div>

          {/* Center Image / Media Card or Timer (Adaptive layout) */}
          {currentQ.image ? (
            <div className="relative w-full flex-1 max-h-[22%] sm:max-h-[26%] min-h-[75px] sm:min-h-[90px] flex items-center justify-center my-auto">
              {/* Floating circular countdown timer on the left */}
              <div className="absolute left-0 sm:left-1 z-10 w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#3B1278] border-2 border-purple-400/40 text-white font-black text-xl sm:text-3xl flex items-center justify-center shadow-2xl shrink-0">
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
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#3B1278] border-2 border-purple-400/40 text-white font-black text-2xl sm:text-3xl flex items-center justify-center shadow-xl shrink-0">
                {timeRemaining}
              </div>
            </div>
          )}

          {/* Question Text Banner with Enlarged Typography */}
          <div className="w-full bg-[#ECECF1] text-slate-900 font-black text-center py-3 sm:py-4 px-4 sm:px-6 rounded-2xl shadow-md border border-white/50 flex items-center justify-center overflow-hidden min-h-[60px] sm:min-h-[70px] max-h-44 overflow-y-auto">
            {(() => {
              const textLen = (currentQ.text || "").length;
              const fontClass = currentQ.image
                ? textLen > 140
                  ? "text-sm sm:text-base md:text-lg"
                  : textLen > 80
                  ? "text-base sm:text-lg md:text-xl"
                  : textLen > 40
                  ? "text-lg sm:text-xl md:text-2xl"
                  : "text-xl sm:text-2xl md:text-3xl"
                : textLen > 140
                ? "text-base sm:text-lg md:text-xl"
                : textLen > 80
                ? "text-lg sm:text-xl md:text-2xl"
                : textLen > 40
                ? "text-xl sm:text-2xl md:text-3xl"
                : "text-2xl sm:text-3xl md:text-4xl";
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
                className="w-full p-4 bg-white border-2 border-indigo-200 rounded-xl sm:rounded-2xl text-slate-900 font-bold text-base focus:border-indigo-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById("challenge_text_answer_input") as HTMLInputElement;
                  if (input && input.value.trim()) {
                    handleSelectAnswer({ id: "typed", text: input.value.trim() }, { textAnswer: input.value.trim() });
                  }
                }}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-base rounded-xl sm:rounded-2xl shadow-lg transition active:scale-95"
              >
                Submit Answer 🚀
              </button>
            </div>
          )}

          {/* 2. MULTI-SELECT (CHECKBOX) */}
          {currentQ.type === "MULTI_SELECT" && (
            <div className="shrink-0 flex flex-col justify-between space-y-2">
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                {currentQ.answers?.map((ans: any, idx: number) => {
                  const letter = ["A", "B", "C", "D"][idx];
                  const isChecked = selectedAnswerIds.includes(ans.id);
                  return (
                    <button
                      key={ans.id || idx}
                      type="button"
                      onClick={() => toggleMultiSelectId(ans.id)}
                      className={`w-full p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border-2 font-bold text-xs sm:text-sm md:text-base flex items-center justify-between transition ${
                        isChecked
                          ? "bg-indigo-50 border-indigo-600 text-indigo-950 shadow-sm"
                          : "bg-white border-slate-200 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-xs sm:text-sm font-black text-slate-400 shrink-0">{letter}</span>
                        <span className="break-words text-left flex-1 leading-snug">{ans.text}</span>
                      </div>
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ml-1.5 ${
                        isChecked ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white"
                      }`}>
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
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
                className="shrink-0 w-full py-3 sm:py-3.5 bg-indigo-600 disabled:opacity-40 hover:bg-indigo-700 text-white font-black text-sm sm:text-base rounded-xl sm:rounded-2xl shadow-lg transition"
              >
                Submit Selected ({selectedAnswerIds.length})
              </button>
            </div>
          )}

          {/* 3. ORDERING / PUZZLE */}
          {currentQ.type === "ORDERING" && (
            <div className="shrink-0 flex flex-col justify-between space-y-2">
              <p className="text-xs sm:text-sm font-bold text-purple-200 text-center shrink-0">Tap items in sequence (1st to 4th)</p>
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                {currentQ.answers?.map((ans: any, idx: number) => {
                  const orderIndex = orderingSequence.indexOf(ans.id);
                  const isOrdered = orderIndex !== -1;
                  return (
                    <button
                      key={ans.id || idx}
                      type="button"
                      onClick={() => toggleOrderingId(ans.id)}
                      className={`w-full p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border-2 font-bold text-xs sm:text-sm md:text-base flex items-center justify-between transition ${
                        isOrdered
                          ? "bg-purple-100 border-purple-500 text-purple-950 shadow-sm"
                          : "bg-white border-slate-200 text-slate-700"
                      }`}
                    >
                      <span className="break-words text-left flex-1 leading-snug">{ans.text}</span>
                      <span className={`w-6 h-6 rounded-full font-black text-xs flex items-center justify-center shrink-0 ml-1.5 ${
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
                className="shrink-0 w-full py-3 sm:py-3.5 bg-purple-600 disabled:opacity-40 hover:bg-purple-700 text-white font-black text-sm sm:text-base rounded-xl sm:rounded-2xl shadow-lg transition"
              >
                Lock In Sequence ({orderingSequence.length}/{currentQ.answers?.length})
              </button>
            </div>
          )}

          {/* 4. TRUE_FALSE, POLL, MULTIPLE_CHOICE (2x2 Grid) */}
          {(currentQ.type === "MULTIPLE_CHOICE" || currentQ.type === "TRUE_FALSE" || currentQ.type === "POLL" || !currentQ.type) && (
            <div className={`shrink-0 w-full grid gap-2 sm:gap-2.5 min-h-[120px] sm:min-h-[140px] ${
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
                  ? "text-[11px] sm:text-xs md:text-sm"
                  : textLen > 35
                  ? "text-xs sm:text-sm md:text-base"
                  : textLen > 20
                  ? "text-xs sm:text-base md:text-lg"
                  : textLen > 10
                  ? "text-sm sm:text-lg md:text-xl"
                  : "text-base sm:text-xl md:text-2xl";

                return (
                  <button
                    key={ans.id || idx}
                    onClick={() => handleSelectAnswer(ans)}
                    className={`w-full min-h-[58px] sm:min-h-[72px] px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-white font-black flex items-center justify-center relative transition shadow-lg ${style.bg}`}
                  >
                    <span className="absolute left-3 sm:left-4 text-base sm:text-xl opacity-95">
                      {style.icon}
                    </span>
                    <span className={`text-center font-black tracking-wide uppercase leading-tight break-words px-6 sm:px-8 w-full ${fontSizeClass}`}>
                      {ans.text}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Bottom Player Status Bar: Avatar + Nickname + Score Badge */}
          <div className="shrink-0 w-full flex items-center justify-between pt-1.5 border-t border-purple-400/20">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-400 border-2 border-white flex items-center justify-center text-2xl sm:text-3xl shadow-md">
                {avatar}
              </div>
              <div className="flex flex-col text-left">
                <span className="font-black text-white text-sm sm:text-base leading-tight max-w-[160px] truncate">
                  {nickname}
                </span>
                <span className="inline-block bg-[#3B1278] border border-purple-400/40 text-white font-mono font-black text-xs sm:text-sm px-2.5 py-0.5 rounded-md mt-0.5 w-fit">
                  {score}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-extrabold uppercase tracking-wider text-purple-200">
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

            <div className="space-y-1 text-center">
              <h2 className="text-xl sm:text-2xl font-black">
                {lastQuestionResult?.isCorrect
                  ? "Awesome! Spot On! 🔥"
                  : lastQuestionResult?.timedOut
                  ? "Time's Up! ⏰"
                  : "Incorrect! ❌"}
              </h2>

              {/* Prominent Bold Points Gained Display */}
              <div className="flex items-center justify-center py-1">
                <span
                  className={`inline-flex items-center px-4 py-1.5 rounded-2xl font-black text-2xl sm:text-3xl tracking-tight shadow-md border ${
                    lastQuestionResult?.isCorrect
                      ? "bg-emerald-50 text-emerald-600 border-emerald-300 shadow-emerald-500/10"
                      : "bg-rose-50 text-rose-600 border-rose-300 shadow-rose-500/10"
                  }`}
                >
                  {lastQuestionResult?.isCorrect ? `+${(lastQuestionResult?.pointsEarned ?? 0).toLocaleString()}` : "+0"} <span className="text-xs sm:text-sm font-bold ml-1.5 opacity-80 uppercase tracking-wider">pts</span>
                </span>
              </div>

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
              <div className="text-left">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Marks Earned</span>
                <span className={`text-base font-black ${lastQuestionResult?.isCorrect ? "text-emerald-600" : "text-rose-500"}`}>
                  {lastQuestionResult?.isCorrect ? `+${(lastQuestionResult?.pointsEarned ?? 0).toLocaleString()}` : "+0"} pts
                </span>
              </div>
              <div className="text-right max-w-[60%]">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Your Selection</span>
                <span className="font-extrabold text-slate-900 break-words block">{lastQuestionResult?.selectedText}</span>
              </div>
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
        <div className="w-full max-w-lg bg-white/95 backdrop-blur-xl rounded-3xl p-6 sm:p-8 text-slate-900 shadow-2xl space-y-5 text-center border border-slate-100 max-h-[96vh] overflow-y-auto animate-fade-in">
          {/* Header Banner */}
          <div className="space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white text-3xl shadow-lg shadow-amber-500/30 mx-auto animate-bounce">
              🏆
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Challenge Completed!
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">
                Outstanding effort, <span className="text-indigo-600 font-extrabold">{finalResult.attempt?.nickname || nickname}</span>! Here are your official standings.
              </p>
            </div>
          </div>

          {(() => {
            const rawList = finalResult.leaderboard || challenge?.attempts || [];
            const standingsList = [...rawList].sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
            const myNick = (finalResult.attempt?.nickname || nickname || "").trim().toLowerCase();
            const myRankIndex = standingsList.findIndex(
              (p: any) =>
                (finalResult.attempt?.id && p.id === finalResult.attempt.id) ||
                (p.nickname || "").trim().toLowerCase() === myNick
            );
            const myRank = finalResult.rank || (myRankIndex >= 0 ? myRankIndex + 1 : 1);
            const totalPlayersCount = finalResult.totalParticipants || standingsList.length || 1;
            const accuracyPct = finalResult.attempt?.accuracy !== undefined
              ? finalResult.attempt.accuracy
              : (finalResult.attempt?.totalQuestions
                  ? Math.round(((finalResult.attempt?.totalCorrect || 0) / finalResult.attempt.totalQuestions) * 100)
                  : 0);

            const top3List = standingsList.slice(0, 3);
            const isPlayerInTop3 = myRank <= 3;

            return (
              <div className="space-y-4">
                {/* 3 Metric Summary Cards */}
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                  {/* Score Card */}
                  <div className="bg-indigo-50/80 border border-indigo-100 rounded-2xl p-3 sm:p-3.5 flex flex-col items-center justify-center text-center shadow-sm">
                    <span className="text-[10px] sm:text-xs font-black text-indigo-500 uppercase tracking-wider">
                      Final Score
                    </span>
                    <span className="text-lg sm:text-2xl font-black text-indigo-600 font-mono mt-0.5">
                      {finalResult.attempt?.score?.toLocaleString()}
                    </span>
                    <span className="text-[9px] font-bold text-indigo-400 uppercase">Points</span>
                  </div>

                  {/* Accuracy Card */}
                  <div className="bg-emerald-50/80 border border-emerald-100 rounded-2xl p-3 sm:p-3.5 flex flex-col items-center justify-center text-center shadow-sm">
                    <span className="text-[10px] sm:text-xs font-black text-emerald-600 uppercase tracking-wider">
                      Accuracy
                    </span>
                    <span className="text-lg sm:text-2xl font-black text-emerald-600 mt-0.5">
                      {accuracyPct}%
                    </span>
                    <span className="text-[9px] font-bold text-emerald-500">
                      {finalResult.attempt?.totalCorrect}/{finalResult.attempt?.totalQuestions} Correct
                    </span>
                  </div>

                  {/* Position Card */}
                  <div className="bg-purple-50/80 border border-purple-100 rounded-2xl p-3 sm:p-3.5 flex flex-col items-center justify-center text-center shadow-sm">
                    <span className="text-[10px] sm:text-xs font-black text-purple-600 uppercase tracking-wider">
                      Position
                    </span>
                    <span className="text-lg sm:text-2xl font-black text-purple-600 mt-0.5">
                      #{myRank}
                    </span>
                    <span className="text-[9px] font-bold text-purple-400">
                      of {totalPlayersCount} {totalPlayersCount === 1 ? "player" : "players"}
                    </span>
                  </div>
                </div>

                {/* Class Leaderboard Standings Section with Stairs Podium */}
                <div className="space-y-3 text-left bg-slate-50 border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-black">
                        🏆
                      </span>
                      <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider">
                        Class Podium (Top 3)
                      </h3>
                    </div>
                    <span className="text-[11px] font-bold text-slate-500 bg-white px-2.5 py-0.5 rounded-full border border-slate-200 shadow-xs">
                      {totalPlayersCount} {totalPlayersCount === 1 ? "Participant" : "Participants"}
                    </span>
                  </div>

                  {/* 3D Stairs Podium (2 on Left, 1 in Center, 3 on Right) */}
                  {(() => {
                    const top1 = top3List[0] || null;
                    const top2 = top3List[1] || null;
                    const top3 = top3List[2] || null;

                    const isMe1 = top1 && (top1.nickname || "").trim().toLowerCase() === myNick;
                    const isMe2 = top2 && (top2.nickname || "").trim().toLowerCase() === myNick;
                    const isMe3 = top3 && (top3.nickname || "").trim().toLowerCase() === myNick;

                    return (
                      <div className="flex items-end justify-center gap-2 sm:gap-3 w-full pt-4 pb-1">
                        {/* Step 2 (Left - Silver) */}
                        <div className="flex flex-col items-center flex-1 min-w-0">
                          {top2 ? (
                            <div className="mb-2 text-center flex flex-col items-center w-full">
                              <span className={`w-11 h-11 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center text-xl sm:text-2xl shadow-md ${
                                isMe2 ? "bg-indigo-50 border-2 border-indigo-500 ring-2 ring-indigo-300" : "bg-white border-2 border-slate-300"
                              }`}>
                                {top2.avatar || "🥈"}
                              </span>
                              <div className="flex items-center justify-center gap-1 max-w-full mt-1.5 px-0.5">
                                <p className="font-black text-[11px] sm:text-xs text-slate-800 truncate max-w-[75px] sm:max-w-[100px]">
                                  {top2.nickname}
                                </p>
                                {isMe2 && (
                                  <span className="px-1 py-0.2 bg-indigo-600 text-white font-black text-[8px] rounded uppercase shrink-0">
                                    You
                                  </span>
                                )}
                              </div>
                              <p className="font-mono text-[10px] sm:text-xs font-black text-indigo-600 mt-0.5">
                                {Number(top2.score || 0).toLocaleString()} pts
                              </p>
                            </div>
                          ) : (
                            <div className="h-14 sm:h-16 flex items-center justify-center text-slate-300 text-xs font-bold">—</div>
                          )}
                          <div className="w-full h-20 sm:h-24 bg-gradient-to-b from-slate-200 to-slate-300 rounded-t-2xl sm:rounded-t-3xl flex flex-col items-center justify-center text-slate-700 font-black shadow-inner border-t-2 border-slate-300">
                            <span className="text-lg sm:text-xl">🥈</span>
                            <span className="text-sm sm:text-base font-black text-slate-700">2</span>
                          </div>
                        </div>

                        {/* Step 1 (Center - Gold Champion) */}
                        <div className="flex flex-col items-center flex-1 min-w-0 relative -mt-5">
                          {top1 ? (
                            <div className="mb-2 text-center flex flex-col items-center w-full">
                              <span className="text-xl sm:text-2xl animate-bounce mb-0.5">👑</span>
                              <span className={`w-13 h-13 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl shadow-xl ${
                                isMe1 ? "bg-amber-100 border-2 border-amber-500 ring-4 ring-amber-400/40" : "bg-amber-50 border-2 border-amber-400 ring-4 ring-amber-300/30"
                              }`}>
                                {top1.avatar || "🥇"}
                              </span>
                              <div className="flex items-center justify-center gap-1 max-w-full mt-1.5 px-0.5">
                                <p className="font-black text-xs sm:text-sm text-slate-900 truncate max-w-[85px] sm:max-w-[110px]">
                                  {top1.nickname}
                                </p>
                                {isMe1 && (
                                  <span className="px-1.5 py-0.5 bg-amber-500 text-white font-black text-[9px] rounded uppercase shrink-0 shadow-xs">
                                    You
                                  </span>
                                )}
                              </div>
                              <p className="font-mono text-xs sm:text-sm font-black text-amber-600 mt-0.5">
                                {Number(top1.score || 0).toLocaleString()} pts
                              </p>
                            </div>
                          ) : (
                            <div className="h-16 sm:h-20 flex items-center justify-center text-slate-300 text-xs font-bold">—</div>
                          )}
                          <div className="w-full h-32 sm:h-40 bg-gradient-to-b from-amber-400 to-amber-500 rounded-t-2xl sm:rounded-t-3xl flex flex-col items-center justify-center text-white font-black shadow-xl border-t-2 border-amber-200">
                            <span className="text-2xl sm:text-3xl">🥇</span>
                            <span className="text-base sm:text-lg font-black text-amber-950">1</span>
                          </div>
                        </div>

                        {/* Step 3 (Right - Bronze) */}
                        <div className="flex flex-col items-center flex-1 min-w-0">
                          {top3 ? (
                            <div className="mb-2 text-center flex flex-col items-center w-full">
                              <span className={`w-11 h-11 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center text-xl sm:text-2xl shadow-md ${
                                isMe3 ? "bg-amber-50 border-2 border-amber-600 ring-2 ring-amber-400" : "bg-white border-2 border-amber-600/40"
                              }`}>
                                {top3.avatar || "🥉"}
                              </span>
                              <div className="flex items-center justify-center gap-1 max-w-full mt-1.5 px-0.5">
                                <p className="font-black text-[11px] sm:text-xs text-slate-800 truncate max-w-[75px] sm:max-w-[100px]">
                                  {top3.nickname}
                                </p>
                                {isMe3 && (
                                  <span className="px-1 py-0.2 bg-indigo-600 text-white font-black text-[8px] rounded uppercase shrink-0">
                                    You
                                  </span>
                                )}
                              </div>
                              <p className="font-mono text-[10px] sm:text-xs font-black text-indigo-600 mt-0.5">
                                {Number(top3.score || 0).toLocaleString()} pts
                              </p>
                            </div>
                          ) : (
                            <div className="h-14 sm:h-16 flex items-center justify-center text-slate-300 text-xs font-bold">—</div>
                          )}
                          <div className="w-full h-16 sm:h-20 bg-gradient-to-b from-amber-600/30 to-amber-700/40 rounded-t-2xl sm:rounded-t-3xl flex flex-col items-center justify-center text-amber-900 font-black shadow-inner border-t-2 border-amber-400/40">
                            <span className="text-lg sm:text-xl">🥉</span>
                            <span className="text-sm sm:text-base font-black text-amber-900">3</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* If player is outside top 3, show their position row */}
                  {!isPlayerInTop3 && (
                    <div className="pt-2 space-y-2 border-t border-dashed border-slate-200 mt-2">
                      <div className="flex items-center justify-center gap-1.5 text-slate-300 font-black text-xs py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                      </div>

                      <div className="p-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl shadow-md ring-2 ring-indigo-400 flex items-center justify-between text-xs font-bold animate-fade-in">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="font-black text-xs sm:text-sm px-2 py-0.5 rounded-lg bg-white/20 text-white shadow-inner shrink-0">
                            #{myRank}
                          </span>
                          <span className="w-8 h-8 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center text-base shadow-sm shrink-0">
                            {finalResult.attempt?.avatar || avatar || "🦊"}
                          </span>
                          <div className="flex flex-col text-left truncate">
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-white text-xs sm:text-sm truncate max-w-[130px]">
                                {finalResult.attempt?.nickname || nickname}
                              </span>
                              <span className="px-1.5 py-0.5 bg-white/25 text-white font-black text-[9px] rounded-md uppercase tracking-wider shrink-0">
                                You
                              </span>
                            </div>
                            <span className="text-[10px] text-indigo-100 font-medium">
                              Your Final Standing
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0 pl-2">
                          <span className="font-mono font-black text-xs sm:text-sm text-white block">
                            {finalResult.attempt?.score?.toLocaleString()} pts
                          </span>
                          <span className="text-[10px] font-bold text-indigo-200">
                            Rank #{myRank} of {totalPlayersCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Action Button */}
          <div className="pt-2">
            <button
              onClick={() => router.push("/explore")}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm rounded-2xl shadow-lg hover:shadow-xl transition transform active:scale-98 flex items-center justify-center gap-2"
            >
              <span>Explore More Quizzes</span>
              <span>🚀</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
