import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { generatePin } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    let user = token ? verifyToken(token) : null;

    // Allow quick demo hosting fallback if not signed in
    if (!user) {
      const demoHost = await prisma.user.findFirst({ where: { email: "demo@quizarena.com" } });
      if (demoHost) {
        user = {
          id: demoHost.id,
          email: demoHost.email,
          name: demoHost.name,
          role: demoHost.role as any,
          avatar: demoHost.avatar,
        };
      } else {
        return NextResponse.json({ error: "Unauthorized. Please sign in to host." }, { status: 401 });
      }
    }

    const body = await req.json();
    const { quizId } = body;

    if (!quizId) {
      return NextResponse.json({ error: "Quiz ID is required" }, { status: 400 });
    }

    // Verify quiz exists and has questions
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true },
    });

    if (!quiz || quiz.questions.length === 0) {
      return NextResponse.json({ error: "Quiz not found or has no questions" }, { status: 400 });
    }

    // Generate unique 6-digit PIN
    let pin = generatePin();
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      const existing = await prisma.gameSession.findUnique({ where: { pin } });
      if (!existing) {
        isUnique = true;
      } else {
        pin = generatePin();
        attempts++;
      }
    }

    const session = await prisma.gameSession.create({
      data: {
        pin,
        hostId: user.id,
        quizId: quiz.id,
        status: "LOBBY",
      },
      include: {
        quiz: {
          select: {
            title: true,
            coverImage: true,
            _count: { select: { questions: true } },
          },
        },
      },
    });

    return NextResponse.json({ session });
  } catch (error) {
    console.error("Create session error:", error);
    return NextResponse.json({ error: "Failed to create game session" }, { status: 500 });
  }
}
