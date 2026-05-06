import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import styles from "./Learning.module.scss";
import { useLearningApi } from "../../api/learningApi";
import LearningSidebar from "./components/LearningSidebar";
import LearningContent from "./components/LearningContent";

export default function Learning() {
  const { courseId, lessonId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const contentAreaRef = useRef(null);
  const lessonRequestSeqRef = useRef(0);
  const learningApi = useLearningApi();

  const [courseData, setCourseData] = useState(null);
  const [lessonData, setLessonData] = useState(null);
  const [openSections, setOpenSections] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingLesson, setLoadingLesson] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [savingProgress, setSavingProgress] = useState(false);

  const normalizeCourseData = (data) => {
    if (!data?.sections) return data;

    let previousLessonCompleted = true;

    return {
      ...data,
      sections: data.sections.map((section) => ({
        ...section,
        lessons: (section.lessons || []).map((lesson) => {
          const locked = Boolean(lesson.locked) || !previousLessonCompleted;

          previousLessonCompleted = Boolean(lesson.completed);

          return {
            ...lesson,
            locked,
            bookmarked: Boolean(lesson.bookmarked),
          };
        }),
      })),
    };
  };

  const findFirstAccessibleLessonId = (data) => {
    if (!data?.sections) return null;

    for (const section of data.sections) {
      for (const lesson of section.lessons || []) {
        if (!lesson.locked) {
          return lesson.id;
        }
      }
    }

    return null;
  };

  const normalizedCourseData = useMemo(
    () => normalizeCourseData(courseData),
    [courseData],
  );
  const targetLessonId =
    lessonId || normalizedCourseData?.currentLessonId || null;

  useEffect(() => {
    fetchLearningCourse();
  }, [courseId]);

  useEffect(() => {
    if (!targetLessonId) {
      setLoadingLesson(false);
      return;
    }

    fetchLessonDetail(targetLessonId);
  }, [targetLessonId]);

  const syncBookmarkState = async (targetLessonId) => {
    if (!targetLessonId) return;

    try {
      const res = await learningApi.getLessonBookmark(targetLessonId);
      const nextBookmarked = Boolean(res?.result?.bookmarked);

      setLessonData((prev) =>
        prev && prev.lessonId === targetLessonId
          ? { ...prev, bookmarked: nextBookmarked }
          : prev,
      );

      setCourseData((prev) => {
        if (!prev?.sections) return prev;

        let changed = false;
        const sections = prev.sections.map((section) => ({
          ...section,
          lessons: (section.lessons || []).map((lesson) => {
            if (lesson.id !== targetLessonId) return lesson;
            if (Boolean(lesson.bookmarked) === nextBookmarked) return lesson;
            changed = true;
            return { ...lesson, bookmarked: nextBookmarked };
          }),
        }));

        return changed ? { ...prev, sections } : prev;
      });
    } catch {
      // Keep current UI state if bookmark sync fails.
    }
  };

  const fetchLearningCourse = async () => {
    try {
      setLoading(true);
      setErrorText("");

      const res = await learningApi.getLearningCourse(courseId);
      const data = res?.result || null;

      if (!data) {
        setErrorText("Không tải được dữ liệu học tập.");
        return;
      }

      if (!data.enrolled) {
        navigate(`/courses/${courseId}`, { replace: true });
        return;
      }

      setCourseData(data);

      const initialOpenState = {};
      (normalizeCourseData(data)?.sections || []).forEach((section) => {
        const hasCurrent = (section.lessons || []).some(
          (lesson) => lesson.id === (lessonId || data.currentLessonId),
        );
        initialOpenState[section.id] = hasCurrent;
      });
      setOpenSections(initialOpenState);
    } catch (error) {
      setErrorText(
        error?.body?.message ||
          error?.message ||
          "Không tải được trang học tập.",
      );
    } finally {
      setLoading(false);
    }
  };

  const markLessonCompletedLocally = (completedLessonId) => {
    if (!completedLessonId) return;

    setLessonData((prev) =>
      prev && prev.lessonId === completedLessonId
        ? { ...prev, completed: true }
        : prev,
    );

    setCourseData((prev) => {
      if (!prev?.sections) return prev;

      let changed = false;
      let completedCount = 0;
      let totalLessons = 0;
      const flatLessonIds = [];

      (prev.sections || []).forEach((section) => {
        (section.lessons || []).forEach((lesson) => {
          flatLessonIds.push(lesson.id);
        });
      });

      const completedIndex = flatLessonIds.indexOf(completedLessonId);
      const nextLessonId =
        completedIndex >= 0 && completedIndex < flatLessonIds.length - 1
          ? flatLessonIds[completedIndex + 1]
          : null;

      const sections = prev.sections.map((section) => ({
        ...section,
        lessons: (section.lessons || []).map((lesson) => {
          totalLessons += 1;
          let nextLesson = lesson;

          if (lesson.id === completedLessonId && !lesson.completed) {
            changed = true;
            nextLesson = {
              ...lesson,
              completed: true,
              locked: false,
            };
          } else if (lesson.id === nextLessonId && lesson.locked) {
            changed = true;
            nextLesson = {
              ...lesson,
              locked: false,
            };
          }

          if (nextLesson.completed) {
            completedCount += 1;
          }

          return nextLesson;
        }),
      }));

      if (!changed) return prev;

      const denominator = prev.totalLessons || totalLessons || 1;
      return {
        ...prev,
        sections,
        completedLessons: completedCount,
        progressPercent: Math.round((completedCount * 100) / denominator),
      };
    });
  };

  const fetchLessonDetail = async (targetLessonId) => {
    const requestSeq = lessonRequestSeqRef.current + 1;
    lessonRequestSeqRef.current = requestSeq;

    try {
      setLoadingLesson(true);
      setErrorText("");

      const res = await learningApi.getLearningLesson(courseId, targetLessonId);
      const data = res?.result || null;

      if (lessonRequestSeqRef.current !== requestSeq) {
        return;
      }

      setLessonData(data);
      await syncBookmarkState(targetLessonId);

      await learningApi.saveLessonProgress(targetLessonId, {
        lastPositionSec: data?.lastPositionSec || 0,
        watchedSeconds: data?.lastPositionSec || 0,
        completed: false,
      });
    } catch (error) {
      if (error?.status === 403) {
        try {
          const latestRes = await learningApi.getLearningCourse(courseId);
          const latestData = normalizeCourseData(latestRes?.result || null);

          if (latestData) {
            setCourseData(latestData);

            const fallbackLessonId =
              latestData.currentLessonId || findFirstAccessibleLessonId(latestData);

            if (fallbackLessonId && fallbackLessonId !== targetLessonId) {
              navigate(`/learning/${courseId}/${fallbackLessonId}`, {
                replace: true,
              });
              return;
            }
          }
        } catch {
          // Fall through to the user-facing lock message below.
        }

        setErrorText("Hãy hoàn thành bài hiện tại để mở bài tiếp theo.");
        return;
      }

      setErrorText(
        error?.body?.message || error?.message || "Không tải được bài học.",
      );
    } finally {
      if (lessonRequestSeqRef.current === requestSeq) {
        setLoadingLesson(false);
      }
    }
  };

  const currentLessonId =
    lessonData?.lessonId || lessonId || normalizedCourseData?.currentLessonId;

  const flatLessons = useMemo(() => {
    if (!normalizedCourseData?.sections) return [];
    return normalizedCourseData.sections.flatMap(
      (section) => section.lessons || [],
    );
  }, [normalizedCourseData]);

  const currentLessonIndex = useMemo(() => {
    return flatLessons.findIndex((lesson) => lesson.id === currentLessonId);
  }, [flatLessons, currentLessonId]);

  const lessonProgressText = useMemo(() => {
    if (!normalizedCourseData) return "0/0 bài học";
    const completedCount = flatLessons.filter(
      (lesson) => lesson.completed,
    ).length;
    return `${completedCount}/${
      normalizedCourseData.totalLessons || flatLessons.length
    } bài học`;
  }, [normalizedCourseData, flatLessons]);

  const handleOpenLesson = async (targetLesson) => {
    if (!targetLesson) return;
    if (targetLesson.locked) {
      setErrorText("Hãy hoàn thành bài hiện tại để mở bài tiếp theo.");
      return;
    }
    setErrorText("");
    navigate(`/learning/${courseId}/${targetLesson.id}`);
  };

  const handlePrevLesson = () => {
    if (currentLessonIndex <= 0) return;
    const prevLesson = flatLessons[currentLessonIndex - 1];
    if (prevLesson?.id) {
      navigate(`/learning/${courseId}/${prevLesson.id}`);
    }
  };

  const handleBackNavigation = () => {
    const from = location.state?.from;
    if (from && !String(from).startsWith("/learning/")) {
      navigate(from, { replace: true });
      return;
    }

    navigate("/my-courses", { replace: true });
  };

  const completeCurrentLesson = async ({ autoNavigate = true } = {}) => {
    if (!lessonData || lessonData.completed) return;

    try {
      setSavingProgress(true);

      await learningApi.saveLessonProgress(lessonData.lessonId, {
        watchedSeconds: lessonData.durationMinutes
          ? lessonData.durationMinutes * 60
          : 0,
        lastPositionSec: lessonData.durationMinutes
          ? lessonData.durationMinutes * 60
          : 0,
        completed: true,
      });

      markLessonCompletedLocally(lessonData.lessonId);

      if (autoNavigate && lessonData.nextLessonId) {
        navigate(`/learning/${courseId}/${lessonData.nextLessonId}`);
      }
    } catch (error) {
      setErrorText(
        error?.body?.message ||
          error?.message ||
          "Không cập nhật được tiến độ bài học.",
      );
    } finally {
      setSavingProgress(false);
    }
  };

  const handlePrimaryLessonAction = async () => {
    if (!lessonData || savingProgress || !lessonData.completed) return;

    if (lessonData.nextLessonId) {
      navigate(`/learning/${courseId}/${lessonData.nextLessonId}`);
    }
  };

  const getPrimaryButtonLabel = () => {
    if (!lessonData) return "Đang tải...";
    if (savingProgress) return "Đang lưu...";
    if (!lessonData.completed) return "Hoàn thành để mở bài tiếp";
    if (lessonData.completed && lessonData.nextLessonId) return "Bài tiếp theo";
    if (lessonData.completed && !lessonData.nextLessonId) return "Đã hoàn thành";
    return "Bài tiếp theo";
  };

  const handleStartIfMissing = async () => {
    try {
      const res = await learningApi.startLearning(courseId);
      const data = res?.result || null;

      if (data?.firstLessonId) {
        navigate(`/learning/${courseId}/${data.firstLessonId}`, {
          replace: true,
        });
      }
    } catch (error) {
      setErrorText(
        error?.body?.message || error?.message || "Không thể bắt đầu học.",
      );
    }
  };

  const toggleSection = (sectionId) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  if (loading) {
    return <div className={styles.stateBox}>Đang tải trang học tập...</div>;
  }

  if (errorText) {
    return <div className={styles.errorBox}>{errorText}</div>;
  }

  if (!normalizedCourseData?.enrolled) {
    return (
      <div className={styles.stateBox}>
        Bạn chưa đăng ký khóa học này.
        <button
          type="button"
          className={styles.inlineBtn}
          onClick={handleStartIfMissing}
        >
          Bắt đầu học
        </button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={handleBackNavigation}
          >
            <ArrowLeft size={18} />
          </button>

          <div className={styles.courseTitle}>
            <h1>{normalizedCourseData?.title}</h1>
            <p>{lessonProgressText}</p>
          </div>
        </div>

        <div className={styles.topbarRight}>
          <div className={styles.progressBadge}>
            {Math.round(normalizedCourseData?.progressPercent || 0)}%
          </div>
        </div>
      </header>

      <div className={styles.mainGrid}>
        <div ref={contentAreaRef} className={styles.contentArea}>
          <LearningContent
            loadingLesson={loadingLesson}
            lessonData={lessonData}
            videoRef={videoRef}
            contentAreaRef={contentAreaRef}
            saveLessonProgress={learningApi.saveLessonProgress}
            learningApi={learningApi}
            onLessonCompleted={completeCurrentLesson}
            onBookmarkChanged={(nextBookmarked) => {
              setLessonData((prev) =>
                prev ? { ...prev, bookmarked: nextBookmarked } : prev,
              );
              setCourseData((prev) => {
                if (!prev?.sections) return prev;

                return {
                  ...prev,
                  sections: prev.sections.map((section) => ({
                    ...section,
                    lessons: (section.lessons || []).map((lesson) =>
                      lesson.id === currentLessonId
                        ? { ...lesson, bookmarked: nextBookmarked }
                        : lesson,
                    ),
                  })),
                };
              });
            }}
            onLearningStateChange={async ({ autoNavigate = false } = {}) => {
              if (lessonData?.lessonId) {
                markLessonCompletedLocally(lessonData.lessonId);
              }
              if (autoNavigate && lessonData?.nextLessonId) {
                navigate(`/learning/${courseId}/${lessonData.nextLessonId}`);
              }
            }}
          />
        </div>

        <LearningSidebar
          courseData={normalizedCourseData}
          openSections={openSections}
          toggleSection={toggleSection}
          currentLessonId={currentLessonId}
          handleOpenLesson={handleOpenLesson}
        />
      </div>

      <footer className={styles.footerNav}>
        <button
          type="button"
          className={styles.footerBtn}
          onClick={handlePrevLesson}
          disabled={currentLessonIndex <= 0}
        >
          Bài trước
        </button>

        <button
          type="button"
          className={styles.footerBtnPrimary}
          onClick={handlePrimaryLessonAction}
          disabled={
            !lessonData ||
            savingProgress ||
            !lessonData.completed ||
            !lessonData.nextLessonId
          }
        >
          {getPrimaryButtonLabel()}
        </button>
      </footer>
    </div>
  );
}
