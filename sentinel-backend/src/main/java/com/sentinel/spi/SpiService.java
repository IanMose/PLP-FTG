package com.sentinel.spi;

import com.sentinel.capa.CapaRepository;
import com.sentinel.hazard.HazardReportRepository;
import com.sentinel.site.IncidentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SpiService {

    private final HazardReportRepository hazardRepo;
    private final CapaRepository capaRepo;
    private final IncidentRepository incidentRepo;

    public SpiSummaryDto getSummary() {
        LocalDateTime startOfMonth = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);

        int hazardThisMonth = (int) hazardRepo.countCreatedSince(startOfMonth);

        double avgClosure = 0.0;
        try {
            Double avg = capaRepo.avgClosureDays();
            avgClosure = avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0;
        } catch (Exception ignored) {}

        double pctOnTime = 0.0;
        try {
            long closed = capaRepo.countClosed();
            long onTime = capaRepo.countClosedBeforeDue();
            pctOnTime = closed > 0 ? Math.round((double) onTime / closed * 1000.0) / 10.0 : 0.0;
        } catch (Exception ignored) {}

        int overdue = 0;
        try {
            Long overdueL = capaRepo.countOverdue(LocalDate.now());
            overdue = overdueL != null ? overdueL.intValue() : 0;
        } catch (Exception ignored) {}

        int incidents30d = 0;
        int highCrit30d = 0;
        try {
            incidents30d = (int) incidentRepo.countAll();
        } catch (Exception ignored) {}

        // Build last 3 months hazard trend
        List<SpiSummaryDto.MonthCount> trend = new ArrayList<>();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MMM yyyy");
        for (int i = 2; i >= 0; i--) {
            LocalDateTime from = LocalDate.now().minusMonths(i).withDayOfMonth(1).atStartOfDay();
            LocalDateTime to   = from.plusMonths(1);
            long count = 0;
            try { count = hazardRepo.countCreatedSince(from); } catch (Exception ignored) {}
            trend.add(new SpiSummaryDto.MonthCount(from.format(fmt), (int) count));
        }

        return SpiSummaryDto.builder()
                .hazardReportsThisMonth(hazardThisMonth)
                .avgCapaClosureDays(avgClosure)
                .pctCapasClosedOnTime(pctOnTime)
                .overdueCapas(overdue)
                .hazardReportTrend(trend)
                .incidents30d(incidents30d)
                .highCriticalIncidents30d(highCrit30d)
                .build();
    }
}
