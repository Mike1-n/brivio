import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    const user = token ? verifyToken(token) : null;

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
    }

    const totalUsers = await prisma.user.count();
    const totalQuizzes = await prisma.quiz.count();
    const totalSessions = await prisma.gameSession.count();
    const totalCategories = await prisma.category.count();

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
        _count: { select: { quizzes: true, gameSessions: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const recentQuizzes = await prisma.quiz.findMany({
      include: {
        author: { select: { name: true, email: true } },
        category: true,
        _count: { select: { questions: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      stats: {
        totalUsers,
        totalQuizzes,
        totalSessions,
        totalCategories,
      },
      users,
      recentQuizzes,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Failed to fetch admin stats" }, { status: 500 });
  }
}
