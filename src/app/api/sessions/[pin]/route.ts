import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: { pin: string } }) {
  try {
    const session = await prisma.gameSession.findUnique({
      where: { pin: params.pin },
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

    if (!session) {
      return NextResponse.json({ error: "Game session not found with this PIN" }, { status: 404 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error("Get session error:", error);
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 });
  }
}
