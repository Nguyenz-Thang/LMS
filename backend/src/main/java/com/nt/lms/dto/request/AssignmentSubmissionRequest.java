package com.nt.lms.dto.request;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignmentSubmissionRequest {
    private String submissionText;
    private Boolean submitNow;
}