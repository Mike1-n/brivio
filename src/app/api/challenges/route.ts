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

    // If quizIdParam is provided or multiple challenges exist, compute combined rankings
    const allQuizAttempts: any[] = [];
    challenges.forEach((c: any) => {
      (c.attempts || []).forEach((att: any) => {
        allQuizAttempts.push({
          ...att,
          challengeId: c.id,
          challengeTitle: c.title || `Challenge #${c.id.substring(0, 4)}`,
        });
      });
    });

    allQuizAttempts.sort((a, b) => (b.score || 0) - (a.score || 0));

    const combinedSeen = new Set<string>();
    const combinedUniqueAttempts: any[] = [];
    for (const att of allQuizAttempts) {
      const lower = att.nickname.toLowerCase();
      if (!combinedSeen.has(lower)) {
        combinedSeen.add(lower);
        combinedUniqueAttempts.push({
          ...att,
          rank: combinedUniqueAttempts.length + 1,
        });
      }
    }

    const combinedScores = combinedUniqueAttempts.map((a) => a.score || 0);
    const combinedTotal = combinedUniqueAttempts.length;
    const combinedHighest = combinedTotal > 0 ? Math.max(...combinedScores) : 0;
    const combinedAvgScore = combinedTotal > 0 ? Math.round(combinedScores.reduce((a, b) => a + b, 0) / combinedTotal) : 0;
    const combinedAvgAcc = combinedTotal > 0
      ? Math.round(combinedUniqueAttempts.reduce((a, b) => a + (b.accuracy || 0), 0) / combinedTotal)
      : 0;

    const combinedChallenge = {
      id: "all-combined",
      title: "All Challenges Combined",
      quizId: quizIdParam || "",
      quizTitle: challenges[0]?.quiz?.title || "Quiz",
      totalParticipants: combinedTotal,
      highestScore: combinedHighest,
      avgScore: combinedAvgScore,
      avgAccuracy: combinedAvgAcc,
      rankings: combinedUniqueAttempts,
      isExpired: false,
    };

    // Also fetch live sessions for this quiz if quizIdParam is provided
    let liveSessionData: any[] = [];
    if (quizIdParam) {
      try {
        const liveSessions = await prisma.gameSession.findMany({
          where: { quizId: quizIdParam },
          include: {
            players: {
              orderBy: { score: "desc" },
              select: {
                id: true,
                nickname: true,
                avatar: true,
                score: true,
                rank: true,
                streak: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        liveSessionData = liveSessions.map((s: any) => ({
          id: s.id,
          pin: s.pin,
          status: s.status,
          totalPlayers: s.players?.length || 0,
          players: s.players || [],
          createdAt: s.createdAt,
        }));
      } catch (err) {
        console.error("Failed to fetch live sessions for quiz:", err);
      }
    }

    return NextResponse.json({
      challenges: formatted,
      combinedChallenge,
      liveSessions: liveSessionData,
    });
  } catch (error) {
    console.error("Fetch host challenges error:", error);
    return NextResponse.json({ error: "Failed to fetch challenges" }, { status: 500 });
  }
}
