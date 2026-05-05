package com.nt.lms.repository;

import com.nt.lms.entity.LearningActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LearningActivityLogRepository extends JpaRepository<LearningActivityLog, Long> {
}
