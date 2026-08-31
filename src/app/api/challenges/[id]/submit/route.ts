import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const challengeId = params.id;
    const body = await req.json();
    const { nickname, avatar = "🦊", answers = [] } = body;

    if (!nickname || !nickname.trim()) {
      return NextResponse.json({ error: "Nickname is required" }, { status: 400 });
    }

    const cleanNick = nickname.trim().substring(0, 18);

    const challenge = await (prisma as any).quizChallenge.findUnique({
      where: { id: challengeId },
      include: {
        quiz: {
          include: {
            questions: {
              include: { answers: true },
            },
          },
        },
      },
    });

    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    if (challenge.deadline && Date.now() > new Date(challenge.deadline).getTime()) {
      const deadlineStr = new Date(challenge.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return NextResponse.json({
        error: `This challenge officially expired at ${deadlineStr} and is no longer accepting submissions.`,
      }, { status: 400 });
    }

    // 1. Enforce unique nickname per challenge
    const existing = await (prisma as any).challengeAttempt.findFirst({
      where: {
        challengeId,
        nickname: { equals: cleanNick, mode: "insensitive" },
      },
    });

    if (existing) {
      return NextResponse.json({
        error: `Nickname '${cleanNick}' is already taken in this challenge. Please choose another nickname.`,
      }, { status: 400 });
    }

    // 2. Server-side score and accuracy calculation
    let totalScore = 0;
    let totalCorrect = 0;
    let streak = 0;

    const answerMap = new Map();
    answers.forEach((ans: any) => {
      answerMap.set(ans.questionId, ans);
    });

    challenge.quiz.questions.forEach((q: any) => {
      const userAns = answerMap.get(q.id);
      let isCorrect = false;

      if (userAns) {
        if (q.type === "TYPE_ANSWER") {
          const textAnswer = (userAns.textAnswer || "").trim().toLowerCase();
          const accepted = (q.answers[0]?.text || "").trim().toLowerCase();
          isCorrect = textAnswer.length > 0 && textAnswer === accepted;
        } else if (q.type === "MULTI_SELECT") {
          const selectedIds: string[] = Array.isArray(userAns.answerIds) ? userAns.answerIds : (userAns.answerId ? [userAns.answerId] : []);
          const correctIds: string[] = q.answers.filter((a: any) => a.isCorrect).map((a: any) => a.id);
          isCorrect = correctIds.length > 0 &&
            correctIds.every((id: string) => selectedIds.includes(id)) &&
            selectedIds.every((id: string) => correctIds.includes(id));
        } else if (q.type === "ORDERING") {
          const orderIds = Array.isArray(userAns.answerIds) ? userAns.answerIds : [];
          const correctOrderedIds = [...q.answers].sort((a: any, b: any) => (a.order || 0) - (b.order || 0)).map((a: any) => a.id);
          isCorrect = orderIds.length > 0 && JSON.stringify(orderIds) === JSON.stringify(correctOrderedIds);
        } else if (q.type === "POLL") {
          isCorrect = true; // Full credit for participating in poll
        } else {
          const correctAns = q.answers.find((a: any) => a.isCorrect);
          isCorrect = !!(correctAns && correctAns.id === userAns.answerId);
        }
      }

      if (isCorrect) {
        totalCorrect++;
        streak++;
        const streakMultiplier = 1 + Math.min(streak - 1, 3) * 0.1;
        const timeLimitMs = (q.timeLimit || 20) * 1000;
        const responseTimeMs = Math.min(userAns?.responseTimeMs || 3000, timeLimitMs);
        const speedFactor = 1 - (responseTimeMs / (timeLimitMs * 2));
        const questionScore = Math.round(q.points * speedFactor * streakMultiplier);
        totalScore += questionScore;
      } else {
        streak = 0;
      }
    });

    const totalQuestions = challenge.quiz.questions.length;
    const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    // 3. Save attempt permanently to Supabase
    const attempt = await (prisma as any).challengeAttempt.create({
      data: {
        challengeId,
        nickname: cleanNick,
        avatar,
        score: totalScore,
        accuracy,
        totalCorrect,
        totalQuestions,
      },
    });

    // 4. Return updated deduplicated leaderboard
    const allAttempts = await (prisma as any).challengeAttempt.findMany({
      where: { challengeId },
      orderBy: { score: "desc" },
      select: {
        id: true,
        nickname: true,
        avatar: true,
        score: true,
        accuracy: true,
        totalCorrect: true,
        totalQuestions: true,
        completedAt: true,
      },
    });

    // Deduplicate by nickname (keeping highest score)
    const seenNicks = new Set<string>();
    const uniqueLeaderboard: any[] = [];
    for (const att of allAttempts) {
      const lower = att.nickname.toLowerCase();
      if (!seenNicks.has(lower)) {
        seenNicks.add(lower);
        uniqueLeaderboard.push(att);
      }
    }

    const rank = uniqueLeaderboard.findIndex((a: any) => a.nickname.toLowerCase() === cleanNick.toLowerCase()) + 1;

    return NextResponse.json({
      attempt,
      rank: rank > 0 ? rank : 1,
      totalParticipants: uniqueLeaderboard.length,
      leaderboard: uniqueLeaderboard,
    });
  } catch (error) {
    console.error("Submit challenge attempt error:", error);
    return NextResponse.json({ error: "Failed to submit challenge attempt" }, { status: 500 });
  }
}
