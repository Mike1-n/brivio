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

    // Fetch user details from DB
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, name: true, email: true, role: true, avatar: true },
    });

    const isGlobalAdmin = dbUser?.role === "ADMIN";
    const userFilter = isGlobalAdmin ? {} : { authorId: user.id };
    const sessionFilter = isGlobalAdmin ? {} : { hostId: user.id };

    // 1. Total Quizzes
    const totalQuizzes = await prisma.quiz.count({ where: userFilter });

    // 2. Total Sessions & Recent Games
    const hostedSessions = await prisma.gameSession.findMany({
      where: sessionFilter,
      include: {
        quiz: { select: { title: true } },
        gameAnalytics: true,
        _count: { select: { players: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    });

    const totalGamesHosted = await prisma.gameSession.count({ where: sessionFilter });

    // 3. User quizzes list for challenge aggregation
    const userQuizzes = await prisma.quiz.findMany({
      where: userFilter,
      select: { id: true },
    });
    const userQuizIds = userQuizzes.map((q) => q.id);

    // 4. Real Player Accuracy & Answers (User's Games)
    const playerAnswers = await prisma.playerAnswer.findMany({
      where: isGlobalAdmin ? {} : {
        player: {
          session: { hostId: user.id },
        },
      },
      select: { isCorrect: true, createdAt: true },
    });

    const totalAnswers = playerAnswers.length;
    const correctAnswers = playerAnswers.filter((a) => a.isCorrect).length;
    const correctPct = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;
    const incorrectPct = totalAnswers > 0 ? 100 - correctPct : 0;

    // 5. Real Participants & Real Average Score
    const gamePlayers = await prisma.gamePlayer.findMany({
      where: isGlobalAdmin ? { isBot: false } : {
        session: { hostId: user.id },
        isBot: false,
      },
      select: { score: true, createdAt: true },
    });

    const challengeAttempts = await prisma.challengeAttempt.findMany({
      where: isGlobalAdmin ? {} : {
        challenge: { quizId: { in: userQuizIds } },
      },
      select: { score: true, accuracy: true, completedAt: true },
    });

    const totalLivePlayers = gamePlayers.length;
    const totalChallengePlayers = challengeAttempts.length;
    const totalParticipants = totalLivePlayers + totalChallengePlayers;

    const allScores = [
      ...gamePlayers.map((p) => p.score),
      ...challengeAttempts.map((a) => a.score),
    ];

    const avgScore = allScores.length > 0
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : 0;

    const avgAccuracy = totalAnswers > 0
      ? correctPct
      : (challengeAttempts.length > 0
          ? Math.round(challengeAttempts.reduce((a, c) => a + (c.accuracy || 0), 0) / challengeAttempts.length)
          : 0);

    // 6. Real Monthly Performance Trends (Actual DB records from last 6 months)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const performanceTrends = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextD = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const mName = monthNames[d.getMonth()];

      const monthPlayers = gamePlayers.filter((p) => {
        const pDate = new Date(p.createdAt);
        return pDate >= d && pDate < nextD;
      });

      const monthAttempts = challengeAttempts.filter((a) => {
        const aDate = new Date(a.completedAt);
        return aDate >= d && aDate < nextD;
      });

      const monthScores = [
        ...monthPlayers.map((p) => p.score),
        ...monthAttempts.map((a) => a.score),
      ];

      const monthAvg = monthScores.length > 0
        ? Math.round(monthScores.reduce((a, b) => a + b, 0) / monthScores.length)
        : 0;

      performanceTrends.push({
        month: mName,
        score: monthAvg,
        participants: monthScores.length,
      });
    }

    return NextResponse.json({
      user: dbUser,
      stats: {
        totalQuizzes,
        totalGamesHosted,
        totalParticipants,
        averageScore: avgScore,
        averageAccuracy: avgAccuracy,
        totalAnswers,
      },
      donut: {
        correct: correctPct,
        incorrect: incorrectPct,
        totalAnswers,
      },
      performanceTrends,
      recentSessions: hostedSessions.map((s) => ({
        id: s.id,
        title: s.quiz?.title || "Live Arena Game",
        pin: s.pin,
        createdAt: s.createdAt,
        playersCount: s._count.players || s.gameAnalytics?.totalParticipants || 0,
      })),
    });
  } catch (error) {
    console.error("Analytics fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
