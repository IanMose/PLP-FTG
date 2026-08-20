package com.sentinel.technician;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface TechnicianRepository extends JpaRepository<TechnicianEntity, Long> {
    Optional<TechnicianEntity> findByAppUserId(Long appUserId);
    List<TechnicianEntity> findByStationHomeId(String stationHomeId);
}
