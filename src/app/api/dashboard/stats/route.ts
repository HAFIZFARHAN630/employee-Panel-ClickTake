import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticate } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth instanceof NextResponse) return auth;

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    // Get start of the week (Monday)
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday is start
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const [
      totalEmployees,
      activeProjects,
      pendingLeaves,
      unverifiedFaces,
      presentToday,
      weeklyTimeResult,
      completedTasks,
    ] = await Promise.all([
      // Count users where userType='employee' and isActive=true
      db.user.count({
        where: {
          userType: "employee",
          isActive: true,
        },
      }),
      // Count projects where status='active'
      db.project.count({ where: { status: "active" } }),
      // Count leave requests where status='pending'
      db.leaveRequest.count({ where: { status: "pending" } }),
      // Count users where isFaceVerified=false
      db.user.count({
        where: {
          userType: "employee",
          isFaceVerified: false,
        },
      }),
      db.attendance.count({
        where: {
          date: { gte: startOfDay, lte: endOfDay },
          status: { in: ["present", "late", "half_day"] },
        },
      }),
      db.timeLog.aggregate({
        where: {
          startTime: { gte: startOfWeek, lte: endOfDay },
          endTime: { not: null },
        },
        _sum: { duration: true },
      }),
      db.projectTask.count({ where: { isCompleted: true } }),
    ]);

    return NextResponse.json({
      totalEmployees,
      activeProjects,
      pendingLeaves,
      unverifiedFaces,
      presentToday,
      totalHoursThisWeek: Math.round((weeklyTimeResult._sum.duration || 0) * 100) / 100,
      completedTasks,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}