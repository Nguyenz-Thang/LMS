package com.nt.lms.repository;

import com.nt.lms.entity.AppNotification;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppNotificationRepository extends JpaRepository<AppNotification, String> {

    List<AppNotification> findTop20ByUserIdOrderByCreatedAtDesc(String userId);

    long countByUserIdAndReadFalse(String userId);

    Optional<AppNotification> findByIdAndUserId(String id, String userId);

    boolean existsByUserIdAndTypeAndTargetUrlAndReadFalse(String userId, String type, String targetUrl);
}
