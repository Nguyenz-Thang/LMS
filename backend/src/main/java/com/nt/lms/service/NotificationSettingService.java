package com.nt.lms.service;

import com.nt.lms.dto.request.NotificationSettingUpdateRequest;
import com.nt.lms.dto.response.NotificationSettingResponse;
import com.nt.lms.entity.User;
import com.nt.lms.entity.UserNotificationSetting;
import com.nt.lms.exception.AppException;
import com.nt.lms.exception.ErrorCode;
import com.nt.lms.repository.UserNotificationSettingRepository;
import com.nt.lms.repository.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class NotificationSettingService {

    UserRepository userRepository;
    UserNotificationSettingRepository notificationSettingRepository;

    public NotificationSettingResponse getMySettings() {
        User user = getCurrentUser();
        return toResponse(resolveSettings(user));
    }

    public NotificationSettingResponse updateMySettings(NotificationSettingUpdateRequest request) {
        User user = getCurrentUser();
        UserNotificationSetting settings = resolveSettings(user);

        if (request.getNewLessonEmail() != null) {
            settings.setNewLessonEmail(request.getNewLessonEmail());
        }

        if (request.getNewAssignmentEmail() != null) {
            settings.setNewAssignmentEmail(request.getNewAssignmentEmail());
        }

        if (request.getWeeklyProgressEmail() != null) {
            settings.setWeeklyProgressEmail(request.getWeeklyProgressEmail());
        }

        return toResponse(notificationSettingRepository.save(settings));
    }

    public UserNotificationSetting resolveSettings(User user) {
        return notificationSettingRepository.findByUserId(user.getId())
                .orElseGet(() -> notificationSettingRepository.save(
                        UserNotificationSetting.builder()
                                .user(user)
                                .newLessonEmail(true)
                                .newAssignmentEmail(true)
                                .weeklyProgressEmail(true)
                                .build()));
    }

    private NotificationSettingResponse toResponse(UserNotificationSetting settings) {
        return NotificationSettingResponse.builder()
                .newLessonEmail(Boolean.TRUE.equals(settings.getNewLessonEmail()))
                .newAssignmentEmail(Boolean.TRUE.equals(settings.getNewAssignmentEmail()))
                .weeklyProgressEmail(Boolean.TRUE.equals(settings.getWeeklyProgressEmail()))
                .build();
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext()
                .getAuthentication()
                .getName();

        return userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
    }
}
