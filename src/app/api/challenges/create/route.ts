import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    const user = token ? verifyToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: "Only logged-in creators can create challenge links" }, { status: 401 });
    }

    const body = await req.json();
    const { quizId, durationHours, durationMinutes, timeLimitMins, title } = body;

    if (!quizId) {
      return NextResponse.json({ error: "Quiz ID is required" }, { status: 400 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: { id: true, title: true, authorId: true },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    let totalMinutes = 24 * 60;
    if (durationMinutes !== undefined) {
      totalMinutes = Number(durationMinutes);
    } else if (durationHours !== undefined) {
      totalMinutes = Number(durationHours) * 60;
    }

    const deadline = totalMinutes > 0
      ? new Date(Date.now() + totalMinutes * 60 * 1000)
      : null;

    const challenge = await (prisma as any).quizChallenge.create({
      data: {
        quizId,
        title: title || `${quiz.title} - Challenge`,
        deadline,
        timeLimitMins: timeLimitMins || null,
        isActive: true,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const shareUrl = `${appUrl}/challenge/${challenge.id}`;

    return NextResponse.json({
      challenge,
      shareUrl,
    });
  } catch (error) {
    console.error("Create challenge error:", error);
    return NextResponse.json({ error: "Failed to create challenge" }, { status: 500 });
  }
}
