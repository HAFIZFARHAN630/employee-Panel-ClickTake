import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate } from "@/lib/auth-middleware";

function toJsonString(val: unknown): string {
  if (val === undefined || val === null) return "{}";
  if (typeof val === "string") return val;
  return JSON.stringify(val);
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const user = await db.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        isActive: true,
        onboardingStatus: true,
      },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (!user.isActive) {
      return NextResponse.json(
        { message: "Account is not active. Please contact an administrator." },
        { status: 403 }
      );
    }

    if (user.onboardingStatus === "completed") {
      return NextResponse.json(
        { message: "Onboarding has already been completed." },
        { status: 409 }
      );
    }

    const body = await req.json();

    const {
      section1Personal,
      section2Contact,
      section3Emergency,
      section4Education,
      section5Experience,
      section6Banking,
      section7Documents,
      section8Declaration,
    } = body;

    await db.employeeOnboardingData.upsert({
      where: { userId: auth.userId },
      update: {
        ...(section1Personal !== undefined && { section1Personal: toJsonString(section1Personal) }),
        ...(section2Contact !== undefined && { section2Contact: toJsonString(section2Contact) }),
        ...(section3Emergency !== undefined && { section3Emergency: toJsonString(section3Emergency) }),
        ...(section4Education !== undefined && { section4Education: toJsonString(section4Education) }),
        ...(section5Experience !== undefined && { section5Experience: toJsonString(section5Experience) }),
        ...(section6Banking !== undefined && { section6Banking: toJsonString(section6Banking) }),
        ...(section7Documents !== undefined && { section7Documents: toJsonString(section7Documents) }),
        ...(section8Declaration !== undefined && { section8Declaration: toJsonString(section8Declaration) }),
      },
      create: {
        userId: auth.userId,
        section1Personal: toJsonString(section1Personal),
        section2Contact: toJsonString(section2Contact),
        section3Emergency: toJsonString(section3Emergency),
        section4Education: toJsonString(section4Education),
        section5Experience: toJsonString(section5Experience),
        section6Banking: toJsonString(section6Banking),
        section7Documents: toJsonString(section7Documents),
        section8Declaration: toJsonString(section8Declaration),
      },
    });

    await db.user.update({
      where: { id: auth.userId },
      data: { onboardingStatus: "completed" },
    });

    return NextResponse.json({
      message: "Onboarding form submitted successfully.",
    });
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
            "Onboarding feature is not yet available. The required database table (EmployeeOnboardingData) has not been set up.",
        },
        { status: 501 }
      );
    }

    console.error("Error submitting onboarding form:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}