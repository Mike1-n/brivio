import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        author: { select: { id: true, name: true, avatar: true } },
        questions: {
          orderBy: { order: "asc" },
          include: {
            answers: {
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    return NextResponse.json({ quiz });
  } catch (error) {
    console.error("Get quiz error:", error);
    return NextResponse.json({ error: "Failed to fetch quiz" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    const user = token ? verifyToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.quiz.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    if (existing.authorId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, categoryId, difficulty, isPublic, coverImage, questions = [] } = body;

    // Delete existing questions & recreate in transaction
    await prisma.$transaction([
      prisma.playerAnswer.deleteMany({
        where: { question: { quizId: params.id } },
      }),
      prisma.answer.deleteMany({
        where: { question: { quizId: params.id } },
      }),
      prisma.question.deleteMany({
        where: { quizId: params.id },
      }),
      prisma.quiz.update({
        where: { id: params.id },
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          coverImage: coverImage || existing.coverImage,
          categoryId: categoryId || null,
          difficulty: difficulty || existing.difficulty,
          isPublic: isPublic !== undefined ? isPublic : existing.isPublic,
          questions: {
            create: questions.map((q: any, idx: number) => ({
              text: q.text,
              type: q.type || "MULTIPLE_CHOICE",
              timeLimit: q.timeLimit || 20,
              points: q.points || 1000,
              order: idx,
              explanation: q.explanation || null,
              image: q.image || null,
              answers: {
                create: (q.answers || []).map((a: any, aIdx: number) => ({
                  text: a.text,
                  isCorrect: Boolean(a.isCorrect),
                  order: aIdx,
                  color: ["red", "blue", "yellow", "green"][aIdx % 4],
                })),
              },
            })),
          },
        },
      }),
    ]);

    const updated = await prisma.quiz.findUnique({
      where: { id: params.id },
      include: {
        questions: {
          include: { answers: true },
        },
      },
    });

    return NextResponse.json({ quiz: updated });
  } catch (error) {
    console.error("Update quiz error:", error);
    return NextResponse.json({ error: "Failed to update quiz" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    const user = token ? verifyToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.quiz.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    if (existing.authorId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.quiz.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete quiz error:", error);
    return NextResponse.json({ error: "Failed to delete quiz" }, { status: 500 });
  }
}
