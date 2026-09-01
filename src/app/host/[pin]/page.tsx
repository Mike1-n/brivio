"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Copy, Check, Play, Square, Pause, ArrowRight, Trophy, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";
import { initSocket } from "@/lib/socket";
import { soundEffects } from "@/lib/soundEffects";

export default function HostScreenPage() {
  const params = useParams();
  const router = useRouter();
  const pin = (params.pin as string) || "";

  // Game States: "LOBBY" | "STARTING" | "QUESTION" | "RESULTS" | "LEADERBOARD" | "PODIUM" | "ENDED"
  const [gameState, setGameState] = useState<string>("LOBBY");
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [timeRemaining, setTimeRemaining] = useState(20);
  const [players, setPlayers] = useState<any[]>([]);
  const [answerStats, setAnswerStats] = useState<any>({ counts: {}, percentages: {}, totalAnswers: 0, correctAnswerId: null });
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    const socket = initSocket();
    socketRef.current = socket;

    const joinAsHost = () => {
      socket.emit("host:create_room", { pin });
    };

    if (socket.connected) {
      joinAsHost();
    } else {
      socket.on("connect", joinAsHost);
    }

    const handlePlayersUpdated = ({ players: currentPlayers }: any) => {
      setPlayers(currentPlayers || []);
    };

    socket.on("room:player_joined", handlePlayersUpdated);
    socket.on("room:players_updated", handlePlayersUpdated);

    socket.on("game:starting", () => {
      setGameState("STARTING");
      soundEffects.playCountdownTick();
      let c = 3;
      setCountdown(c);
      const interval = setInterval(() => {
        c -= 1;
        if (c > 0) {
          setCountdown(c);
          soundEffects.playCountdownTick();
        } else {
          clearInterval(interval);
        }
      }, 1000);
    });

    const handleHostQuestion = (data: any) => {
      setGameState("QUESTION");
      setCurrentQuestion(data.question || data);
      setQuestionIndex(data.questionIndex);
      setTotalQuestions(data.totalQuestions);
      setTimeRemaining(data.timeLimit || 20);
      setIsPaused(false);
    };

    socket.on("host:question", handleHostQuestion);
    socket.on("game:question", handleHostQuestion);
    socket.on("game:question_active", handleHostQuestion);

    socket.on("timer:tick", ({ timeRemaining: t }: any) => {
      setTimeRemaining(t);
      if (t <= 5 && t > 0) {
        soundEffects.playWarningTick();
      }
    });

    socket.on("game:timer_tick", ({ timeRemaining: t }: any) => {
      setTimeRemaining(t);
    });

    socket.on("game:results", (data: any) => {
      setGameState("RESULTS");
      setAnswerStats(data.stats);
      soundEffects.playCorrect();
    });

    socket.on("game:leaderboard", (data: any) => {
      setGameState("LEADERBOARD");
      setLeaderboard(data.leaderboard || []);
    });

    socket.on("game:podium", (data: any) => {
      setGameState("PODIUM");
      setLeaderboard(data.topPlayers || []);
      soundEffects.playPodiumFanfare();
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 },
      });
    });

    return () => {
      socket.off("connect", joinAsHost);
      socket.off("room:player_joined", handlePlayersUpdated);
      socket.off("room:players_updated", handlePlayersUpdated);
      socket.off("game:starting");
      socket.off("host:question", handleHostQuestion);
      socket.off("game:question", handleHostQuestion);
      socket.off("game:question_active", handleHostQuestion);
      socket.off("timer:tick");
      socket.off("game:timer_tick");
      socket.off("game:results");
      socket.off("game:leaderboard");
      socket.off("game:podium");
    };
  }, [pin]);

  const handleCopyPin = () => {
    navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartGame = () => {
    soundEffects.init();
    socketRef.current?.emit("host:start_game", { pin });
  };

  const handleSkipQuestion = () => {
    socketRef.current?.emit("host:skip_question", { pin });
  };

  const handleShowLeaderboard = () => {
    socketRef.current?.emit("host:show_leaderboard", { pin });
    socketRef.current?.emit("host:next_step", { pin });
  };

  const handleNextQuestion = () => {
    socketRef.current?.emit("host:next_question", { pin });
  };

  const handleNextStep = () => {
    if (gameState === "RESULTS") {
      handleShowLeaderboard();
    } else if (gameState === "LEADERBOARD") {
      handleNextQuestion();
    }
  };

  const handleEndGame = () => {
    if (confirm("End current game session?")) {
      router.push("/dashboard");
    }
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full bg-gradient-to-b from-[#25094d] via-[#3b126d] to-[#1a0433] text-white flex flex-col justify-between p-4 sm:p-6 md:p-8 font-sans select-none overflow-hidden">
      {/* ========================================================================= */}
      {/* 1. FULL-BLEED LOBBY VIEW (NO CARDS) */}
      {/* ========================================================================= */}
      {gameState === "LOBBY" && (
        <div className="h-full flex-1 flex flex-col justify-between w-full animate-fade-in space-y-6">
          {/* Top Bar Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-purple-400/20 pb-4">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Brivio" className="h-10 w-auto object-contain drop-shadow" />
              <div>
                <span className="text-2xl font-black tracking-tight text-white block leading-none">brivio</span>
                <span className="text-[10px] font-bold text-purple-300 tracking-wider uppercase">Live Arena Host</span>
              </div>
            </div>

            {/* Central Game PIN Callout */}
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 px-5 py-2.5 rounded-2xl shadow-xl">
              <div className="text-left">
                <span className="text-[10px] font-extrabold text-purple-200 uppercase tracking-widest block">Join at /play</span>
                <span className="font-mono text-2xl sm:text-3xl font-black text-amber-300 tracking-wider">
                  {pin}
                </span>
              </div>
              <button
                onClick={handleCopyPin}
                className="px-3.5 py-2 bg-white text-purple-950 font-black text-xs rounded-xl shadow hover:bg-purple-50 transition flex items-center gap-1.5 active:scale-95 ml-2"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            {/* Start / End Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleStartGame}
                disabled={players.length === 0}
                className="px-7 py-3 bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-600 text-white font-black text-base rounded-2xl shadow-xl shadow-emerald-500/30 transition flex items-center gap-2 transform active:scale-95"
              >
                <Play className="w-5 h-5 fill-white" />
                Start Game
              </button>
              <button
                onClick={handleEndGame}
                className="px-4 py-3 bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-sm rounded-2xl border border-rose-500/30 transition flex items-center gap-1.5"
              >
                <Square className="w-4 h-4 fill-white" />
                End
              </button>
            </div>
          </div>

          {/* Center Waiting Hero + Live Player Grid */}
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 min-h-0">
            <div className="space-y-1">
              <p className="text-purple-200 text-sm font-semibold tracking-wide">Waiting for players to connect...</p>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white">
                {players.length} {players.length === 1 ? "Player" : "Players"} in the Arena
              </h1>
            </div>

            {/* Joined Players Dynamic Flow */}
            <div className="w-full max-w-5xl flex flex-wrap items-center justify-center gap-3 md:gap-4 max-h-[46vh] overflow-y-auto p-4 custom-scrollbar">
              {players.length === 0 ? (
                <div className="py-12 px-6 rounded-2xl bg-white/5 border border-dashed border-white/15 text-purple-200 text-base font-bold">
                  Ask players to go to <span className="underline font-mono text-white">/play</span> and enter PIN: <span className="font-mono text-amber-300 text-2xl font-black">{pin}</span>
                </div>
              ) : (
                players.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 px-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 flex items-center gap-3 shadow-lg transform hover:scale-105 transition"
                  >
                    <span className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-xl shadow-inner">
                      {p.avatar || "🦁"}
                    </span>
                    <span className="font-black text-sm text-white">{p.nickname}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Bottom Host Footer Tips */}
          <div className="flex items-center justify-between text-xs text-purple-300/80 border-t border-purple-400/20 pt-3">
            <span>Press <strong>Start Game</strong> when all participants are ready</span>
            <span className="font-mono">Room PIN: {pin}</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. STARTING COUNTDOWN */}
      {/* ========================================================================= */}
      {gameState === "STARTING" && (
        <div className="h-full flex-1 flex flex-col items-center justify-center text-center space-y-6 text-white animate-pulse">
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-widest text-amber-300">Get Ready!</h2>
          <div className="w-44 h-44 rounded-full bg-indigo-600 border-4 border-indigo-400 flex items-center justify-center text-8xl font-black shadow-2xl mx-auto ring-8 ring-indigo-500/20">
            {countdown}
          </div>
          <p className="text-xl font-bold text-purple-200">First question incoming...</p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. FULL-BLEED LIVE QUESTION & RESULTS VIEW (NO CARDS) */}
      {/* ========================================================================= */}
      {(gameState === "QUESTION" || gameState === "RESULTS") && currentQuestion && (
        <div className="h-full flex-1 flex flex-col justify-between w-full animate-fade-in space-y-4">
          {/* Top Bar Header */}
          <div className="flex items-center justify-between border-b border-purple-400/20 pb-3 shrink-0">
            <div className="flex items-center gap-3">
              <span className="px-3.5 py-1.5 bg-white/10 rounded-xl text-xs sm:text-sm font-black border border-white/15">
                Question {questionIndex + 1} of {totalQuestions}
              </span>
              <span className="font-mono text-xs sm:text-sm font-black bg-indigo-900/60 px-3 py-1.5 rounded-xl border border-indigo-400/30">
                PIN: {pin}
              </span>
            </div>

            {/* Countdown Timer */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 border-amber-400 flex items-center justify-center text-2xl sm:text-3xl font-black text-amber-300 bg-purple-950/80 shadow-2xl ring-4 ring-amber-400/20">
              {timeRemaining}
            </div>

            {/* Host Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              {gameState === "QUESTION" && (
                <button
                  onClick={handleSkipQuestion}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm font-black rounded-xl transition shadow-lg flex items-center gap-1.5 active:scale-95"
                >
                  <ArrowRight className="w-4 h-4" /> Skip
                </button>
              )}

              {gameState === "RESULTS" && (
                <button
                  onClick={handleShowLeaderboard}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm font-black rounded-xl transition shadow-lg flex items-center gap-1.5 active:scale-95"
                >
                  Leaderboard <ArrowRight className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={() => setIsPaused(!isPaused)}
                className="px-3 py-2 bg-white/15 hover:bg-white/25 text-white text-xs sm:text-sm font-bold rounded-xl transition flex items-center gap-1"
              >
                <Pause className="w-4 h-4" /> {isPaused ? "Resume" : "Pause"}
              </button>
            </div>
          </div>

          {/* Center Question Prompt & Media */}
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4 my-auto min-h-0 space-y-3">
            {currentQuestion.image && (
              <div className="max-h-36 sm:max-h-48 w-auto max-w-full rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl">
                <img src={currentQuestion.image} alt="Question" className="w-full h-full object-contain max-h-36 sm:max-h-48" />
              </div>
            )}
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-white leading-tight max-w-5xl">
              {currentQuestion.text}
            </h1>
          </div>

          {/* Full-Width 2x2 Answers Display Across Bottom */}
          <div className={`w-full grid gap-3 sm:gap-4 shrink-0 max-h-[38vh] min-h-[140px] ${
            (currentQuestion.type === "TRUE_FALSE" || currentQuestion.answers?.length === 2)
              ? "grid-cols-2 grid-rows-1"
              : "grid-cols-1 sm:grid-cols-2 grid-rows-2"
          }`}>
            {currentQuestion.answers?.map((ans: any, idx: number) => {
              const isTF = currentQuestion.type === "TRUE_FALSE" || currentQuestion.answers?.length === 2;
              const isTrue = (ans.text || "").toLowerCase().includes("true");

              const choiceShapes = [
                { bg: "bg-[#E21B3C] border-b-4 border-[#9c1228]", icon: "▲" },
                { bg: "bg-[#1368CE] border-b-4 border-[#0d4a94]", icon: "◆" },
                { bg: "bg-[#D89E00] border-b-4 border-[#9e7400]", icon: "●" },
                { bg: "bg-[#26890C] border-b-4 border-[#1a5e08]", icon: "■" },
              ];

              const style = isTF
                ? (isTrue ? choiceShapes[1] : choiceShapes[0])
                : choiceShapes[idx % choiceShapes.length];

              const isCorrect = ans.isCorrect;
              const isRevealed = gameState === "RESULTS";
              const votes = answerStats.counts?.[ans?.id] || 0;
              const pct = answerStats.percentages?.[ans?.id] !== undefined ? answerStats.percentages[ans.id] : 0;

              return (
                <div
                  key={ans.id || idx}
                  className={`w-full h-full min-h-[58px] p-3 sm:p-4 rounded-2xl font-black text-base sm:text-xl flex items-center justify-between shadow-2xl transition-all duration-300 ${
                    style.bg
                  } ${
                    isRevealed && !isCorrect ? "opacity-35 grayscale" : ""
                  } ${
                    isRevealed && isCorrect ? "ring-4 ring-white shadow-emerald-500/50 scale-[1.01]" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-xl sm:text-2xl opacity-90 shrink-0">
                      {style.icon}
                    </span>
                    <span className="text-left font-black tracking-wide uppercase leading-tight line-clamp-2 break-words flex-1">
                      {ans.text}
                    </span>
                  </div>

                  {isRevealed && (
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="text-xs sm:text-sm font-mono bg-black/30 px-2.5 py-1 rounded-lg">
                        {votes} ({pct}%)
                      </span>
                      {isCorrect && (
                        <span className="text-xs bg-white text-emerald-700 px-3 py-1 rounded-full font-black uppercase shadow">
                          ✓ Correct
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. FULL-BLEED LEADERBOARD VIEW (NO CARDS) */}
      {/* ========================================================================= */}
      {gameState === "LEADERBOARD" && (
        <div className="h-full flex-1 flex flex-col justify-between w-full animate-fade-in space-y-6">
          {/* Top Bar Header */}
          <div className="flex items-center justify-between border-b border-purple-400/20 pb-4">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-purple-300 block">Question {questionIndex + 1} Complete</span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Arena Leaderboard 🏆</h2>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-black bg-indigo-900/60 px-3.5 py-2 rounded-xl border border-indigo-400/30">
                PIN: {pin}
              </span>
              <button
                onClick={handleNextStep}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm sm:text-base rounded-xl shadow-xl transition flex items-center gap-2 active:scale-95"
              >
                Next Question <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Ranked List Grid */}
          <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col justify-center space-y-3 min-h-0 overflow-y-auto p-2">
            {leaderboard.slice(0, 6).map((p, idx) => {
              const medalIcons = ["🥇", "🥈", "🥉"];
              return (
                <div
                  key={p.id || idx}
                  className={`p-4 px-6 rounded-2xl border flex items-center justify-between shadow-xl transition ${
                    idx === 0
                      ? "bg-gradient-to-r from-amber-500/30 to-amber-600/20 border-amber-400/50 ring-2 ring-amber-400/30"
                      : "bg-white/10 backdrop-blur-md border-white/15"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-black w-8 text-center">
                      {idx < 3 ? medalIcons[idx] : `#${idx + 1}`}
                    </span>
                    <span className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-2xl shadow-inner">
                      {p.avatar || "🦊"}
                    </span>
                    <span className="font-black text-xl text-white">{p.nickname}</span>
                  </div>
                  <span className="font-mono font-black text-2xl sm:text-3xl text-amber-300">
                    {p.score?.toLocaleString()} pts
                  </span>
                </div>
              );
            })}
          </div>

          <div className="text-center text-xs text-purple-300/80 pt-2 border-t border-purple-400/20">
            Live arena scoring based on accuracy and response speed
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. FULL-BLEED FINAL PODIUM VIEW (NO CARDS) */}
      {/* ========================================================================= */}
      {gameState === "PODIUM" && (
        <div className="h-full flex-1 flex flex-col justify-between w-full animate-fade-in text-center space-y-6">
          {/* Header */}
          <div className="border-b border-purple-400/20 pb-4">
            <span className="text-xs font-black uppercase tracking-widest text-amber-300">Game Over</span>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">Final Champions Podium 🏆</h1>
          </div>

          {/* 3D Olympic Style Pillars */}
          <div className="flex items-end justify-center gap-4 sm:gap-6 w-full max-w-3xl mx-auto my-auto min-h-[300px]">
            {/* 2nd Place */}
            <div className="flex flex-col items-center flex-1">
              <div className="mb-3 text-center">
                <span className="w-16 h-16 rounded-2xl bg-blue-500/30 border-2 border-blue-400 flex items-center justify-center text-4xl shadow-xl mx-auto">
                  {leaderboard[1]?.avatar || "🥈"}
                </span>
                <p className="font-black text-base text-white mt-1.5">{leaderboard[1]?.nickname || "SmartCookie"}</p>
                <p className="font-mono text-sm font-bold text-amber-300">{leaderboard[1]?.score?.toLocaleString() || "9,850"} pts</p>
              </div>
              <div className="w-full h-44 bg-gradient-to-b from-blue-500 to-blue-700 rounded-t-3xl flex items-center justify-center text-white text-5xl font-black shadow-2xl border-t-2 border-blue-300/40">
                2
              </div>
            </div>

            {/* 1st Place Champion */}
            <div className="flex flex-col items-center flex-1 relative -mt-10">
              <span className="text-4xl animate-bounce mb-1">👑</span>
              <div className="mb-3 text-center">
                <span className="w-20 h-20 rounded-2xl bg-amber-500/30 border-2 border-amber-400 flex items-center justify-center text-5xl shadow-2xl mx-auto ring-4 ring-amber-400/20">
                  {leaderboard[0]?.avatar || "👑"}
                </span>
                <p className="font-black text-lg text-white mt-1.5">{leaderboard[0]?.nickname || "Champion"}</p>
                <p className="font-mono text-base font-black text-amber-300">{leaderboard[0]?.score?.toLocaleString() || "12,450"} pts</p>
              </div>
              <div className="w-full h-64 bg-gradient-to-b from-indigo-500 to-indigo-700 rounded-t-3xl flex items-center justify-center text-white text-6xl font-black shadow-2xl border-t-2 border-indigo-300/50">
                1
              </div>
            </div>

            {/* 3rd Place */}
            <div className="flex flex-col items-center flex-1">
              <div className="mb-3 text-center">
                <span className="w-16 h-16 rounded-2xl bg-amber-500/30 border-2 border-amber-400 flex items-center justify-center text-4xl shadow-xl mx-auto">
                  {leaderboard[2]?.avatar || "🥉"}
                </span>
                <p className="font-black text-base text-white mt-1.5">{leaderboard[2]?.nickname || "QuizMaster"}</p>
                <p className="font-mono text-sm font-bold text-amber-300">{leaderboard[2]?.score?.toLocaleString() || "8,600"} pts</p>
              </div>
              <div className="w-full h-36 bg-gradient-to-b from-amber-500 to-amber-700 rounded-t-3xl flex items-center justify-center text-white text-5xl font-black shadow-2xl border-t-2 border-amber-300/40">
                3
              </div>
            </div>
          </div>

          {/* Footer Back Button */}
          <div className="pt-4 border-t border-purple-400/20">
            <button
              onClick={() => router.push("/dashboard")}
              className="px-8 py-3.5 bg-white text-purple-950 font-black text-base rounded-2xl shadow-2xl hover:bg-purple-50 transition active:scale-95"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
