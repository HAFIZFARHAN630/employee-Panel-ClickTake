-- Employee Management System - Supabase PostgreSQL Migration
-- Generated from Prisma SQLite schema
-- All column types converted to PostgreSQL equivalents

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: tenants (no dependencies)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenants (
  id         TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL,
  org_code   TEXT NOT NULL DEFAULT 'ORG001',
  is_active  BOOLEAN NOT NULL DEFAULT true,
  country    TEXT NOT NULL DEFAULT '',
  region     TEXT NOT NULL DEFAULT '',
  timezone   TEXT NOT NULL DEFAULT 'Asia/Karachi',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS tenants_slug_key ON tenants (slug);

-- ============================================================================
-- TABLE: users (depends on: tenants)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id               TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  email            TEXT NOT NULL,
  password         TEXT NOT NULL DEFAULT '',
  full_name        TEXT NOT NULL,
  user_type        TEXT NOT NULL DEFAULT 'employee',
  role             TEXT NOT NULL DEFAULT 'viewer',
  is_active        BOOLEAN NOT NULL DEFAULT false,
  requested_role   TEXT,
  is_superuser     BOOLEAN NOT NULL DEFAULT false,
  is_face_verified BOOLEAN NOT NULL DEFAULT false,
  avatar_url       TEXT,
  tenant_id        TEXT,
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (email);
CREATE INDEX IF NOT EXISTS users_tenant_id_idx ON users (tenant_id);
CREATE INDEX IF NOT EXISTS users_user_type_idx ON users (user_type);

-- ============================================================================
-- TABLE: rbac_roles (no dependencies)
-- ============================================================================
CREATE TABLE IF NOT EXISTS rbac_roles (
  id          TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id     TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  color       TEXT NOT NULL DEFAULT '#6b7280',
  is_system   BOOLEAN NOT NULL DEFAULT false,
  parent_role TEXT,
  permissions TEXT NOT NULL DEFAULT '[]',
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS rbac_roles_role_id_key ON rbac_roles (role_id);

-- ============================================================================
-- TABLE: signup_policies (no dependencies)
-- ============================================================================
CREATE TABLE IF NOT EXISTS signup_policies (
  id           TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  label        TEXT NOT NULL,
  title        TEXT NOT NULL,
  storage_path TEXT NOT NULL DEFAULT '',
  file_name    TEXT NOT NULL DEFAULT '',
  file_url     TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- TABLE: agreement_templates (no dependencies)
-- ============================================================================
CREATE TABLE IF NOT EXISTS agreement_templates (
  id                    TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  title                 TEXT NOT NULL,
  content               TEXT NOT NULL DEFAULT '',
  applicable_roles      TEXT NOT NULL DEFAULT '[]',
  applicable_departments TEXT NOT NULL DEFAULT '[]',
  version               TEXT NOT NULL DEFAULT '1.0',
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- TABLE: shifts (no dependencies)
-- ============================================================================
CREATE TABLE IF NOT EXISTS shifts (
  id              TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'working',
  start_time      TEXT NOT NULL DEFAULT '09:00',
  end_time        TEXT NOT NULL DEFAULT '17:00',
  applicable_type TEXT NOT NULL DEFAULT 'office',
  applicable_ids  TEXT NOT NULL DEFAULT '[]',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- TABLE: branding_settings (no dependencies)
-- ============================================================================
CREATE TABLE IF NOT EXISTS branding_settings (
  id                TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_urls         TEXT NOT NULL DEFAULT '[]',
  office_locations  TEXT NOT NULL DEFAULT '[]',
  contact_emails    TEXT NOT NULL DEFAULT '[]',
  contact_phones    TEXT NOT NULL DEFAULT '[]',
  social_media_links TEXT NOT NULL DEFAULT '{}',
  primary_color     TEXT NOT NULL DEFAULT '#E0197A',
  secondary_color   TEXT NOT NULL DEFAULT '#7B2FBE',
  created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- TABLE: ai_model_configs (no dependencies)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_model_configs (
  id         TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL DEFAULT '',
  provider   TEXT NOT NULL DEFAULT 'openai',
  api_key    TEXT NOT NULL DEFAULT '',
  purpose    TEXT NOT NULL DEFAULT '',
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- TABLE: password_reset_tokens (no dependencies)
-- ============================================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL,
  token      TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at    TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS password_reset_tokens_token_key ON password_reset_tokens (token);

-- ============================================================================
-- TABLE: hr_training_data (no dependencies)
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_training_data (
  id         TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  question   TEXT NOT NULL,
  answer     TEXT NOT NULL DEFAULT '',
  category   TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- TABLE: individual_users (depends on: users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS individual_users (
  id          TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,
  phone_number TEXT,
  address     TEXT,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT individual_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS individual_users_user_id_key ON individual_users (user_id);

-- ============================================================================
-- TABLE: employees (depends on: users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS employees (
  id              TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL,
  department      TEXT NOT NULL DEFAULT 'General',
  designation     TEXT NOT NULL DEFAULT 'Employee',
  hourly_rate     DOUBLE PRECISION,
  face_photo_urls TEXT NOT NULL DEFAULT '[]',
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT employees_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS employees_user_id_key ON employees (user_id);
CREATE INDEX IF NOT EXISTS employees_department_idx ON employees (department);

-- ============================================================================
-- TABLE: notifications (depends on: users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id               TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          TEXT NOT NULL,
  message          TEXT NOT NULL,
  notification_type TEXT NOT NULL DEFAULT 'info',
  is_read          BOOLEAN NOT NULL DEFAULT false,
  action_url       TEXT,
  scheduled_at     TIMESTAMP WITH TIME ZONE,
  expires_at       TIMESTAMP WITH TIME ZONE,
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON notifications (is_read);

-- ============================================================================
-- TABLE: announcements (depends on: users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS announcements (
  id                  TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  title               TEXT NOT NULL,
  description         TEXT NOT NULL DEFAULT '',
  content             TEXT NOT NULL DEFAULT '',
  priority            TEXT NOT NULL DEFAULT 'normal',
  status              TEXT NOT NULL DEFAULT 'active',
  expires_at          TIMESTAMP WITH TIME ZONE,
  created_by          TEXT,
  target_roles        TEXT NOT NULL DEFAULT '[]',
  target_departments  TEXT NOT NULL DEFAULT '[]',
  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS announcements_status_idx ON announcements (status);
CREATE INDEX IF NOT EXISTS announcements_created_by_idx ON announcements (created_by);

-- ============================================================================
-- TABLE: rbac_temp_access (depends on: users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS rbac_temp_access (
  id           TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email   TEXT NOT NULL,
  role         TEXT NOT NULL,
  expires_at   TIMESTAMP WITH TIME ZONE NOT NULL,
  granted_by   TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT rbac_temp_access_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS rbac_temp_access_user_email_idx ON rbac_temp_access (user_email);
CREATE INDEX IF NOT EXISTS rbac_temp_access_is_active_idx ON rbac_temp_access (is_active);

-- ============================================================================
-- TABLE: session_settings (depends on: tenants)
-- ============================================================================
CREATE TABLE IF NOT EXISTS session_settings (
  id                              TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  time_tracking_timeout_minutes   INTEGER NOT NULL DEFAULT 15,
  time_tracking_warning_minutes   INTEGER NOT NULL DEFAULT 10,
  activity_check_interval_minutes INTEGER NOT NULL DEFAULT 5,
  popup_countdown_seconds         INTEGER NOT NULL DEFAULT 60,
  office_lat                      DOUBLE PRECISION NOT NULL DEFAULT 0,
  office_lng                      DOUBLE PRECISION NOT NULL DEFAULT 0,
  allowed_radius_meters           INTEGER NOT NULL DEFAULT 500,
  tenant_id                       TEXT,
  created_at                      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT session_settings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants (id)
);

CREATE INDEX IF NOT EXISTS session_settings_tenant_id_idx ON session_settings (tenant_id);

-- ============================================================================
-- TABLE: activity_logs (depends on: users, tenants)
-- ============================================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id         TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT,
  user_email TEXT NOT NULL DEFAULT '',
  action     TEXT NOT NULL,
  section    TEXT NOT NULL DEFAULT '',
  details    TEXT NOT NULL DEFAULT '{}',
  tenant_id  TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT activity_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants (id)
);

CREATE INDEX IF NOT EXISTS activity_logs_user_id_idx ON activity_logs (user_id);
CREATE INDEX IF NOT EXISTS activity_logs_tenant_id_idx ON activity_logs (tenant_id);
CREATE INDEX IF NOT EXISTS activity_logs_action_idx ON activity_logs (action);
CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON activity_logs (created_at);

-- ============================================================================
-- TABLE: projects (depends on: tenants, users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS projects (
  id              TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'draft',
  priority        TEXT NOT NULL DEFAULT 'medium',
  progress        INTEGER NOT NULL DEFAULT 0,
  budget          DOUBLE PRECISION NOT NULL DEFAULT 0,
  tags            TEXT NOT NULL DEFAULT '[]',
  department      TEXT NOT NULL DEFAULT '',
  tenant_id       TEXT,
  created_by      TEXT,
  owner_id        TEXT,
  is_duplicate_of TEXT,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT projects_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants (id),
  CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES users (id),
  CONSTRAINT projects_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS projects_tenant_id_idx ON projects (tenant_id);
CREATE INDEX IF NOT EXISTS projects_status_idx ON projects (status);
CREATE INDEX IF NOT EXISTS projects_created_by_idx ON projects (created_by);
CREATE INDEX IF NOT EXISTS projects_owner_id_idx ON projects (owner_id);

-- ============================================================================
-- TABLE: project_tasks (depends on: projects)
-- ============================================================================
CREATE TABLE IF NOT EXISTS project_tasks (
  id              TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  is_completed    BOOLEAN NOT NULL DEFAULT false,
  phase           TEXT NOT NULL DEFAULT '',
  estimated_hours DOUBLE PRECISION,
  assigned_to     TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT project_tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS project_tasks_project_id_idx ON project_tasks (project_id);
CREATE INDEX IF NOT EXISTS project_tasks_is_completed_idx ON project_tasks (is_completed);

-- ============================================================================
-- TABLE: employee_projects (depends on: employees, projects, users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS employee_projects (
  id               TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id      TEXT NOT NULL,
  project_id       TEXT NOT NULL,
  assigned_by      TEXT,
  status           TEXT NOT NULL DEFAULT 'pending',
  progress_report  TEXT NOT NULL DEFAULT '',
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT employee_projects_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE,
  CONSTRAINT employee_projects_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT employee_projects_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS employee_projects_employee_id_idx ON employee_projects (employee_id);
CREATE INDEX IF NOT EXISTS employee_projects_project_id_idx ON employee_projects (project_id);

-- ============================================================================
-- TABLE: leave_requests (depends on: employees)
-- ============================================================================
CREATE TABLE IF NOT EXISTS leave_requests (
  id          TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL,
  type        TEXT NOT NULL,
  start_date  TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date    TIMESTAMP WITH TIME ZONE NOT NULL,
  reason      TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'pending',
  days        DOUBLE PRECISION NOT NULL DEFAULT 1,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT leave_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS leave_requests_employee_id_idx ON leave_requests (employee_id);
CREATE INDEX IF NOT EXISTS leave_requests_status_idx ON leave_requests (status);
CREATE INDEX IF NOT EXISTS leave_requests_start_date_idx ON leave_requests (start_date);

-- ============================================================================
-- TABLE: attendance (depends on: employees)
-- ============================================================================
CREATE TABLE IF NOT EXISTS attendance (
  id                   TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id          TEXT NOT NULL,
  date                 TIMESTAMP WITH TIME ZONE NOT NULL,
  check_in             TIMESTAMP WITH TIME ZONE,
  check_out            TIMESTAMP WITH TIME ZONE,
  status               TEXT NOT NULL DEFAULT 'absent',
  hours                DOUBLE PRECISION NOT NULL DEFAULT 0,
  latitude             DOUBLE PRECISION,
  longitude            DOUBLE PRECISION,
  is_location_verified BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT attendance_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS attendance_employee_id_idx ON attendance (employee_id);
CREATE INDEX IF NOT EXISTS attendance_date_idx ON attendance (date);
CREATE INDEX IF NOT EXISTS attendance_status_idx ON attendance (status);
CREATE UNIQUE INDEX IF NOT EXISTS attendance_employee_id_date_key ON attendance (employee_id, date);

-- ============================================================================
-- TABLE: time_logs (depends on: employees)
-- ============================================================================
CREATE TABLE IF NOT EXISTS time_logs (
  id                 TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id        TEXT NOT NULL,
  project            TEXT NOT NULL DEFAULT '',
  task               TEXT NOT NULL DEFAULT '',
  tag                TEXT NOT NULL DEFAULT '',
  start_time         TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time           TIMESTAMP WITH TIME ZONE,
  duration           DOUBLE PRECISION NOT NULL DEFAULT 0,
  is_verified        BOOLEAN NOT NULL DEFAULT true,
  verification_method TEXT,
  idle_flags         INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT time_logs_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS time_logs_employee_id_idx ON time_logs (employee_id);
CREATE INDEX IF NOT EXISTS time_logs_start_time_idx ON time_logs (start_time);
CREATE INDEX IF NOT EXISTS time_logs_is_verified_idx ON time_logs (is_verified);

-- ============================================================================
-- TABLE: verification_records (depends on: users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS verification_records (
  id               TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          TEXT NOT NULL,
  video_url        TEXT NOT NULL DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'pending',
  reviewed_by      TEXT,
  rejection_reason TEXT NOT NULL DEFAULT '',
  submitted_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT verification_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT verification_records_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS verification_records_user_id_idx ON verification_records (user_id);
CREATE INDEX IF NOT EXISTS verification_records_status_idx ON verification_records (status);
CREATE INDEX IF NOT EXISTS verification_records_reviewed_by_idx ON verification_records (reviewed_by);

-- ============================================================================
-- TABLE: employee_signatures (depends on: employees, agreement_templates)
-- ============================================================================
CREATE TABLE IF NOT EXISTS employee_signatures (
  id                 TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id        TEXT NOT NULL,
  template_id        TEXT NOT NULL,
  signature_image_url TEXT NOT NULL DEFAULT '',
  ip_address         TEXT NOT NULL DEFAULT '',
  signed_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT employee_signatures_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE,
  CONSTRAINT employee_signatures_template_id_fkey FOREIGN KEY (template_id) REFERENCES agreement_templates (id)
);

CREATE INDEX IF NOT EXISTS employee_signatures_employee_id_idx ON employee_signatures (employee_id);
CREATE INDEX IF NOT EXISTS employee_signatures_template_id_idx ON employee_signatures (template_id);

-- ============================================================================
-- TABLE: award_points (depends on: employees, users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS award_points (
  id           TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id  TEXT NOT NULL,
  points       INTEGER NOT NULL DEFAULT 0,
  reason       TEXT NOT NULL DEFAULT '',
  awarded_by   TEXT NOT NULL,
  target_type  TEXT NOT NULL DEFAULT 'individual',
  target_ids   TEXT,
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT award_points_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE,
  CONSTRAINT award_points_awarded_by_fkey FOREIGN KEY (awarded_by) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS award_points_employee_id_idx ON award_points (employee_id);
CREATE INDEX IF NOT EXISTS award_points_awarded_by_idx ON award_points (awarded_by);

-- ============================================================================
-- TABLE: assets (depends on: employees)
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets (
  id            TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  serial_number TEXT NOT NULL DEFAULT '',
  category      TEXT NOT NULL DEFAULT '',
  condition     TEXT NOT NULL DEFAULT 'new',
  assigned_to   TEXT,
  purchase_date TEXT,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT assets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES employees (id)
);

CREATE INDEX IF NOT EXISTS assets_category_idx ON assets (category);
CREATE INDEX IF NOT EXISTS assets_assigned_to_idx ON assets (assigned_to);