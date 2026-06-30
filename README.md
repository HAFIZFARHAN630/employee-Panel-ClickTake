Employee Management System (EMS)

     

    A full-featured, production-ready Employee Management System built with Next.js 16, TypeScript, Tailwind CSS 4, and shadcn/ui. Designed for ClickTake Technologies — handles onboarding, attendance, time tracking, leave management, project assignments, policy agreements, AI-powered chat, and much more.

Table of Contents

     Features
     Tech Stack
     Project Structure
     Getting Started
     Environment Variables
     Database Setup
     Admin Panel
     Employee Portal
     Onboarding Flow
     Authentication & Security
     Deployment
     Architecture Highlights

Features
Core HR Modules

     User Management — Admin registration, employee approval workflow, role-based access control (RBAC) with temporary access grants
     Multi-Tenant Support — Organization isolation via tenant model with slug-based routing
     Department Management — Create/manage departments with hierarchical structure
     Shift Management — Define working/remote shifts with per-department applicability

Onboarding

     3-Step State Machine — face_pending → agreements_pending → form_pending → completed
     Face Verification — Capture & submit face photos for admin review
     Smart Policy Engine — AND-logic matching: policies are matched by applicableRoles AND applicableDepartments simultaneously
     Digital Signature Pad — Canvas-based signature capture (no external library)
     8-Section Employee Form — Personal, Contact, Emergency, Education, Experience, Banking, Documents, Declaration

Attendance & Time Tracking

     GPS-Verified Check-In/Out — Geofencing with configurable office radius
     Live Tracking — Real-time session monitoring with idle detection
     Time Logs — Per-project, per-task time entries with verification
     Export — CSV/Excel export of attendance records

Project Management

     Project CRUD — Create, duplicate, assign employees, track progress
     AI Task Generation — Auto-generate project tasks via AI integration
     Task Management — Sortable, phase-based tasks with drag-and-drop reordering
     Employee Assignments — Accept/reject workflow with progress reports

Communication

     Team Chat — Real-time messaging via WebSocket/Socket.IO channels
     Announcements — Targeted announcements by role and department with priority levels
     Notifications — In-app notification system with read/unread tracking

Other Modules

     Leave Management — Request, approve/reject leave with balance tracking
     Awards & Recognition — Point-based reward system (individual & bulk)
     Asset Management — Track company assets with assignment history
     HR Training — AI-powered HR chatbot trained on custom knowledge base
     Branding — Customizable company branding (logo, colors, contact info)
     Activity Log — Full audit trail of all system actions
     Integrations — Webhook management for third-party services
     AI Configuration — Manage AI model providers and API keys
     Business Data — Centralized company information management
     Live Dashboard — Real-time stats, charts, and KPIs

Tech Stack
Category
	
Technology
Framework	Next.js 16 (App Router, Standalone Output)
Language	TypeScript 5
Styling	Tailwind CSS 4 + CSS Variables
UI Library	shadcn/ui (New York style) + Radix Primitives
Icons	Lucide React
Database ORM	Prisma ORM
Database	PostgreSQL (Supabase managed)
Authentication	JWT (jsonwebtoken) + Bearer token in localStorage
State Management	Zustand (client) + TanStack Query (server)
Forms	React Hook Form + Zod validation
Charts	Recharts
Animations	Framer Motion
File Upload	Cloudinary SDK
Real-time	Socket.IO (mini-service)
AI	z-ai-web-dev-sdk (LLM, VLM, Image Gen, TTS, ASR)
Containerization	Docker (multi-stage Alpine build)
Hosting	Render (backend) + Firebase Hosting (frontend)
  
Project Structure
text
 
  
 
 
src/
├── app/
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Client-side app router (auth state)
│   ├── globals.css             # Tailwind + CSS variables theme
│   └── api/
│       ├── auth/               # Login, register, forgot/reset password, seed-admin, pending-approvals
│       ├── users/              # User CRUD (admin)
│       ├── projects/           # Project CRUD, tasks, AI generation, duplication
│       ├── assignments/        # Employee-project assignments
│       ├── attendance/         # Check-in/out, today, export
│       ├── time-logs/          # Time entries, sync, live tracking, stats
│       ├── leaves/             # Leave request CRUD
│       ├── shifts/             # Shift management
│       ├── departments/        # Department CRUD
│       ├── agreements/         # Policy templates, signing, per-employee list
│       ├── onboarding/         # Status, data, required policies, form submission
│       ├── notifications/      # Notification CRUD, mark-all-read
│       ├── announcements/      # Announcement CRUD
│       ├── awards/             # Award points (individual & bulk)
│       ├── assets/             # Asset CRUD
│       ├── rbac/               # Roles, temporary access
│       ├── hr-training/        # HR knowledge base for AI chat
│       ├── hr-chat/            # AI chatbot endpoint
│       ├── settings/           # Session tracking settings
│       ├── branding/           # Company branding (public & admin)
│       ├── activity-logs/      # Audit trail
│       ├── dashboard/          # Dashboard statistics
│       ├── verification/       # Face verification review
│       ├── integrations/       # Webhook management
│       ├── ai-models/          # AI model configuration
│       ├── business-data/      # Business information
│       ├── chat/               # Channels, messages, members
│       └── health/             # Health check endpoint
├── components/
│   ├── admin/                  # 26 admin page components + admin-layout
│   ├── employee/               # 12 employee page components + employee-layout
│   ├── auth/                   # Login, signup, forgot-password, reset-password
│   ├── shared/                 # KYC verification popup, employee search dropdown
│   ├── ui/                     # 50+ shadcn/ui base components
│   └── theme-toggle.tsx        # Light/dark mode toggle
├── hooks/
│   ├── use-mobile.ts           # Responsive breakpoint hook
│   └── use-toast.ts            # Toast notification hook
├── lib/
│   ├── api.ts                  # Centralized API client (JWT, error handling, content-type guard)
│   ├── auth-context.tsx        # Auth provider (login, signup, session restore)
│   ├── auth-middleware.ts      # JWT verification, admin checks, secret management
│   ├── db.ts                   # Prisma client singleton
│   ├── types.ts                # TypeScript type definitions
│   ├── utils.ts                # Utility functions (cn, etc.)
│   ├── crypto-utils.ts         # Password hashing (bcrypt)
│   ├── date-utils.ts           # Date formatting helpers
│   ├── cloudinary.ts           # Cloudinary upload/delete utilities
│   ├── theme-context.tsx       # Theme provider
│   └── webhook-service.ts      # Webhook dispatch service
└── middleware.ts                # Next.js middleware (auth guards)
prisma/
├── schema.prisma               # 25 database models
└── seed.ts                     # Database seeding script
 
 
Getting Started
Prerequisites

     Node.js >= 20
     Bun (recommended runtime)
     PostgreSQL database (or use Supabase)
     Git

Installation
bash
 
  
 
 
# Clone the repository
git clone https://github.com/HAFIZFARHAN630/employee-Panel-ClickTake.git
cd employee-Panel-ClickTake

# Install dependencies
bun install

# Generate Prisma client
bunx prisma generate

# Push database schema
bun run db:push

# (Optional) Seed database with initial data
bunx prisma db seed

# Start development server
bun run dev
 
 

The application will be available at http://localhost:3000.
Environment Variables

Create a .env.local file in the project root (this file is already in .gitignore):
env
 
  
 
 
# Database
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"

# Authentication
JWT_SECRET="your-secure-random-secret-here"

# Cloudinary (file uploads)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloud-name"

# Firebase (optional - for frontend hosting)
NEXT_PUBLIC_FIREBASE_API_KEY=""
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=""
NEXT_PUBLIC_FIREBASE_PROJECT_ID=""
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=""
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=""
NEXT_PUBLIC_FIREBASE_APP_ID=""
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=""

# Supabase (optional)
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""

# Base URL (for production)
NEXT_PUBLIC_BASE_URL="https://your-domain.com"
 
 

     

    Never commit .env files to version control. The .gitignore already excludes all .env* files.

Database Setup
Using Prisma
bash
 
  
 
 
# Push schema changes to database
bun run db:push

# Generate Prisma client
bun run db:generate

# Run migrations (if using migration workflow)
bun run db:migrate

# Reset database (dangerous - drops all data)
bun run db:reset
 
 
Database Models (25 tables)
Model
	
Purpose
Tenant	Multi-tenant organization
User	Core user account (admin/employee)
IndividualUser	Individual user profile
Employee	Employee-specific profile
Project	Project management
ProjectTask	Project tasks with AI generation
EmployeeProject	Employee-project assignments
LeaveRequest	Leave management
Attendance	Daily attendance records
TimeLog	Time tracking entries
Notification	In-app notifications
Announcement	Company announcements
RBACRole	Role-based access control
RBACTempAccess	Temporary role grants
SessionSettings	Tracking configuration
SignupPolicy	Onboarding policies
ActivityLog	Audit trail
AgreementTemplate	Policy agreements
EmployeeSignature	Digital signatures
VerificationRecord	Face verification
Shift	Work shift definitions
AwardPoint	Rewards & recognition
Asset	Company asset tracking
BrandingSettings	Company branding
AIModelConfig	AI model configuration
PasswordResetToken	Password reset flow
HRTrainingData	HR knowledge base
Department	Department management
ChatChannel	Chat channels
ChatMessage	Chat messages
ChatMember	Channel memberships
Integration	Webhook integrations
BusinessData	Company business info
EmployeeOnboardingData	Onboarding form data (JSON)
  
Admin Panel (26 Pages)

The admin sidebar is organized into 8 categorized groups with a collapsible layout:
Group
	
Pages
Main	Dashboard, Business Data
People	Users, Departments, Shifts
Projects	Projects, Assignments
Time & Attendance	Time Tracking, Attendance, Live Tracking
HR	Leave Management, Agreements, HR Training, Onboarding Verification, Awards
Communication	Chat, Notifications, Announcements
System	Settings, Branding, RBAC, Integrations, AI Config, Activity Log, Storage
Data	Assets, Salary Calc
  
Sidebar Features

     Collapsible (256px ↔ 70px) with localStorage persistence
     Scrollable navigation with ScrollArea
     Tooltip on collapsed icon buttons
     Mobile-responsive via Sheet overlay
     Purple gradient active state with left border accent
     Dark mode support

Employee Portal

Employees get a dedicated portal with:

     Overview — Personal dashboard with stats
     Attendance — Check-in/out with GPS verification
     Time Tracking — Start/stop timer, manual entries
     Leave — Request and track leave
     Projects — View assigned projects
     Agreements — Sign required policies
     Schedule — View shift schedule
     Chat — Team messaging
     Notifications — View and manage notifications
     Announcements — Company-wide updates
     Profile — Edit personal information
     Settings — Account preferences

Onboarding Flow

New employees go through a 3-stage onboarding state machine:
text
 
  
 
 
Registration → face_pending → agreements_pending → form_pending → completed
 
 

    Face Verification — Upload/capture face photos for admin review
    Policy Agreements — Sign applicable policies (matched by role AND department using AND logic)
    Employee Data Form — Complete 8-section form:
         Personal Information
         Contact Details
         Emergency Contact
         Education History
         Work Experience
         Banking Information
         Document Upload
         Self Declaration

Authentication & Security

     JWT-based authentication with Bearer tokens stored in localStorage
     Role-based access control (RBAC) with granular permissions
     Temporary access grants — Time-limited role elevation
     Admin-only API guards — Critical endpoints protected with isAdmin() checks
     Onboarding guards — Prevents re-submission of completed onboarding
     Account activation — New users are inactive until admin approval
     API interceptor — Content-type validation prevents HTML injection parsing
     Environment-aware JWT secret — Throws fatal error in production if not configured
     Security headers — Firebase hosting includes X-Content-Type-Options, X-Frame-Options, X-XSS-Protection

Deployment
Architecture
text
 
  
 
 
GitHub (source) ──→ Render (backend API + SSR) ──→ PostgreSQL (Supabase)
                     ↓
Firebase Hosting (static frontend + SPA rewrites)
 
 
Render (Backend)

The render.yaml is pre-configured for Render web service deployment:
yaml
 
  
 
 
services:
  - type: web
    name: employee-panel
    runtime: node
    plan: starter
    # Build and start commands pre-configured
 
 

Steps:

    Connect your GitHub repo to Render
    Set environment variables in the Render dashboard (see Environment Variables)
    Render auto-deploys on git push to main

Firebase Hosting (Frontend)

The firebase.json is configured for static hosting with SPA rewrites:
json
 
  
 
 
{
  "hosting": {
    "public": "out",
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
 
 

Steps:

    Install Firebase CLI: npm install -g firebase-tools
    Login: firebase login
    Build static export: STATIC_BUILD=1 npx next build
    Deploy: firebase deploy --only hosting

Docker

A multi-stage Dockerfile is included for containerized deployment:
bash
 
  
 
 
docker build -t employee-panel .
docker run -p 3000:3000 --env-file .env.local employee-panel
 
 
Quick Deploy Script
bash
 
  
 
 
bash deploy.sh
 
 

     

    This pushes to GitHub, and provides instructions for Render & Firebase deployment.

Architecture Highlights
Client-Side Routing

The app uses a single-page architecture with React state-based navigation (not URL routing). The AuthContext manages appView state which switches between Login, Signup, Admin, and Employee views.
API Client (src/lib/api.ts)

     Centralized fetch wrapper with JWT auto-injection
     Content-type guard (prevents parsing HTML error pages as JSON)
     204 No Content handling
     Corrupted localStorage auto-clearing
     Only sets Content-Type: application/json when a body is present (supports FormData uploads)

Smart Policy Matching

The agreement system uses AND logic — a policy is applicable only if the employee's role matches applicableRoles AND their department matches applicableDepartments. If either array is empty, that constraint is ignored.
Real-Time Mini-Services

WebSocket/Socket.IO services run as independent Bun processes in the mini-services/ directory, each on its own port, forwarded through the Caddy gateway.
JSON Fields in SQLite/PostgreSQL

Array and object fields (e.g., permissions, tags, targetRoles) are stored as JSON strings and serialized/deserialized with JSON.stringify()/JSON.parse().
License

Private — All rights reserved. ClickTake Technologies.
Contributing

    Fork the repository
    Create a feature branch: git checkout -b feature/your-feature
    Commit your changes: git commit -m "Add your feature"
    Push to the branch: git push origin feature/your-feature
    Open a Pull Request

Support

For issues and feature requests, please open a GitHub Issue.
