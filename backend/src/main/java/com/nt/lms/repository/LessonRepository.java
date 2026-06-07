package com.nt.lms.repository;

import com.nt.lms.entity.Lesson;
import com.nt.lms.entity.Section;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface LessonRepository extends JpaRepository<Lesson, String> {

    List<Lesson> findBySectionOrderByOrderIndexAsc(Section section);

    List<Lesson> findBySectionIdOrderByOrderIndexAsc(String sectionId);

    @Query("""
            select l
            from Lesson l
            join fetch l.section s
            where s.course.id = :courseId
            order by s.orderIndex asc, l.orderIndex asc
            """)
    List<Lesson> findByCourseIdOrderBySectionAndLesson(@Param("courseId") String courseId);

    long countBySection_Course_Id(String courseId);

    @Query(value = """
            select
                id,
                section_id as sectionId,
                title,
                description,
                video_url as videoUrl,
                thumbnail_url as thumbnailUrl,
                duration_minutes as durationMinutes,
                is_published as isPublished,
                is_preview as isPreview,
                order_index as orderIndex
            from lessons
            where section_id in (:sectionIds)
            order by section_id, order_index
            """, nativeQuery = true)
    List<CurriculumLessonView> findCurriculumLessonsBySectionIds(@Param("sectionIds") List<String> sectionIds);

    interface CurriculumLessonView {
        String getId();
        String getSectionId();
        String getTitle();
        String getDescription();
        String getVideoUrl();
        String getThumbnailUrl();
        Integer getDurationMinutes();
        Boolean getIsPublished();
        Boolean getIsPreview();
        Integer getOrderIndex();
    }
}
