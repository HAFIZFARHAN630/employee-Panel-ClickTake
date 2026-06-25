-- ============================================================
-- Clean Supabase Migration – regenerated from Prisma schema
-- ============================================================

DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

CREATE EXTENSION "uuid-ossp";

-- ===================== 1. tenants =====================
CREATE TABLE tenants (
  id         TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  org_code   TEXT NOT NULL DEFAULT 'ORG001',
  is_active  BOOLEAN NOT NULL DEFAULT true,
  country    TEXT NOT NULL DEFAULT '',
  region     TEXT NOT NULL DEFAULT '',
  timezone   TEXT NOT NULL DEFAULT 'Asia/Karachi',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ===================== 2. users =====================
CREATE TABLE users (
  id               TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  email            TEXT NOT NULL UNIQUE,
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
  CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- ===================== 3. rbac_roles =====================
CREATE TABLE rbac_roles (
  id          TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id     TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  color       TEXT NOT NULL DEFAULT '#6b7280',
  is_system   BOOLEAN NOT NULL DEFAULT false,
  parent_role TEXT,
  permissions TEXT NOT NULL DEFAULT '[]',
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ===================== 4. signup_policies =====================
CREATE TABLE signup_policies (
  id           TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  label        TEXT NOT NULL,
  title        TEXT NOT NULL,
  storage_path TEXT NOT NULL DEFAULT '',
  file_name    TEXT NOT NULL DEFAULT '',
  file_url     TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ===================== 5. agreement_templates =====================
CREATE TABLE agreement_templates (
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

-- ===================== 6. shifts =====================
CREATE TABLE shifts (
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

-- ===================== 7. branding_settings =====================
CREATE TABLE branding_settings (
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

-- ===================== 8. ai_model_configs =====================
CREATE TABLE ai_model_configs (
  id         TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL DEFAULT '',
  provider   TEXT NOT NULL DEFAULT 'openai',
  api_key    TEXT NOT NULL DEFAULT '',
  purpose    TEXT NOT NULL DEFAULT '',
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ===================== 9. password_reset_tokens =====================
CREATE TABLE password_reset_tokens (
  id         TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL,
  token      TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at    TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ===================== 10. hr_training_data =====================
CREATE TABLE hr_training_data (
  id         TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  question   TEXT NOT NULL,
  answer     TEXT NOT NULL DEFAULT '',
  category   TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ===================== 11. individual_users =====================
CREATE TABLE individual_users (
  id          TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL UNIQUE,
  phone_number TEXT,
  address     TEXT,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_individual_users_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ===================== 12. employees =====================
CREATE TABLE employees (
  id              TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL UNIQUE,
  department      TEXT NOT NULL DEFAULT 'General',
  designation     TEXT NOT NULL DEFAULT 'Employee',
  hourly_rate     DOUBLE PRECISION,
  face_photo_urls TEXT NOT NULL DEFAULT '[]',
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_employees_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ===================== 13. notifications =====================
CREATE TABLE notifications (
  id                TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           TEXT NOT NULL,
  message           TEXT NOT NULL,
  notification_type TEXT NOT NULL DEFAULT 'info',
  is_read           BOOLEAN NOT NULL DEFAULT false,
  action_url        TEXT,
  scheduled_at      TIMESTAMP WITH TIME ZONE,
  expires_at        TIMESTAMP WITH TIME ZONE,
  created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ===================== 14. announcements =====================
CREATE TABLE announcements (
  id                 TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  title              TEXT NOT NULL,
  description        TEXT NOT NULL DEFAULT '',
  content            TEXT NOT NULL DEFAULT '',
  priority           TEXT NOT NULL DEFAULT 'normal',
  status             TEXT NOT NULL DEFAULT 'active',
  expires_at         TIMESTAMP WITH TIME ZONE,
  created_by         TEXT,
  target_roles       TEXT NOT NULL DEFAULT '[]',
  target_departments TEXT NOT NULL DEFAULT '[]',
  created_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_announcements_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ===================== 15. rbac_temp_access =====================
CREATE TABLE rbac_temp_access (
  id          TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email  TEXT NOT NULL,
  role        TEXT NOT NULL,
  expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
  granted_by  TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_rbac_temp_access_granted_by FOREIGN KEY (granted_by) REFERENCES users(id)
);

-- ===================== 16. session_settings =====================
CREATE TABLE session_settings (
  id                             TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  time_tracking_timeout_minutes INTEGER NOT NULL DEFAULT 15,
  time_tracking_warning_minutes INTEGER NOT NULL DEFAULT 10,
  activity_check_interval_minutes INTEGER NOT NULL DEFAULT 5,
  popup_countdown_seconds        INTEGER NOT NULL DEFAULT 60,
  office_lat                     DOUBLE PRECISION NOT NULL DEFAULT 0,
  office_lng                     DOUBLE PRECISION NOT NULL DEFAULT 0,
  allowed_radius_meters          INTEGER NOT NULL DEFAULT 500,
  tenant_id                      TEXT,
  created_at                     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at                     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_session_settings_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- ===================== 17. activity_logs =====================
CREATE TABLE activity_logs (
  id         TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT,
  user_email TEXT NOT NULL DEFAULT '',
  action     TEXT NOT NULL,
  section    TEXT NOT NULL DEFAULT '',
  details    TEXT NOT NULL DEFAULT '{}',
  tenant_id  TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_activity_logs_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_activity_logs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- ===================== 18. projects =====================
CREATE TABLE projects (
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
  CONSTRAINT fk_projects_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_projects_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_projects_owner FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- ===================== 19. project_tasks =====================
CREATE TABLE project_tasks (
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
  CONSTRAINT fk_project_tasks_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- ===================== 20. employee_projects =====================
CREATE TABLE employee_projects (
  id              TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     TEXT NOT NULL,
  project_id      TEXT NOT NULL,
  assigned_by     TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',
  progress_report TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_employee_projects_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_employee_projects_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_employee_projects_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id)
);

-- ===================== 21. leave_requests =====================
CREATE TABLE leave_requests (
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
  CONSTRAINT fk_leave_requests_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- ===================== 22. attendance =====================
CREATE TABLE attendance (
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
  CONSTRAINT fk_attendance_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- ===================== 23. time_logs =====================
CREATE TABLE time_logs (
  id                  TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id         TEXT NOT NULL,
  project             TEXT NOT NULL DEFAULT '',
  task                TEXT NOT NULL DEFAULT '',
  tag                 TEXT NOT NULL DEFAULT '',
  start_time          TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time            TIMESTAMP WITH TIME ZONE,
  duration            DOUBLE PRECISION NOT NULL DEFAULT 0,
  is_verified         BOOLEAN NOT NULL DEFAULT true,
  verification_method TEXT,
  idle_flags          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_time_logs_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- ===================== 24. verification_records =====================
CREATE TABLE verification_records (
  id                TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           TEXT NOT NULL,
  video_url         TEXT NOT NULL DEFAULT '',
  status            TEXT NOT NULL DEFAULT 'pending',
  reviewed_by       TEXT,
  rejection_reason  TEXT NOT NULL DEFAULT '',
  submitted_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_verification_records_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_verification_records_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

-- ===================== 25. employee_signatures =====================
CREATE TABLE employee_signatures (
  id                  TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id         TEXT NOT NULL,
  template_id         TEXT NOT NULL,
  signature_image_url TEXT NOT NULL DEFAULT '',
  ip_address          TEXT NOT NULL DEFAULT '',
  signed_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_employee_signatures_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_employee_signatures_template FOREIGN KEY (template_id) REFERENCES agreement_templates(id)
);

-- ===================== 26. award_points =====================
CREATE TABLE award_points (
  id           TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id  TEXT NOT NULL,
  points       INTEGER NOT NULL DEFAULT 0,
  reason       TEXT NOT NULL DEFAULT '',
  awarded_by   TEXT NOT NULL,
  target_type  TEXT NOT NULL DEFAULT 'individual',
  target_ids   TEXT,
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_award_points_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_award_points_awarded_by FOREIGN KEY (awarded_by) REFERENCES users(id)
);

-- ===================== 27. assets =====================
CREATE TABLE assets (
  id            TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  serial_number TEXT NOT NULL DEFAULT '',
  category      TEXT NOT NULL DEFAULT '',
  condition     TEXT NOT NULL DEFAULT 'new',
  assigned_to   TEXT,
  purchase_date TEXT,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_assets_assignee FOREIGN KEY (assigned_to) REFERENCES employees(id)
);

-- ============================================================
-- INDEXES
-- ============================================================

-- users
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_is_active ON users(is_active);

-- employees
CREATE UNIQUE INDEX idx_employees_user_id ON employees(user_id);
CREATE INDEX idx_employees_department ON employees(department);

-- attendance
CREATE INDEX idx_attendance_employee_id ON attendance(employee_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE UNIQUE INDEX idx_attendance_employee_id_date ON attendance(employee_id, date);

-- time_logs
CREATE INDEX idx_time_logs_employee_id ON time_logs(employee_id);
CREATE INDEX idx_time_logs_start_time ON time_logs(start_time);

-- notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- activity_logs
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_tenant_id ON activity_logs(tenant_id);

-- projects
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_tenant_id ON projects(tenant_id);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_owner_id ON projects(owner_id);

-- project_tasks
CREATE INDEX idx_project_tasks_project_id ON project_tasks(project_id);
CREATE INDEX idx_project_tasks_is_completed ON project_tasks(is_completed);

-- password_reset_tokens
CREATE UNIQUE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_email ON password_reset_tokens(email);

-- rbac_temp_access
CREATE INDEX idx_rbac_temp_access_user_email ON rbac_temp_access(user_email);
CREATE INDEX idx_rbac_temp_access_is_active ON rbac_temp_access(is_active);

-- ============================================================
-- VERIFY
-- ============================================================
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;