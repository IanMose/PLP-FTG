package com.sentinel.corridor;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EnvironmentalReadingRepository extends JpaRepository<EnvironmentalReading, String> {

    /**
     * Returns the single latest reading for a given asset, used for the
     * status component of the heatmap weight computation.
     */
    @Query("SELECT e FROM EnvironmentalReading e WHERE e.assetId = :assetId " +
           "ORDER BY e.readingTimestamp DESC LIMIT 1")
    Optional<EnvironmentalReading> findLatestByAssetId(@Param("assetId") String assetId);
}
