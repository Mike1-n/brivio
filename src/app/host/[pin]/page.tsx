"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Copy, Check, Play, Square, Bot, Pause, ArrowRight, Trophy, Volume2, VolumeX } from "lucide-react";
import confetti from "canvas-confetti";
import { initSocket } from "@/lib/socket";
import { soundEffects } from "@/lib/soundEffects";

export default function HostScreenPage() {
  const params = useParams();
  const router = useRouter();
  const pin = (params.pin as string) || "";

  // Game States from Mockup: "LOBBY" | "STARTING" | "QUESTION" | "RESULTS" | "LEADERBOARD" | "PODIUM" | "ENDED"
  const [gameState, setGameState] = useState<string>("LOBBY");
  const [quiz, setQuiz] = useState<any>(null);
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
    <div className="min-h-screen bg-[#0B0E23] flex flex-col items-center justify-center p-4 md:p-8 font-sans">
      {/* 1. GAME LOBBY VIEW FROM MOCKUP */}
      {gameState === "LOBBY" && (
        <div className="w-full max-w-5xl bg-[#4F46E5] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
          {/* Top Bar: Game Lobby | PIN: 487521 [Copy] */}
          <div className="bg-[#4338CA] px-8 py-4 flex items-center justify-between text-white border-b border-indigo-400/30">
            <h2 className="text-xl font-black tracking-wide">Game Lobby</h2>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xl font-black bg-indigo-900/50 px-4 py-1.5 rounded-xl border border-indigo-400/30">
                PIN: {pin}
              </span>
              <button
                onClick={handleCopyPin}
                className="px-3 py-1.5 bg-white text-indigo-700 text-xs font-bold rounded-lg shadow-sm hover:bg-indigo-50 transition flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          {/* Lobby Body */}
          <div className="p-8 md:p-12 flex flex-col items-center space-y-8 text-center text-white">
            <div className="space-y-1">
              <p className="text-indigo-200 text-sm font-semibold">Waiting for players to join...</p>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
                {players.length} Players Joined
              </h1>
            </div>

            {/* 2-Column Player Avatar Grid from Mockup */}
            <div className="w-full max-w-3xl grid grid-cols-2 sm:grid-cols-4 gap-4 max-h-[320px] overflow-y-auto p-4 bg-indigo-900/30 rounded-2xl border border-indigo-400/20">
              {players.length === 0 ? (
                <div className="col-span-full py-12 text-indigo-200 font-bold">
                  Open <span className="underline font-mono">/play</span> and enter PIN: <span className="font-mono text-white text-xl">{pin}</span>
                </div>
              ) : (
                players.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/15 flex items-center gap-2.5 text-left"
                  >
                    <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-base shadow-sm">
                      {p.avatar || "🦁"}
                    </span>
                    <span className="font-bold text-sm truncate text-white">{p.nickname}</span>
                  </div>
                ))
              )}
            </div>

            {/* Bottom Controls */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <button
                onClick={handleStartGame}
                disabled={players.length === 0}
                className="px-8 py-3.5 bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-600 text-white font-black text-lg rounded-2xl shadow-xl shadow-emerald-500/30 transition flex items-center gap-2 transform active:scale-95"
              >
                <Play className="w-5 h-5 fill-white" />
                Start Game
              </button>
              <button
                onClick={handleEndGame}
                className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl transition flex items-center gap-2"
              >
                <Square className="w-4 h-4 fill-white" />
                End Game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. STARTING COUNTDOWN */}
      {gameState === "STARTING" && (
        <div className="text-center space-y-6 text-white animate-pulse">
          <h2 className="text-2xl font-black uppercase tracking-widest text-indigo-400">Get Ready!</h2>
          <div className="w-40 h-40 rounded-full bg-indigo-600 border-4 border-indigo-400 flex items-center justify-center text-7xl font-black shadow-2xl mx-auto">
            {countdown}
          </div>
          <p className="text-lg font-bold text-slate-300">Question incoming...</p>
        </div>
      )}

      {/* 3. LIVE GAME QUESTION VIEW FROM MOCKUP */}
      {(gameState === "QUESTION" || gameState === "RESULTS") && currentQuestion && (
        <div className="w-full max-w-6xl bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col text-slate-900">
          {/* Top Purple Bar: Live Game - Question 4 of 10 | Skip Question | Next Question | PIN */}
          <div className="bg-[#4F46E5] px-8 py-4 flex flex-wrap items-center justify-between text-white gap-4">
            <h2 className="text-lg font-black tracking-wide">
              Live Game — Question {questionIndex + 1} of {totalQuestions}
            </h2>
            <div className="flex items-center gap-3">
              <span className="font-mono text-base font-black bg-indigo-900/50 px-3 py-1 rounded-lg border border-indigo-400/30">
                PIN: {pin}
              </span>
              
              {gameState === "QUESTION" && (
                <button
                  onClick={handleSkipQuestion}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-lg transition shadow flex items-center gap-1.5"
                >
                  <ArrowRight className="w-3.5 h-3.5" /> Skip Question
                </button>
              )}

              {gameState === "RESULTS" && (
                <button
                  onClick={handleNextQuestion}
                  className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-lg transition shadow flex items-center gap-1.5"
                >
                  <ArrowRight className="w-3.5 h-3.5" /> Next Question
                </button>
              )}

              <button
                onClick={() => setIsPaused(!isPaused)}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-lg transition flex items-center gap-1"
              >
                <Pause className="w-3.5 h-3.5" /> {isPaused ? "Resume" : "Pause"}
              </button>
            </div>
          </div>

          {/* Main Question + Answer Grid + Stats Card */}
          <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left 8 cols: Timer, Question Prompt, Image, 4 Answer Bars */}
            <div className="lg:col-span-8 space-y-6">
              {/* Question + Timer */}
              <div className="flex items-center gap-6">
                {/* Circle Countdown Timer from Mockup */}
                <div className="w-20 h-20 rounded-full border-4 border-indigo-600 flex items-center justify-center text-2xl font-black text-indigo-700 bg-indigo-50 shadow-inner flex-shrink-0">
                  {timeRemaining}
                </div>

                <div className="flex-1">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-snug">
                    {currentQuestion.text}
                  </h1>
                </div>

                {currentQuestion.image && (
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 shadow-sm flex-shrink-0">
                    <img src={currentQuestion.image} alt="Question media" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Horizontal Answer Bars (Supports 2 for True/False or 4 for Multiple Choice) */}
              <div className="space-y-3">
                {currentQuestion.answers?.map((ans: any, idx: number) => {
                  const letter = ["A", "B", "C", "D"][idx];
                  const isTF = currentQuestion.type === "TRUE_FALSE" || currentQuestion.answers?.length === 2;
                  
                  // Color for TF or MC
                  let barColor = "bg-[#3B82F6] text-white"; // Default Blue
                  if (isTF) {
                    barColor = ans.text.toLowerCase().includes("true") ? "bg-[#3B82F6] text-white" : "bg-[#EF4444] text-white";
                  } else {
                    const barColors = [
                      "bg-[#EF4444] text-white", // Red
                      "bg-[#3B82F6] text-white", // Blue
                      "bg-[#F59E0B] text-white", // Yellow/Orange
                      "bg-[#10B981] text-white", // Green
                    ];
                    barColor = barColors[idx % 4];
                  }

                  const isCorrect = ans.isCorrect;
                  const isRevealed = gameState === "RESULTS";

                  return (
                    <div
                      key={ans.id || idx}
                      className={`p-4 px-6 rounded-2xl font-black text-lg flex items-center justify-between shadow-md transition-all ${
                        barColor
                      } ${
                        isRevealed && !isCorrect ? "opacity-30 grayscale" : ""
                      } ${
                        isRevealed && isCorrect ? "ring-4 ring-emerald-400 scale-[1.02]" : ""
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">
                          {isTF ? (ans.text.toLowerCase().includes("true") ? "◆" : "▲") : letter}
                        </span>
                        <span>{ans.text}</span>
                      </div>
                      {isRevealed && isCorrect && (
                        <span className="text-xs bg-white text-emerald-700 px-3 py-1 rounded-full font-extrabold uppercase shadow">
                          ✓ Correct
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right 4 cols: Answer Statistics Card */}
            <div className="lg:col-span-4 bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 flex flex-col justify-between h-full">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-slate-900">Answer Statistics</h3>
                  <span className="text-xs font-bold text-slate-500">
                    {answerStats.totalAnswers || 0} Total Responses
                  </span>
                </div>

                {/* Percentage Distribution Bars from Real Votes */}
                <div className="space-y-3">
                  {currentQuestion.answers?.map((ans: any, idx: number) => {
                    const letter = ["A", "B", "C", "D"][idx];
                    const isTF = currentQuestion.type === "TRUE_FALSE" || currentQuestion.answers?.length === 2;
                    const votes = answerStats.counts?.[ans?.id] || 0;
                    const pct = answerStats.percentages?.[ans?.id] !== undefined ? answerStats.percentages[ans.id] : 0;
                    const color = isTF
                      ? (ans.text.toLowerCase().includes("true") ? "bg-[#3B82F6]" : "bg-[#EF4444]")
                      : ["bg-[#EF4444]", "bg-[#3B82F6]", "bg-[#F59E0B]", "bg-[#10B981]"][idx % 4];

                    return (
                      <div key={ans.id || idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                          <span className="flex items-center gap-1.5">
                            <span className={`w-3 h-3 rounded-full ${color}`} />
                            {isTF ? ans.text : `Option ${letter}`}
                          </span>
                          <span>
                            {votes} {votes === 1 ? "vote" : "votes"} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${color} rounded-full transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons: Show Leaderboard or Skip to Next Question */}
              <div className="pt-4 border-t border-slate-200 space-y-2">
                {gameState === "QUESTION" && (
                  <button
                    onClick={handleSkipQuestion}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-black text-base rounded-2xl shadow-lg transition flex items-center justify-center gap-2"
                  >
                    Reveal / Skip Question <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                {gameState === "RESULTS" && (
                  <div className="space-y-2">
                    <button
                      onClick={handleShowLeaderboard}
                      className="w-full py-3 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-black text-base rounded-2xl shadow-lg transition flex items-center justify-center gap-2"
                    >
                      Show Leaderboard <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleNextQuestion}
                      className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-sm rounded-xl transition flex items-center justify-center gap-2"
                    >
                      Skip Leaderboard & Go to Next Question ⏭️
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. LEADERBOARD VIEW FROM MOCKUP */}
      {gameState === "LEADERBOARD" && (
        <div className="w-full max-w-4xl bg-[#4F46E5] rounded-3xl overflow-hidden shadow-2xl flex flex-col text-white">
          {/* Header from Mockup: Leaderboard | PIN: 487521 🏆 */}
          <div className="bg-[#4338CA] px-8 py-4 flex items-center justify-between border-b border-indigo-400/30">
            <h2 className="text-xl font-black tracking-wide">Leaderboard</h2>
            <div className="flex items-center gap-2 font-mono text-base font-black bg-indigo-900/50 px-3 py-1 rounded-lg">
              PIN: {pin} 🏆
            </div>
          </div>

          {/* Ranked List from Mockup */}
          <div className="p-8 space-y-3 max-w-2xl mx-auto w-full">
            {leaderboard.slice(0, 6).map((p, idx) => {
              const medalIcons = ["🥇", "🥈", "🥉"];
              return (
                <div
                  key={p.id || idx}
                  className="p-4 px-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-between shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-xl font-black w-6 text-center">
                      {idx < 3 ? medalIcons[idx] : idx + 1}
                    </span>
                    <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-base">
                      {p.avatar || "🦊"}
                    </span>
                    <span className="font-black text-lg text-white">{p.nickname}</span>
                  </div>
                  <span className="font-mono font-black text-2xl text-amber-300">
                    {p.score?.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Bottom Next Button */}
          <div className="p-6 bg-[#4338CA]/60 flex justify-center">
            <button
              onClick={handleNextStep}
              className="px-10 py-3.5 bg-white text-indigo-700 font-black text-lg rounded-2xl shadow-xl hover:bg-indigo-50 transition flex items-center gap-2"
            >
              Next Question <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* 5. FINAL RESULTS PODIUM VIEW FROM MOCKUP */}
      {gameState === "PODIUM" && (
        <div className="w-full max-w-5xl bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col text-slate-900">
          {/* Header: Final Results */}
          <div className="bg-[#4F46E5] px-8 py-4 text-white text-center">
            <h1 className="text-2xl font-black tracking-wide">Final Results 🏆</h1>
          </div>

          <div className="p-8 md:p-12 flex flex-col items-center space-y-12">
            {/* 3D Olympic Podium from Mockup */}
            <div className="flex items-end justify-center gap-4 w-full max-w-xl">
              {/* 2nd Place: SmartCookie (Blue Pillar) */}
              <div className="flex flex-col items-center flex-1">
                <div className="mb-2 text-center">
                  <span className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-3xl shadow-md mx-auto">
                    {leaderboard[1]?.avatar || "🥈"}
                  </span>
                  <p className="font-black text-sm text-slate-900 mt-1">{leaderboard[1]?.nickname || "SmartCookie"}</p>
                  <p className="font-mono text-xs font-bold text-slate-500">{leaderboard[1]?.score?.toLocaleString() || "9,850"} pts</p>
                </div>
                <div className="w-full h-40 bg-[#3B82F6] rounded-t-2xl flex items-center justify-center text-white text-4xl font-black shadow-lg">
                  2
                </div>
              </div>

              {/* 1st Place: LionKing_23 with Crown 👑 (Purple Pillar) */}
              <div className="flex flex-col items-center flex-1 relative">
                <span className="absolute -top-6 text-3xl animate-bounce">👑</span>
                <div className="mb-2 text-center">
                  <span className="w-18 h-18 rounded-full bg-indigo-100 border-2 border-indigo-400 flex items-center justify-center text-4xl shadow-lg mx-auto">
                    {leaderboard[0]?.avatar || "👑"}
                  </span>
                  <p className="font-black text-base text-slate-900 mt-1">{leaderboard[0]?.nickname || "LionKing_23"}</p>
                  <p className="font-mono text-sm font-black text-indigo-600">{leaderboard[0]?.score?.toLocaleString() || "12,450"} pts</p>
                </div>
                <div className="w-full h-56 bg-[#4F46E5] rounded-t-2xl flex items-center justify-center text-white text-5xl font-black shadow-xl">
                  1
                </div>
              </div>

              {/* 3rd Place: QuizMaster (Orange Pillar) */}
              <div className="flex flex-col items-center flex-1">
                <div className="mb-2 text-center">
                  <span className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center text-3xl shadow-md mx-auto">
                    {leaderboard[2]?.avatar || "🥉"}
                  </span>
                  <p className="font-black text-sm text-slate-900 mt-1">{leaderboard[2]?.nickname || "QuizMaster"}</p>
                  <p className="font-mono text-xs font-bold text-slate-500">{leaderboard[2]?.score?.toLocaleString() || "8,600"} pts</p>
                </div>
                <div className="w-full h-32 bg-[#F59E0B] rounded-t-2xl flex items-center justify-center text-white text-4xl font-black shadow-lg">
                  3
                </div>
              </div>
            </div>

            {/* Standings 4-6 from Mockup */}
            <div className="w-full max-w-lg space-y-2 border-t border-slate-200 pt-6">
              {leaderboard.slice(3, 6).map((p, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl font-bold text-sm">
                  <span className="text-slate-700">{idx + 4}. {p.nickname}</span>
                  <span className="font-mono text-slate-500">{p.score?.toLocaleString()} pts</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => router.push("/dashboard")}
              className="px-8 py-3 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold rounded-xl shadow-md transition"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
