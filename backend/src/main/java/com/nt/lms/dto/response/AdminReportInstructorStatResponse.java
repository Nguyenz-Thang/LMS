package com.nt.lms.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminReportInstructorStatResponse {
    private String instructorId;
    private String instructorName;
    private Integer courseCount;
    private Integer learnerCount;
    private Double averageProgressPercent;
}
