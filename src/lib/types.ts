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
  isFaceVerified: boolean;
  avatarUrl: string | null;
  requestedRole: string | null;
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
  designation: string;
  hourlyRate: number | null;
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
  department: string;
  isDuplicateOf: string | null;
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
  phase: string;
  estimatedHours: number | null;
  assignedTo: string | null;
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
  latitude: number | null;
  longitude: number | null;
  isLocationVerified: boolean;
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
  isVerified: boolean;
  verificationMethod: string | null;
  idleFlags: number;
  employee?: { user: { fullName: string; email: string } };
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  notificationType: string;
  isRead: boolean;
  actionUrl: string | null;
  scheduledAt: string | null;
  expiresAt: string | null;
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
  targetRoles: string;
  targetDepartments: string;
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
  officeLat: number;
  officeLng: number;
  allowedRadiusMeters: number;
}

export interface ActivityLog {
  id: string;
  userId: string | null;
  userEmail: string;
  action: string;
  section: string;
  details: string;
  createdAt: string;
  user?: { fullName: string; email: string } | null;
}

// ============ NEW TYPES ============

export interface AgreementTemplate {
  id: string;
  title: string;
  content: string;
  applicableRoles: string;
  applicableDepartments: string;
  version: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeSignature {
  id: string;
  employeeId: string;
  templateId: string;
  signatureImageUrl: string;
  ipAddress: string;
  signedAt: string;
  createdAt: string;
}

export interface VerificationRecord {
  id: string;
  userId: string;
  videoUrl: string;
  status: string;
  reviewedBy: string | null;
  rejectionReason: string;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

export interface Shift {
  id: string;
  name: string;
  type: string;
  startTime: string;
  endTime: string;
  applicableType: string;
  applicableIds: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AwardPoint {
  id: string;
  employeeId: string;
  points: number;
  reason: string;
  awardedById: string;
  targetType: string;
  targetIds: string | null;
  createdAt: string;
  employee?: Employee & { user: User };
}

export interface Asset {
  id: string;
  name: string;
  serialNumber: string;
  category: string;
  condition: string;
  assignedTo: string | null;
  purchaseDate: string | null;
  createdAt: string;
  updatedAt: string;
  assignee?: Employee & { user: User };
}

export interface BrandingSettings {
  id: string;
  companyName: string;
  tagline: string;
  logoUrls: string | string[];
  officeLocations: string;
  contactEmails: string;
  contactPhones: string;
  socialMediaLinks: string | Record<string, string>;
  primaryColor: string;
  secondaryColor: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIModelConfig {
  id: string;
  modelName: string;
  provider: string;
  apiKey: string;
  purpose: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HRTrainingData {
  id: string;
  question: string;
  answer: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface Department { id: string; name: string; description: string; isActive: boolean; employeeCount?: number; createdAt: string; }

export interface ChatChannel { id: string; name: string; type: string; projectId: string | null; createdAt: string; lastMessage?: string; }

export interface ChatMessage { id: string; channelId: string; senderId: string; content: string; senderName?: string; createdAt: string; }

export interface Integration { id: string; name: string; provider: string; type: string; webhookUrl: string; isActive: boolean; events: string; createdAt: string; }

export interface BusinessData { id: string; businessName: string; address: string; city: string; postalCode: string; country: string; contactNumber: string; email: string; website: string; googleMapLink: string; gmbProfileLink: string; openingHours: string; socialMedia: string; services: string; targetAreas: string; shortDescription: string; longDescription: string; workTargets: string; hashtags: string; seoKeywords: string; createdAt: string; updatedAt: string; }

// ============ DASHBOARD STATS ============

export interface DashboardStats {
  totalEmployees: number;
  activeProjects: number;
  pendingLeaves: number;
  unverifiedFaces: number;
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

export type AppView = "login" | "signup" | "forgot-password" | "reset-password" | "admin" | "employee";

export type AdminPage = 
  | "dashboard"
  | "users"
  | "departments"
  | "projects"
  | "workflows"
  | "assignments"
  | "attendance"
  | "leaves"
  | "time-tracking"
  | "live-tracking"
  | "notifications"
  | "announcements"
  | "rbac"
  | "settings"
  | "activity-log"
  | "verification"
  | "shifts"
  | "awards"
  | "assets"
  | "ai-config"
  | "hr-training"
  | "branding"
  | "integrations"
  | "business-data"
  | "agreements"
  | "chat"
  | "storage";

export type EmployeePage =
  | "overview"
  | "profile"
  | "projects"
  | "attendance"
  | "leaves"
  | "time-tracking"
  | "announcements"
  | "notifications"
  | "settings"
  | "chat"
  | "my-schedule"
  | "agreements";