import React from "react";
import { cn } from "@/lib/utils";
import { soundEffects } from "@/lib/soundEffects";

export interface AnswerButtonProps {
  id: string;
  text: string;
  index: number;
  color?: string;
  isSelected?: boolean;
  isCorrect?: boolean;
  showResult?: boolean;
  disabled?: boolean;
  isHostView?: boolean;
  count?: number; // count of players who picked this
  totalPlayers?: number;
  onClick?: () => void;
}

const SHAPES = [
  { shape: "▲", name: "Triangle", colorClass: "btn-choice-red", bgLight: "bg-red-500", text: "text-white" },
  { shape: "◆", name: "Diamond", colorClass: "btn-choice-blue", bgLight: "bg-blue-500", text: "text-white" },
  { shape: "●", name: "Circle", colorClass: "btn-choice-yellow", bgLight: "bg-amber-500", text: "text-white" },
  { shape: "■", name: "Square", colorClass: "btn-choice-green", bgLight: "bg-emerald-500", text: "text-white" },
];

export function AnswerButton({
  id,
  text,
  index,
  isSelected,
  isCorrect,
  showResult,
  disabled,
  isHostView,
  count = 0,
  totalPlayers = 1,
  onClick,
}: AnswerButtonProps) {
  const item = SHAPES[index % SHAPES.length];

  const handleClick = () => {
    if (!disabled && onClick) {
      soundEffects.playAnswerClick();
      onClick();
    }
  };

  // Percentage for host result view bar chart
  const percentage = totalPlayers > 0 ? Math.round((count / totalPlayers) * 100) : 0;

  if (isHostView) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl p-5 flex flex-col justify-between min-h-[140px] text-white shadow-xl transition-all duration-300",
          item.colorClass,
          showResult && !isCorrect && "opacity-40 grayscale-[40%]",
          showResult && isCorrect && "ring-4 ring-white shadow-2xl scale-[1.02]"
        )}
      >
        <div className="flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-black opacity-90 drop-shadow-md">{item.shape}</span>
            <span className="text-xl md:text-2xl font-bold tracking-tight drop-shadow">{text}</span>
          </div>
          {showResult && (
            <div className="flex items-center gap-2">
              {isCorrect ? (
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-extrabold flex items-center gap-1 border border-white/40">
                  ✓ Correct
                </span>
              ) : (
                <span className="bg-black/30 px-3 py-1 rounded-full text-sm font-extrabold flex items-center gap-1">
                  ✕
                </span>
              )}
            </div>
          )}
        </div>

        {/* Live / Results Answer Count Bar */}
        {showResult && (
          <div className="mt-4 z-10 flex items-center justify-between text-sm font-bold bg-black/30 px-3 py-1.5 rounded-lg backdrop-blur-sm">
            <span>{count} answers</span>
            <span>{percentage}%</span>
          </div>
        )}
      </div>
    );
  }

  // Player mobile controller button
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "w-full h-full min-h-[110px] md:min-h-[140px] rounded-2xl p-4 flex items-center justify-center gap-3 text-white font-extrabold text-lg md:text-xl shadow-lg transition-all transform select-none active:scale-95 disabled:cursor-not-allowed",
        item.colorClass,
        isSelected && "ring-4 ring-white shadow-2xl scale-[0.98] brightness-110",
        disabled && !isSelected && "opacity-60"
      )}
    >
      <span className="text-3xl md:text-4xl drop-shadow-md">{item.shape}</span>
      {text && <span className="text-center font-bold break-words drop-shadow-sm">{text}</span>}
    </button>
  );
}
