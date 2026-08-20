package com.sentinel.maintenance;

import lombok.Data;

@Data
public class UpdateWorkOrderStatusRequest {
    /** open | in_progress | completed | verified */
    private String status;
    private String notes;
}
