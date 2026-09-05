"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Copy, Check, Play, Square, ArrowRight, Trophy, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";
import { initSocket } from "@/lib/socket";
import { soundEffects } from "@/lib/soundEffects";
import SafeImage from "@/components/SafeImage";

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
  const [totalTimeLimit, setTotalTimeLimit] = useState(20);
  const [players, setPlayers] = useState<any[]>([]);
  const [answerStats, setAnswerStats] = useState<any>({ counts: {}, percentages: {}, totalAnswers: 0, correctAnswerId: null });
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    const socket = initSocket();
    socketRef.current = socket;

    const joinAsHost = () => {
      socket.emit("host:create_room", { pin });
      socket.emit("host:get_players", { pin });
    };

    socket.on("connect", joinAsHost);
    if (socket.connected) {
      joinAsHost();
    }

    const handlePlayersUpdated = (data: any) => {
      const currentPlayers = Array.isArray(data) ? data : (data?.players || []);
      setPlayers((prev) => {
        if (currentPlayers.length > prev.length) {
          try {
            soundEffects.playPop();
          } catch (_) {}
        }
        return currentPlayers;
      });
      const lb = data?.leaderboard || currentPlayers;
      if (Array.isArray(lb) && lb.length > 0) {
        setLeaderboard(lb);
      }
    };

    socket.on("host:room_created", handlePlayersUpdated);
    socket.on("host:players_update", handlePlayersUpdated);
    socket.on("room:player_joined", handlePlayersUpdated);
    socket.on("room:players_updated", handlePlayersUpdated);
    socket.on("room:player_list", handlePlayersUpdated);

    // Fast sync interval in lobby to ensure immediate visual updates
    const syncInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit("host:get_players", { pin });
      }
    }, 1200);

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
      const limit = data.timeLimit || data.question?.timeLimit || 20;
      setTotalTimeLimit(limit);
      setTimeRemaining(limit);
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
      if (data.leaderboard) {
        setLeaderboard(data.leaderboard);
      }
      soundEffects.playCorrect();
    });

    socket.on("host:question_results", (data: any) => {
      setGameState("RESULTS");
      if (data.stats) setAnswerStats(data.stats);
      if (data.leaderboard) {
        setLeaderboard(data.leaderboard);
      }
    });

    socket.on("game:leaderboard", (data: any) => {
      setGameState("LEADERBOARD");
      setLeaderboard(data.leaderboard || []);
    });

    socket.on("host:leaderboard", (data: any) => {
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
      clearInterval(syncInterval);
      socket.off("connect", joinAsHost);
      socket.off("host:room_created", handlePlayersUpdated);
      socket.off("host:players_update", handlePlayersUpdated);
      socket.off("room:player_joined", handlePlayersUpdated);
      socket.off("room:players_updated", handlePlayersUpdated);
      socket.off("room:player_list", handlePlayersUpdated);
      socket.off("game:starting");
      socket.off("host:question", handleHostQuestion);
      socket.off("game:question", handleHostQuestion);
      socket.off("game:question_active", handleHostQuestion);
      socket.off("timer:tick");
      socket.off("game:timer_tick");
      socket.off("game:results");
      socket.off("host:question_results");
      socket.off("game:leaderboard");
      socket.off("host:leaderboard");
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
    setGameState("LEADERBOARD");
  };

  const handleNextQuestion = () => {
    socketRef.current?.emit("host:next_question", { pin });
  };

  const handleNextStep = () => {
    handleNextQuestion();
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
        <div className="h-full flex-1 flex flex-col justify-between w-full animate-fade-in space-y-2.5 sm:space-y-4">
          {/* Clean Top Bar Header (Question index format: 2/10, Game PIN, Leader Callout, and Action buttons) */}
          <div className="flex items-center justify-between border-b border-purple-400/20 pb-2.5 sm:pb-3 shrink-0 gap-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 bg-white/10 rounded-xl text-xs sm:text-sm font-black border border-white/15 tracking-wide">
                {questionIndex + 1}/{totalQuestions}
              </span>
              <span className="font-mono text-xs sm:text-sm font-black bg-indigo-900/60 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-indigo-400/30">
                PIN: {pin}
              </span>
              {(() => {
                const currentLineup = (leaderboard && leaderboard.length > 0)
                  ? leaderboard
                  : [...players].sort((a, b) => ((b.score ?? b.points) || 0) - ((a.score ?? a.points) || 0));
                if (currentLineup[0] && currentLineup[0].nickname) {
                  return (
                    <div className="hidden sm:flex items-center gap-1.5 bg-amber-500/20 border border-amber-400/40 px-3 py-1 rounded-xl text-xs font-bold text-amber-200 shadow-sm">
                      <span>👑 Rank #1:</span>
                      <span className="font-black text-white truncate max-w-[100px]">{currentLineup[0].nickname}</span>
                      <span className="font-mono text-amber-300 font-extrabold">({Number(currentLineup[0].score || 0).toLocaleString()} pts)</span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Host Controls: TWO BUTTONS (Leaderboard & Next) */}
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              <button
                onClick={handleShowLeaderboard}
                className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-black rounded-xl transition shadow-lg flex items-center gap-1.5 active:scale-95 border border-indigo-400/40"
                title="View Leaderboard & Player Lineup"
              >
                <Trophy className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-amber-300 shrink-0" />
                <span>Leaderboard</span>
              </button>

              <button
                onClick={handleNextQuestion}
                className="px-3 sm:px-5 py-1.5 sm:py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm font-black rounded-xl transition shadow-lg flex items-center gap-1.5 active:scale-95 shadow-emerald-950/30"
                title="Go to Next Question"
              >
                <span>{questionIndex + 1 >= totalQuestions ? "Podium" : "Next"}</span>
                <ArrowRight className="w-3.5 sm:w-4 h-3.5 sm:h-4 shrink-0" />
              </button>
            </div>
          </div>

          {/* Center Question Prompt & Media (Responsive typography adjusted for phones and larger screens) */}
          <div className="flex-1 flex flex-col items-center justify-center text-center px-2 sm:px-4 my-auto min-h-0 space-y-2 sm:space-y-3 overflow-y-auto">
            {currentQuestion.image && (
              <div className="max-h-20 sm:max-h-32 md:max-h-48 w-auto max-w-full rounded-xl sm:rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl shrink-0">
                <SafeImage src={currentQuestion.image} alt="Question" className="w-full h-full object-contain max-h-20 sm:max-h-32 md:max-h-48" />
              </div>
            )}
            <h1 className="text-base sm:text-2xl md:text-4xl lg:text-5xl font-black text-white leading-snug sm:leading-tight max-w-5xl break-words">
              {currentQuestion.text}
            </h1>
          </div>

          {/* Smooth Timer Bar Line (Positioned below the question prompt) */}
          <div className="w-full max-w-4xl mx-auto shrink-0 px-1 py-0.5 sm:py-1">
            <div className="w-full h-1.5 sm:h-2 md:h-2.5 bg-white/10 backdrop-blur-md rounded-full overflow-hidden border border-white/15 p-0.5 shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                  timeRemaining <= 5 && gameState === "QUESTION"
                    ? "bg-gradient-to-r from-rose-500 to-amber-500 shadow-[0_0_12px_rgba(244,63,94,0.8)] animate-pulse"
                    : "bg-gradient-to-r from-indigo-400 via-purple-400 to-amber-400 shadow-[0_0_10px_rgba(129,140,248,0.5)]"
                }`}
                style={{
                  width: `${gameState === "RESULTS" ? 100 : Math.max(0, Math.min(100, (timeRemaining / Math.max(totalTimeLimit, 1)) * 100))}%`,
                }}
              />
            </div>
          </div>

          {/* LIVE RANKS & STANDINGS TICKER (DISPLAYED DIRECTLY ON RESULTS SCREEN) */}
          {gameState === "RESULTS" && (
            <div className="w-full bg-purple-950/80 border border-purple-400/30 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 shadow-xl shrink-0 space-y-2">
              <div className="flex items-center justify-between border-b border-purple-400/20 pb-1.5">
                <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  Live Player Standings & Ranks
                </span>
                <button
                  onClick={handleShowLeaderboard}
                  className="text-[10px] sm:text-xs font-extrabold text-purple-200 hover:text-white underline"
                >
                  Full Standings →
                </button>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 custom-scrollbar">
                {(() => {
                  const currentLineup = (leaderboard && leaderboard.length > 0)
                    ? leaderboard
                    : [...players].sort((a, b) => ((b.score ?? b.points) || 0) - ((a.score ?? a.points) || 0));

                  if (currentLineup.length === 0) {
                    return <span className="text-xs text-purple-300 italic">No player answers recorded yet.</span>;
                  }

                  return currentLineup.slice(0, 6).map((p: any, idx: number) => {
                    const medals = ["🥇", "🥈", "🥉"];
                    const earned = Number(p.lastPointsEarned ?? p.pointsEarned ?? p.pointsAwarded ?? 0);
                    const totalScore = Number(p.score ?? p.totalScore ?? p.points ?? 0);

                    return (
                      <div
                        key={p.id || idx}
                        className={`shrink-0 px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold shadow-md ${
                          idx === 0
                            ? "bg-amber-500/25 border-amber-400/50 text-amber-200 ring-1 ring-amber-400/30"
                            : idx === 1
                            ? "bg-slate-400/20 border-slate-300/40 text-slate-200"
                            : idx === 2
                            ? "bg-amber-700/25 border-amber-600/40 text-amber-300"
                            : "bg-white/10 border-white/15 text-white"
                        }`}
                      >
                        <span className="font-black text-xs sm:text-sm">{idx < 3 ? medals[idx] : `#${idx + 1}`}</span>
                        <span>{p.avatar || "🦊"}</span>
                        <span className="font-extrabold max-w-[90px] sm:max-w-[120px] truncate text-white">{p.nickname}</span>
                        {earned > 0 && (
                          <span className="text-[10px] font-black text-emerald-300 bg-emerald-950/70 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                            +{earned}
                          </span>
                        )}
                        <span className="font-mono font-black text-amber-300 text-xs ml-0.5">
                          {totalScore.toLocaleString()} pts
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* Full-Width 2x2 Answers Display Across Bottom (Responsive layout and fonts) */}
          <div className={`w-full grid gap-2 sm:gap-3 md:gap-4 shrink-0 max-h-[38vh] min-h-[100px] sm:min-h-[140px] ${
            (currentQuestion.type === "TRUE_FALSE" || currentQuestion.answers?.length === 2)
              ? "grid-cols-2 grid-rows-1"
              : "grid-cols-1 sm:grid-cols-2 grid-rows-2"
          }`}>
            {currentQuestion.answers?.map((ans: any, idx: number) => {
              const isTF = currentQuestion.type === "TRUE_FALSE" || currentQuestion.answers?.length === 2;
              const isTrue = (ans.text || "").toLowerCase().includes("true");

              const choiceShapes = [
                { bg: "bg-[#E21B3C] border-b-2 sm:border-b-4 border-[#9c1228]", icon: "▲" },
                { bg: "bg-[#1368CE] border-b-2 sm:border-b-4 border-[#0d4a94]", icon: "◆" },
                { bg: "bg-[#D89E00] border-b-2 sm:border-b-4 border-[#9e7400]", icon: "●" },
                { bg: "bg-[#26890C] border-b-2 sm:border-b-4 border-[#1a5e08]", icon: "■" },
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
                  className={`w-full h-full min-h-[44px] sm:min-h-[58px] p-2.5 sm:p-3.5 md:p-4 rounded-xl sm:rounded-2xl font-bold sm:font-black text-xs sm:text-base md:text-xl flex items-center justify-between shadow-xl transition-all duration-300 ${
                    style.bg
                  } ${
                    isRevealed && !isCorrect ? "opacity-35 grayscale" : ""
                  } ${
                    isRevealed && isCorrect ? "ring-2 sm:ring-4 ring-white shadow-emerald-500/50 scale-[1.01]" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <span className="text-sm sm:text-xl md:text-2xl opacity-90 shrink-0">
                      {style.icon}
                    </span>
                    <span className="text-left font-bold sm:font-black tracking-wide uppercase leading-tight line-clamp-2 break-words flex-1">
                      {ans.text}
                    </span>
                  </div>

                  {isRevealed && (
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2 sm:ml-3">
                      <span className="text-[10px] sm:text-xs md:text-sm font-mono bg-black/30 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg">
                        {votes} ({pct}%)
                      </span>
                      {isCorrect && (
                        <span className="text-[10px] sm:text-xs bg-white text-emerald-700 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-black uppercase shadow">
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
      {/* 4. FULL-BLEED LEADERBOARD VIEW (PLAYER LINEUP & MARKS) */}
      {/* ========================================================================= */}
      {gameState === "LEADERBOARD" && (
        <div className="h-full flex-1 flex flex-col justify-between w-full animate-fade-in space-y-3 sm:space-y-4">
          {/* Top Bar Header */}
          <div className="flex items-center justify-between border-b border-purple-400/20 pb-2.5 sm:pb-3 gap-2 shrink-0">
            <div>
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-purple-300 block">
                {questionIndex + 1}/{totalQuestions} Complete
              </span>
              <h2 className="text-base sm:text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                Player Lineup & Standings 🏆
              </h2>
            </div>

            {/* Host Controls: TWO BUTTONS (Leaderboard & Next) */}
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              <button
                onClick={() => {
                  if (currentQuestion) setGameState("RESULTS");
                }}
                className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-indigo-500/80 hover:bg-indigo-500 text-white text-xs sm:text-sm font-black rounded-xl transition shadow-lg flex items-center gap-1.5 active:scale-95 border border-indigo-300/40 ring-2 ring-indigo-400/30"
                title="Lineup & Standings Active (Click to toggle question results)"
              >
                <Trophy className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-amber-300 shrink-0" />
                <span>Leaderboard</span>
              </button>

              <button
                onClick={handleNextQuestion}
                className="px-3 sm:px-5 py-1.5 sm:py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm font-black rounded-xl transition shadow-lg flex items-center gap-1.5 active:scale-95 shadow-emerald-950/30"
                title="Go to Next Question"
              >
                <span>{questionIndex + 1 >= totalQuestions ? "Podium" : "Next"}</span>
                <ArrowRight className="w-3.5 sm:w-4 h-3.5 sm:h-4 shrink-0" />
              </button>
            </div>
          </div>

          {/* Ranked List Grid - All players arranged from highest total marks to lowest */}
          <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col space-y-2 sm:space-y-2.5 min-h-0 overflow-y-auto pr-1 py-1">
            {(() => {
              const currentLineup = (leaderboard && leaderboard.length > 0)
                ? leaderboard
                : [...players].sort((a, b) => ((b.score ?? b.points) || 0) - ((a.score ?? a.points) || 0));

              if (currentLineup.length === 0) {
                return (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-white/5 rounded-2xl border border-white/10 my-auto">
                    <span className="text-3xl sm:text-4xl mb-2">👥</span>
                    <p className="text-sm sm:text-base font-black text-white">No player scores recorded yet</p>
                    <p className="text-xs text-purple-300">Marks and scores will update as questions are answered.</p>
                  </div>
                );
              }

              return currentLineup.map((p: any, idx: number) => {
                const medalIcons = ["🥇", "🥈", "🥉"];
                const earned = Number(p.lastPointsEarned ?? p.pointsEarned ?? p.pointsAwarded ?? 0);
                const totalScore = Number(p.score ?? p.totalScore ?? p.points ?? 0);
                const hasGained = earned > 0;

                return (
                  <div
                    key={p.id || idx}
                    className={`p-2.5 sm:p-3.5 md:p-4 px-3 sm:px-5 md:px-6 rounded-xl sm:rounded-2xl border flex items-center justify-between shadow-xl transition-all duration-300 ${
                      idx === 0
                        ? "bg-gradient-to-r from-amber-500/25 via-purple-900/40 to-amber-600/20 border-amber-400/60 ring-2 ring-amber-400/30"
                        : idx === 1
                        ? "bg-gradient-to-r from-slate-400/20 via-purple-900/30 to-slate-500/15 border-slate-300/40"
                        : idx === 2
                        ? "bg-gradient-to-r from-amber-700/25 via-purple-900/30 to-amber-800/15 border-amber-600/30"
                        : "bg-white/10 backdrop-blur-md border-white/15"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1 mr-2">
                      <span className="text-base sm:text-xl md:text-2xl font-black w-6 sm:w-8 text-center shrink-0">
                        {idx < 3 ? medalIcons[idx] : `#${idx + 1}`}
                      </span>
                      <span className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/20 flex items-center justify-center text-lg sm:text-2xl shadow-inner shrink-0">
                        {p.avatar || "🦊"}
                      </span>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-black text-xs sm:text-base md:text-lg text-white truncate">
                          {p.nickname}
                        </span>
                        {p.streak > 1 && (
                          <span className="text-[10px] sm:text-xs font-bold text-amber-400 flex items-center gap-1">
                            🔥 {p.streak} streak
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Marks for that question + Total Marks */}
                    <div className="flex items-center gap-2 sm:gap-4 shrink-0 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] sm:text-[11px] font-bold text-purple-200/70 uppercase">
                          This Question
                        </span>
                        <span
                          className={`text-[11px] sm:text-xs md:text-sm font-black px-1.5 sm:px-2.5 py-0.5 rounded-md sm:rounded-lg ${
                            hasGained
                              ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                              : "bg-white/5 text-slate-400 border border-white/10"
                          }`}
                        >
                          {hasGained ? `+${earned.toLocaleString()} pts` : "+0 pts"}
                        </span>
                      </div>

                      <div className="flex flex-col items-end min-w-[70px] sm:min-w-[95px]">
                        <span className="text-[9px] sm:text-[11px] font-bold text-purple-200/70 uppercase">
                          Total Marks
                        </span>
                        <span className="font-mono font-black text-xs sm:text-lg md:text-xl text-amber-300">
                          {totalScore.toLocaleString()} pts
                        </span>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          <div className="text-center text-[10px] sm:text-xs text-purple-300/80 pt-1.5 border-t border-purple-400/20 shrink-0">
            Player lineup ranked by total marks accumulated across all questions so far
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. FULL-BLEED FINAL PODIUM VIEW (NO CARDS) */}
      {/* ========================================================================= */}
      {gameState === "PODIUM" && (
        <div className="h-full flex-1 flex flex-col justify-between w-full animate-fade-in text-center space-y-4 sm:space-y-6 overflow-y-auto">
          {/* Header */}
          <div className="border-b border-purple-400/20 pb-3 shrink-0">
            <span className="text-xs font-black uppercase tracking-widest text-amber-300">Game Over</span>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">Final Champions Podium 🏆</h1>
          </div>

          {/* 3D Olympic Style Pillars */}
          {(() => {
            const podiumLineup = (leaderboard && leaderboard.length > 0)
              ? leaderboard
              : [...players].sort((a, b) => ((b.score ?? b.points) || 0) - ((a.score ?? a.points) || 0));

            return (
              <div className="space-y-6 my-auto">
                <div className="flex items-end justify-center gap-3 sm:gap-6 w-full max-w-3xl mx-auto min-h-[220px] sm:min-h-[280px]">
                  {/* 2nd Place */}
                  <div className="flex flex-col items-center flex-1">
                    <div className="mb-2 text-center">
                      <span className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-blue-500/30 border-2 border-blue-400 flex items-center justify-center text-2xl sm:text-4xl shadow-xl mx-auto">
                        {podiumLineup[1]?.avatar || "🥈"}
                      </span>
                      <p className="font-black text-xs sm:text-base text-white mt-1 truncate max-w-[100px] sm:max-w-none">{podiumLineup[1]?.nickname || "Player 2"}</p>
                      <p className="font-mono text-xs sm:text-sm font-bold text-amber-300">{Number(podiumLineup[1]?.score || 0).toLocaleString()} pts</p>
                    </div>
                    <div className="w-full h-28 sm:h-44 bg-gradient-to-b from-blue-500 to-blue-700 rounded-t-2xl sm:rounded-t-3xl flex items-center justify-center text-white text-3xl sm:text-5xl font-black shadow-2xl border-t-2 border-blue-300/40">
                      2
                    </div>
                  </div>

                  {/* 1st Place Champion */}
                  <div className="flex flex-col items-center flex-1 relative -mt-6 sm:-mt-10">
                    <span className="text-2xl sm:text-4xl animate-bounce mb-1">👑</span>
                    <div className="mb-2 text-center">
                      <span className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-amber-500/30 border-2 border-amber-400 flex items-center justify-center text-3xl sm:text-5xl shadow-2xl mx-auto ring-4 ring-amber-400/20">
                        {podiumLineup[0]?.avatar || "👑"}
                      </span>
                      <p className="font-black text-sm sm:text-lg text-white mt-1 truncate max-w-[110px] sm:max-w-none">{podiumLineup[0]?.nickname || "Champion"}</p>
                      <p className="font-mono text-xs sm:text-base font-black text-amber-300">{Number(podiumLineup[0]?.score || 0).toLocaleString()} pts</p>
                    </div>
                    <div className="w-full h-40 sm:h-64 bg-gradient-to-b from-indigo-500 to-indigo-700 rounded-t-2xl sm:rounded-t-3xl flex items-center justify-center text-white text-4xl sm:text-6xl font-black shadow-2xl border-t-2 border-indigo-300/50">
                      1
                    </div>
                  </div>

                  {/* 3rd Place */}
                  <div className="flex flex-col items-center flex-1">
                    <div className="mb-2 text-center">
                      <span className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-amber-500/30 border-2 border-amber-400 flex items-center justify-center text-2xl sm:text-4xl shadow-xl mx-auto">
                        {podiumLineup[2]?.avatar || "🥉"}
                      </span>
                      <p className="font-black text-xs sm:text-base text-white mt-1 truncate max-w-[100px] sm:max-w-none">{podiumLineup[2]?.nickname || "Player 3"}</p>
                      <p className="font-mono text-xs sm:text-sm font-bold text-amber-300">{Number(podiumLineup[2]?.score || 0).toLocaleString()} pts</p>
                    </div>
                    <div className="w-full h-24 sm:h-36 bg-gradient-to-b from-amber-500 to-amber-700 rounded-t-2xl sm:rounded-t-3xl flex items-center justify-center text-white text-3xl sm:text-5xl font-black shadow-2xl border-t-2 border-amber-300/40">
                      3
                    </div>
                  </div>
                </div>

                {/* Full Ranking Standings Below Podium for All Participants */}
                {podiumLineup.length > 3 && (
                  <div className="w-full max-w-2xl mx-auto bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 space-y-2 text-left">
                    <h3 className="text-xs font-black uppercase tracking-wider text-purple-200 border-b border-purple-400/20 pb-1.5 flex items-center justify-between">
                      <span>All Participant Final Ranks ({podiumLineup.length} Players)</span>
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    </h3>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {podiumLineup.slice(3).map((p: any, i: number) => (
                        <div key={p.id || i} className="p-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs font-bold">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-purple-300 w-6">#{i + 4}</span>
                            <span>{p.avatar || "🦊"}</span>
                            <span className="font-extrabold text-white">{p.nickname}</span>
                          </div>
                          <span className="font-mono font-black text-amber-300">{Number(p.score || 0).toLocaleString()} pts</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Footer Back Button */}
          <div className="pt-3 border-t border-purple-400/20 shrink-0">
            <button
              onClick={() => router.push("/dashboard")}
              className="px-8 py-3 bg-white text-purple-950 font-black text-sm sm:text-base rounded-2xl shadow-2xl hover:bg-purple-50 transition active:scale-95"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
