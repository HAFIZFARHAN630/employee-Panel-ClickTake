// ============ SHARED TYPES ============

export type UserType = "super_admin" | "admin" | "manager" | "editor" | "viewer" | "employee" | "freelancer" | "client";

export interface User {
  id: string;
  email: string;
  fullName: string;
  userType: UserType;
  role: string;
  isActive: boolean;
  isSuperuser: boolean;
  avatarUrl: string | null;
  tenantId: string | null;
  createdAt: string;
  updatedAt: string;
  individualUser?: IndividualUser | null;
  employee?: Employee | null;
}

export interface IndividualUser {
  id: string;
  userId: string;
  phoneNumber: string | null;
  address: string | null;
}

export interface Employee {
  id: string;
  userId: string;
  department: string;
  role: string;
  facePhotoUrls: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  orgCode: string;
  isActive: boolean;
}

export type ProjectStatus = "draft" | "active" | "on_hold" | "completed" | "archived";
export type ProjectPriority = "low" | "medium" | "high" | "critical";

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  progress: number;
  budget: number;
  tags: string;
  tenantId: string | null;
  createdById: string | null;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
  tasks?: ProjectTask[];
  _count?: { tasks: number; assignments: number };
}

export interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  description: string;
  isCompleted: boolean;
  sortOrder: number;
}

export type AssignmentStatus = "pending" | "accepted" | "rejected" | "completed";

export interface EmployeeProject {
  id: string;
  employeeId: string;
  projectId: string;
  assignedById: string | null;
  status: AssignmentStatus;
  progressReport: string;
  createdAt: string;
  updatedAt: string;
  employee?: { id: string; user: { id: string; fullName: string; email: string; employee?: { department: string } | null } };
  project?: Project;
}

export type LeaveType = "sick" | "casual" | "annual" | "maternity" | "paternity" | "unpaid";
export type LeaveStatus = "pending" | "approved" | "rejected";

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  days: number;
  createdAt: string;
  employee?: { user: { fullName: string; email: string } };
}

export type AttendanceStatus = "present" | "absent" | "late" | "half_day" | "on_leave";

export interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: AttendanceStatus;
  hours: number;
  employee?: { user: { fullName: string; email: string } };
}

export interface TimeLog {
  id: string;
  employeeId: string;
  project: string;
  task: string;
  tag: string;
  startTime: string;
  endTime: string | null;
  duration: number;
  employee?: { user: { fullName: string; email: string } };
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  notificationType: string;
  isRead: boolean;
  link: string;
  createdAt: string;
}

export type AnnouncementPriority = "low" | "normal" | "high" | "urgent";
export type AnnouncementStatus = "draft" | "active" | "archived";

export interface Announcement {
  id: string;
  title: string;
  description: string;
  content: string;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  expiresAt: string | null;
  createdById: string | null;
  createdAt: string;
  createdBy?: { fullName: string };
}

export interface RBACRole {
  id: string;
  roleId: string;
  name: string;
  description: string;
  color: string;
  isSystem: boolean;
  parentRole: string | null;
  permissions: string;
}

export interface SessionSettings {
  id: string;
  timeTrackingTimeoutMinutes: number;
  timeTrackingWarningMinutes: number;
}

export interface ActivityLog {
  id: string;
  userId: string | null;
  userEmail: string;
  action: string;
  section: string;
  details: string;
  createdAt: string;
}

// ============ DASHBOARD STATS ============

export interface DashboardStats {
  totalEmployees: number;
  activeProjects: number;
  pendingLeaves: number;
  presentToday: number;
  totalHoursThisWeek: number;
  completedTasks: number;
}

// ============ AUTH ============

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// ============ VIEW STATE ============

export type AppView = "login" | "signup" | "admin" | "employee";

export type AdminPage = 
  | "dashboard"
  | "users"
  | "projects"
  | "workflows"
  | "assignments"
  | "attendance"
  | "leaves"
  | "time-tracking"
  | "notifications"
  | "announcements"
  | "rbac"
  | "settings"
  | "activity-log";

export type EmployeePage =
  | "overview"
  | "profile"
  | "projects"
  | "attendance"
  | "leaves"
  | "time-tracking"
  | "announcements"
  | "notifications"
  | "settings";