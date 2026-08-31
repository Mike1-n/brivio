"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Zap, Play, BookOpen, LayoutDashboard, Shield, Volume2, VolumeX, LogOut, User as UserIcon } from "lucide-react";
import { soundEffects } from "@/lib/soundEffects";
import { Button } from "@/components/ui/Button";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMuted, setIsMuted] = useState(false);
  const [user, setUser] = useState<{ name: string; role: string; email: string } | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    };
    checkAuth();
  }, [pathname]);

  const toggleAudio = () => {
    const muted = soundEffects.toggleMute();
    setIsMuted(muted);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  };

  // Hide top navbar inside live game screens & teacher studio sidebar layout
  if (pathname.startsWith("/play/") || pathname.startsWith("/host/") || pathname.startsWith("/dashboard")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo & Tagline */}
        <Link href="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="Brivio Logo" className="h-11 w-auto object-contain drop-shadow-sm" />
          <div className="flex flex-col">
            <span className="text-2xl font-black tracking-tight text-slate-900 leading-none">
              brivio
            </span>
            <span className="text-[10px] font-bold text-slate-400 tracking-tight mt-0.5">
              Where minds compete.
            </span>
          </div>
        </Link>

        {/* Mockup Navigation Links: Home, Features, Explore, Pricing, About */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
          <Link
            href="/"
            className={`transition-colors hover:text-indigo-600 ${
              pathname === "/" ? "text-indigo-600 font-bold" : ""
            }`}
          >
            Home
          </Link>
          <Link
            href="/#features"
            className="transition-colors hover:text-indigo-600"
          >
            Features
          </Link>
          <Link
            href="/explore"
            className={`transition-colors hover:text-indigo-600 ${
              pathname === "/explore" ? "text-indigo-600 font-bold" : ""
            }`}
          >
            Explore
          </Link>
          <Link
            href="/#pricing"
            className="transition-colors hover:text-indigo-600"
          >
            Pricing
          </Link>
          <Link
            href="/#about"
            className="transition-colors hover:text-indigo-600"
          >
            About
          </Link>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Sound Mute Toggle */}
          <button
            onClick={toggleAudio}
            title={isMuted ? "Unmute sound FX" : "Mute sound FX"}
            className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-indigo-600" />}
          </button>

          {user ? (
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <Button variant="primary" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md">
                  <LayoutDashboard className="w-4 h-4 mr-1.5" />
                  Dashboard
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout} title="Logout" className="text-slate-500 hover:text-slate-900">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login">
                <button className="px-4 py-2 text-sm font-bold text-slate-700 hover:text-indigo-600 transition">
                  Login
                </button>
              </Link>
              <Link href="/register">
                <button className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition active:scale-95">
                  Sign Up
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
