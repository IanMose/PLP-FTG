package com.sentinel.ingestion;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IngestLogRepository extends JpaRepository<IngestLogEntity, Long> {

    List<IngestLogEntity> findAllByOrderByIngestionTimestampDesc();
}
