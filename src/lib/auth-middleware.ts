import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import jwt from "jsonwebtoken";

export interface AuthResult {
  userId: string;
  email: string;
  userType: string;
  isSuperuser: boolean;
  id: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // Fallback for dev — in-memory tokens still work in dev mode
    return "dev-only-secret-do-not-use-in-production";
  }
  return secret;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyJwtToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as TokenPayload;
  } catch {
    return null;
  }
}

export async function authenticate(req: Request): Promise<AuthResult | NextResponse> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  const tokenData = verifyJwtToken(token);
  if (!tokenData) {
    return NextResponse.json({ message: "Invalid or expired token" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: tokenData.userId },
    select: { id: true, email: true, userType: true, isSuperuser: true, isActive: true },
  });

  if (!user || !user.isActive) {
    return NextResponse.json({ message: "User not found or disabled" }, { status: 401 });
  }

  return {
    id: user.id,
    userId: user.id,
    email: user.email,
    userType: user.userType,
    isSuperuser: user.isSuperuser,
  };
}

export function isAdmin(auth: AuthResult): boolean {
  return auth.isSuperuser || auth.userType === "admin" || auth.userType === "manager";
}

export function queryParams(req: Request): Record<string, string> {
  const url = new URL(req.url);
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}