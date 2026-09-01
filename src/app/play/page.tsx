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

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6);
    if (!pasteData) return;
    const arr = ["", "", "", "", "", ""];
    for (let i = 0; i < 6; i++) {
      arr[i] = pasteData[i] || "";
    }
    setDigits(arr);
    const nextIdx = Math.min(pasteData.length, 5);
    inputRefs.current[nextIdx]?.focus();
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
    <div className="min-h-[100dvh] bg-gradient-to-b from-[#3b0764] via-[#4c1d95] to-[#2e1065] flex flex-col justify-center items-center p-3 sm:p-4 font-sans text-white">
      {/* Mobile Join Box */}
      <div className="w-full max-w-sm bg-white rounded-3xl p-5 sm:p-7 text-slate-900 shadow-2xl space-y-5 mx-auto">
        <div className="text-center space-y-1">
          <img src="/logo.png" alt="Brivio Logo" className="w-14 h-14 mx-auto object-contain drop-shadow-sm mb-1" />
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Join Game</h1>
          <p className="text-xs font-semibold text-slate-400">Enter the 6-digit PIN to enter the arena</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          {/* 6 Responsive Square PIN Digits */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
              Game PIN
            </label>
            <div className="grid grid-cols-6 gap-1.5 sm:gap-2 w-full">
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
                  onPaste={handlePaste}
                  className="w-full aspect-square text-center text-lg sm:text-xl font-black bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-indigo-600 focus:bg-white focus:outline-none transition text-slate-900 min-w-0 p-0 shadow-sm"
                />
              ))}
            </div>
          </div>

          {/* Nickname Input */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Your Nickname
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                if (error) setError("");
              }}
              placeholder="e.g. LionKing_23"
              maxLength={15}
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none transition text-sm shadow-sm"
            />
          </div>

          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-600 text-center animate-shake">
              {error}
            </div>
          )}

          {/* JOIN GAME Button */}
          <button
            type="submit"
            className="w-full py-3.5 sm:py-4 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-black text-sm sm:text-base rounded-2xl shadow-xl shadow-indigo-600/30 transition transform active:scale-95 flex items-center justify-center gap-2"
          >
            JOIN GAME <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-[10px] sm:text-[11px] font-medium text-slate-400 text-center">
            By joining, you enter the live arena game session.
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
