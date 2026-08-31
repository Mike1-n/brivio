"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { soundEffects } from "@/lib/soundEffects";
import { Trophy, Medal, Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export interface PodiumPlayer {
  id: string;
  nickname: string;
  avatar: string;
  score: number;
  rank: number;
}

interface PodiumViewProps {
  podium: PodiumPlayer[];
  fullRanking: PodiumPlayer[];
  totalPlayers: number;
  onPlayAgain?: () => void;
}

export function PodiumView({ podium, fullRanking, totalPlayers, onPlayAgain }: PodiumViewProps) {
  const first = podium.find((p) => p.rank === 1);
  const second = podium.find((p) => p.rank === 2);
  const third = podium.find((p) => p.rank === 3);

  useEffect(() => {
    // Play fanfare
    soundEffects.playPodiumFanfare();

    // Trigger grand confetti
    const duration = 4 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ["#A855F7", "#EC4899", "#F59E0B", "#10B981", "#3B82F6"],
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ["#A855F7", "#EC4899", "#F59E0B", "#10B981", "#3B82F6"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-10 py-6 text-center">
      {/* Title */}
      <div className="space-y-3">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-amber-500/20 border border-amber-400/40 text-amber-300 font-extrabold text-sm uppercase tracking-widest shadow-lg shadow-amber-500/10"
        >
          <Trophy className="w-4 h-4 text-amber-400" />
          Game Completed • Final Results
        </motion.div>
        <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight drop-shadow-lg">
          Victory Podium
        </h1>
        <p className="text-slate-400 text-lg font-medium">
          Congratulations to all {totalPlayers} participants!
        </p>
      </div>

      {/* 3D Olympic-style Podium Pillars */}
      <div className="flex items-end justify-center gap-3 md:gap-6 pt-10 min-h-[360px]">
        {/* 2nd Place */}
        <div className="flex flex-col items-center flex-1 max-w-[200px]">
          {second && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="flex flex-col items-center space-y-2 mb-3"
            >
              <span className="text-4xl filter drop-shadow">{second.avatar}</span>
              <div className="text-center">
                <p className="font-black text-white text-base md:text-lg truncate max-w-[140px]">
                  {second.nickname}
                </p>
                <p className="text-sm font-extrabold text-slate-300">
                  {second.score.toLocaleString()} pts
                </p>
              </div>
            </motion.div>
          )}
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 180 }}
            transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
            className="w-full bg-gradient-to-t from-slate-800 to-slate-700 rounded-t-2xl border-t-4 border-slate-400 p-4 flex flex-col items-center justify-between shadow-2xl"
          >
            <div className="text-3xl font-black text-slate-300">🥈</div>
            <span className="text-2xl font-black text-slate-400">2nd</span>
          </motion.div>
        </div>

        {/* 1st Place Champion */}
        <div className="flex flex-col items-center flex-1 max-w-[220px]">
          {first && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.8, duration: 0.6, type: "spring" }}
              className="flex flex-col items-center space-y-2 mb-3"
            >
              <div className="relative">
                <span className="text-5xl md:text-6xl filter drop-shadow-xl">{first.avatar}</span>
                <span className="absolute -top-3 -right-2 text-2xl animate-bounce">👑</span>
              </div>
              <div className="text-center">
                <p className="font-black text-amber-300 text-lg md:text-xl truncate max-w-[160px] drop-shadow">
                  {first.nickname}
                </p>
                <p className="text-base font-black text-amber-400">
                  {first.score.toLocaleString()} pts
                </p>
              </div>
            </motion.div>
          )}
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 240 }}
            transition={{ delay: 0.6, duration: 0.7, ease: "easeOut" }}
            className="w-full bg-gradient-to-t from-amber-700 via-amber-600 to-amber-500 rounded-t-2xl border-t-4 border-yellow-200 p-4 flex flex-col items-center justify-between shadow-2xl shadow-amber-500/20"
          >
            <div className="text-4xl font-black text-yellow-200 animate-pulse">🥇</div>
            <div className="space-y-1">
              <span className="text-3xl font-black text-white">1st</span>
              <p className="text-xs font-black text-amber-950 uppercase tracking-widest bg-amber-300/80 px-2 py-0.5 rounded">
                Champion
              </p>
            </div>
          </motion.div>
        </div>

        {/* 3rd Place */}
        <div className="flex flex-col items-center flex-1 max-w-[200px]">
          {third && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex flex-col items-center space-y-2 mb-3"
            >
              <span className="text-4xl filter drop-shadow">{third.avatar}</span>
              <div className="text-center">
                <p className="font-black text-white text-base md:text-lg truncate max-w-[140px]">
                  {third.nickname}
                </p>
                <p className="text-sm font-extrabold text-amber-600">
                  {third.score.toLocaleString()} pts
                </p>
              </div>
            </motion.div>
          )}
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 130 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full bg-gradient-to-t from-amber-950 to-amber-900 rounded-t-2xl border-t-4 border-amber-700 p-4 flex flex-col items-center justify-between shadow-2xl"
          >
            <div className="text-3xl font-black text-amber-500">🥉</div>
            <span className="text-2xl font-black text-amber-600">3rd</span>
          </motion.div>
        </div>
      </div>

      {/* Full Leaderboard Table */}
      <div className="w-full max-w-2xl mx-auto space-y-3 pt-6 text-left">
        <h3 className="text-xl font-black text-slate-200">Full Standings</h3>
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800/60 shadow-xl">
          {fullRanking.map((p) => (
            <div
              key={p.id}
              className={`flex items-center justify-between p-3.5 px-5 transition-colors ${
                p.rank === 1 ? "bg-amber-500/10" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 font-bold text-slate-400">#{p.rank}</span>
                <span className="text-2xl">{p.avatar}</span>
                <span className="font-bold text-white">{p.nickname}</span>
              </div>
              <span className="font-black text-purple-400">{p.score.toLocaleString()} pts</span>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-6">
        <Link href="/dashboard">
          <Button variant="primary" size="lg">
            Return to Dashboard
          </Button>
        </Link>
        <Link href="/explore">
          <Button variant="secondary" size="lg">
            Explore More Quizzes
          </Button>
        </Link>
      </div>
    </div>
  );
}
