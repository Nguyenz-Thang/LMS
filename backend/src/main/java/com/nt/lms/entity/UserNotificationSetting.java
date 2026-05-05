package com.nt.lms.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Entity
@Table(name = "user_notification_settings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserNotificationSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @OneToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    User user;

    @Column(name = "new_lesson_email", nullable = false)
    Boolean newLessonEmail;

    @Column(name = "new_assignment_email", nullable = false)
    Boolean newAssignmentEmail;

    @Column(name = "weekly_progress_email", nullable = false)
    Boolean weeklyProgressEmail;

    @PrePersist
    public void prePersist() {
        if (newLessonEmail == null) {
            newLessonEmail = true;
        }
        if (newAssignmentEmail == null) {
            newAssignmentEmail = true;
        }
        if (weeklyProgressEmail == null) {
            weeklyProgressEmail = true;
        }
    }
}
