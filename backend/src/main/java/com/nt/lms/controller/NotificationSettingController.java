package com.nt.lms.controller;

import com.nt.lms.dto.request.NotificationSettingUpdateRequest;
import com.nt.lms.dto.response.ApiResponse;
import com.nt.lms.dto.response.NotificationSettingResponse;
import com.nt.lms.service.NotificationSettingService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/notification-settings")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class NotificationSettingController {

    NotificationSettingService notificationSettingService;

    @GetMapping("/me")
    ApiResponse<NotificationSettingResponse> getMySettings() {
        return ApiResponse.<NotificationSettingResponse>builder()
                .result(notificationSettingService.getMySettings())
                .build();
    }

    @PutMapping("/me")
    ApiResponse<NotificationSettingResponse> updateMySettings(
            @RequestBody NotificationSettingUpdateRequest request) {
        return ApiResponse.<NotificationSettingResponse>builder()
                .result(notificationSettingService.updateMySettings(request))
                .build();
    }

    @PostMapping("/me/test-email")
    ApiResponse<String> sendMyTestEmail() {
        return ApiResponse.<String>builder()
                .result(notificationSettingService.sendMyTestEmail())
                .build();
    }
}
