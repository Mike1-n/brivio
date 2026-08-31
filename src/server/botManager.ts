/**
 * AI Bot Simulator for QuizArena Demo & Solo Test Drives
 * Generates realistic player bots with distinct names, avatars, response delays, and accuracy profiles.
 */

export interface BotProfile {
  id: string;
  name: string;
  avatar: string;
  accuracy: number; // 0.0 to 1.0
  speedBias: "FAST" | "BALANCED" | "THINKER";
}

const BOT_NAMES = [
  "PixelNinja 🥷", "BrainyFox 🦊", "QuantumCat 🐱", "RocketPanda 🐼",
  "CyberWolf 🐺", "NeonTiger 🐯", "HyperWizard 🧙‍♂️", "StarCaptain 🚀",
  "QuizValkyrie ⚡", "DrCosmic 🌌", "SpeedyCheetah 🐆", "ZenDragon 🐲"
];

const BOT_AVATARS = ["🦊", "🐼", "🚀", "⚡", "🔥", "💎", "⭐", "🤖", "🍕", "🎮", "🎯", "🏆"];

export function generateBots(count: number = 4): BotProfile[] {
  const selectedNames = [...BOT_NAMES].sort(() => 0.5 - Math.random()).slice(0, count);
  
  return selectedNames.map((name, i) => {
    const speeds: ("FAST" | "BALANCED" | "THINKER")[] = ["FAST", "BALANCED", "THINKER"];
    const speedBias = speeds[i % speeds.length];
    
    // Vary accuracy between 60% and 95%
    const accuracy = 0.65 + Math.random() * 0.28;
    const avatar = BOT_AVATARS[Math.floor(Math.random() * BOT_AVATARS.length)];

    return {
      id: `bot_${Math.random().toString(36).substring(2, 9)}`,
      name,
      avatar,
      accuracy,
      speedBias,
    };
  });
}

/**
 * Calculates a simulated response time and chosen answer for a bot on a question
 */
export function simulateBotAnswer(
  bot: BotProfile,
  answers: Array<{ id: string; isCorrect: boolean }>,
  timeLimitSeconds: number
): { answerId: string; responseTimeMs: number } {
  const timeLimitMs = timeLimitSeconds * 1000;
  
  // Decide response time based on speed bias
  let minMs = 1200;
  let maxMs = Math.min(timeLimitMs - 1000, 8000);
  
  if (bot.speedBias === "FAST") {
    minMs = 800;
    maxMs = Math.min(timeLimitMs * 0.4, 4000);
  } else if (bot.speedBias === "THINKER") {
    minMs = 2500;
    maxMs = Math.min(timeLimitMs * 0.85, 12000);
  }

  const responseTimeMs = Math.floor(minMs + Math.random() * (maxMs - minMs));

  // Determine correctness based on bot's accuracy
  const willBeCorrect = Math.random() < bot.accuracy;
  const correctAnswer = answers.find((a) => a.isCorrect);
  const incorrectAnswers = answers.filter((a) => !a.isCorrect);

  let chosenAnswerId = "";
  if (willBeCorrect && correctAnswer) {
    chosenAnswerId = correctAnswer.id;
  } else if (incorrectAnswers.length > 0) {
    const randomWrong = incorrectAnswers[Math.floor(Math.random() * incorrectAnswers.length)];
    chosenAnswerId = randomWrong.id;
  } else {
    chosenAnswerId = answers[0]?.id || "";
  }

  return {
    answerId: chosenAnswerId,
    responseTimeMs,
  };
}
