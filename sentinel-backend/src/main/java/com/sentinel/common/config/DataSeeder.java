package com.sentinel.common.config;

import com.sentinel.user.AppRoleEntity;
import com.sentinel.user.AppRoleRepository;
import com.sentinel.user.AppUserEntity;
import com.sentinel.user.AppUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DataSeeder — runs once at startup after the JPA schema is created.
 *
 * On the H2 dev profile, Flyway is disabled and JPA uses create-drop.
 * This seeder is therefore the sole source of reference data at startup.
 * It seeds in order:
 *   1. RBAC roles (app_role) — needed before users
 *   2. Default user accounts (app_user)
 *
 * On Postgres / Render, Flyway already seeded both tables via V3 and V4.
 * Every insert here is guarded by an existsBy* check — safe to run on
 * every restart regardless of profile.
 *
 * Default accounts:
 * ┌─────────────────────────┬───────────────────┬─────────────┐
 * │ Email                   │ Password          │ Role        │
 * ├─────────────────────────┼───────────────────┼─────────────┤
 * │ admin@sentinel.kpc      │ sentinel@admin    │ Admin       │
 * │ manager@sentinel.kpc    │ sentinel@admin    │ HSE Manager │
 * │ auditor@sentinel.kpc    │ sentinel@admin    │ Auditor     │
 * │ analyst@sentinel.kpc    │ sentinel@admin    │ Analyst     │
 * │ viewer@sentinel.kpc     │ sentinel@admin    │ Viewer      │
 * └─────────────────────────┴───────────────────┴─────────────┘
 *
 * Rotate passwords after first login.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements ApplicationRunner {

    private final AppUserRepository userRepository;
    private final AppRoleRepository roleRepository;
    private final PasswordEncoder   passwordEncoder;

    /** Temporary password shared by all seed accounts. Rotate after first login. */
    private static final String DEFAULT_PASSWORD = "sentinel@admin";

    /** RBAC roles seeded in order — used by both Flyway (Postgres) and JPA (H2) profiles. */
    private static final List<String> ROLE_NAMES = List.of(
        "Admin", "HSE Manager", "Auditor", "Analyst", "Viewer"
    );

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedRoles();
        seedUsers();
    }

    /** Ensures all RBAC roles exist. Idempotent — skips roles already present. */
    private void seedRoles() {
        int created = 0;
        for (String roleName : ROLE_NAMES) {
            if (roleRepository.findByNameIgnoreCase(roleName).isPresent()) {
                log.debug("DataSeeder: role '{}' already exists — skipping", roleName);
                continue;
            }
            AppRoleEntity role = new AppRoleEntity();
            role.setName(roleName);
            role.setDescription(roleName + " role");
            role.setCreatedAt(java.time.LocalDateTime.now());
            roleRepository.save(role);
            log.info("DataSeeder: created role '{}'", roleName);
            created++;
        }
        if (created > 0) {
            log.info("DataSeeder: seeded {} role(s)", created);
        }
    }

    /** Ensures all default user accounts exist. Idempotent — skips accounts already present. */
    private void seedUsers() {
        log.info("DataSeeder: checking seed accounts...");

        List<SeedAccount> accounts = List.of(
            new SeedAccount("Sentinel Admin",    "admin@sentinel.kpc",     "Admin"),
            new SeedAccount("Jane Mwangi",       "manager@sentinel.kpc",   "HSE Manager"),
            new SeedAccount("David Otieno",      "auditor@sentinel.kpc",   "Auditor"),
            new SeedAccount("Amina Kariuki",     "analyst@sentinel.kpc",   "Analyst"),
            new SeedAccount("Tom Kiplangat",     "viewer@sentinel.kpc",    "Viewer"),
            new SeedAccount("Kariuki Wambua",    "tech@sentinel.kpc",      "Field Technician"),
            new SeedAccount("Beatrice Mutua",    "station@sentinel.kpc",   "Station Manager"),
            new SeedAccount("ML Admin User",     "ml.admin@sentinel.kpc",  "ML Admin")
        );

        int created = 0;
        for (SeedAccount account : accounts) {
            if (userRepository.existsByEmailIgnoreCase(account.email())) {
                log.debug("DataSeeder: {} already exists — skipping", account.email());
                continue;
            }

            AppRoleEntity role = roleRepository.findByNameIgnoreCase(account.role())
                .orElseThrow(() -> new IllegalStateException(
                    "DataSeeder: role '%s' not found — seedRoles() must run first."
                        .formatted(account.role())
                ));

            AppUserEntity user = new AppUserEntity();
            user.setName(account.name());
            user.setEmail(account.email().toLowerCase());
            user.setPasswordHash(passwordEncoder.encode(DEFAULT_PASSWORD));
            user.setRole(role);
            user.setStatus("Active");
            user.setJoinedAt(LocalDateTime.now());

            userRepository.save(user);
            log.info("DataSeeder: created {} ({}) with role {}", account.name(), account.email(), account.role());
            created++;
        }

        if (created == 0) {
            log.info("DataSeeder: all seed accounts already present — nothing to do");
        } else {
            log.info("DataSeeder: created {} account(s). Rotate passwords after first login.", created);
        }
    }

    /** Lightweight record to hold seed account data. */
    private record SeedAccount(String name, String email, String role) {}
}
