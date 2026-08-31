"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";

function MobileJoinGamePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPin = searchParams.get("pin") || "";

  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (initialPin) {
      const clean = initialPin.replace(/[^0-9]/g, "").slice(0, 6);
      const arr = ["", "", "", "", "", ""];
      for (let i = 0; i < clean.length; i++) arr[i] = clean[i];
      setDigits(arr);
    }
  }, [initialPin]);

  const handleDigitChange = (idx: number, val: string) => {
    const clean = val.replace(/[^0-9]/g, "").slice(-1);
    const copy = [...digits];
    copy[idx] = clean;
    setDigits(copy);

    if (clean && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const pin = digits.join("");
    if (pin.length !== 6) {
      setError("Please enter a valid 6-digit PIN.");
      return;
    }
    if (!nickname.trim()) {
      setError("Please enter a nickname.");
      return;
    }

    // Save player profile locally
    const avatarList = ["🦁", "🦊", "🚀", "💎", "⚡", "🐼", "🦄", "🎯"];
    const randomAvatar = avatarList[Math.floor(Math.random() * avatarList.length)];
    localStorage.setItem("quiz_player_nickname", nickname.trim());
    localStorage.setItem("quiz_player_avatar", randomAvatar);

    router.push(`/play/${pin}`);
  };

  return (
    <div className="min-h-screen bg-[#4F46E5] flex flex-col justify-center items-center p-4 font-sans text-white">
      {/* Mobile Join Box from Mockup */}
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 md:p-8 text-slate-900 shadow-2xl space-y-6">
        <div className="text-center space-y-1">
          <img src="/logo.png" alt="Brivio Logo" className="w-16 h-16 mx-auto object-contain drop-shadow-sm mb-1" />
          <h1 className="text-2xl font-black text-slate-900">Join Game</h1>
          <p className="text-xs font-semibold text-slate-400">Enter the game PIN to join</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-5">
          {/* 6 Square PIN Digits from Mockup: [4][8][7][5][2][1] */}
          <div className="flex justify-between gap-1.5">
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => { inputRefs.current[idx] = el; }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-11 h-13 text-center text-xl font-black bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-indigo-600 focus:bg-white focus:outline-none transition text-slate-900"
              />
            ))}
          </div>

          {/* Nickname Input */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Nickname
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. LionKing_23"
              maxLength={15}
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none transition text-sm"
            />
          </div>

          {error && <p className="text-xs font-bold text-rose-500 text-center">{error}</p>}

          {/* JOIN GAME Button */}
          <button
            type="submit"
            className="w-full py-4 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-black text-base rounded-2xl shadow-xl shadow-indigo-600/30 transition transform active:scale-95 flex items-center justify-center gap-2"
          >
            JOIN GAME
          </button>

          <p className="text-[11px] font-medium text-slate-400 text-center">
            By joining, you agree to our Terms.
          </p>
        </form>
      </div>
    </div>
  );
}

export default function MobileJoinGamePage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-[#4F46E5] flex items-center justify-center text-white font-bold">Loading...</div>}>
      <MobileJoinGamePageContent />
    </React.Suspense>
  );
}
