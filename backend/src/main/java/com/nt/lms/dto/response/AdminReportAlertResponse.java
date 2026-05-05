package com.nt.lms.dto.response;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminReportAlertResponse {
    private String severity;
    private String title;
    private String description;
    private String courseId;
    private String courseTitle;
    private String userId;
    private String username;
    private LocalDateTime lastAccessedAt;
}
