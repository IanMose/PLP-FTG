-- V4: Seed default users — one per RBAC role for immediate use
--
-- Credentials (BCrypt, cost 12):
--   admin@sentinel.kpc       password: sentinel@admin
--   manager@sentinel.kpc     password: sentinel@admin
--   auditor@sentinel.kpc     password: sentinel@admin
--   analyst@sentinel.kpc     password: sentinel@admin
--   viewer@sentinel.kpc      password: sentinel@admin
--
-- Uses MERGE INTO (H2-compatible) so this migration is safe to re-run
-- and also works on PostgreSQL via Flyway's H2 mode for local dev.
-- DataSeeder.java also seeds these on startup with an existsByEmail guard.

MERGE INTO app_user (name, email, password_hash, role_id, status, joined_at)
KEY (email)
VALUES (
  'Sentinel Admin',
  'admin@sentinel.kpc',
  '$2a$12$ErAAPenHn9MBI/5ugYgB.eGk6RwPT3TvNFKKl9xDAkIGv71UEk8g.',
  (SELECT id FROM app_role WHERE name = 'Admin'),
  'Active',
  CURRENT_TIMESTAMP
);

MERGE INTO app_user (name, email, password_hash, role_id, status, joined_at)
KEY (email)
VALUES (
  'Jane Mwangi',
  'manager@sentinel.kpc',
  '$2a$12$ErAAPenHn9MBI/5ugYgB.eGk6RwPT3TvNFKKl9xDAkIGv71UEk8g.',
  (SELECT id FROM app_role WHERE name = 'HSE Manager'),
  'Active',
  CURRENT_TIMESTAMP
);

MERGE INTO app_user (name, email, password_hash, role_id, status, joined_at)
KEY (email)
VALUES (
  'David Otieno',
  'auditor@sentinel.kpc',
  '$2a$12$ErAAPenHn9MBI/5ugYgB.eGk6RwPT3TvNFKKl9xDAkIGv71UEk8g.',
  (SELECT id FROM app_role WHERE name = 'Auditor'),
  'Active',
  CURRENT_TIMESTAMP
);

MERGE INTO app_user (name, email, password_hash, role_id, status, joined_at)
KEY (email)
VALUES (
  'Amina Kariuki',
  'analyst@sentinel.kpc',
  '$2a$12$ErAAPenHn9MBI/5ugYgB.eGk6RwPT3TvNFKKl9xDAkIGv71UEk8g.',
  (SELECT id FROM app_role WHERE name = 'Analyst'),
  'Active',
  CURRENT_TIMESTAMP
);

MERGE INTO app_user (name, email, password_hash, role_id, status, joined_at)
KEY (email)
VALUES (
  'Tom Kiplangat',
  'viewer@sentinel.kpc',
  '$2a$12$ErAAPenHn9MBI/5ugYgB.eGk6RwPT3TvNFKKl9xDAkIGv71UEk8g.',
  (SELECT id FROM app_role WHERE name = 'Viewer'),
  'Active',
  CURRENT_TIMESTAMP
);
