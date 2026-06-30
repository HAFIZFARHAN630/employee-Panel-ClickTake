import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    if (!isAdmin(auth)) {
      return NextResponse.json(
        { message: "Forbidden: admin only" },
        { status: 403 }
      );
    }

    const employees = await db.employee.findMany({
      select: {
        id: true,
        department: true,
        designation: true,
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            isActive: true,
            onboardingStatus: true,
          },
        },
        signatures: {
          select: {
            id: true,
            signedAt: true,
            template: {
              select: {
                id: true,
                title: true,
                version: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = employees.map((emp) => {
      const { user, signatures, ...rest } = emp;
      return {
        ...rest,
        user: {
          ...user,
          isActive: user.isActive,
          onboardingStatus: user.onboardingStatus ?? "pending",
        },
        policySignatures: signatures.map((sig) => ({
          id: sig.id,
          signedAt: sig.signedAt.toISOString(),
          template: sig.template,
        })),
      };
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : String(error);

    if (
      message.includes("employee_onboarding_data") ||
      message.includes("does not exist") ||
      message.includes("relation")
    ) {
      return NextResponse.json(
        {
          message:
            "Onboarding data feature is not yet available. The required database table (EmployeeOnboardingData) has not been set up.",
        },
        { status: 501 }
      );
    }

    console.error("Error fetching required policies:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}