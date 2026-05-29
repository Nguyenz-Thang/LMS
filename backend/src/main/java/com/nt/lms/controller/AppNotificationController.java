package com.nt.lms.controller;

import com.nt.lms.dto.response.ApiResponse;
import com.nt.lms.dto.response.AppNotificationResponse;
import com.nt.lms.service.AppNotificationService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class AppNotificationController {

    private final AppNotificationService notificationService;

    @GetMapping("/me")
    public ApiResponse<List<AppNotificationResponse>> getMine() {
        return ApiResponse.<List<AppNotificationResponse>>builder()
                .result(notificationService.getMine())
                .build();
    }

    @PutMapping("/{notificationId}/read")
    public ApiResponse<AppNotificationResponse> markRead(@PathVariable String notificationId) {
        return ApiResponse.<AppNotificationResponse>builder()
                .result(notificationService.markRead(notificationId))
                .build();
    }

    @PutMapping("/read-all")
    public ApiResponse<Void> markAllRead() {
        notificationService.markAllRead();
        return ApiResponse.<Void>builder().build();
    }
}
