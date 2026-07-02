import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin, queryParams } from "@/lib/auth-middleware";

function safeJsonParse(str: string): unknown {
  try { return JSON.parse(str); } catch { return str; }
}

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

    const params = queryParams(req);
    const employeeId = params.employeeId;

    const where: Record<string, unknown> = {};
    if (employeeId) {
      where.userId = employeeId;
    }

    const data = await db.employeeOnboardingData.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            isActive: true,
            employee: {
              select: { department: true, designation: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = data.map((d) => ({
      id: d.id,
      userId: d.userId,
      section1Personal: safeJsonParse(d.section1Personal),
      section2Contact: safeJsonParse(d.section2Contact),
      section3Emergency: safeJsonParse(d.section3Emergency),
      section4Education: safeJsonParse(d.section4Education),
      section5Experience: safeJsonParse(d.section5Experience),
      section6Banking: safeJsonParse(d.section6Banking),
      section7Documents: safeJsonParse(d.section7Documents),
      section8Declaration: safeJsonParse(d.section8Declaration),
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
      user: {
        id: d.user.id,
        email: d.user.email,
        fullName: d.user.fullName,
        isActive: d.user.isActive,
        employee: d.user.employee,
      },
    }));

    return NextResponse.json(formatted);
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

    console.error("Error fetching onboarding data:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}