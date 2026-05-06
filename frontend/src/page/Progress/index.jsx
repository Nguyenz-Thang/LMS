import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  CalendarRange,
  CheckCircle2,
  Clock3,
  GraduationCap,
  PauseCircle,
  Search,
} from "lucide-react";
import {
  getMyEnrollments,
  getMyProgressDashboard,
  markEnrollmentAccess,
} from "../../api/enrollmentApi";
import styles from "./Progress.module.scss";

function normalizeEnrollment(rawEnrollment) {
  return {
    id: rawEnrollment?.id || "",
    courseId: rawEnrollment?.courseId || "",
    courseTitle: rawEnrollment?.courseTitle || "Khóa học không xác định",
    status: rawEnrollment?.status || "ACTIVE",
    progressPercent: Number(rawEnrollment?.progressPercent) || 0,
    enrolledAt: rawEnrollment?.enrolledAt || null,
    lastAccessedAt: rawEnrollment?.lastAccessedAt || null,
  };
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function formatDateTime(value) {
  if (!value) return "Chưa cập nhật";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds) {
  const total = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  if (hours <= 0) return `${minutes} phút`;
  if (minutes <= 0) return `${hours} giờ`;
  return `${hours} giờ ${minutes} phút`;
}

function getRiskLabel(level) {
  return level === "HIGH" ? "Cần chú ý nhiều" : "Cần theo dõi";
}

function getRiskClass(level) {
  return level === "HIGH" ? styles.riskHigh : styles.riskMedium;
}

function StatCard({ icon, label, value, note }) {
  return (
    <article className={styles.statCard}>
      <span className={styles.statIcon}>{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        {note ? <small>{note}</small> : null}
      </div>
    </article>
  );
}

export default function ProgressPage() {
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [keyword, setKeyword] = useState("");
  const [openingCourseId, setOpeningCourseId] = useState("");

  useEffect(() => {
    const fetchProgressDashboard = async () => {
      try {
        setLoading(true);
        setErrorText("");

        const [enrollmentRes, dashboardRes] = await Promise.all([
          getMyEnrollments(),
          getMyProgressDashboard(),
        ]);

        const enrollmentData = Array.isArray(enrollmentRes?.result)
          ? enrollmentRes.result
          : [];

        setEnrollments(enrollmentData.map(normalizeEnrollment));
        setDashboard(dashboardRes?.result || null);
      } catch (error) {
        setErrorText(
          error?.response?.data?.message ||
            error?.message ||
            "Không tải được dữ liệu tiến độ học.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProgressDashboard();
  }, []);

  const filteredEnrollments = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return enrollments.filter((item) => {
      if (!normalizedKeyword) return true;
      return item.courseTitle.toLowerCase().includes(normalizedKeyword);
    });
  }, [enrollments, keyword]);

  const recommendedCourse = useMemo(() => {
    return [...filteredEnrollments]
      .filter((item) => item.status === "ACTIVE")
      .sort((a, b) => {
        const aAccess = a.lastAccessedAt
          ? new Date(a.lastAccessedAt).getTime()
          : 0;
        const bAccess = b.lastAccessedAt
          ? new Date(b.lastAccessedAt).getTime()
          : 0;

        if (aAccess !== bAccess) return bAccess - aAccess;
        return b.progressPercent - a.progressPercent;
      })[0];
  }, [filteredEnrollments]);

  const summary = dashboard?.summary || {};
  const dailyCompletions = Array.isArray(dashboard?.dailyCompletions)
    ? dashboard.dailyCompletions
    : [];
  const weeklyCompletions = Array.isArray(dashboard?.weeklyCompletions)
    ? dashboard.weeklyCompletions
    : [];
  const independentQuizzes = Array.isArray(dashboard?.independentQuizzes)
    ? dashboard.independentQuizzes
    : [];
  const pausedLessons = Array.isArray(dashboard?.pausedLessons)
    ? dashboard.pausedLessons
    : [];
  const atRiskCourses = Array.isArray(dashboard?.atRiskCourses)
    ? dashboard.atRiskCourses
    : [];

  const averageProgress =
    enrollments.length === 0
      ? 0
      : Math.round(
          enrollments.reduce(
            (total, item) => total + clampPercent(item.progressPercent),
            0,
          ) / enrollments.length,
        );

  const maxDailyValue = Math.max(
    1,
    ...dailyCompletions.map((item) => Number(item?.value) || 0),
  );
  const maxWeeklyValue = Math.max(
    1,
    ...weeklyCompletions.map((item) => Number(item?.value) || 0),
  );

  const continueLearning = async (item) => {
    try {
      setOpeningCourseId(item.courseId);
      await markEnrollmentAccess(item.courseId);
    } catch {
      // Vẫn mở khóa học nếu việc ghi nhận lần truy cập bị lỗi.
    } finally {
      setOpeningCourseId("");
      navigate(`/courses/${item.courseId}`);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        Khóa học <span>\</span> Tiến độ học
      </div>

      <section className={styles.header}>
        <div>
          <h1>Tiến độ học tập</h1>
          <p>
            Theo dõi thời lượng học, bài đã hoàn thành, kết quả kiểm tra và các
            khóa học cần quay lại.
          </p>
        </div>

        <label className={styles.searchBox}>
          <Search size={17} />
          <input
            type="text"
            placeholder="Tìm khóa học..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </label>
      </section>

      {loading ? (
        <div className={styles.stateBox}>Đang tải tiến độ học tập...</div>
      ) : errorText ? (
        <div className={styles.errorBox}>{errorText}</div>
      ) : (
        <>
          <section className={styles.statGrid}>
            <StatCard
              icon={<Clock3 size={20} />}
              label="Thời gian học"
              value={formatDuration(summary.totalLearningSeconds)}
              note="Thời lượng đã ghi nhận"
            />
            <StatCard
              icon={<CheckCircle2 size={20} />}
              label="Bài đã hoàn thành"
              value={summary.totalCompletedLessons || 0}
              note="Tổng số bài đã học xong"
            />
            <StatCard
              icon={<GraduationCap size={20} />}
              label="Khóa đang học"
              value={summary.activeCourses || 0}
              note="Các khóa còn hoạt động"
            />
            <StatCard
              icon={<BarChart3 size={20} />}
              label="Tiến độ trung bình"
              value={`${averageProgress}%`}
              note="Tính trên các khóa hiện có"
            />
          </section>

          {recommendedCourse ? (
            <section
              className={`${styles.continueCard} ${
                openingCourseId === recommendedCourse.courseId
                  ? styles.continueCardBusy
                  : ""
              }`}
              onClick={() => continueLearning(recommendedCourse)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  continueLearning(recommendedCourse);
                }
              }}
            >
              <div>
                <span className={styles.sectionLabel}>Nên học tiếp</span>
                <h2>{recommendedCourse.courseTitle}</h2>
                <p>
                  Gợi ý dựa trên tiến độ hiện tại và lần truy cập gần nhất của
                  bạn.
                </p>
              </div>

              <div className={styles.continueProgress}>
                <strong>{clampPercent(recommendedCourse.progressPercent)}%</strong>
                <span>Đã hoàn thành</span>
              </div>
            </section>
          ) : null}

          <section className={styles.dashboardGrid}>
            <article className={styles.panelCard}>
              <div className={styles.panelHead}>
                <div>
                  <h3>Hoàn thành theo ngày</h3>
                  <p>7 ngày gần nhất</p>
                </div>
                <CalendarRange size={18} />
              </div>

              {dailyCompletions.length === 0 ? (
                <div className={styles.panelEmpty}>Chưa có dữ liệu.</div>
              ) : (
                <div className={styles.chartBars}>
                  {dailyCompletions.map((item) => {
                    const value = Number(item?.value) || 0;
                    const height = `${Math.max(
                      8,
                      (value / maxDailyValue) * 100,
                    )}%`;

                    return (
                      <div key={item.key} className={styles.chartItem}>
                        <span className={styles.chartValue}>{value}</span>
                        <div className={styles.chartColumn}>
                          <div className={styles.chartBar} style={{ height }} />
                        </div>
                        <span className={styles.chartLabel}>{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </article>

            <article className={styles.panelCard}>
              <div className={styles.panelHead}>
                <div>
                  <h3>Hoàn thành theo tuần</h3>
                  <p>6 tuần gần nhất</p>
                </div>
                <CalendarRange size={18} />
              </div>

              {weeklyCompletions.length === 0 ? (
                <div className={styles.panelEmpty}>Chưa có dữ liệu.</div>
              ) : (
                <div className={styles.timelineList}>
                  {weeklyCompletions.map((item) => {
                    const value = Number(item?.value) || 0;
                    const width = `${(value / maxWeeklyValue) * 100}%`;

                    return (
                      <div key={item.key} className={styles.timelineRow}>
                        <span>{item.label}</span>
                        <div className={styles.timelineTrack}>
                          <div
                            className={styles.timelineFill}
                            style={{ width }}
                          />
                        </div>
                        <strong>{value}</strong>
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
          </section>

          <section className={styles.dashboardGrid}>
            <article className={styles.panelCard}>
              <div className={styles.panelHead}>
                <div>
                  <h3>Kết quả bài kiểm tra</h3>
                  <p>Các bài kiểm tra độc lập đã làm</p>
                </div>
                <BrainCircuit size={18} />
              </div>

              {independentQuizzes.length === 0 ? (
                <div className={styles.panelEmpty}>
                  Chưa có dữ liệu bài kiểm tra độc lập.
                </div>
              ) : (
                <div className={styles.itemList}>
                  {independentQuizzes.map((quiz) => (
                    <div key={quiz.quizId} className={styles.infoItem}>
                      <div>
                        <h4>{quiz.title}</h4>
                        <p>{quiz.attemptCount || 0} lượt làm</p>
                      </div>
                      <div className={styles.badgeList}>
                        <span>Tốt nhất {Math.round(quiz.bestScorePercent || 0)}%</span>
                        <span>Gần nhất {Math.round(quiz.lastScorePercent || 0)}%</span>
                        <span>Mốc đạt {Math.round(quiz.passingScorePercent || 0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className={styles.panelCard}>
              <div className={styles.panelHead}>
                <div>
                  <h3>Bài học đang dừng</h3>
                  <p>Các bài học còn dang dở gần đây</p>
                </div>
                <PauseCircle size={18} />
              </div>

              {pausedLessons.length === 0 ? (
                <div className={styles.panelEmpty}>
                  Chưa có bài học nào đang dừng giữa chừng.
                </div>
              ) : (
                <div className={styles.itemList}>
                  {pausedLessons.map((lesson) => (
                    <div key={lesson.lessonId} className={styles.infoItem}>
                      <div>
                        <h4>{lesson.lessonTitle}</h4>
                        <p>{lesson.courseTitle || "Không rõ khóa học"}</p>
                      </div>
                      <div className={styles.badgeList}>
                        <span>Dừng ở {lesson.lastPositionSec || 0}s</span>
                        <span>
                          Đã học {Math.round(lesson.completionPercent || 0)}%
                        </span>
                        <span>{formatDateTime(lesson.lastAccessedAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>

          <article className={styles.panelCard}>
            <div className={styles.panelHead}>
              <div>
                <h3>Khóa học cần chú ý</h3>
                <p>
                  Cảnh báo dựa trên lần truy cập gần nhất, độ lệch tiến độ và số
                  bài đã hoàn thành.
                </p>
              </div>
              <AlertTriangle size={18} />
            </div>

            {atRiskCourses.length === 0 ? (
              <div className={styles.panelEmpty}>
                Hiện tại chưa có khóa học nào bị đánh dấu cần chú ý.
              </div>
            ) : (
              <div className={styles.itemList}>
                {atRiskCourses.map((course) => (
                  <div key={course.courseId} className={styles.infoItem}>
                    <div className={styles.riskTitle}>
                      <div>
                        <h4>{course.courseTitle}</h4>
                        <p>{course.reason}</p>
                      </div>
                      <span
                        className={`${styles.riskBadge} ${getRiskClass(
                          course.riskLevel,
                        )}`}
                      >
                        {getRiskLabel(course.riskLevel)}
                      </span>
                    </div>

                    <div className={styles.badgeList}>
                      <span>Hiện tại {Math.round(course.progressPercent || 0)}%</span>
                      <span>
                        Kỳ vọng {Math.round(course.expectedProgressPercent || 0)}%
                      </span>
                      <span>
                        {course.completedLessons || 0}/{course.totalLessons || 0} bài
                      </span>
                      <span>Vắng {course.daysSinceLastAccess || 0} ngày</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        </>
      )}
    </div>
  );
}
