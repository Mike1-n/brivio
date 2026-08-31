"use client";

import React from "react";
import { motion } from "framer-motion";
import { Crown, Flame, Zap, Star } from "lucide-react";

// ==========================================
// 1. ALEX - THE 1ST PLACE CHAMPION (CENTER)
// ==========================================
export function AlexCaricature() {
  return (
    <motion.div
      className="relative flex flex-col items-center select-none cursor-pointer"
      animate={{
        y: [0, -10, 0],
        rotate: [-1, 1.5, -1],
      }}
      transition={{
        duration: 2.4,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      whileHover={{ scale: 1.1, rotate: 0 }}
    >
      {/* Floating Gleaming Crown */}
      <motion.div
        className="absolute -top-9 z-30"
        animate={{
          y: [0, -5, 0],
          rotate: [-3, 3, -3],
          scale: [1, 1.08, 1],
        }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <div className="relative">
          <Crown className="w-8 h-8 text-amber-400 fill-amber-400 filter drop-shadow-[0_4px_12px_rgba(251,191,36,0.8)]" />
        </div>
      </motion.div>

      {/* Caricature Illustration Avatar Box */}
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl p-1 bg-gradient-to-tr from-indigo-600 via-purple-500 to-pink-500 shadow-[0_8px_25px_rgba(99,102,241,0.45)] ring-4 ring-indigo-400/40">
        <div className="w-full h-full rounded-[22px] bg-gradient-to-b from-slate-900 to-indigo-950 overflow-hidden relative flex items-center justify-center">
          {/* Background Glow */}
          <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/20 via-transparent to-purple-500/30" />

          {/* SVG Expressive Caricature Character */}
          <svg viewBox="0 0 100 100" className="w-full h-full relative z-10">
            <defs>
              <linearGradient id="alexSkin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffdbac" />
                <stop offset="100%" stopColor="#f1c27d" />
              </linearGradient>
              <linearGradient id="alexHair" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#4338ca" />
                <stop offset="50%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#818cf8" />
              </linearGradient>
              <linearGradient id="alexJersey" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </linearGradient>
            </defs>

            {/* Shoulders & Champion Jersey */}
            <path d="M 22 88 Q 50 78 78 88 L 85 100 L 15 100 Z" fill="url(#alexJersey)" />
            {/* Jersey Star Badge */}
            <polygon points="50,83 52,87 56,87 53,89 54,93 50,91 46,93 47,89 44,87 48,87" fill="#fbbf24" />

            {/* Neck */}
            <rect x="44" y="68" width="12" height="12" rx="4" fill="#e0ac69" />

            {/* Head / Face */}
            <circle cx="50" cy="50" r="23" fill="url(#alexSkin)" />

            {/* Cheeks Blush */}
            <circle cx="34" cy="56" r="4" fill="#f87171" opacity="0.4" />
            <circle cx="66" cy="56" r="4" fill="#f87171" opacity="0.4" />

            {/* Expressive Winking & Smiling Eyes */}
            {/* Left Eye: Happy Arch */}
            <path d="M 33 46 Q 38 40 43 46" stroke="#1e1b4b" strokeWidth="3" strokeLinecap="round" fill="none" />
            {/* Right Eye: Big Sparkle Eye */}
            <circle cx="61" cy="46" r="4.5" fill="#1e1b4b" />
            <circle cx="59.5" cy="44.5" r="1.5" fill="#ffffff" />

            {/* Eyebrows */}
            <path d="M 32 39 Q 38 36 43 40" stroke="#312e81" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M 57 40 Q 62 36 67 39" stroke="#312e81" strokeWidth="2.5" strokeLinecap="round" fill="none" />

            {/* Nose */}
            <path d="M 49 49 Q 51 53 53 52" stroke="#d97706" strokeWidth="2" strokeLinecap="round" fill="none" />

            {/* Big Energetic Open Smile with Teeth */}
            <path d="M 38 56 Q 50 69 62 56 Z" fill="#b91c1c" />
            <path d="M 40 56 Q 50 61 60 56 Q 50 54 40 56" fill="#ffffff" />
            <path d="M 44 62 Q 50 67 56 62 Q 50 61 44 62" fill="#f87171" />

            {/* Spiky Cool Champion Hair */}
            <path
              d="M 27 44 C 23 28 35 18 50 18 C 65 18 77 28 73 44 C 70 34 62 26 50 26 C 38 26 30 34 27 44 Z"
              fill="url(#alexHair)"
            />
            <path d="M 38 23 L 42 12 L 48 20 L 55 9 L 60 21 L 68 14 L 66 26" fill="url(#alexHair)" />

            {/* Gamer Headphones */}
            <path d="M 24 48 C 24 30 76 30 76 48" stroke="#ec4899" strokeWidth="4" strokeLinecap="round" fill="none" />
            {/* Left Earpad */}
            <rect x="20" y="44" width="8" height="14" rx="4" fill="#db2777" />
            <circle cx="24" cy="51" r="2.5" fill="#fdf2f8" />
            {/* Right Earpad */}
            <rect x="72" y="44" width="8" height="14" rx="4" fill="#db2777" />
            <circle cx="76" cy="51" r="2.5" fill="#fdf2f8" />
            {/* Headset Mic */}
            <path d="M 26 55 Q 32 64 42 62" stroke="#db2777" strokeWidth="2" strokeLinecap="round" fill="none" />
            <circle cx="43" cy="62" r="2" fill="#ec4899" />
          </svg>
        </div>
      </div>

      {/* Name & Title */}
      <span className="text-xs font-black text-slate-900 block mt-2 tracking-wide">
        Alex
      </span>
      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200/60 -mt-0.5">
        👑 1st Champion
      </span>
    </motion.div>
  );
}

// ==========================================
// 2. SARAH - THE 2ND PLACE CONTENDER (LEFT)
// ==========================================
export function SarahCaricature() {
  return (
    <motion.div
      className="relative flex flex-col items-center select-none cursor-pointer"
      animate={{
        y: [0, -7, 0],
        rotate: [1, -1.5, 1],
      }}
      transition={{
        duration: 2.8,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      whileHover={{ scale: 1.1, rotate: 0 }}
    >
      {/* Caricature Illustration Avatar Box */}
      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-3xl p-1 bg-gradient-to-tr from-amber-500 via-orange-400 to-yellow-300 shadow-[0_6px_20px_rgba(245,158,11,0.4)] ring-3 ring-amber-400/40">
        <div className="w-full h-full rounded-[22px] bg-gradient-to-b from-slate-900 to-amber-950 overflow-hidden relative flex items-center justify-center">
          {/* Background Glow */}
          <div className="absolute inset-0 bg-gradient-to-t from-amber-500/20 via-transparent to-orange-500/30" />

          {/* SVG Expressive Caricature Character */}
          <svg viewBox="0 0 100 100" className="w-full h-full relative z-10">
            <defs>
              <linearGradient id="sarahSkin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fcd34d" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
              <linearGradient id="sarahHair" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#7c2d12" />
                <stop offset="100%" stopColor="#9a3412" />
              </linearGradient>
              <linearGradient id="sarahHoodie" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>
            </defs>

            {/* Hair Bun Left & Right */}
            <circle cx="25" cy="30" r="11" fill="url(#sarahHair)" />
            <circle cx="75" cy="30" r="11" fill="url(#sarahHair)" />
            {/* Hair Ribbons */}
            <rect x="29" y="34" width="6" height="4" rx="2" fill="#ec4899" />
            <rect x="65" y="34" width="6" height="4" rx="2" fill="#ec4899" />

            {/* Shoulders & Trendy Hoodie */}
            <path d="M 20 90 Q 50 80 80 90 L 88 100 L 12 100 Z" fill="url(#sarahHoodie)" />
            {/* Hoodie Strings */}
            <line x1="44" y1="84" x2="44" y2="95" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="56" y1="84" x2="56" y2="95" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />

            {/* Neck */}
            <rect x="44" y="68" width="12" height="12" rx="4" fill="#fcd34d" />

            {/* Head / Face */}
            <circle cx="50" cy="52" r="22" fill="#fde68a" />

            {/* Cheeks Blush */}
            <circle cx="35" cy="58" r="4" fill="#f43f5e" opacity="0.4" />
            <circle cx="65" cy="58" r="4" fill="#f43f5e" opacity="0.4" />

            {/* Big Cute Expressive Eyes with Lashes */}
            {/* Left Eye */}
            <circle cx="38" cy="48" r="4.5" fill="#1e1b4b" />
            <circle cx="36.5" cy="46.5" r="1.5" fill="#ffffff" />
            <path d="M 33 44 L 30 42" stroke="#1e1b4b" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 37 42 L 36 39" stroke="#1e1b4b" strokeWidth="1.5" strokeLinecap="round" />

            {/* Right Eye */}
            <circle cx="62" cy="48" r="4.5" fill="#1e1b4b" />
            <circle cx="60.5" cy="46.5" r="1.5" fill="#ffffff" />
            <path d="M 67 44 L 70 42" stroke="#1e1b4b" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 63 42 L 64 39" stroke="#1e1b4b" strokeWidth="1.5" strokeLinecap="round" />

            {/* Stylish Modern Glasses Frame */}
            <rect x="30" y="42" width="16" height="12" rx="4" stroke="#ec4899" strokeWidth="2" fill="none" />
            <rect x="54" y="42" width="16" height="12" rx="4" stroke="#ec4899" strokeWidth="2" fill="none" />
            <line x1="46" y1="47" x2="54" y2="47" stroke="#ec4899" strokeWidth="2" />

            {/* Nose */}
            <circle cx="50" cy="55" r="1.5" fill="#d97706" />

            {/* Sweet Happy Smile */}
            <path d="M 42 61 Q 50 68 58 61" stroke="#991b1b" strokeWidth="2.5" strokeLinecap="round" fill="none" />

            {/* Bangs / Hairline */}
            <path
              d="M 28 45 C 28 30 40 24 50 24 C 60 24 72 30 72 45 C 67 36 58 32 50 32 C 42 32 33 36 28 45 Z"
              fill="url(#sarahHair)"
            />
          </svg>
        </div>
      </div>

      {/* Name & Title */}
      <span className="text-xs font-bold text-slate-800 block mt-2 tracking-wide">
        Sarah
      </span>
      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60 -mt-0.5">
        🥈 2nd Place
      </span>
    </motion.div>
  );
}

// ==========================================
// 3. DAVID - THE 3RD PLACE FINALIST (RIGHT)
// ==========================================
export function DavidCaricature() {
  return (
    <motion.div
      className="relative flex flex-col items-center select-none cursor-pointer"
      animate={{
        y: [0, -6, 0],
        rotate: [-1.5, 1, -1.5],
      }}
      transition={{
        duration: 2.6,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      whileHover={{ scale: 1.1, rotate: 0 }}
    >
      {/* Caricature Illustration Avatar Box */}
      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-3xl p-1 bg-gradient-to-tr from-rose-500 via-pink-400 to-rose-300 shadow-[0_6px_20px_rgba(244,63,94,0.4)] ring-3 ring-rose-400/40">
        <div className="w-full h-full rounded-[22px] bg-gradient-to-b from-slate-900 to-rose-950 overflow-hidden relative flex items-center justify-center">
          {/* Background Glow */}
          <div className="absolute inset-0 bg-gradient-to-t from-rose-500/20 via-transparent to-pink-500/30" />

          {/* SVG Expressive Caricature Character */}
          <svg viewBox="0 0 100 100" className="w-full h-full relative z-10">
            <defs>
              <linearGradient id="davidSkin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8d5524" />
                <stop offset="100%" stopColor="#643b14" />
              </linearGradient>
              <linearGradient id="davidBeanie" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#ea580c" />
              </linearGradient>
              <linearGradient id="davidShirt" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#6d28d9" />
              </linearGradient>
            </defs>

            {/* Shoulders & Cool Purple Shirt */}
            <path d="M 20 90 Q 50 80 80 90 L 88 100 L 12 100 Z" fill="url(#davidShirt)" />
            {/* Lightning bolt badge on shirt */}
            <polygon points="50,83 47,89 50,89 48,94 53,88 50,88" fill="#fbbf24" />

            {/* Neck */}
            <rect x="44" y="68" width="12" height="12" rx="4" fill="#8d5524" />

            {/* Head / Face */}
            <circle cx="50" cy="52" r="22" fill="#c68642" />

            {/* Cheeks Blush */}
            <circle cx="34" cy="58" r="4" fill="#ef4444" opacity="0.3" />
            <circle cx="66" cy="58" r="4" fill="#ef4444" opacity="0.3" />

            {/* Winking & Playful Eyes */}
            {/* Left Eye: Big Bright Open Eye */}
            <circle cx="37" cy="48" r="4.5" fill="#1e1b4b" />
            <circle cx="35.5" cy="46.5" r="1.5" fill="#ffffff" />
            <path d="M 32 41 Q 37 38 42 41" stroke="#1e1b4b" strokeWidth="2.5" strokeLinecap="round" fill="none" />

            {/* Right Eye: Playful Wink Arch */}
            <path d="M 58 48 Q 63 43 68 48" stroke="#1e1b4b" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M 58 41 Q 63 38 68 41" stroke="#1e1b4b" strokeWidth="2.5" strokeLinecap="round" fill="none" />

            {/* Nose */}
            <path d="M 49 51 Q 50 55 53 54" stroke="#8d5524" strokeWidth="2" strokeLinecap="round" fill="none" />

            {/* Confident Wide Grin with Dimples */}
            <path d="M 38 59 Q 50 71 62 59 Z" fill="#ffffff" />
            <path d="M 38 59 Q 50 71 62 59" stroke="#451a03" strokeWidth="2" fill="none" />
            <circle cx="36" cy="59" r="1" fill="#451a03" />
            <circle cx="64" cy="59" r="1" fill="#451a03" />

            {/* Stylish Orange Streetwear Beanie */}
            <path d="M 28 38 C 28 20 72 20 72 38 Z" fill="url(#davidBeanie)" />
            <rect x="25" y="34" width="50" height="8" rx="4" fill="#f97316" />
            {/* Beanie pompom */}
            <circle cx="50" cy="18" r="5" fill="#fbbf24" />
          </svg>
        </div>
      </div>

      {/* Name & Title */}
      <span className="text-xs font-bold text-slate-800 block mt-2 tracking-wide">
        David
      </span>
      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60 -mt-0.5">
        🥉 3rd Finalist
      </span>
    </motion.div>
  );
}
