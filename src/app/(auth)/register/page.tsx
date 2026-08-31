"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("TEACHER");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected network error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 py-12 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/15 blur-[120px] pointer-events-none rounded-full" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center mb-1">
            <img src="/logo.png" alt="Brivio Logo" className="w-20 h-20 object-contain drop-shadow-md" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Create an Account</h1>
          <p className="text-sm text-slate-400 font-medium">
            Join Brivio to host live interactive multiplayer games
          </p>
        </div>

        <div className="glass-panel p-8 rounded-3xl space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              placeholder="e.g. Professor Alex Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="alex@school.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Account Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("TEACHER")}
                  className={`p-3 rounded-xl border text-sm font-bold transition flex items-center justify-center gap-2 ${
                    role === "TEACHER"
                      ? "bg-purple-600/20 border-purple-500 text-purple-300 shadow-lg shadow-purple-500/10"
                      : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  🎓 Teacher / Host
                </button>
                <button
                  type="button"
                  onClick={() => setRole("STUDENT")}
                  className={`p-3 rounded-xl border text-sm font-bold transition flex items-center justify-center gap-2 ${
                    role === "STUDENT"
                      ? "bg-purple-600/20 border-purple-500 text-purple-300 shadow-lg shadow-purple-500/10"
                      : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  🎮 Student / Player
                </button>
              </div>
            </div>

            <Button type="submit" variant="gradient" size="lg" className="w-full" isLoading={isLoading}>
              <UserPlus className="w-5 h-5 mr-2" />
              Create Free Account
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="text-purple-400 hover:text-purple-300 font-bold underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
