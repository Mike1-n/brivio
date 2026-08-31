"use client";

import React from "react";
import { motion } from "framer-motion";
import { Trophy, Flame, ArrowUp, ArrowDown, Minus } from "lucide-react";

export interface LeaderboardPlayer {
  id: string;
  nickname: string;
  avatar: string;
  score: number;
  streak: number;
  rank: number;
  prevRank: number;
  rankDiff: number;
}

interface LeaderboardViewProps {
  leaderboard: LeaderboardPlayer[];
  currentQuestionIndex: number;
  totalQuestions: number;
  isLastQuestion: boolean;
}

export function LeaderboardView({
  leaderboard,
  currentQuestionIndex,
  totalQuestions,
  isLastQuestion,
}: LeaderboardViewProps) {
  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <span className="text-2xl">🥇</span>;
      case 2:
        return <span className="text-2xl">🥈</span>;
      case 3:
        return <span className="text-2xl">🥉</span>;
      default:
        return <span className="text-lg font-bold text-purple-300">#{rank}</span>;
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-sm font-bold uppercase tracking-wider">
          <Trophy className="w-4 h-4 text-amber-400" />
          Scoreboard (Question {currentQuestionIndex + 1} of {totalQuestions})
        </div>
        <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow">
          Leaderboard
        </h2>
      </div>

      <div className="space-y-3">
        {leaderboard.map((player, idx) => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: idx * 0.1, duration: 0.35, ease: "easeOut" }}
            className={`flex items-center justify-between p-4 md:p-5 rounded-2xl border backdrop-blur-xl transition-all shadow-xl ${
              player.rank === 1
                ? "bg-gradient-to-r from-amber-500/20 via-purple-600/20 to-amber-500/20 border-amber-400/50 shadow-amber-500/10"
                : "bg-slate-900/80 border-slate-800"
            }`}
          >
            {/* Left: Rank & Avatar & Nickname */}
            <div className="flex items-center gap-4">
              <div className="w-10 flex items-center justify-center">
                {getRankBadge(player.rank)}
              </div>
              <div className="text-3xl p-1.5 bg-white/5 rounded-xl border border-white/10">
                {player.avatar}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg md:text-xl font-black text-white">
                    {player.nickname}
                  </span>
                  {player.streak >= 2 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black animate-pulse">
                      <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      {player.streak}
                    </span>
                  )}
                </div>
                {/* Rank difference badge */}
                <div className="flex items-center gap-1 text-xs font-semibold mt-0.5">
                  {player.rankDiff > 0 ? (
                    <span className="text-emerald-400 flex items-center">
                      <ArrowUp className="w-3 h-3 stroke-[3]" /> +{player.rankDiff} spots
                    </span>
                  ) : player.rankDiff < 0 ? (
                    <span className="text-rose-400 flex items-center">
                      <ArrowDown className="w-3 h-3 stroke-[3]" /> {player.rankDiff} spots
                    </span>
                  ) : (
                    <span className="text-slate-400 flex items-center">
                      <Minus className="w-3 h-3" /> Same position
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Score */}
            <div className="text-right">
              <span className="text-2xl md:text-3xl font-black text-purple-300">
                {player.score.toLocaleString()}
              </span>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">points</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
