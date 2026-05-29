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
public class AppNotificationResponse {
    private String id;
    private String type;
    private String title;
    private String message;
    private String targetUrl;
    private Boolean read;
    private LocalDateTime createdAt;
}
