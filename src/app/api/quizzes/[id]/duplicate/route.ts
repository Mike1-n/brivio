import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    const user = token ? verifyToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const original = await prisma.quiz.findUnique({
      where: { id: params.id },
      include: {
        questions: {
          include: { answers: true },
        },
      },
    });

    if (!original) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const duplicate = await prisma.quiz.create({
      data: {
        title: `${original.title} (Copy)`,
        description: original.description,
        coverImage: original.coverImage,
        difficulty: original.difficulty,
        categoryId: original.categoryId,
        isPublic: false,
        authorId: user.id,
        questions: {
          create: original.questions.map((q) => ({
            text: q.text,
            type: q.type,
            timeLimit: q.timeLimit,
            points: q.points,
            order: q.order,
            explanation: q.explanation,
            image: q.image,
            answers: {
              create: q.answers.map((a) => ({
                text: a.text,
                isCorrect: a.isCorrect,
                order: a.order,
                color: a.color,
              })),
            },
          })),
        },
      },
    });

    return NextResponse.json({ quiz: duplicate });
  } catch (error) {
    console.error("Duplicate quiz error:", error);
    return NextResponse.json({ error: "Failed to duplicate quiz" }, { status: 500 });
  }
}
