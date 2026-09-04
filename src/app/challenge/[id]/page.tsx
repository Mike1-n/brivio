"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Play, Trophy, Check, X, Clock, Users, ArrowRight, CheckCircle2, RotateCcw, AlertCircle } from "lucide-react";
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

  // Game Flow: "ENTRY" | "PLAYING" | "FEEDBACK" | "FINISHED"
  const [stage, setStage] = useState<"ENTRY" | "PLAYING" | "FEEDBACK" | "FINISHED">("ENTRY");
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

    const alreadyTaken = challenge?.attempts?.some(
      (a: any) => a.nickname.toLowerCase() === cleanNick.toLowerCase()
    );
    if (alreadyTaken) {
      setError(`Nickname "${cleanNick}" has already completed this challenge. Each player can only submit once. Please enter a different nickname.`);
      return;
    }

    setError("");
    soundEffects.init();
    setStage("PLAYING");
    setCurrentQIndex(0);
    setScore(0);
    setStreak(0);
    setAnswersRecorded([]);
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

    // Provide instant feedback
    soundEffects.playPop();
    setStage("FEEDBACK");
    setLastQuestionResult({
      selectedText: extraData.textAnswer || ans.text,
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
    soundEffects.playIncorrect();
    setStage("FEEDBACK");
    setLastQuestionResult({
      selectedText: "Time Ran Out",
    });
  };

  const handleNextQuestion = () => {
    if (isSubmitting || submittingRef.current) return;
    setSelectedAnswerId(null);
    if (currentQIndex + 1 < challenge.quiz.questions.length) {
      setCurrentQIndex((prev) => prev + 1);
      setStage("PLAYING");
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
    <div className="h-[100dvh] max-h-[100dvh] bg-[#0B0E23] flex flex-col justify-center items-center p-2.5 sm:p-4 font-sans text-white overflow-hidden">
      {/* 0. EXPIRED / CLOSED CHALLENGE VIEW (EXPIRES AT EXACT SECOND) */}
      {isChallengeExpired && stage !== "FINISHED" && (
        <div className="w-full max-w-md bg-white rounded-3xl p-6 md:p-8 text-slate-900 shadow-2xl space-y-6 text-center animate-fade-in">
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

          {/* Final Standings Leaderboard */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-600">
                Final Leaderboard ({challenge?.attempts?.length || 0} Players)
              </span>
              <Trophy className="w-4 h-4 text-amber-500" />
            </div>

            {(!challenge?.attempts || challenge.attempts.length === 0) ? (
              <p className="text-xs font-bold text-slate-400 text-center py-4">No participants joined this challenge.</p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {challenge.attempts.map((att: any, idx: number) => {
                  const medalIcons = ["🥇", "🥈", "🥉"];
                  return (
                    <div
                      key={att.id}
                      className={`p-2.5 rounded-xl flex items-center justify-between text-xs font-bold ${
                        idx < 3 ? "bg-white shadow-sm border border-slate-200" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 text-center font-black">
                          {idx < 3 ? medalIcons[idx] : `${idx + 1}.`}
                        </span>
                        <span>{att.avatar || "🦊"}</span>
                        <span className="font-extrabold text-slate-900 truncate max-w-[120px]">{att.nickname}</span>
                      </div>
                      <span className="font-mono font-black text-indigo-600">
                        {att.score?.toLocaleString()} pts
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={() => router.push("/explore")}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-2xl shadow-xl transition"
          >
            Explore Public Quizzes 🚀
          </button>
        </div>
      )}

      {/* 1. ENTRY & NICKNAME REGISTRATION (ACTIVE CHALLENGE) */}
      {!isChallengeExpired && stage === "ENTRY" && challenge && (
        <div className="w-full max-w-md bg-white rounded-3xl p-6 md:p-8 text-slate-900 shadow-2xl space-y-6 animate-fade-in">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl mx-auto shadow-sm">
              🏆
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-snug">
              {challenge.title}
            </h1>
            <p className="text-xs text-slate-500 font-semibold">
              Hosted by {challenge.quiz?.author?.name || "Teacher"} • {challenge.quiz?.questions?.length || 10} Questions
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

          <form onSubmit={handleStartChallenge} className="space-y-5">
            {/* Nickname Input with Uniqueness Notice */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Choose Unique Nickname
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g. LionKing_23"
                maxLength={18}
                required
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none transition text-sm"
              />
              <span className="text-[11px] text-slate-400 block">
                Must not be taken by another player in this challenge.
              </span>
            </div>

            {/* Avatar Picker */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Select Your Avatar
              </label>
              <div className="flex items-center justify-between gap-1.5 overflow-x-auto p-1">
                {AVATAR_OPTIONS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setAvatar(av)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition ${
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
              className="w-full py-4 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-black text-base rounded-2xl shadow-xl shadow-indigo-600/30 transition transform active:scale-95 flex items-center justify-center gap-2"
            >
              Start Challenge <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Current Leaderboard Preview */}
          {challenge.attempts?.length > 0 && (
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Current Leaders ({challenge.attempts.length})</span>
                <Users className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {challenge.attempts.slice(0, 3).map((att: any, idx: number) => (
                  <div key={att.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl text-xs font-bold">
                    <span className="flex items-center gap-2">
                      <span>{["🥇", "🥈", "🥉"][idx] || `${idx + 1}.`}</span>
                      <span>{att.nickname}</span>
                    </span>
                    <span className="font-mono text-indigo-600">{att.score?.toLocaleString()} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. PLAYING QUESTION SCREEN */}
      {stage === "PLAYING" && currentQ && (
        <div className="h-full flex-1 flex flex-col w-full max-w-xl bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-5 text-slate-900 shadow-2xl overflow-hidden justify-between animate-fade-in">
          {/* Top Bar: Question N of Total | Timer */}
          <div className="shrink-0 flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-[11px] sm:text-xs font-black text-slate-500 uppercase tracking-wider">
              Question {currentQIndex + 1} of {challenge.quiz.questions.length}
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-indigo-600 flex items-center justify-center font-black text-indigo-700 text-xs sm:text-sm bg-indigo-50 shadow-inner">
              {timeRemaining}s
            </div>
          </div>

          {/* Question Prompt + Optional Media */}
          <div className="shrink-0 flex flex-col items-center justify-center text-center my-auto py-1 sm:py-2 px-1 max-h-[30%] overflow-hidden">
            {currentQ.image && (
              <div className="max-h-20 sm:max-h-28 w-auto max-w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm mb-1">
                <SafeImage src={currentQ.image} alt="Question" className="w-full h-full object-contain max-h-20 sm:max-h-28" />
              </div>
            )}
            <h2 className="text-sm sm:text-base md:text-lg font-black text-slate-900 leading-snug line-clamp-3">
              {currentQ.text}
            </h2>
          </div>

          {/* 1. TYPE / SHORT ANSWER */}
          {currentQ.type === "TYPE_ANSWER" && (
            <div className="flex-1 flex flex-col justify-center space-y-2.5 sm:space-y-3 min-h-0">
              <input
                type="text"
                placeholder="Type your answer here..."
                id="challenge_text_answer_input"
                className="w-full p-3 sm:p-4 bg-slate-50 border-2 border-indigo-200 rounded-xl sm:rounded-2xl text-slate-900 font-bold text-sm sm:text-base focus:border-indigo-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById("challenge_text_answer_input") as HTMLInputElement;
                  if (input && input.value.trim()) {
                    handleSelectAnswer({ id: "typed", text: input.value.trim() }, { textAnswer: input.value.trim() });
                  }
                }}
                className="w-full py-3.5 sm:py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm sm:text-base rounded-xl sm:rounded-2xl shadow-lg transition active:scale-95"
              >
                Submit Answer 🚀
              </button>
            </div>
          )}

          {/* 2. MULTI-SELECT (CHECKBOX) */}
          {currentQ.type === "MULTI_SELECT" && (
            <div className="flex-1 flex flex-col justify-between space-y-2 min-h-0">
              <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
                {currentQ.answers?.map((ans: any, idx: number) => {
                  const letter = ["A", "B", "C", "D"][idx];
                  const isChecked = selectedAnswerIds.includes(ans.id);
                  return (
                    <button
                      key={ans.id || idx}
                      type="button"
                      onClick={() => toggleMultiSelectId(ans.id)}
                      className={`w-full h-full p-2.5 rounded-xl border-2 font-bold text-xs sm:text-sm flex items-center justify-between transition ${
                        isChecked
                          ? "bg-indigo-50 border-indigo-600 text-indigo-950 shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="text-[11px] font-black text-slate-400 shrink-0">{letter}</span>
                        <span className="truncate text-left">{ans.text}</span>
                      </div>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ml-1 ${
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
                className="shrink-0 w-full py-2.5 sm:py-3 bg-indigo-600 disabled:opacity-40 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg transition"
              >
                Submit Selected ({selectedAnswerIds.length})
              </button>
            </div>
          )}

          {/* 3. ORDERING / PUZZLE */}
          {currentQ.type === "ORDERING" && (
            <div className="flex-1 flex flex-col justify-between space-y-2 min-h-0">
              <p className="text-[10px] sm:text-xs font-bold text-slate-500 text-center shrink-0">Tap items in sequence (1st to 4th)</p>
              <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
                {currentQ.answers?.map((ans: any, idx: number) => {
                  const orderIndex = orderingSequence.indexOf(ans.id);
                  const isOrdered = orderIndex !== -1;
                  return (
                    <button
                      key={ans.id || idx}
                      type="button"
                      onClick={() => toggleOrderingId(ans.id)}
                      className={`w-full h-full p-2.5 rounded-xl border-2 font-bold text-xs sm:text-sm flex items-center justify-between transition ${
                        isOrdered
                          ? "bg-purple-50 border-purple-600 text-purple-950 shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      <span className="truncate text-left flex-1">{ans.text}</span>
                      <span className={`w-5 h-5 rounded-full font-black text-[10px] flex items-center justify-center shrink-0 ml-1 ${
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
                className="shrink-0 w-full py-2.5 sm:py-3 bg-purple-600 disabled:opacity-40 hover:bg-purple-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg transition"
              >
                Lock In Sequence ({orderingSequence.length}/{currentQ.answers?.length})
              </button>
            </div>
          )}

          {/* 4. TRUE_FALSE, POLL, MULTIPLE_CHOICE (2x2 Grid) */}
          {(currentQ.type === "MULTIPLE_CHOICE" || currentQ.type === "TRUE_FALSE" || currentQ.type === "POLL" || !currentQ.type) && (
            <div className={`flex-1 min-h-0 w-full grid gap-2 sm:gap-2.5 pt-1 ${
              (currentQ.type === "TRUE_FALSE" || currentQ.answers?.length === 2)
                ? "grid-cols-2 grid-rows-1"
                : currentQ.answers?.length === 3
                ? "grid-cols-1 sm:grid-cols-3 grid-rows-3 sm:grid-rows-1"
                : "grid-cols-2 grid-rows-2"
            }`}>
              {currentQ.answers?.map((ans: any, idx: number) => {
                const isTF = currentQ.type === "TRUE_FALSE" || currentQ.answers?.length === 2;
                const letter = ["A", "B", "C", "D"][idx];
                const isTrue = (ans.text || "").toLowerCase().includes("true");

                const choiceColors = [
                  "bg-[#E21B3C] hover:bg-[#c91835] border-red-800",
                  "bg-[#1368CE] hover:bg-[#1059b0] border-blue-800",
                  "bg-[#D89E00] hover:bg-[#bd8a00] border-amber-700",
                  "bg-[#26890C] hover:bg-[#1f7009] border-emerald-800",
                ];
                const choiceIcons = ["▲", "◆", "●", "■"];

                const styleBg = isTF
                  ? (isTrue ? choiceColors[1] : choiceColors[0])
                  : choiceColors[idx % choiceColors.length];
                const styleIcon = isTF
                  ? (isTrue ? "◆" : "▲")
                  : choiceIcons[idx % choiceIcons.length];

                const textLen = (ans.text || "").length;
                const fontSizeClass = textLen > 45
                  ? "text-[10px] sm:text-xs"
                  : textLen > 25
                  ? "text-[11px] sm:text-sm"
                  : textLen > 15
                  ? "text-xs sm:text-base"
                  : "text-sm sm:text-lg";

                return (
                  <button
                    key={ans.id || idx}
                    onClick={() => handleSelectAnswer(ans)}
                    className={`w-full h-full p-2 sm:p-3 rounded-xl sm:rounded-2xl text-white font-black flex items-center justify-between border-b-2 sm:border-b-4 transition active:scale-95 shadow-md overflow-hidden ${styleBg}`}
                  >
                    <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1">
                      <span className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-black/20 shrink-0 flex items-center justify-center text-xs sm:text-sm shadow-inner">
                        {styleIcon}
                      </span>
                      <span className={`text-left font-black leading-tight line-clamp-3 break-words flex-1 ${fontSizeClass}`}>
                        {ans.text}
                      </span>
                    </div>
                    <span className="text-[10px] sm:text-xs bg-white/20 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md uppercase tracking-wider font-bold shrink-0 ml-1">
                      {letter}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. QUESTION FEEDBACK & ADVANCE */}
      {stage === "FEEDBACK" && (
        <div className="w-full max-w-md bg-white rounded-3xl p-6 text-slate-900 shadow-2xl flex flex-col justify-between space-y-6 text-center">
          <div className="space-y-4 py-4">
            <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-3xl mx-auto font-black shadow-inner">
              ✓
            </div>
            <h2 className="text-xl font-black text-slate-900">Answer Recorded!</h2>
            <p className="text-xs font-bold text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
              You selected: <span className="text-slate-900 font-extrabold">{lastQuestionResult?.selectedText}</span>
            </p>
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

      {/* 4. FINAL RESULTS & PERSISTENT CHALLENGE LEADERBOARD */}
      {stage === "FINISHED" && finalResult && (
        <div className="w-full max-w-md bg-white rounded-3xl p-6 md:p-8 text-slate-900 shadow-2xl space-y-6 text-center">
          <div className="space-y-2">
            <span className="text-5xl block animate-bounce">🏆</span>
            <h1 className="text-2xl font-black text-slate-900">Challenge Completed!</h1>
            <p className="text-xs font-semibold text-slate-500">
              Great job, {finalResult.attempt?.nickname}! Your score has been recorded.
            </p>
          </div>

          {/* Player Score Stats Card */}
          <div className="grid grid-cols-3 gap-2 bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-center">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase block">Score</span>
              <span className="text-xl font-black text-indigo-600 font-mono">
                {finalResult.attempt?.score?.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase block">Correct</span>
              <span className="text-xl font-black text-emerald-600">
                {finalResult.attempt?.totalCorrect}/{finalResult.attempt?.totalQuestions}
              </span>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase block">Your Rank</span>
              <span className="text-xl font-black text-purple-600">
                #{finalResult.rank}
              </span>
            </div>
          </div>

          {/* Persistent Challenge Leaderboard Table */}
          <div className="space-y-2 text-left">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">
              Challenge Leaderboard ({finalResult.leaderboard?.length || 1} Players)
            </h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {finalResult.leaderboard?.map((att: any, idx: number) => {
                const isMe = att.nickname === finalResult.attempt?.nickname;
                return (
                  <div
                    key={att.id || idx}
                    className={`flex items-center justify-between p-2.5 px-3.5 rounded-xl text-xs font-bold ${
                      isMe
                        ? "bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300"
                        : "bg-slate-50 text-slate-700"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-5 text-center font-black">
                        {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`}
                      </span>
                      <span>{att.avatar || "🦊"}</span>
                      <span className="truncate max-w-[120px]">{att.nickname}</span>
                    </span>
                    <span className="font-mono">{att.score?.toLocaleString()} pts</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => router.push("/explore")}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition"
            >
              Explore More Quizzes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
