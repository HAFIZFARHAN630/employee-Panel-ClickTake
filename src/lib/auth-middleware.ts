import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export interface AuthResult {
  userId: string;
  email: string;
  userType: string;
  isSuperuser: boolean;
}

// Simple in-memory token store (shared with login route via import)
const tokenStore = new Map<string, { userId: string; email: string }>();

// This is exported so login route can register tokens
export function getTokenStore() {
  return tokenStore;
}

export async function authenticate(req: Request): Promise<AuthResult | NextResponse> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");

  // For simplicity, we verify token by looking up the user
  // In production, this would use proper JWT verification
  const { verifyToken } = await import("@/app/api/auth/login/route");
  const tokenData = verifyToken(token);
  if (!tokenData) {
    return NextResponse.json({ message: "Invalid token" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: tokenData.userId },
    select: { id: true, email: true, userType: true, isSuperuser: true, isActive: true },
  });

  if (!user || !user.isActive) {
    return NextResponse.json({ message: "User not found or disabled" }, { status: 401 });
  }

  return {
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