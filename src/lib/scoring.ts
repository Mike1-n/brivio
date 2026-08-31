/**
 * Scoring Calculation Engine for QuizArena
 * 
 * Formula:
 * - Base points: Typically 1000 (configurable per question)
 * - Speed multiplier: Full points if answered immediately; scales down to 50% at full timeLimit.
 * - Streak bonus:
 *   - 2 correct in a row: +10%
 *   - 3 correct in a row: +20%
 *   - 4+ correct in a row: +30%
 * - Incorrect answer: 0 points (streak resets to 0)
 */

export interface ScoreCalculationParams {
  isCorrect: boolean;
  basePoints: number;
  timeLimitSeconds: number;
  responseTimeMs: number;
  currentStreak: number;
}

export interface ScoreCalculationResult {
  points: number;
  speedBonus: number;
  streakBonus: number;
  newStreak: number;
}

export function calculateScore({
  isCorrect,
  basePoints = 1000,
  timeLimitSeconds = 20,
  responseTimeMs,
  currentStreak = 0,
}: ScoreCalculationParams): ScoreCalculationResult {
  if (!isCorrect) {
    return {
      points: 0,
      speedBonus: 0,
      streakBonus: 0,
      newStreak: 0,
    };
  }

  const timeLimitMs = Math.max(timeLimitSeconds * 1000, 1000);
  const clampedResponseTime = Math.min(Math.max(responseTimeMs, 0), timeLimitMs);
  
  // Calculate speed factor between 0.5 (slowest) and 1.0 (instant)
  // Response fraction from 0.0 (instant) to 1.0 (time expired)
  const responseFraction = clampedResponseTime / timeLimitMs;
  const speedFactor = 1 - (responseFraction * 0.5); // ranges 0.5 to 1.0
  
  const rawPoints = Math.round(basePoints * speedFactor);
  
  // Calculate streak bonus
  const newStreak = currentStreak + 1;
  let streakMultiplier = 0;
  if (newStreak === 2) streakMultiplier = 0.1;
  else if (newStreak === 3) streakMultiplier = 0.2;
  else if (newStreak >= 4) streakMultiplier = 0.3;

  const streakBonus = Math.round(rawPoints * streakMultiplier);
  const totalPoints = rawPoints + streakBonus;

  return {
    points: totalPoints,
    speedBonus: rawPoints - Math.round(basePoints * 0.5),
    streakBonus,
    newStreak,
  };
}
