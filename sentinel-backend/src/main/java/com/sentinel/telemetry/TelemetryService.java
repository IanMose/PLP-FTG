package com.sentinel.telemetry;

import com.sentinel.common.dto.TelemetryReadingDto;
import com.sentinel.common.dto.TelemetrySummaryDto;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Telemetry service — provides pipeline sensor reading summaries and site-level detail.
 * Pressure spikes are surfaced as leading indicators for risk scoring.
 */
@Service
public class TelemetryService {

    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'");

    private final TelemetryRepository telemetryRepository;

    public TelemetryService(TelemetryRepository telemetryRepository) {
        this.telemetryRepository = telemetryRepository;
    }

    public TelemetrySummaryDto getSummary() {
        long totalReadings = telemetryRepository.count();

        // Count pressure spikes (out-of-bounds readings that made it through)
        int pressureSpikes = 0;
        for (Object[] row : telemetryRepository.countPressureSpikesBySite()) {
            pressureSpikes += ((Long) row[1]).intValue();
        }

        // Compute averages
        double avgPressure = 0, avgFlow = 0, avgTemp = 0;
        List<Object[]> avgs = telemetryRepository.avgReadingsBySite();
        if (!avgs.isEmpty()) {
            int count = avgs.size();
            for (Object[] row : avgs) {
                avgPressure += row[1] != null ? ((Number) row[1]).doubleValue() : 0;
                avgFlow += row[2] != null ? ((Number) row[2]).doubleValue() : 0;
                avgTemp += row[3] != null ? ((Number) row[3]).doubleValue() : 0;
            }
            avgPressure /= count;
            avgFlow /= count;
            avgTemp /= count;
        }

        // Count sensor dropouts (rows with null pressure/flow/temp)
        int sensorDropouts = (int) telemetryRepository.findAll().stream()
                .filter(t -> t.getPressurePsi() == null || t.getFlowRateBph() == null || t.getTemperatureCelsius() == null)
                .count();

        return TelemetrySummaryDto.builder()
                .totalReadings((int) totalReadings)
                .pressureSpikeCount(pressureSpikes)
                .sensorDropoutCount(sensorDropouts)
                .avgPressure(Math.round(avgPressure * 10.0) / 10.0)
                .avgFlowRate(Math.round(avgFlow * 10.0) / 10.0)
                .avgTemperature(Math.round(avgTemp * 10.0) / 10.0)
                .build();
    }

    public List<TelemetryReadingDto> getSiteReadings(String siteId) {
        return telemetryRepository.findLatestBySite(siteId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public int getPressureSpikeCountForSite(String siteId) {
        return telemetryRepository.countPressureSpikesBySite().stream()
                .filter(row -> siteId.equals(row[0]))
                .mapToInt(row -> ((Long) row[1]).intValue())
                .findFirst()
                .orElse(0);
    }

    /**
     * Returns spike count for a single site using a targeted query.
     * Use this in the simulate path instead of getPressureSpikeCountForSite().
     */
    public int getSpikeCountForSite(String siteId) {
        Long count = telemetryRepository.countSpikesForSite(siteId);
        return count != null ? count.intValue() : 0;
    }

    private TelemetryReadingDto toDto(TelemetryEntity entity) {
        return TelemetryReadingDto.builder()
                .readingId(entity.getReadingId())
                .timestamp(entity.getTimestamp() != null ? entity.getTimestamp().format(ISO_FORMATTER) : null)
                .site(entity.getSite())
                .pipelineSection(entity.getPipelineSection())
                .pressurePsi(entity.getPressurePsi())
                .flowRateBph(entity.getFlowRateBph())
                .temperatureCelsius(entity.getTemperatureCelsius())
                .valveStatus(entity.getValveStatus())
                .sensorId(entity.getSensorId())
                .build();
    }
}
