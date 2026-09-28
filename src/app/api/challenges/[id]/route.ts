import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const challengeId = params.id;

    const challenge = await (prisma as any).quizChallenge.findUnique({
      where: { id: challengeId },
      include: {
        quiz: {
          include: {
            author: { select: { name: true, avatar: true } },
            category: true,
            questions: {
              orderBy: { order: "asc" },
              include: {
                answers: {
                  select: {
                    id: true,
                    text: true,
                    color: true,
                    order: true,
                    isCorrect: true,
                  },
                  orderBy: { order: "asc" },
                },
              },
            },
          },
        },
        attempts: {
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
        },
      },
    });

    if (!challenge || !challenge.isActive) {
      return NextResponse.json({ error: "Challenge not found or inactive" }, { status: 404 });
    }

    const isExpired = challenge.deadline ? new Date() > new Date(challenge.deadline) : false;

    // Deduplicate attempts by nickname (keep highest score)
    const seenNicks = new Set<string>();
    const uniqueAttempts: any[] = [];
    for (const att of (challenge.attempts || [])) {
      const lower = att.nickname.toLowerCase();
      if (!seenNicks.has(lower)) {
        seenNicks.add(lower);
        uniqueAttempts.push({
          ...att,
          rank: uniqueAttempts.length + 1,
        });
      }
    }

    const scores = uniqueAttempts.map((a: any) => a.score || 0);
    const totalParticipants = uniqueAttempts.length;
    const highestScore = totalParticipants > 0 ? Math.max(...scores) : 0;
    const avgScore = totalParticipants > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / totalParticipants) : 0;
    const avgAccuracy = totalParticipants > 0
      ? Math.round(uniqueAttempts.reduce((a: number, b: any) => a + (b.accuracy || 0), 0) / totalParticipants)
      : 0;

    return NextResponse.json({
      challenge: {
        id: challenge.id,
        title: challenge.title || challenge.quiz.title,
        deadline: challenge.deadline,
        timeLimitMins: challenge.timeLimitMins,
        isExpired,
        quiz: challenge.quiz,
        attempts: uniqueAttempts,
        rankings: uniqueAttempts,
        totalParticipants,
        highestScore,
        avgScore,
        avgAccuracy,
      },
    });
  } catch (error) {
    console.error("Fetch challenge error:", error);
    return NextResponse.json({ error: "Failed to fetch challenge" }, { status: 500 });
  }
}
