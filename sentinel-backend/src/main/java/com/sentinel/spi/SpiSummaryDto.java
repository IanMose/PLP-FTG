package com.sentinel.spi;

import lombok.*;
import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SpiSummaryDto {
    // Leading indicators
    private int hazardReportsThisMonth;
    private double avgCapaClosureDays;
    private double pctCapasClosedOnTime;
    private int overdueCapas;
    private List<MonthCount> hazardReportTrend;
    // Lagging indicators
    private int incidents30d;
    private int highCriticalIncidents30d;

    @Data @AllArgsConstructor
    public static class MonthCount {
        private String month;
        private int count;
    }
}
