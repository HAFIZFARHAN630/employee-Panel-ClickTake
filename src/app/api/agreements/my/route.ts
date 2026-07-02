import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate } from "@/lib/auth-middleware";

function safeJsonParse(val: string | null | undefined): unknown {
  if (!val) return [];
  try { return JSON.parse(val); } catch { return []; }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const user = await db.user.findUnique({
      where: { id: auth.id },
      include: { employee: true },
    });
    if (!user?.employee) return NextResponse.json([]);

    const templates = await db.agreementTemplate.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });

    const signatures = await db.employeeSignature.findMany({
      where: { employeeId: user.employee.id },
      select: { templateId: true },
    });
    const signedIds = new Set(signatures.map((s) => s.templateId));

    const result = templates.map((t) => {
      const roles = safeJsonParse(t.applicableRoles) as string[];
      const depts = safeJsonParse(t.applicableDepartments) as string[];
      const userRole = user.userType;
      const userDept = user.employee.department;

      const matchesRole = roles.length === 0 || roles.includes(userRole) || roles.includes("all");
      const matchesDept = depts.length === 0 || depts.includes(userDept) || depts.includes("all");
      const isApplicable = matchesRole && matchesDept;

      return {
        ...t,
        applicableRoles: roles,
        applicableDepartments: depts,
        isApplicable,
        isSigned: signedIds.has(t.id),
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      };
    }).filter((t) => t.isApplicable);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching my agreements:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}