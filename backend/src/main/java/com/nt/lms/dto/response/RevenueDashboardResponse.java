package com.nt.lms.dto.response;

import java.math.BigDecimal;
import java.util.List;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RevenueDashboardResponse {
    String scope;
    BigDecimal totalRevenue;
    BigDecimal revenueToday;
    BigDecimal revenueThisMonth;
    long totalTransactions;
    long paidTransactions;
    long pendingTransactions;
    long failedTransactions;
    double conversionRatePercent;
    List<RevenueTrendPointResponse> revenueTrend;
    List<RevenueCourseStatResponse> topCourses;
    List<RevenueStatusStatResponse> statusStats;
}
