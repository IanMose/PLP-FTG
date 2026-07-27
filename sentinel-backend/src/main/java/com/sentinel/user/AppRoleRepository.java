package com.sentinel.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AppRoleRepository extends JpaRepository<AppRoleEntity, Long> {
    Optional<AppRoleEntity> findByNameIgnoreCase(String name);
}
