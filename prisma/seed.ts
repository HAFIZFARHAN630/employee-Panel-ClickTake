import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  // Create Tenant
  const tenant = await db.tenant.create({
    data: {
      name: "TechCorp Solutions",
      slug: "techcorp",
      orgCode: "TC001",
    },
  });

  // Create System Roles
  const roles = [
    { roleId: "super_admin", name: "Super Admin", description: "Full system access", color: "#ef4444", isSystem: true, permissions: JSON.stringify({ all: true }) },
    { roleId: "admin", name: "Admin", description: "Administrative access", color: "#f97316", isSystem: true, permissions: JSON.stringify({ users: true, projects: true, attendance: true, leaves: true, timeTracking: true, notifications: true, announcements: true, rbac: true, settings: true, reports: true }) },
    { roleId: "manager", name: "Manager", description: "Team management", color: "#eab308", isSystem: true, permissions: JSON.stringify({ users: true, projects: true, attendance: true, leaves: true, timeTracking: true, reports: true }) },
    { roleId: "editor", name: "Editor", description: "Content editing", color: "#22c55e", isSystem: true, permissions: JSON.stringify({ projects: true, timeTracking: true }) },
    { roleId: "viewer", name: "Viewer", description: "Read-only access", color: "#6b7280", isSystem: true, permissions: JSON.stringify({ view: true }) },
    { roleId: "employee", name: "Employee", description: "Standard employee", color: "#3b82f6", isSystem: true, permissions: JSON.stringify({ selfAttendance: true, selfLeave: true, selfTimeTracking: true, viewProjects: true }) },
    { roleId: "freelancer", name: "Freelancer", description: "Freelance contractor", color: "#8b5cf6", isSystem: true, permissions: JSON.stringify({ selfTimeTracking: true, viewProjects: true }) },
    { roleId: "client", name: "Client", description: "Client access", color: "#ec4899", isSystem: true, permissions: JSON.stringify({ viewProjects: true }) },
  ];

  for (const role of roles) {
    await db.rBACRole.create({ data: role });
  }

  // Create Users
  const users = [
    { email: "admin@techcorp.com", password: "admin123", fullName: "Sarah Johnson", userType: "admin", role: "admin", isSuperuser: true, tenantId: tenant.id },
    { email: "manager@techcorp.com", password: "manager123", fullName: "Michael Chen", userType: "manager", role: "manager", tenantId: tenant.id },
    { email: "employee@techcorp.com", password: "emp123", fullName: "Emily Rodriguez", userType: "employee", role: "employee", tenantId: tenant.id },
    { email: "john@techcorp.com", password: "john123", fullName: "John Smith", userType: "employee", role: "employee", tenantId: tenant.id },
    { email: "alice@techcorp.com", password: "alice123", fullName: "Alice Wang", userType: "employee", role: "employee", tenantId: tenant.id },
    { email: "bob@techcorp.com", password: "bob123", fullName: "Bob Taylor", userType: "freelancer", role: "freelancer", tenantId: tenant.id },
    { email: "client@techcorp.com", password: "client123", fullName: "David Wilson", userType: "client", role: "client", tenantId: tenant.id },
  ];

  const createdUsers: string[] = [];
  for (const u of users) {
    const user = await db.user.create({ data: u });
    createdUsers.push(user.id);

    // Create IndividualUser for all
    await db.individualUser.create({
      data: {
        userId: user.id,
        phoneNumber: `+1-555-${Math.floor(1000 + Math.random() * 9000)}`,
        address: `${100 + Math.floor(Math.random() * 900)} Main Street, City`,
      },
    });

    // Create Employee record for employee/freelancer types
    if (user.userType === "employee" || user.userType === "freelancer") {
      const depts = ["Engineering", "Design", "Marketing", "Sales", "HR", "Finance"];
      const dept = user.fullName === "Emily Rodriguez" ? "Engineering" :
                   user.fullName === "John Smith" ? "Design" :
                   user.fullName === "Alice Wang" ? "Marketing" : "Engineering";
      await db.employee.create({
        data: {
          userId: user.id,
          department: dept,
          role: user.userType === "freelancer" ? "Freelance Developer" : "Team Member",
        },
      });
    }
  }

  // Create Projects
  const projects = [
    { name: "Website Redesign", description: "Complete overhaul of company website with modern UI/UX", status: "active", priority: "high", progress: 65, budget: 50000, tags: JSON.stringify(["design", "frontend", "priority"]) },
    { name: "Mobile App Development", description: "Build cross-platform mobile application for customers", status: "active", priority: "critical", progress: 35, budget: 120000, tags: JSON.stringify(["mobile", "react-native", "priority"]) },
    { name: "API Gateway Migration", description: "Migrate existing API to new gateway infrastructure", status: "on_hold", priority: "medium", progress: 20, budget: 30000, tags: JSON.stringify(["backend", "infrastructure"]) },
    { name: "Data Analytics Dashboard", description: "Real-time analytics dashboard for business intelligence", status: "active", priority: "high", progress: 80, budget: 40000, tags: JSON.stringify(["data", "analytics", "frontend"]) },
    { name: "Security Audit", description: "Comprehensive security assessment and penetration testing", status: "draft", priority: "medium", progress: 0, budget: 25000, tags: JSON.stringify(["security", "compliance"]) },
    { name: "Employee Portal", description: "Internal employee self-service portal", status: "completed", priority: "low", progress: 100, budget: 35000, tags: JSON.stringify(["hr", "internal"]) },
  ];

  const projectIds: string[] = [];
  for (const p of projects) {
    const project = await db.project.create({
      data: {
        ...p,
        tenantId: tenant.id,
        createdById: createdUsers[0],
        ownerId: createdUsers[0],
      },
    });
    projectIds.push(project.id);

    // Create tasks for active projects
    if (p.status === "active") {
      const taskCount = 3 + Math.floor(Math.random() * 5);
      const taskTitles: Record<string, string[]> = {
        "Website Redesign": ["Design homepage mockup", "Implement responsive navigation", "Build contact page", "Optimize images and assets", "Cross-browser testing"],
        "Mobile App Development": ["Setup React Native project", "Design onboarding screens", "Implement authentication", "Build product catalog", "Push notification integration", "Payment gateway"],
        "Data Analytics Dashboard": ["Setup charting library", "Build KPI widgets", "Implement real-time data feed", "Export to PDF/CSV", "Role-based dashboard views"],
      };

      const titles = taskTitles[p.name] || [`Task 1 for ${p.name}`, `Task 2 for ${p.name}`, `Task 3 for ${p.name}`];
      for (let i = 0; i < Math.min(taskCount, titles.length); i++) {
        const completed = Math.random() > 0.5;
        await db.projectTask.create({
          data: {
            projectId: project.id,
            title: titles[i],
            description: `Detailed description for: ${titles[i]}`,
            isCompleted: completed,
            sortOrder: i,
          },
        });
      }
    }
  }

  // Assign employees to projects
  const assignments = [
    { employeeIdx: 2, projectIdx: 0, status: "accepted", progressReport: "Working on responsive design components" },
    { employeeIdx: 3, projectIdx: 0, status: "accepted", progressReport: "Completed navigation redesign" },
    { employeeIdx: 4, projectIdx: 1, status: "accepted", progressReport: "Setting up analytics infrastructure" },
    { employeeIdx: 2, projectIdx: 3, status: "completed", progressReport: "Dashboard fully functional" },
    { employeeIdx: 5, projectIdx: 0, status: "pending", progressReport: "" },
    { employeeIdx: 3, projectIdx: 1, status: "pending", progressReport: "" },
  ];

  for (const a of assignments) {
    // Get employee id
    const emp = await db.employee.findFirst({
      where: { userId: createdUsers[a.employeeIdx] },
    });
    if (emp) {
      await db.employeeProject.create({
        data: {
          employeeId: emp.id,
          projectId: projectIds[a.projectIdx],
          assignedById: createdUsers[0],
          status: a.status,
          progressReport: a.progressReport,
        },
      });
    }
  }

  // Create Leave Requests
  const leaveTypes = ["sick", "casual", "annual", "unpaid"];
  const leaveStatuses = ["pending", "approved", "rejected"];
  for (let i = 0; i < 8; i++) {
    const emp = await db.employee.findFirst({
      skip: (i * 2) % 4,
    });
    if (emp) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 30));
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 5) + 1);
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      await db.leaveRequest.create({
        data: {
          employeeId: emp.id,
          type: leaveTypes[i % leaveTypes.length],
          startDate,
          endDate,
          reason: ["Not feeling well", "Family event", "Personal matters", "Medical appointment", "Vacation trip"][i % 5],
          status: leaveStatuses[i % 3],
          days,
        },
      });
    }
  }

  // Create Attendance Records (last 14 days)
  const employees = await db.employee.findMany();
  for (const emp of employees) {
    for (let d = 13; d >= 0; d--) {
      const date = new Date();
      date.setDate(date.getDate() - d);
      date.setHours(0, 0, 0, 0);

      if (date.getDay() === 0 || date.getDay() === 6) continue; // Skip weekends

      const rand = Math.random();
      const status = rand > 0.15 ? (rand > 0.05 ? "present" : "late") : "absent";

      const checkIn = status !== "absent" ? new Date(date.getTime() + (8 + Math.random() * 1.5) * 3600000) : null;
      const checkOut = checkIn ? new Date(checkIn.getTime() + (7 + Math.random() * 3) * 3600000) : null;
      const hours = checkIn && checkOut ? Math.round(((checkOut.getTime() - checkIn.getTime()) / 3600000) * 10) / 10 : 0;

      await db.attendance.create({
        data: {
          employeeId: emp.id,
          date,
          checkIn,
          checkOut,
          status,
          hours,
        },
      });
    }
  }

  // Create Time Logs
  for (const emp of employees) {
    const projectNames = ["Website Redesign", "Mobile App Development", "Data Analytics Dashboard"];
    const taskNames = ["Development", "Design Review", "Bug Fixing", "Documentation", "Testing"];
    const tags = ["frontend", "backend", "design", "meeting", "review"];

    for (let i = 0; i < 10; i++) {
      const startTime = new Date();
      startTime.setDate(startTime.getDate() - Math.floor(Math.random() * 14));
      startTime.setHours(9 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 60));
      const duration = 0.5 + Math.random() * 4;
      const endTime = new Date(startTime.getTime() + duration * 3600000);

      await db.timeLog.create({
        data: {
          employeeId: emp.id,
          project: projectNames[Math.floor(Math.random() * projectNames.length)],
          task: taskNames[Math.floor(Math.random() * taskNames.length)],
          tag: tags[Math.floor(Math.random() * tags.length)],
          startTime,
          endTime,
          duration: Math.round(duration * 100) / 100,
        },
      });
    }
  }

  // Create Notifications
  const notificationMessages = [
    { message: "New project 'Website Redesign' has been assigned to you", type: "task" },
    { message: "Your leave request has been approved", type: "leave" },
    { message: "System maintenance scheduled for this weekend", type: "info" },
    { message: "Meeting reminder: Sprint Planning at 2:00 PM", type: "info" },
    { message: "Project 'Data Analytics Dashboard' is 80% complete", type: "success" },
    { message: "Your attendance report for this week is ready", type: "info" },
    { message: "New announcement from management", type: "announcement" },
    { message: "Password change required for security", type: "warning" },
  ];

  for (let i = 0; i < notificationMessages.length; i++) {
    for (const userId of createdUsers.slice(0, 4)) {
      await db.notification.create({
        data: {
          userId,
          message: notificationMessages[i].message,
          notificationType: notificationMessages[i].type,
          isRead: Math.random() > 0.6,
          link: i % 3 === 0 ? "/projects" : "",
        },
      });
    }
  }

  // Create Announcements
  await db.announcement.createMany({
    data: [
      { title: "Q3 Company Meeting", description: "Quarterly company meeting", content: "Please join us for the Q3 company meeting on Friday at 3 PM in the main conference room.", priority: "high", status: "active", createdById: createdUsers[0], expiresAt: new Date(Date.now() + 30 * 24 * 3600000) },
      { title: "New HR Policy Update", description: "Updated remote work policy", content: "Effective immediately, employees can work remotely up to 3 days per week. Please review the updated policy document in the HR portal.", priority: "normal", status: "active", createdById: createdUsers[0], expiresAt: new Date(Date.now() + 60 * 24 * 3600000) },
      { title: "Team Building Event", description: "Annual team building", content: "Our annual team building event is scheduled for next month. Please RSVP by the end of this week.", priority: "low", status: "active", createdById: createdUsers[1], expiresAt: new Date(Date.now() + 45 * 24 * 3600000) },
      { title: "System Maintenance", description: "Scheduled downtime", content: "The system will undergo maintenance this Saturday from 2 AM to 6 AM. Please save all work before then.", priority: "urgent", status: "active", createdById: createdUsers[0], expiresAt: new Date(Date.now() + 7 * 24 * 3600000) },
    ],
  });

  // Create Session Settings
  await db.sessionSettings.create({
    data: {
      timeTrackingTimeoutMinutes: 15,
      timeTrackingWarningMinutes: 10,
    },
  });

  // Create Signup Policy
  await db.signupPolicy.create({
    data: {
      label: "Employee Agreement",
      title: "Employee Code of Conduct",
      storagePath: "/policies",
      fileName: "code_of_conduct.pdf",
      fileUrl: "/policies/code_of_conduct.pdf",
    },
  });

  // Create Activity Logs
  const actions = [
    { action: "login", section: "auth", details: JSON.stringify({ ip: "192.168.1.1", browser: "Chrome" }) },
    { action: "create_project", section: "projects", details: JSON.stringify({ projectName: "Website Redesign" }) },
    { action: "assign_employee", section: "workflows", details: JSON.stringify({ employee: "Emily Rodriguez", project: "Website Redesign" }) },
    { action: "approve_leave", section: "leaves", details: JSON.stringify({ employee: "John Smith", days: 3 }) },
    { action: "update_settings", section: "settings", details: JSON.stringify({ setting: "timeout_minutes", value: 15 }) },
  ];

  for (const a of actions) {
    await db.activityLog.create({
      data: {
        userId: createdUsers[0],
        userEmail: "admin@techcorp.com",
        action: a.action,
        section: a.section,
        details: a.details,
        tenantId: tenant.id,
      },
    });
  }

  console.log("✅ Seed data created successfully!");
  console.log(`   Tenant: ${tenant.name}`);
  console.log(`   Users: ${users.length}`);
  console.log(`   Projects: ${projects.length}`);
  console.log(`   Roles: ${roles.length}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());