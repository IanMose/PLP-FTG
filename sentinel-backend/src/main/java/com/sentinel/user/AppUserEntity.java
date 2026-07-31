package com.sentinel.user;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "app_user")
@Getter @Setter @NoArgsConstructor
public class AppUserEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "email", nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "role_id", nullable = false)
    private AppRoleEntity role;

    @Column(name = "status", nullable = false, length = 30)
    private String status = "Active";

    @Column(name = "joined_at")
    private LocalDateTime joinedAt;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;
}
