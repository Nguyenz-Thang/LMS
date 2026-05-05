import { Bookmark, CheckCircle2, ChevronDown, ChevronUp, Lock } from "lucide-react";
import styles from "../Learning.module.scss";
import {
  formatClockDuration,
  formatDuration,
  getLessonIcon,
} from "../utils/learningHelpers";

function withEffectiveLocks(sections = []) {
  let canOpenCurrentLesson = true;

  return sections.map((section) => ({
    ...section,
    lessons: (section.lessons || []).map((lesson) => {
      const effectiveLocked =
        Boolean(lesson.locked) || !canOpenCurrentLesson;

      if (!lesson.completed) {
        canOpenCurrentLesson = false;
      }

      return {
        ...lesson,
        effectiveLocked,
      };
    }),
  }));
}

export default function LearningSidebar({
  courseData,
  openSections,
  toggleSection,
  currentLessonId,
  handleOpenLesson,
}) {
  const displaySections = withEffectiveLocks(courseData?.sections || []);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHead}>
        <h3>Noi dung khoa hoc</h3>
        <p>
          {courseData?.totalSections || 0} chuong •{" "}
          {courseData?.totalLessons || 0} bai hoc •{" "}
          {formatDuration(courseData?.totalDurationMinutes || 0)}
        </p>
      </div>

      <div className={styles.sidebarSections}>
        {displaySections.map((section, sectionIndex) => {
          const isOpen = !!openSections[section.id];

          return (
            <div key={section.id} className={styles.sidebarSection}>
              <button
                type="button"
                className={styles.sectionBtn}
                onClick={() => toggleSection(section.id)}
              >
                <div>
                  <strong>
                    {sectionIndex + 1}. {section.title}
                  </strong>
                  <span>
                    {section.totalLessons || 0} bai •{" "}
                    {formatDuration(section.totalDurationMinutes || 0)}
                  </span>
                </div>

                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {isOpen ? (
                <div className={styles.sidebarLessons}>
                  {(section.lessons || []).map((lesson) => {
                    const isActive =
                      lesson.id === currentLessonId && !lesson.effectiveLocked;
                    const lessonItemClasses = [
                      styles.lessonItem,
                      isActive ? styles.lessonItemActive : "",
                      lesson.effectiveLocked ? styles.lessonItemLocked : "",
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        className={lessonItemClasses}
                        onClick={() =>
                          handleOpenLesson({
                            ...lesson,
                            locked: lesson.effectiveLocked,
                          })
                        }
                        disabled={lesson.effectiveLocked}
                      >
                        <div className={styles.lessonItemLeft}>
                          <span className={styles.lessonItemIcon}>
                            {lesson.completed ? (
                              <CheckCircle2 size={14} />
                            ) : (
                              getLessonIcon(lesson.lessonType)
                            )}
                          </span>

                          <div className={styles.lessonItemText}>
                            <strong>{lesson.title}</strong>
                            <span>
                              {lesson.effectiveLocked
                                ? "Hoan thanh bai truoc de mo"
                                : lesson.lessonType}{" "}
                              • {formatClockDuration(lesson.durationMinutes)}
                            </span>
                          </div>
                        </div>

                        {lesson.effectiveLocked ? (
                          <span className={styles.lessonItemLock} aria-hidden="true">
                            <Lock size={14} />
                          </span>
                        ) : lesson.bookmarked ? (
                          <span
                            className={styles.lessonItemBookmark}
                            aria-hidden="true"
                          >
                            <Bookmark size={14} />
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
