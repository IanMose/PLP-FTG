package com.sentinel.corridor;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface EnvironmentalReadingRepository extends JpaRepository<EnvironmentalReading, String> {

    /**
     * Returns the single latest reading for a given asset — used as a fallback
     * when only one asset is needed (e.g. alert rules).
     */
    @Query("SELECT e FROM EnvironmentalReading e WHERE e.assetId = :assetId " +
           "ORDER BY e.readingTimestamp DESC LIMIT 1")
    Optional<EnvironmentalReading> findLatestByAssetId(@Param("assetId") String assetId);

    /**
     * Returns the latest reading for EVERY asset in a single query.
     * Used by CorridorHeatmapService to replace the per-asset N+1 loop.
     *
     * Subquery selects the max timestamp per asset; outer query joins back
     * to get the full row. Works on H2 and Postgres.
     */
    @Query("SELECT e FROM EnvironmentalReading e WHERE e.readingTimestamp = " +
           "(SELECT MAX(e2.readingTimestamp) FROM EnvironmentalReading e2 " +
           " WHERE e2.assetId = e.assetId)")
    List<EnvironmentalReading> findLatestPerAsset();

    /** Returns the subset of the given IDs that already exist — one query for a whole batch. */
    @Query("SELECT e.readingId FROM EnvironmentalReading e WHERE e.readingId IN :ids")
    Set<String> findExistingIds(@Param("ids") Set<String> ids);
}
