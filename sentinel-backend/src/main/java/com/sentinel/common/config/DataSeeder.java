package com.sentinel.common.config;

import com.sentinel.compliance.ComplianceDomainEntity;
import com.sentinel.compliance.ComplianceDomainRepository;
import com.sentinel.compliance.ComplianceIndicatorEntity;
import com.sentinel.compliance.ComplianceIndicatorRepository;
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
    private final ComplianceDomainRepository    complianceDomainRepository;
    private final ComplianceIndicatorRepository complianceIndicatorRepository;

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
        seedComplianceConfig();
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
            new SeedAccount("Sentinel Admin", "admin@sentinel.kpc",    "Admin"),
            new SeedAccount("Jane Mwangi",    "manager@sentinel.kpc",  "HSE Manager"),
            new SeedAccount("David Otieno",   "auditor@sentinel.kpc",  "Auditor"),
            new SeedAccount("Amina Kariuki",  "analyst@sentinel.kpc",  "Analyst"),
            new SeedAccount("Tom Kiplangat",  "viewer@sentinel.kpc",   "Viewer")
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

    /** Ensures compliance domains and indicators are seeded. Idempotent — skips if already present. */
    private void seedComplianceConfig() {
        if (complianceDomainRepository.count() > 0) {
            log.debug("DataSeeder: compliance domains already present — skipping");
            return;
        }
        LocalDateTime now = LocalDateTime.now();

        // ── Domains ─────────────────────────────────────────────────────────
        record DomainSeed(String id, String name, double weight, String desc, int order) {}
        List<DomainSeed> domains = List.of(
            new DomainSeed("SCD",  "Safety Compliance",           0.30, "Procedures, authorisations, training, and equipment.", 1),
            new DomainSeed("ECD",  "Environmental Compliance",    0.25, "Water, air, waste, and spill response.", 2),
            new DomainSeed("AICD", "Asset Integrity Compliance",  0.25, "Inspection, maintenance, and monitoring intervals.", 3),
            new DomainSeed("RCD",  "Regulatory Compliance",       0.20, "External regulators and internal governance.", 4)
        );
        for (DomainSeed d : domains) {
            ComplianceDomainEntity e = new ComplianceDomainEntity();
            e.setDomainId(d.id()); e.setDomainName(d.name()); e.setDomainWeight(d.weight());
            e.setDescription(d.desc()); e.setDisplayOrder(d.order());
            e.setIsActive(true); e.setVersion(1); e.setCreatedAt(now); e.setUpdatedAt(now);
            complianceDomainRepository.save(e);
        }

        // ── Indicators ───────────────────────────────────────────────────────
        record IndSeed(String id, String name, String domain, double wt, double green, double amber, String type) {}
        List<IndSeed> indicators = List.of(
            // Safety
            new IndSeed("PCI",   "PPE Compliance Rate",                    "SCD",  0.25, 95, 80, "LEADING"),
            new IndSeed("TCI",   "Training Compliance Rate",               "SCD",  0.30, 90, 75, "LEADING"),
            new IndSeed("PTWCI", "Permit-to-Work Compliance Rate",         "SCD",  0.30, 98, 90, "LEADING"),
            new IndSeed("IRCI",  "Incident Reporting Timeliness Rate",     "SCD",  0.15, 95, 80, "LAGGING"),
            // Environmental
            new IndSeed("WQCI",  "Water Quality Discharge Compliance Rate","ECD",  0.25, 95, 80, "MIXED"),
            new IndSeed("AQCI",  "Air Emissions Compliance Rate",          "ECD",  0.20, 95, 80, "MIXED"),
            new IndSeed("WMCI",  "Waste Management Compliance Rate",       "ECD",  0.30, 90, 75, "LEADING"),
            new IndSeed("SRCI",  "Spill Response Compliance Rate",         "ECD",  0.25, 95, 80, "LAGGING"),
            // Asset Integrity
            new IndSeed("ICI",   "Asset Inspection Compliance Rate",       "AICD", 0.30, 95, 80, "LEADING"),
            new IndSeed("PMCI",  "Preventive Maintenance Completion Rate", "AICD", 0.30, 90, 75, "LEADING"),
            new IndSeed("CMCI",  "Corrosion Monitoring Coverage Rate",     "AICD", 0.20, 90, 75, "LEADING"),
            new IndSeed("LDCI",  "Leak Detection System Availability",     "AICD", 0.20, 99, 95, "LEADING"),
            // Regulatory
            new IndSeed("ACI",   "HSE Audit Completion Rate",              "RCD",  0.25, 95, 80, "LAGGING"),
            new IndSeed("CACI",  "Corrective Action Closure Rate",         "RCD",  0.30, 90, 75, "LAGGING"),
            new IndSeed("RRI",   "Regulatory Report Submission Rate",      "RCD",  0.25,100, 90, "LAGGING"),
            new IndSeed("SOPCI","Internal SOP Adherence Rate",             "RCD",  0.20, 90, 75, "MIXED")
        );
        for (IndSeed i : indicators) {
            ComplianceIndicatorEntity e = new ComplianceIndicatorEntity();
            e.setIndicatorId(i.id()); e.setIndicatorName(i.name()); e.setDomainId(i.domain());
            e.setIndicatorWeight(i.wt()); e.setGreenThreshold(i.green()); e.setAmberThreshold(i.amber());
            e.setIndicatorType(i.type()); e.setIsActive(true); e.setVersion(1);
            e.setCreatedAt(now); e.setUpdatedAt(now);
            complianceIndicatorRepository.save(e);
        }
        log.info("DataSeeder: seeded 4 compliance domains and 16 indicators");
    }

    /** Lightweight record to hold seed account data. */
    private record SeedAccount(String name, String email, String role) {}
}
