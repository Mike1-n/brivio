import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generatePin(): string {
  // Generate a random 6-digit game PIN
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export const AVATAR_OPTIONS = [
  "🦁", "🐯", "🦊", "🐼", "🐨", "🐸", "🐙", "🦄", 
  "🚀", "⚡", "🔥", "💎", "⭐", "🧙‍♂️", "🤖", "🍕",
  "🎮", "🎯", "🏆", "🌟", "🦅", "🐺", "🐬", "🐲"
];
