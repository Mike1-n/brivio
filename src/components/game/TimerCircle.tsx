"use client";

import React, { useEffect } from "react";
import { soundEffects } from "@/lib/soundEffects";

interface TimerCircleProps {
  timeRemaining: number;
  totalTime: number;
  size?: number;
}

export function TimerCircle({ timeRemaining, totalTime, size = 110 }: TimerCircleProps) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeTotal = Math.max(totalTime, 1);
  const strokeDashoffset = circumference - (timeRemaining / safeTotal) * circumference;

  const isUrgent = timeRemaining <= 5 && timeRemaining > 0;

  useEffect(() => {
    if (isUrgent) {
      soundEffects.playUrgentTick();
    }
  }, [timeRemaining, isUrgent]);

  return (
    <div className="relative flex items-center justify-center select-none" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Animated progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isUrgent ? "#EF4444" : "#A855F7"}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`text-2xl md:text-3xl font-black transition-all ${
            isUrgent ? "text-red-500 scale-110 animate-pulse font-extrabold" : "text-white"
          }`}
        >
          {timeRemaining}
        </span>
      </div>
    </div>
  );
}
