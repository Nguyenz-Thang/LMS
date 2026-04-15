import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Layers3,
  Clock3,
  PlayCircle,
  FileText,
  ClipboardCheck,
  FilePenLine,
  GraduationCap,
  CircleCheck,
} from "lucide-react";
import { useCourseApi } from "../../api/courseApi";
import { enrollCourse, getMyEnrollments } from "../../api/enrollmentApi";
import styles from "./CourseDetail.module.scss";

function normalizeCourse(rawCourse) {
  return {
    id: rawCourse?.id || "",
    title: rawCourse?.title || "Khóa học không xác định",
    description: rawCourse?.description || "",
    thumbnailUrl: rawCourse?.thumbnailUrl || "",
    instructorName: rawCourse?.instructorName || "Chưa cập nhật",
    categoryName: rawCourse?.categoryName || "Chưa phân loại",
    status: rawCourse?.status || "DRAFT",
    visibility: rawCourse?.visibility || "PUBLIC",
    level: rawCourse?.level || "BEGINNER",
    estimatedHours: Number(rawCourse?.estimatedHours) || 0,
  };
}

function normalizeCurriculum(rawCurriculum) {
  return {
    id: rawCurriculum?.id || "",
    sections: Array.isArray(rawCurriculum?.sections)
      ? rawCurriculum.sections.map((section) => ({
          id: section?.id || "",
          title: section?.title || "Chương học",
          description: section?.description || "",
          orderIndex: Number(section?.orderIndex) || 0,
          totalLessons: Number(section?.totalLessons) || 0,
          totalDurationMinutes: Number(section?.totalDurationMinutes) || 0,
          lessons: Array.isArray(section?.lessons)
            ? section.lessons.map((lesson) => ({
                id: lesson?.id || "",
                title: lesson?.title || "Bài học",
                description: lesson?.description || "",
                durationMinutes: Number(lesson?.durationMinutes) || 0,
                isPreview: !!lesson?.isPreview,
                isPublished: !!lesson?.isPublished,
                orderIndex: Number(lesson?.orderIndex) || 0,
                lessonType: lesson?.lessonType || "READING",
                quizId: lesson?.quizId || "",
                assignmentId: lesson?.assignmentId || "",
              }))
            : [],
        }))
      : [],
  };
}

function getLessonTypeLabel(lessonType) {
  switch (lessonType) {
    case "VIDEO":
      return "Video";
    case "QUIZ":
      return "Quiz";
    case "ASSIGNMENT":
      return "Bài tập";
    case "READING":
    default:
      return "Bài đọc";
  }
}

function getLessonIcon(lessonType) {
  switch (lessonType) {
    case "VIDEO":
      return PlayCircle;
    case "QUIZ":
      return ClipboardCheck;
    case "ASSIGNMENT":
      return FilePenLine;
    case "READING":
    default:
      return FileText;
  }
}

export default function CourseDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { getCourseById, getCourseCurriculum } = useCourseApi();

  const [course, setCourse] = useState(null);
  const [curriculum, setCurriculum] = useState({ sections: [] });
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);

  const fetchMyEnrollments = async (courseId) => {
    try {
      const res = await getMyEnrollments();
      const items = Array.isArray(res?.result) ? res.result : [];
      setIsEnrolled(items.some((item) => item?.courseId === courseId));
    } catch (error) {
      console.error("Fetch my enrollments error:", error);
    }
  };

  const fetchCourseDetail = async () => {
    try {
      setLoading(true);
      setErrorText("");

      const [courseRes, curriculumRes] = await Promise.all([
        getCourseById(id),
        getCourseCurriculum(id),
      ]);

      const normalizedCourse = normalizeCourse(courseRes?.result);
      setCourse(normalizedCourse);
      setCurriculum(normalizeCurriculum(curriculumRes?.result));
      await fetchMyEnrollments(normalizedCourse.id);
    } catch (error) {
      setErrorText(
        error?.body?.message ||
          error?.message ||
          "Không tải được chi tiết khóa học.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchCourseDetail();
    }
  }, [id]);

  const totalSections = curriculum.sections.length;

  const totalLessons = useMemo(
    () =>
      curriculum.sections.reduce(
        (sum, section) => sum + section.lessons.length,
        0,
      ),
    [curriculum],
  );

  const totalDurationMinutes = useMemo(
    () =>
      curriculum.sections.reduce(
        (sum, section) => sum + (section.totalDurationMinutes || 0),
        0,
      ),
    [curriculum],
  );

  const handleEnroll = async () => {
    if (!course?.id) return;

    try {
      setEnrolling(true);
      await enrollCourse({ courseId: course.id });
      setIsEnrolled(true);
    } catch (error) {
      alert(
        error?.response?.data?.message ||
          error?.body?.message ||
          error?.message ||
          "Đăng ký khóa học thất bại.",
      );
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return <div className={styles.stateBox}>Đang tải chi tiết khóa học...</div>;
  }

  if (errorText) {
    return <div className={styles.errorBox}>{errorText}</div>;
  }

  if (!course) {
    return <div className={styles.stateBox}>Không có dữ liệu khóa học.</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={18} />
          <span>Quay lại</span>
        </button>
      </div>

      <div className={styles.heroCard}>
        <div className={styles.heroMedia}>
          {course.thumbnailUrl ? (
            <img
              src={course.thumbnailUrl}
              alt={course.title}
              className={styles.heroImage}
            />
          ) : (
            <div className={styles.heroPlaceholder}>
              <BookOpen size={32} />
            </div>
          )}
        </div>

        <div className={styles.heroContent}>
          <div className={styles.badgeRow}>
            <span className={styles.badge}>{course.status}</span>
            <span className={styles.badgeMuted}>{course.level}</span>
          </div>

          <h1>{course.title}</h1>
          <p>{course.description || "Chưa có mô tả khóa học."}</p>

          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <BookOpen size={16} />
              <span>Giảng viên: {course.instructorName}</span>
            </div>

            <div className={styles.metaItem}>
              <Layers3 size={16} />
              <span>Danh mục: {course.categoryName}</span>
            </div>

            <div className={styles.metaItem}>
              <Layers3 size={16} />
              <span>{totalSections} chương</span>
            </div>

            <div className={styles.metaItem}>
              <BookOpen size={16} />
              <span>{totalLessons} bài học</span>
            </div>

            <div className={styles.metaItem}>
              <Clock3 size={16} />
              <span>{totalDurationMinutes} phút nội dung</span>
            </div>

            <div className={styles.metaItem}>
              <Clock3 size={16} />
              <span>{course.estimatedHours} giờ ước tính</span>
            </div>
          </div>

          <div className={styles.heroActions}>
            {isEnrolled ? (
              <button
                type="button"
                className={styles.enrolledBtn}
                onClick={() => navigate("/my-courses")}
              >
                <CircleCheck size={16} />
                <span>Đã đăng ký</span>
              </button>
            ) : (
              <button
                type="button"
                className={styles.enrollBtn}
                onClick={handleEnroll}
                disabled={enrolling}
              >
                <GraduationCap size={16} />
                <span>{enrolling ? "Đang đăng ký..." : "Đăng ký học"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={styles.curriculumCard}>
        <div className={styles.sectionHeader}>
          <h2>Chương trình học</h2>
          <p>Dữ liệu hiển thị theo curriculum backend hiện tại.</p>
        </div>

        {curriculum.sections.length === 0 ? (
          <div className={styles.stateBox}>
            Khóa học chưa có chương/bài học.
          </div>
        ) : (
          <div className={styles.sectionList}>
            {curriculum.sections.map((section, sectionIndex) => (
              <div key={section.id} className={styles.sectionCard}>
                <div className={styles.sectionTop}>
                  <div>
                    <span className={styles.sectionOrder}>
                      Chương {sectionIndex + 1}
                    </span>
                    <h3>{section.title}</h3>
                    <p>{section.description || "Chưa có mô tả chương."}</p>
                  </div>

                  <div className={styles.sectionStats}>
                    <span>{section.totalLessons} bài</span>
                    <span>{section.totalDurationMinutes} phút</span>
                  </div>
                </div>

                <div className={styles.lessonList}>
                  {section.lessons.map((lesson, lessonIndex) => {
                    const LessonIcon = getLessonIcon(lesson.lessonType);

                    return (
                      <div key={lesson.id} className={styles.lessonItem}>
                        <div className={styles.lessonLeft}>
                          <div className={styles.lessonIcon}>
                            <LessonIcon size={18} />
                          </div>

                          <div className={styles.lessonInfo}>
                            <div className={styles.lessonTitleRow}>
                              <strong>
                                {sectionIndex + 1}.{lessonIndex + 1}{" "}
                                {lesson.title}
                              </strong>
                              <span className={styles.lessonType}>
                                {getLessonTypeLabel(lesson.lessonType)}
                              </span>
                            </div>

                            <span className={styles.lessonDescription}>
                              {lesson.description || "Chưa có mô tả bài học."}
                            </span>

                            <div className={styles.lessonMeta}>
                              <span>{lesson.durationMinutes} phút</span>
                              <span>
                                {lesson.isPublished ? "Đã publish" : "Bản nháp"}
                              </span>
                              <span>
                                {lesson.isPreview
                                  ? "Cho xem thử"
                                  : "Không preview"}
                              </span>
                              {lesson.quizId ? <span>Quiz: Có</span> : null}
                              {lesson.assignmentId ? (
                                <span>Bài tập: Có</span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
