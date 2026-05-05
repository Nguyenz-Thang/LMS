package com.nt.lms.repository;

import com.nt.lms.entity.UserNotificationSetting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserNotificationSettingRepository extends JpaRepository<UserNotificationSetting, String> {
    Optional<UserNotificationSetting> findByUserId(String userId);
    List<UserNotificationSetting> findByWeeklyProgressEmailTrue();
}
