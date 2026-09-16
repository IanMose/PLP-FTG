package com.sentinel.alert;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for SMS contact management.
 */
@Repository
public interface SmsContactRepository extends JpaRepository<SmsContactEntity, Long> {

    /**
     * Find all active contacts.
     */
    List<SmsContactEntity> findByActiveTrue();

    /**
     * Find active contacts by role.
     */
    List<SmsContactEntity> findByActiveTrueAndRole(String role);

    /**
     * Find active contacts for a specific site (includes global contacts with null siteId).
     */
    @Query("SELECT c FROM SmsContactEntity c WHERE c.active = true AND (c.siteId IS NULL OR c.siteId = :siteId)")
    List<SmsContactEntity> findActiveContactsForSite(@Param("siteId") String siteId);

    /**
     * Find contact by phone number.
     */
    Optional<SmsContactEntity> findByPhoneNumber(String phoneNumber);

    /**
     * Check if phone number already exists.
     */
    boolean existsByPhoneNumber(String phoneNumber);

    /**
     * Count active contacts.
     */
    long countByActiveTrue();

    /**
     * Find on-call engineers (active only).
     */
    default List<SmsContactEntity> findOnCallEngineers() {
        return findByActiveTrueAndRole("on_call");
    }

    /**
     * Find emergency contacts (active only).
     */
    default List<SmsContactEntity> findEmergencyContacts() {
        return findByActiveTrueAndRole("emergency");
    }
}
