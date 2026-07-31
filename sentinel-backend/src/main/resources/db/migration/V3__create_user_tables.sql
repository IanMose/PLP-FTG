-- V3: User management and RBAC tables for Sentinel
-- Roles: Admin, HSE Manager, Auditor, Analyst, Viewer

CREATE TABLE app_role (
    id          BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(50)  NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE app_user (
    id             BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name           VARCHAR(150) NOT NULL,
    email          VARCHAR(255) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    role_id        BIGINT       NOT NULL REFERENCES app_role(id),
    status         VARCHAR(30)  NOT NULL DEFAULT 'Active',
    joined_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at  TIMESTAMP
);

CREATE INDEX idx_app_user_email  ON app_user(email);
CREATE INDEX idx_app_user_role   ON app_user(role_id);
CREATE INDEX idx_app_user_status ON app_user(status);

-- Seed RBAC roles aligned to Sentinel HSE domain
INSERT INTO app_role (name, description) VALUES
  ('Admin',       'Full system access: user management, configuration, all data'),
  ('HSE Manager', 'Manage incidents, audits, approve alerts; no user admin'),
  ('Auditor',     'Create and manage audit records; read-only on incidents'),
  ('Analyst',     'Read-only access to dashboards, risk scores, telemetry'),
  ('Viewer',      'Read-only access to the alert feed and summary views');
