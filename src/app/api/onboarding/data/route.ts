import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate, isAdmin, queryParams } from "@/lib/auth-middleware";

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
      ...d,
      section1Personal: d.section1Personal as unknown,
      section2Contact: d.section2Contact as unknown,
      section3Emergency: d.section3Emergency as unknown,
      section4Education: d.section4Education as unknown,
      section5Experience: d.section5Experience as unknown,
      section6Banking: d.section6Banking as unknown,
      section7Documents: d.section7Documents as unknown,
      section8Declaration: d.section8Declaration as unknown,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
      user: {
        ...d.user,
        createdAt: undefined,
        updatedAt: undefined,
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