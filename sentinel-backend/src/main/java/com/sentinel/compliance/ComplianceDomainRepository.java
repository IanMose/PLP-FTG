package com.sentinel.compliance;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ComplianceDomainRepository extends JpaRepository<ComplianceDomainEntity, String> {

    @Query("SELECT d FROM ComplianceDomainEntity d WHERE d.isActive = true ORDER BY d.displayOrder")
    List<ComplianceDomainEntity> findAllActiveOrderByDisplayOrder();
}
