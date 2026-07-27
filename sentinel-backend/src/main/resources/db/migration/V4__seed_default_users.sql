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

INSERT INTO app_user (name, email, password_hash, role_id, status, joined_at) VALUES
  (
    'Sentinel Admin',
    'admin@sentinel.kpc',
    '$2a$12$ErAAPenHn9MBI/5ugYgB.eGk6RwPT3TvNFKKl9xDAkIGv71UEk8g.',
    (SELECT id FROM app_role WHERE name = 'Admin'),
    'Active',
    CURRENT_TIMESTAMP
  ),
  (
    'Jane Mwangi',
    'manager@sentinel.kpc',
    '$2a$12$ErAAPenHn9MBI/5ugYgB.eGk6RwPT3TvNFKKl9xDAkIGv71UEk8g.',
    (SELECT id FROM app_role WHERE name = 'HSE Manager'),
    'Active',
    CURRENT_TIMESTAMP
  ),
  (
    'David Otieno',
    'auditor@sentinel.kpc',
    '$2a$12$ErAAPenHn9MBI/5ugYgB.eGk6RwPT3TvNFKKl9xDAkIGv71UEk8g.',
    (SELECT id FROM app_role WHERE name = 'Auditor'),
    'Active',
    CURRENT_TIMESTAMP
  ),
  (
    'Amina Kariuki',
    'analyst@sentinel.kpc',
    '$2a$12$ErAAPenHn9MBI/5ugYgB.eGk6RwPT3TvNFKKl9xDAkIGv71UEk8g.',
    (SELECT id FROM app_role WHERE name = 'Analyst'),
    'Active',
    CURRENT_TIMESTAMP
  ),
  (
    'Tom Kiplangat',
    'viewer@sentinel.kpc',
    '$2a$12$ErAAPenHn9MBI/5ugYgB.eGk6RwPT3TvNFKKl9xDAkIGv71UEk8g.',
    (SELECT id FROM app_role WHERE name = 'Viewer'),
    'Active',
    CURRENT_TIMESTAMP
  );
