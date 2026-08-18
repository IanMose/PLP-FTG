package com.sentinel.common.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class AlertDto {
    private String id;
    private String siteId;
    private String siteName;
    private String severity;
    private String status;
    private String title;
    private String description;
    private String rule;
    private List<String> recordIds;
    private String createdAt;
    private String acknowledgedAt;
    private String acknowledgedBy;
    /**
     * Rich narrative text generated at alert-creation time by NarrativeService.
     * May be null for alerts created before V11 migration.
     */
    private String narrative;

    /**
     * ISO timestamp of when the narrative was last written or refreshed.
     * Used by the UI to show "narrative updated 2h ago" vs "generated 3 days ago".
     */
    private String narrativeUpdatedAt;
}
