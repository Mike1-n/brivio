import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { sanitizeInput, sanitizePlainText } from "@/lib/security";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category");
    const difficulty = searchParams.get("difficulty");
    const authorOnly = searchParams.get("authorOnly") === "true";

    const token = req.cookies.get("auth_token")?.value;
    const user = token ? verifyToken(token) : null;

    const where: any = {};

    if (authorOnly) {
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      where.authorId = user.id;
    } else {
      where.isPublic = true;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (category && category !== "all") {
      where.category = { slug: category };
    }

    if (difficulty && difficulty !== "all") {
      where.difficulty = difficulty.toUpperCase();
    }

    const quizzes = await prisma.quiz.findMany({
      where,
      include: {
        author: { select: { name: true, avatar: true } },
        category: true,
        _count: { select: { questions: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ quizzes });
  } catch (error) {
    console.error("Fetch quizzes error:", error);
    return NextResponse.json({ error: "Failed to fetch quizzes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rateCheck = checkRateLimit(`create_quiz_${clientIp}`, { limit: 20, windowMs: 60 * 1000 });
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: "Too many quiz creation requests. Please wait a moment." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const token = req.cookies.get("auth_token")?.value;
    const user = token ? verifyToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, categoryId, difficulty = "MEDIUM", isPublic = true, coverImage, questions = [] } = body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ error: "Quiz title is required" }, { status: 400 });
    }

    const cleanTitle = sanitizePlainText(title, 120);
    const cleanDescription = description ? sanitizeInput(description).substring(0, 1000) : null;

    const quiz = await prisma.quiz.create({
      data: {
        title: cleanTitle,
        description: cleanDescription,
        coverImage: coverImage || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60",
        categoryId: categoryId || null,
        difficulty,
        isPublic: Boolean(isPublic),
        authorId: user.id,
        questions: {
          create: questions.map((q: any, idx: number) => ({
            text: sanitizeInput(q.text || "").substring(0, 500),
            type: q.type || "MULTIPLE_CHOICE",
            timeLimit: Math.min(Math.max(Number(q.timeLimit) || 20, 5), 300),
            points: Math.min(Math.max(Number(q.points) || 1000, 100), 10000),
            order: idx,
            explanation: q.explanation ? sanitizeInput(q.explanation).substring(0, 500) : null,
            image: q.image || null,
            answers: {
              create: (q.answers || []).map((a: any, aIdx: number) => ({
                text: sanitizeInput(a.text || "").substring(0, 250),
                isCorrect: Boolean(a.isCorrect),
                order: aIdx,
                color: ["red", "blue", "yellow", "green"][aIdx % 4],
              })),
            },
          })),
        },
      },
      include: {
        questions: {
          include: { answers: true },
        },
      },
    });

    return NextResponse.json({ quiz });
  } catch (error) {
    console.error("Create quiz error:", error);
    return NextResponse.json({ error: "Failed to create quiz" }, { status: 500 });
  }
}
