import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    const user = token ? verifyToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const quizIdParam = searchParams.get("quizId");

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, role: true },
    });

    const isGlobalAdmin = dbUser?.role === "ADMIN";

    const whereClause: any = {
      isActive: true,
    };

    if (quizIdParam) {
      whereClause.quizId = quizIdParam;
      if (!isGlobalAdmin) {
        whereClause.quiz = { authorId: user.id };
      }
    } else if (!isGlobalAdmin) {
      whereClause.quiz = { authorId: user.id };
    }

    const challenges = await (prisma as any).quizChallenge.findMany({
      where: whereClause,
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            coverImage: true,
            authorId: true,
            questions: {
              select: { id: true },
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
      orderBy: { createdAt: "desc" },
    });

    const formatted = challenges.map((c: any) => {
      const isExpired = c.deadline ? new Date() > new Date(c.deadline) : false;

      // Deduplicate attempts by nickname (keep highest score)
      const seenNicks = new Set<string>();
      const rankedAttempts: any[] = [];
      for (const att of (c.attempts || [])) {
        const lower = att.nickname.toLowerCase();
        if (!seenNicks.has(lower)) {
          seenNicks.add(lower);
          rankedAttempts.push(att);
        }
      }

      // Assign explicit rank numbers
      const rankedWithRanks = rankedAttempts.map((att, idx) => ({
        ...att,
        rank: idx + 1,
      }));

      const totalParticipants = rankedWithRanks.length;
      const scores = rankedWithRanks.map((a) => a.score);
      const avgScore = totalParticipants > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / totalParticipants) : 0;
      const highestScore = totalParticipants > 0 ? Math.max(...scores) : 0;
      const avgAccuracy = totalParticipants > 0
        ? Math.round(rankedWithRanks.reduce((a, b) => a + (b.accuracy || 0), 0) / totalParticipants)
        : 0;

      return {
        id: c.id,
        title: c.title || c.quiz?.title || "Quiz Challenge",
        quizId: c.quizId,
        quizTitle: c.quiz?.title || "Quiz",
        quizCoverImage: c.quiz?.coverImage,
        totalQuestions: c.quiz?.questions?.length || 0,
        deadline: c.deadline,
        timeLimitMins: c.timeLimitMins,
        isExpired,
        createdAt: c.createdAt,
        totalParticipants,
        avgScore,
        highestScore,
        avgAccuracy,
        rankings: rankedWithRanks,
      };
    });

    return NextResponse.json({ challenges: formatted });
  } catch (error) {
    console.error("Fetch host challenges error:", error);
    return NextResponse.json({ error: "Failed to fetch challenges" }, { status: 500 });
  }
}
