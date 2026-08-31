"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Play,
  Trophy,
  Users,
  Globe,
  BookOpen,
  Gamepad2,
  Crown,
  Zap,
  Flame,
  Medal,
  BarChart3,
  CheckCircle2,
} from "lucide-react";
import { AlexCaricature, SarahCaricature, DavidCaricature } from "@/components/PodiumCaricatures";

export default function HomePage() {
  const router = useRouter();
  const [pin, setPin] = useState("");

  const handleJoinByPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim()) {
      router.push(`/play?pin=${encodeURIComponent(pin.trim())}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Hero Section */}
      <section className="relative pt-12 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Headline & CTA */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider">
              <Gamepad2 className="w-3.5 h-3.5 text-indigo-600" />
              Real-Time Game Arena
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.08]">
              Supercharge <br />
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
                the way we learn!
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 font-medium leading-relaxed max-w-lg">
              Create interactive live quiz games in seconds. Challenge classrooms, teams, and friends with real-time multiplayer excitement.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link href="/register">
                <button className="px-8 py-4 text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-xl shadow-indigo-600/30 transition-all transform active:scale-95">
                  Get Started Free
                </button>
              </Link>
              <Link href="/play">
                <button className="px-8 py-4 text-base font-bold text-slate-800 bg-white hover:bg-slate-50 border-2 border-slate-200 rounded-2xl shadow-sm transition-all transform active:scale-95">
                  Join a Game
                </button>
              </Link>
            </div>

            {/* Quick PIN input bar */}
            <form onSubmit={handleJoinByPin} className="pt-2 flex items-center gap-2 max-w-md">
              <input
                type="text"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                placeholder="Enter 6-digit Game PIN..."
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 transition"
              />
              <button type="submit" className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition">
                Join
              </button>
            </form>
          </div>

          {/* Right Column: Animated Live Battle Caricature Podium Showcase */}
          <div className="lg:col-span-6 relative flex justify-center items-end min-h-[440px]">
            {/* Floating Live Game Badges */}
            <div className="absolute -top-6 left-2 z-20 bg-white/95 backdrop-blur-md border border-orange-200 text-orange-600 px-3.5 py-1.5 rounded-2xl shadow-lg shadow-orange-500/10 flex items-center gap-2 text-xs font-black animate-bounce">
              <Flame className="w-4 h-4 fill-orange-500 text-orange-500" />
              5x Answer Streak!
            </div>

            <div className="absolute top-4 right-0 z-20 bg-white/95 backdrop-blur-md border border-indigo-200 text-indigo-600 px-3.5 py-1.5 rounded-2xl shadow-lg shadow-indigo-500/10 flex items-center gap-2 text-xs font-black animate-pulse">
              <Zap className="w-4 h-4 fill-indigo-500 text-indigo-500" />
              +1,000 Speed Bonus
            </div>

            {/* Animated Caricature Podium Showcase */}
            <div className="flex items-end justify-center gap-3 sm:gap-4 w-full max-w-md relative z-10">
              {/* 2nd Place (Sarah / Amber Pillar) */}
              <div className="flex flex-col items-center flex-1">
                <div className="mb-2.5">
                  <SarahCaricature />
                </div>
                <div className="w-full h-36 bg-gradient-to-b from-amber-400 to-amber-500 rounded-t-2xl flex flex-col items-center justify-between p-3.5 text-white shadow-xl">
                  <span className="text-3xl font-black">2</span>
                  <div className="bg-black/25 px-2.5 py-1 rounded-lg text-xs font-black tracking-wide">
                    7,350 pts
                  </div>
                </div>
              </div>

              {/* 1st Place (Alex Champion / Royal Blue Pillar) */}
              <div className="flex flex-col items-center flex-1 -mt-8">
                <div className="mb-2.5">
                  <AlexCaricature />
                </div>
                <div className="w-full h-48 bg-gradient-to-b from-indigo-500 via-indigo-600 to-blue-600 rounded-t-2xl flex flex-col items-center justify-between p-3.5 text-white shadow-2xl ring-2 ring-indigo-400/30">
                  <span className="text-4xl font-black">1</span>
                  <div className="bg-black/30 px-3 py-1 rounded-lg text-xs font-black tracking-wide">
                    9,200 pts
                  </div>
                </div>
              </div>

              {/* 3rd Place (David / Coral Pillar) */}
              <div className="flex flex-col items-center flex-1">
                <div className="mb-2.5">
                  <DavidCaricature />
                </div>
                <div className="w-full h-28 bg-gradient-to-b from-rose-400 to-rose-500 rounded-t-2xl flex flex-col items-center justify-between p-3 text-white shadow-xl">
                  <span className="text-3xl font-black">3</span>
                  <div className="bg-black/25 px-2.5 py-1 rounded-lg text-xs font-black tracking-wide">
                    6,100 pts
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Purple Stats Card */}
        <div className="mt-14 w-full bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 rounded-3xl p-8 text-white shadow-2xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-white/15">
            <div className="flex flex-col items-center justify-center space-y-1">
              <div className="flex items-center gap-2 text-2xl sm:text-3xl font-black">
                <BookOpen className="w-6 h-6 text-indigo-200" />
                10K+
              </div>
              <p className="text-xs font-bold text-indigo-100 uppercase tracking-wider">Quizzes Created</p>
            </div>

            <div className="flex flex-col items-center justify-center space-y-1 pt-4 md:pt-0">
              <div className="flex items-center gap-2 text-2xl sm:text-3xl font-black">
                <Gamepad2 className="w-6 h-6 text-indigo-200" />
                5M+
              </div>
              <p className="text-xs font-bold text-indigo-100 uppercase tracking-wider">Games Played</p>
            </div>

            <div className="flex flex-col items-center justify-center space-y-1 pt-4 md:pt-0">
              <div className="flex items-center gap-2 text-2xl sm:text-3xl font-black">
                <Users className="w-6 h-6 text-indigo-200" />
                2M+
              </div>
              <p className="text-xs font-bold text-indigo-100 uppercase tracking-wider">Players</p>
            </div>

            <div className="flex flex-col items-center justify-center space-y-1 pt-4 md:pt-0">
              <div className="flex items-center gap-2 text-2xl sm:text-3xl font-black">
                <Globe className="w-6 h-6 text-indigo-200" />
                100+
              </div>
              <p className="text-xs font-bold text-indigo-100 uppercase tracking-wider">Countries</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Section */}
      <section id="features" className="py-16 bg-slate-50 border-t border-slate-200 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
              Why Teachers and Teams Love Brivio
            </h2>
            <p className="text-slate-600 font-medium">
              Where minds compete. Bring real-time multiplayer excitement to any room.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                <Zap className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Live Multiplayer</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Connect hundreds of students simultaneously using simple 6-digit game PINs.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
                <Trophy className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Speed & Streak Scoring</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Reward fast correct answers with multipliers and keep energy high with animated scoreboards.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                <BarChart3 className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Instant Analytics</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Track participant accuracy, hardest questions, and export reports with clean visual charts.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
