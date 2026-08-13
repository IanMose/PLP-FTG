-- V4: Seed default users — one per RBAC role for immediate use
--
-- Credentials (BCrypt, cost 12):
--   admin@sentinel.kpc       password: sentinel@admin
--   manager@sentinel.kpc     password: sentinel@admin
--   auditor@sentinel.kpc     password: sentinel@admin
--   analyst@sentinel.kpc     password: sentinel@admin
--   viewer@sentinel.kpc      password: sentinel@admin
--
-- All share the same temporary password so they can be onboarded and rotated.
--
-- Note: DataSeeder.java (ApplicationRunner) also seeds these accounts at startup
-- using the PasswordEncoder bean, with an existsByEmail guard. ON CONFLICT DO NOTHING
-- ensures this migration is safe regardless of execution order.
--
-- Single-row INSERTs used for H2 compatibility (H2 PostgreSQL MODE does not support
-- ON CONFLICT with multi-row VALUES lists).

INSERT INTO app_user (name, email, password_hash, role_id, status, joined_at)
  SELECT 'Sentinel Admin', 'admin@sentinel.kpc',
    '$2a$12$ErAAPenHn9MBI/5ugYgB.eGk6RwPT3TvNFKKl9xDAkIGv71UEk8g.',
    (SELECT id FROM app_role WHERE name = 'Admin'), 'Active', CURRENT_TIMESTAMP
  WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE email = 'admin@sentinel.kpc');

INSERT INTO app_user (name, email, password_hash, role_id, status, joined_at)
  SELECT 'Jane Mwangi', 'manager@sentinel.kpc',
    '$2a$12$ErAAPenHn9MBI/5ugYgB.eGk6RwPT3TvNFKKl9xDAkIGv71UEk8g.',
    (SELECT id FROM app_role WHERE name = 'HSE Manager'), 'Active', CURRENT_TIMESTAMP
  WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE email = 'manager@sentinel.kpc');

INSERT INTO app_user (name, email, password_hash, role_id, status, joined_at)
  SELECT 'David Otieno', 'auditor@sentinel.kpc',
    '$2a$12$ErAAPenHn9MBI/5ugYgB.eGk6RwPT3TvNFKKl9xDAkIGv71UEk8g.',
    (SELECT id FROM app_role WHERE name = 'Auditor'), 'Active', CURRENT_TIMESTAMP
  WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE email = 'auditor@sentinel.kpc');

INSERT INTO app_user (name, email, password_hash, role_id, status, joined_at)
  SELECT 'Amina Kariuki', 'analyst@sentinel.kpc',
    '$2a$12$ErAAPenHn9MBI/5ugYgB.eGk6RwPT3TvNFKKl9xDAkIGv71UEk8g.',
    (SELECT id FROM app_role WHERE name = 'Analyst'), 'Active', CURRENT_TIMESTAMP
  WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE email = 'analyst@sentinel.kpc');

INSERT INTO app_user (name, email, password_hash, role_id, status, joined_at)
  SELECT 'Tom Kiplangat', 'viewer@sentinel.kpc',
    '$2a$12$ErAAPenHn9MBI/5ugYgB.eGk6RwPT3TvNFKKl9xDAkIGv71UEk8g.',
    (SELECT id FROM app_role WHERE name = 'Viewer'), 'Active', CURRENT_TIMESTAMP
  WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE email = 'viewer@sentinel.kpc');
