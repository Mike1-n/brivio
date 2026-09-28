import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, signToken } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { validatePasswordStrength, sanitizePlainText } from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limit Registration Attempts: 5 per minute per IP
    const clientIp = getClientIp(req);
    const rateCheck = checkRateLimit(`register_${clientIp}`, { limit: 5, windowMs: 60 * 1000 });
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please wait 1 minute before trying again." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const body = await req.json();
    const { email, name, password, role = "TEACHER" } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }

    // 2. Validate Password Strength
    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.valid) {
      return NextResponse.json({ error: passwordCheck.error }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = sanitizePlainText(name, 50);

    if (!cleanEmail.includes("@") || cleanEmail.length > 254) {
      return NextResponse.json({ error: "Please provide a valid email address" }, { status: 400 });
    }

    if (!cleanName || cleanName.length < 2) {
      return NextResponse.json({ error: "Name must be at least 2 characters long" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Email is already registered" }, { status: 409 });
    }

    const passwordHash = hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: cleanEmail,
        name: cleanName,
        passwordHash,
        role: role === "ADMIN" ? "ADMIN" : "TEACHER",
        avatar: "🎓",
      },
    });

    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as any,
      avatar: user.avatar,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      },
    });

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
