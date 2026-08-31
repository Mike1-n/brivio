"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, X, Rocket, Trophy, Play, ArrowRight, CheckCircle2, ChevronLeft } from "lucide-react";
import confetti from "canvas-confetti";
import { initSocket } from "@/lib/socket";
import { soundEffects } from "@/lib/soundEffects";

export default function PlayerGameControllerPage() {
  const params = useParams();
  const router = useRouter();
  const pin = (params.pin as string) || "";

  // Player state
  const [nickname, setNickname] = useState("Player");
  const [avatar, setAvatar] = useState("🦊");
  const [gameState, setGameState] = useState<"LOBBY" | "PREVIEW" | "QUESTION" | "SUBMITTED" | "RESULTS" | "LEADERBOARD" | "PODIUM">("LOBBY");
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [timeRemaining, setTimeRemaining] = useState(20);
  const [totalTimeLimit, setTotalTimeLimit] = useState(20);
  const [previewSeconds, setPreviewSeconds] = useState(5);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [selectedAnswerText, setSelectedAnswerText] = useState<string>("");
  const [lastResult, setLastResult] = useState<{
    isCorrect: boolean;
    pointsAwarded: number;
    correctAnswerText: string;
    aheadPlayerName?: string | null;
    pointsBehind?: number;
    streak?: number;
  } | null>(null);
  const [score, setScore] = useState(0);
  const [rank, setRank] = useState(1);
  const [totalPlayers, setTotalPlayers] = useState(1);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const socketRef = useRef<any>(null);
  const startTimeRef = useRef<number>(Date.now());
  const currentQuestionRef = useRef<any>(null);
  const selectedAnswerIdRef = useRef<string | null>(null);

  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
  }, [currentQuestion]);

  useEffect(() => {
    selectedAnswerIdRef.current = selectedAnswerId;
  }, [selectedAnswerId]);

  useEffect(() => {
    const savedNick = localStorage.getItem("quiz_player_nickname") || "Player";
    const savedAvatar = localStorage.getItem("quiz_player_avatar") || "🦊";
    setNickname(savedNick);
    setAvatar(savedAvatar);

    const socket = initSocket();
    socketRef.current = socket;

    const joinRoom = () => {
      socket.emit("player:join", {
        pin,
        nickname: savedNick,
        avatar: savedAvatar,
      });
    };

    if (socket.connected) {
      joinRoom();
    } else {
      socket.on("connect", joinRoom);
    }

    socket.on("player:joined", (data: any) => {
      setJoinError(null);
      if (data.nickname) setNickname(data.nickname);
      if (data.avatar) setAvatar(data.avatar);
      if (data.status === "QUESTION" || data.status === "PREVIEW") {
        // Will receive game:question right away
      } else if (data.status === "LEADERBOARD") {
        setGameState("LEADERBOARD");
      } else if (data.status === "RESULTS") {
        setGameState("RESULTS");
      } else {
        setGameState("LOBBY");
      }
    });

    socket.on("player:join_error", ({ message }: any) => {
      setJoinError(message || "Failed to join live room.");
    });

    const handlePlayersUpdate = ({ players }: any) => {
      if (players) setTotalPlayers(players.length);
      setJoinError(null);
    };

    socket.on("room:player_joined", handlePlayersUpdate);
    socket.on("room:players_updated", handlePlayersUpdate);

    socket.on("game:starting", () => {
      setGameState("LOBBY");
      soundEffects.playCountdownTick();
    });

    socket.on("game:question_preview", (data: any) => {
      setGameState("PREVIEW");
      setCurrentQuestion(data.question || data);
      setQuestionIndex(data.questionIndex);
      setTotalQuestions(data.totalQuestions);
      const limit = data.timeLimit || data.question?.timeLimit || 20;
      setTotalTimeLimit(limit);
      setTimeRemaining(limit);
      setPreviewSeconds(data.previewSeconds || 5);
      setSelectedAnswerId(null);
      setSelectedAnswerText("");
      setLastResult(null);
    });

    socket.on("preview:tick", ({ previewRemaining }: any) => {
      setPreviewSeconds(previewRemaining);
    });

    socket.on("game:question_active", (data: any) => {
      setGameState("QUESTION");
      setCurrentQuestion(data.question || data);
      setQuestionIndex(data.questionIndex);
      setTotalQuestions(data.totalQuestions);
      const limit = data.timeLimit || data.question?.timeLimit || 20;
      setTotalTimeLimit(limit);
      setTimeRemaining(limit);
      setSelectedAnswerId(null);
      setSelectedAnswerText("");
      setLastResult(null);
      startTimeRef.current = Date.now();
      soundEffects.playPop();
    });

    socket.on("game:question", (data: any) => {
      const limit = data.timeLimit || data.question?.timeLimit || 20;
      setTotalTimeLimit(limit);
      if (data.isPreview) {
        setGameState("PREVIEW");
        setCurrentQuestion(data.question || data);
        setQuestionIndex(data.questionIndex);
        setTotalQuestions(data.totalQuestions);
        setPreviewSeconds(data.previewSeconds || 5);
        setTimeRemaining(limit);
        setSelectedAnswerId(null);
        setSelectedAnswerText("");
        setLastResult(null);
      } else {
        setGameState("QUESTION");
        setCurrentQuestion(data.question || data);
        setQuestionIndex(data.questionIndex);
        setTotalQuestions(data.totalQuestions);
        setTimeRemaining(limit);
        setSelectedAnswerId(null);
        setSelectedAnswerText("");
        setLastResult(null);
        startTimeRef.current = Date.now();
      }
    });

    socket.on("timer:tick", ({ timeRemaining: t }: any) => {
      setTimeRemaining(t);
      if (t <= 5 && t > 0) soundEffects.playWarningTick();
    });

    socket.on("game:timer_tick", ({ timeRemaining: t }: any) => {
      setTimeRemaining(t);
    });

    // Instant answer feedback to the player upon submission
    socket.on("player:answer_feedback", (data: any) => {
      setLastResult({
        isCorrect: data.isCorrect,
        pointsAwarded: data.pointsAwarded || 0,
        correctAnswerText: data.correctAnswerText || data.explanation || "Correct Option",
        streak: data.streak,
      });
      if (data.score !== undefined) setScore(data.score);
      if (data.timeRemaining !== undefined) setTimeRemaining(data.timeRemaining);
      if (data.isCorrect) {
        soundEffects.playCorrect();
      } else {
        soundEffects.playIncorrect();
      }
    });

    const handleQuestionResult = (data: any) => {
      setGameState("RESULTS");
      const isCorrect = data.isCorrect;
      const pts = data.pointsEarned || 0;
      setLastResult({
        isCorrect,
        pointsAwarded: pts,
        correctAnswerText: data.correctAnswerText || data.explanation || "Correct Option",
        aheadPlayerName: data.aheadPlayerName,
        pointsBehind: data.pointsBehind,
        streak: data.streak,
      });
      if (data.totalScore !== undefined) setScore(data.totalScore);
      if (data.rank !== undefined) setRank(data.rank);
      if (data.totalPlayers !== undefined) setTotalPlayers(data.totalPlayers);
    };

    socket.on("player:question_result", handleQuestionResult);

    socket.on("game:results", (data: any) => {
      setGameState("RESULTS");
      const currQ = currentQuestionRef.current;
      const correctAns = currQ?.answers?.find((a: any) => a.isCorrect);
      const isCorrect = selectedAnswerIdRef.current === correctAns?.id;
      const pts = isCorrect ? Math.round(1000 * (1 - ((Date.now() - startTimeRef.current) / 40000))) : 0;
      
      setLastResult((prev) => prev || {
        isCorrect,
        pointsAwarded: pts,
        correctAnswerText: correctAns?.text || data.explanation || "Correct Option",
      });
    });

    socket.on("game:leaderboard", (data: any) => {
      setGameState("LEADERBOARD");
      setLeaderboard(data.leaderboard || []);
      const myIdx = (data.leaderboard || []).findIndex((p: any) => p.nickname === savedNick);
      if (myIdx !== -1) setRank(myIdx + 1);
    });

    socket.on("game:podium", (data: any) => {
      setGameState("PODIUM");
      setLeaderboard(data.topPlayers || []);
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    });

    return () => {
      socket.off("connect", joinRoom);
      socket.off("player:joined");
      socket.off("player:join_error");
      socket.off("room:player_joined", handlePlayersUpdate);
      socket.off("room:players_updated", handlePlayersUpdate);
      socket.off("game:starting");
      socket.off("game:question_preview");
      socket.off("preview:tick");
      socket.off("game:question_active");
      socket.off("game:question");
      socket.off("timer:tick");
      socket.off("game:timer_tick");
      socket.off("player:answer_feedback");
      socket.off("player:question_result", handleQuestionResult);
      socket.off("game:results");
      socket.off("game:leaderboard");
      socket.off("game:podium");
    };
  }, [pin]);

  const [selectedAnswerIds, setSelectedAnswerIds] = useState<string[]>([]);
  const [orderingSequence, setOrderingSequence] = useState<string[]>([]);

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
    const responseTimeMs = Date.now() - startTimeRef.current;
    setSelectedAnswerId(ans.id);
    setSelectedAnswerText(ans.text);
    setGameState("SUBMITTED");
    soundEffects.playPop();

    socketRef.current?.emit("player:submit_answer", {
      pin,
      playerId: `p_${socketRef.current?.id?.substring(0, 8)}`,
      answerId: ans.id,
      responseTimeMs,
      ...extraData,
    });
  };

  // Choice button styles: Red, Blue, Yellow, Green
  const choiceStyles = [
    { bg: "bg-[#EF4444] hover:bg-[#DC2626] border-red-600 active:bg-[#B91C1C]", icon: "▲", name: "Red" },
    { bg: "bg-[#3B82F6] hover:bg-[#2563EB] border-blue-600 active:bg-[#1D4ED8]", icon: "◆", name: "Blue" },
    { bg: "bg-[#F59E0B] hover:bg-[#D97706] border-amber-600 active:bg-[#B45309]", icon: "●", name: "Amber" },
    { bg: "bg-[#10B981] hover:bg-[#059669] border-emerald-600 active:bg-[#047857]", icon: "■", name: "Green" },
  ];

  // Visual Timer Progress percentage
  const progressPercent = totalTimeLimit > 0 ? Math.min(100, Math.max(0, (timeRemaining / totalTimeLimit) * 100)) : 0;

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 font-sans text-white select-none max-w-lg mx-auto w-full">
      {/* JOIN ERROR MODAL */}
      {joinError && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 text-slate-900 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-2xl mx-auto font-black">
              ✕
            </div>
            <h2 className="text-xl font-black">Cannot Join Game</h2>
            <p className="text-sm font-semibold text-slate-600 leading-relaxed">{joinError}</p>
            <button
              onClick={() => router.push(`/play?pin=${pin}`)}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-md transition"
            >
              Change Nickname or PIN
            </button>
          </div>
        </div>
      )}

      {/* 1. YOU'RE IN! (LOBBY WAITING SCREEN) */}
      {gameState === "LOBBY" && !joinError && (
        <div className="flex-1 flex flex-col items-center justify-between py-10 w-full bg-emerald-600 rounded-3xl p-6 text-center shadow-2xl space-y-6">
          <div className="space-y-3 pt-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-800/60 border border-emerald-400/40 text-emerald-100 text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
              Connected to Game
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white">You&apos;re in!</h1>
            <p className="text-emerald-100 text-sm font-semibold">See your nickname on screen?</p>
          </div>

          {/* Player Badge Card */}
          <div className="w-full bg-white text-slate-900 rounded-2xl p-5 shadow-xl space-y-3 text-center border-2 border-emerald-300/40">
            <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-400 flex items-center justify-center text-3xl mx-auto shadow-md">
              {avatar}
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">{nickname}</h2>
              <p className="text-xs font-bold text-slate-500">Game PIN: <span className="font-mono text-emerald-600 font-extrabold">{pin}</span></p>
            </div>
          </div>

          <div className="w-full bg-emerald-800/40 backdrop-blur-md rounded-2xl p-3.5 flex items-center justify-between border border-emerald-400/30 text-white font-bold text-xs">
            <span>👥 {totalPlayers} Players in Lobby</span>
            <span className="text-emerald-200">Waiting for host...</span>
          </div>
        </div>
      )}

      {/* 2. PREVIEW PHASE (5 SECONDS QUESTION READ-IN WITHOUT ANSWERS & NO COUNTDOWN TIMER) */}
      {gameState === "PREVIEW" && currentQuestion && (
        <div className="flex-1 flex flex-col w-full bg-white rounded-3xl p-6 text-slate-900 shadow-2xl justify-between space-y-6 animate-fade-in">
          {/* Top Bar: Question index & Get Ready Badge (No timer shown) */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                Question {questionIndex + 1} of {totalQuestions}
              </span>
            </div>
            <div className="px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-black text-xs uppercase tracking-wider">
              Get Ready!
            </div>
          </div>

          {/* Question Media & Text */}
          <div className="space-y-4 text-center my-auto py-2">
            {currentQuestion.image && (
              <div className="h-36 w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                <img src={currentQuestion.image} alt="Question" className="w-full h-full object-cover" />
              </div>
            )}
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
              {currentQuestion.text}
            </h2>
          </div>

          {/* Focus & Read Banner (No numeric timer shown) */}
          <div className="flex flex-col items-center space-y-3 py-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center text-2xl shadow-sm animate-pulse">
              👀
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Read the question carefully • Answers revealing shortly
            </p>
          </div>

          {/* Answer choices locked placeholder */}
          <div className="w-full bg-slate-100 border border-slate-200 rounded-2xl p-4 text-center text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
            <span>🔒</span>
            <span>Answers will unlock automatically...</span>
          </div>
        </div>
      )}

      {/* 3. ACTIVE QUESTION PHASE (ANSWERS REVEALED + SLEEK PROGRESS BAR TIMER) */}
      {gameState === "QUESTION" && currentQuestion && (
        <div className="flex-1 flex flex-col w-full bg-white rounded-3xl p-6 text-slate-900 shadow-2xl justify-between space-y-5 animate-fade-in">
          {/* Top Bar: Question Index and Visual Progress Bar */}
          <div className="space-y-3 border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  Question {questionIndex + 1} of {totalQuestions}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-black text-indigo-600">
                <span>⚡</span>
                <span className="uppercase tracking-wider font-extrabold text-[11px]">Time</span>
              </div>
            </div>

            {/* Visual Timer Progress Bar */}
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200 shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                  progressPercent > 50
                    ? "bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-sm"
                    : progressPercent > 20
                    ? "bg-gradient-to-r from-amber-400 to-amber-500 shadow-sm"
                    : "bg-gradient-to-r from-rose-500 to-rose-600 animate-pulse shadow-sm"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Question Text */}
          <div className="space-y-3 text-center">
            {currentQuestion.image && (
              <div className="h-32 w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                <img src={currentQuestion.image} alt="Question" className="w-full h-full object-cover" />
              </div>
            )}
            <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
              {currentQuestion.text}
            </h2>
          </div>

          {/* Choice Grid: Red, Blue, Yellow, Green cards */}
          {(currentQuestion.type === "MULTIPLE_CHOICE" || currentQuestion.type === "TRUE_FALSE" || currentQuestion.type === "POLL" || !currentQuestion.type) && (
            <div className="grid grid-cols-1 gap-3">
              {currentQuestion.answers?.map((ans: any, idx: number) => {
                const isTF = currentQuestion.type === "TRUE_FALSE" || currentQuestion.answers?.length === 2;
                const letter = ["A", "B", "C", "D"][idx];
                const isTrue = ans.text.toLowerCase().includes("true");

                // Style mapping: Choice A = Red, Choice B = Blue, Choice C = Yellow/Amber, Choice D = Green
                const style = isTF
                  ? (isTrue ? choiceStyles[1] : choiceStyles[0])
                  : choiceStyles[idx % choiceStyles.length];

                return (
                  <button
                    key={ans.id || idx}
                    onClick={() => handleSelectAnswer(ans)}
                    className={`w-full p-4 rounded-2xl text-white font-black text-base flex items-center justify-between border-b-4 transition active:scale-95 shadow-md ${style.bg}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl bg-black/20 flex items-center justify-center text-lg shadow-inner">
                        {style.icon}
                      </span>
                      <span className="text-left font-extrabold">{ans.text}</span>
                    </div>
                    <span className="text-xs bg-white/20 px-2.5 py-1 rounded-lg uppercase tracking-wider font-bold">
                      {letter}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Short Answer Input */}
          {currentQuestion.type === "TYPE_ANSWER" && (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Type your answer here..."
                id="player_text_answer_input"
                className="w-full p-4 bg-slate-50 border-2 border-indigo-200 rounded-2xl text-slate-900 font-bold text-base focus:border-indigo-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById("player_text_answer_input") as HTMLInputElement;
                  if (input && input.value.trim()) {
                    handleSelectAnswer({ id: "typed", text: input.value.trim() }, { textAnswer: input.value.trim() });
                  }
                }}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-base rounded-2xl shadow-lg transition active:scale-95"
              >
                Submit Answer 🚀
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4. ANSWER SUBMITTED! INSTANT FEEDBACK CARD WITH PROGRESS BAR */}
      {gameState === "SUBMITTED" && (
        <div className="flex-1 flex flex-col justify-between w-full bg-[#312E81] rounded-3xl p-6 text-center text-white shadow-2xl space-y-6 animate-fade-in">
          {/* Top Bar with Question Counter and Progress Bar */}
          <div className="space-y-3 border-b border-indigo-400/20 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-black text-indigo-200 uppercase tracking-wider">
                  Question {questionIndex + 1} of {totalQuestions}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-black text-emerald-300">
                <span>⚡</span>
                <span className="uppercase tracking-wider font-extrabold text-[11px]">Round Time</span>
              </div>
            </div>

            {/* Visual Timer Progress Bar */}
            <div className="w-full h-2.5 bg-indigo-950/60 rounded-full overflow-hidden p-0.5 border border-indigo-500/30">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                  progressPercent > 50
                    ? "bg-emerald-400"
                    : progressPercent > 20
                    ? "bg-amber-400"
                    : "bg-rose-400 animate-pulse"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="space-y-4 flex flex-col items-center py-2">
            {/* Immediate Correct / Incorrect Icon & Glow */}
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition transform scale-100 ${
                lastResult?.isCorrect
                  ? "bg-emerald-500 text-white shadow-emerald-500/40"
                  : "bg-rose-500 text-white shadow-rose-500/40"
              }`}
            >
              {lastResult?.isCorrect ? (
                <Check className="w-12 h-12 stroke-[3.5]" />
              ) : (
                <X className="w-12 h-12 stroke-[3.5]" />
              )}
            </div>

            {/* Headline & Motivational Message */}
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-black">
                {lastResult?.isCorrect ? "Awesome! Spot On! 🔥" : "Failing is not the end! 💪"}
              </h2>
              <p className="text-xs font-semibold text-indigo-200">
                {lastResult?.isCorrect
                  ? "Lightning fast answer! Points awarded!"
                  : "Dust it off, you can catch up on the next question! 🚀"}
              </p>
            </div>

            {/* If Incorrect, show the correct answer clearly */}
            {lastResult && !lastResult.isCorrect && (
              <div className="w-full bg-rose-950/60 border border-rose-400/40 rounded-2xl p-3 text-xs text-rose-200 font-bold">
                Correct answer was: <span className="underline font-black text-white">{lastResult.correctAnswerText}</span>
              </div>
            )}

            {/* Score pill */}
            <div className="bg-indigo-900/80 border border-indigo-400/30 rounded-2xl p-3.5 w-full flex items-center justify-between">
              <div className="text-left">
                <span className="text-[10px] font-bold text-indigo-300 uppercase block">Points Earned</span>
                <span className="text-xl font-black text-emerald-400">
                  {lastResult?.isCorrect ? `+${lastResult.pointsAwarded}` : "0"} pts
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-indigo-300 uppercase block">Your Pick</span>
                <span className="text-sm font-bold text-white max-w-[140px] truncate block">
                  {selectedAnswerText}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom live status banner */}
          <div className="w-full bg-indigo-950/60 border border-indigo-500/30 rounded-2xl p-3 text-xs font-semibold text-indigo-200 flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Round timer active • Waiting for next phase</span>
          </div>
        </div>
      )}

      {/* 5. RESULT FEEDBACK SCREEN */}
      {gameState === "RESULTS" && lastResult && (
        <div className="flex-1 flex flex-col items-center justify-between w-full bg-white rounded-3xl p-6 text-center text-slate-900 shadow-2xl py-8 space-y-6">
          <div className="space-y-4 w-full flex flex-col items-center">
            {/* Status Icon */}
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl ${
                lastResult.isCorrect ? "bg-emerald-500 text-white shadow-emerald-500/30" : "bg-rose-500 text-white shadow-rose-500/30"
              }`}
            >
              {lastResult.isCorrect ? (
                <Check className="w-12 h-12 stroke-[3]" />
              ) : (
                <X className="w-12 h-12 stroke-[3]" />
              )}
            </div>

            {/* Motivational Heading & Subtext */}
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-black">
                {lastResult.isCorrect ? "Awesome! Spot On! 🔥" : "Failing is not the end! 💪"}
              </h2>
              <p className="text-xs font-semibold text-slate-500">
                {lastResult.isCorrect
                  ? "Lightning fast speed! Great reflexes!"
                  : "Keep your head up, you can catch up on the next question! 🚀"}
              </p>
            </div>

            {/* Correct Answer reveal if incorrect */}
            {!lastResult.isCorrect && (
              <div className="w-full bg-rose-50 border border-rose-200 rounded-2xl p-3 text-xs text-rose-900 font-bold">
                Correct answer was: <span className="underline font-black">{lastResult.correctAnswerText}</span>
              </div>
            )}

            {/* Score points awarded banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 w-full flex items-center justify-between">
              <div className="text-left">
                <span className="text-xs font-bold text-slate-400 block uppercase">Points Earned</span>
                <span className="text-2xl font-black text-indigo-600">
                  {lastResult.isCorrect ? `+${lastResult.pointsAwarded}` : "0"} pts
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-400 block uppercase">Total Score</span>
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {score.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Personalized Standing Breakdown Card */}
            <div className="w-full bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-4 text-center space-y-1">
              {rank === 1 ? (
                <p className="text-sm font-black text-indigo-900">
                  👑 1st Place! You are leading the arena!
                </p>
              ) : rank <= 3 ? (
                <p className="text-sm font-black text-indigo-900">
                  🏆 You are on the podium! Position #{rank} of {totalPlayers}!
                </p>
              ) : lastResult.aheadPlayerName ? (
                <p className="text-xs font-bold text-indigo-900">
                  📍 Position <span className="font-black text-indigo-700">#{rank}</span> • Only <span className="font-black text-amber-600">{lastResult.pointsBehind || 0} pts</span> behind <span className="font-black">{lastResult.aheadPlayerName}</span>! You can catch up! 🚀
                </p>
              ) : (
                <p className="text-xs font-bold text-indigo-900">
                  📍 Position <span className="font-black text-indigo-700">#{rank}</span> of {totalPlayers} players!
                </p>
              )}
            </div>
          </div>

          {/* Waiting for host indicator */}
          <div className="w-full bg-indigo-900 text-white rounded-2xl p-3.5 text-xs font-bold flex items-center justify-center gap-2 shadow-inner animate-pulse">
            <span>⏳</span>
            <span>Waiting for host to go to the next question...</span>
          </div>
        </div>
      )}

      {/* 6. PLAYER LEADERBOARD SCREEN */}
      {gameState === "LEADERBOARD" && (
        <div className="flex-1 flex flex-col justify-between w-full bg-[#4F46E5] rounded-3xl p-6 text-white shadow-2xl space-y-6">
          <div className="space-y-4">
            <div className="text-center border-b border-indigo-400/30 pb-3">
              <span className="text-xs font-black text-indigo-200 uppercase tracking-wider">
                Question {questionIndex + 1} of {totalQuestions}
              </span>
              <h2 className="text-xl font-black mt-1">Arena Leaderboard 🏆</h2>
            </div>

            {/* Standings list with current player highlighted */}
            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((p, idx) => (
                <div
                  key={idx}
                  className={`p-3 px-4 rounded-xl flex items-center justify-between text-xs font-bold ${
                    p.nickname === nickname
                      ? "bg-white text-indigo-900 ring-2 ring-amber-300 font-black shadow-md"
                      : "bg-indigo-900/40 text-white"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-5">{idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`}</span>
                    <span className="truncate max-w-[120px]">{p.nickname}</span>
                  </span>
                  <span className="font-mono">{p.score?.toLocaleString()} pts</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Rank Banner */}
          <div className="bg-[#4338CA] border border-indigo-400/40 rounded-2xl p-4 text-center space-y-1">
            <span className="text-xs font-bold text-indigo-200 uppercase block">Your Current Rank</span>
            <span className="text-2xl font-black text-amber-300 font-mono">Position #{rank} of {totalPlayers}</span>
            <p className="text-xs text-indigo-200 pt-1">Get ready for the next round! 🚀</p>
          </div>
        </div>
      )}

      {/* 7. PLAYER FINAL RESULTS (SINGLE UNIFIED CARD) */}
      {gameState === "PODIUM" && (
        <div className="flex-1 flex flex-col items-center justify-between w-full bg-[#4F46E5] rounded-3xl p-6 sm:p-8 text-white shadow-2xl text-center space-y-6 animate-fade-in">
          {/* Header */}
          <div className="space-y-1">
            <span className="text-xs font-black uppercase tracking-widest text-indigo-200">
              Game Finished
            </span>
            <h1 className="text-3xl font-black tracking-tight">Final Results 🏆</h1>
          </div>

          {/* Single Unified Champion / Rank & Score Section */}
          <div className="flex flex-col items-center space-y-4 my-auto py-2">
            <div className="w-24 h-24 rounded-3xl bg-white/15 border-2 border-white/30 backdrop-blur-md flex items-center justify-center text-5xl shadow-2xl">
              {rank === 1 ? "👑" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "🎉"}
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-black">
                {rank === 1
                  ? "Champion! 1st Place! 🔥"
                  : rank <= 3
                  ? `Podium Finish! Rank #${rank} 🏆`
                  : `Rank #${rank} of ${totalPlayers} Players`}
              </h2>
              <p className="text-sm font-semibold text-indigo-200">
                {nickname} • Great effort in the arena!
              </p>
            </div>

            <div className="px-6 py-3 rounded-2xl bg-indigo-900/60 border border-indigo-400/30 shadow-inner flex items-center gap-3">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-200">
                Final Score:
              </span>
              <span className="font-mono text-2xl font-black text-amber-300">
                {score.toLocaleString()} pts
              </span>
            </div>
          </div>

          {/* Play Again Button */}
          <button
            onClick={() => router.push("/play")}
            className="w-full py-4 bg-white text-indigo-900 hover:bg-indigo-50 active:scale-95 font-black text-base rounded-2xl shadow-xl transition"
          >
            Play Another Game 🎮
          </button>
        </div>
      )}
    </div>
  );
}
