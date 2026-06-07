package com.nt.lms.repository;

import com.nt.lms.entity.Assignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AssignmentRepository extends JpaRepository<Assignment, String> {
    Optional<Assignment> findByLessonId(String lessonId);
    Optional<Assignment> findFirstByLessonId(String lessonId);
    @Query(value = """
            select a.*
            from assignments a
            join courses c on c.id = a.course_id
            where c.instructor_id = :instructorId
            """, nativeQuery = true)
    List<Assignment> findByCourseInstructorId(@Param("instructorId") String instructorId);

    @Query(value = """
            select
                id,
                course_id as courseId,
                lesson_id as lessonId,
                title,
                description,
                assignment_type as assignmentType
            from assignments
            where id = :assignmentId
            """, nativeQuery = true)
    Optional<LearningAssignmentView> findLearningAssignmentViewById(@Param("assignmentId") String assignmentId);

    @Query(value = """
            select id, lesson_id as lessonId
            from assignments
            where lesson_id in (:lessonIds)
            """, nativeQuery = true)
    List<LessonAssignmentRef> findLessonAssignmentRefs(@Param("lessonIds") List<String> lessonIds);

    interface LearningAssignmentView {
        String getId();
        String getCourseId();
        String getLessonId();
        String getTitle();
        String getDescription();
        String getAssignmentType();
    }

    interface LessonAssignmentRef {
        String getId();
        String getLessonId();
    }
}
