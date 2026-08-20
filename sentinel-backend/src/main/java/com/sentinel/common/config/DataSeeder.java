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
 * DataSeeder — runs once at startup after Flyway migrations complete.
 *
 * Seeds the five default Sentinel accounts if they do not already exist.
 * Safe to run on every restart: every insert is guarded by an existsByEmail check.
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

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
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
                    "DataSeeder: role '%s' not found. Ensure V3 Flyway migration ran first."
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
