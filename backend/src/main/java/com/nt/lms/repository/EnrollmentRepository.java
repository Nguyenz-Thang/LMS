package com.nt.lms.repository;

import com.nt.lms.entity.Enrollment;
import com.nt.lms.enums.EnrollmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface EnrollmentRepository extends JpaRepository<Enrollment, String> {

    @Query("""
            select case when count(enrollment) > 0 then true else false end
            from Enrollment enrollment
            where enrollment.user.id = :userId
              and enrollment.course.id = :courseId
            """)
    boolean existsByUserIdAndCourseId(@Param("userId") String userId, @Param("courseId") String courseId);

    @Query("""
            select case when count(enrollment) > 0 then true else false end
            from Enrollment enrollment
            where enrollment.user.id = :userId
            """)
    boolean existsByUserId(@Param("userId") String userId);

    @Query(value = """
            select *
            from enrollments
            where user_id = :userId
            """, nativeQuery = true)
    List<Enrollment> findByUserId(@Param("userId") String userId);

    @Query(value = """
            select *
            from enrollments
            where user_id = :userId
              and status = :#{#status.name()}
            """, nativeQuery = true)
    List<Enrollment> findByUserIdAndStatus(@Param("userId") String userId, @Param("status") EnrollmentStatus status);

    @Query(value = """
            select *
            from enrollments
            where course_id = :courseId
              and status = :#{#status.name()}
            """, nativeQuery = true)
    List<Enrollment> findByCourseIdAndStatus(@Param("courseId") String courseId, @Param("status") EnrollmentStatus status);

    @Query(value = """
            select count(*)
            from enrollments
            where course_id = :courseId
            """, nativeQuery = true)
    long countByCourseId(@Param("courseId") String courseId);

    @Query(value = """
            select *
            from enrollments
            where user_id = :userId
              and course_id = :courseId
            """, nativeQuery = true)
    Optional<Enrollment> findByUserIdAndCourseId(@Param("userId") String userId, @Param("courseId") String courseId);
}
