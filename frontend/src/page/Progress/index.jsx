import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CalendarRange,
  CircleCheckBig,
  Clock3,
  GraduationCap,
  PauseCircle,
  Search,
  Trophy,
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
    courseTitle: rawEnrollment?.courseTitle || "KhÃ³a há»c khÃ´ng xÃ¡c Ä‘á»‹nh",
    status: rawEnrollment?.status || "ACTIVE",
    progressPercent: Number(rawEnrollment?.progressPercent) || 0,
    enrolledAt: rawEnrollment?.enrolledAt || null,
    lastAccessedAt: rawEnrollment?.lastAccessedAt || null,
  };
}

function formatDateTime(value) {
  if (!value) return "ChÆ°a cáº­p nháº­t";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "ChÆ°a cáº­p nháº­t";
  return date.toLocaleString("vi-VN");
}

function formatDuration(seconds) {
  const total = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  if (hours <= 0) return `${minutes} phÃºt`;
  if (minutes <= 0) return `${hours} giá»`;
  return `${hours} giá» ${minutes} phÃºt`;
}

function getRiskLabel(level) {
  return level === "HIGH" ? "Cáº§n chÃº Ã½ nhiá»u" : "Cáº§n theo dÃµi";
}

function getRiskClass(level) {
  return level === "HIGH" ? styles.riskHigh : styles.riskMedium;
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
            "KhÃ´ng táº£i Ä‘Æ°á»£c dá»¯ liá»‡u tiáº¿n Ä‘á»™ há»c.",
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
            (total, item) => total + Math.max(0, Math.min(100, item.progressPercent)),
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
      // Váº«n má»Ÿ khÃ³a há»c náº¿u viá»‡c ghi nháº­n láº§n truy cáº­p bá»‹ lá»—i.
    } finally {
      setOpeningCourseId("");
      navigate(`/courses/${item.courseId}`);
    }
  };

  return (
    <div className={styles.page}>
      <section className={styles.headerBlock}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <BarChart3 size={24} />
          </div>
          <div>
            <h1>Tiáº¿n Ä‘á»™ há»c táº­p</h1>
            <p>
              Theo dÃµi thá»i lÆ°á»£ng há»c, bÃ i Ä‘Ã£ hoÃ n thÃ nh, káº¿t quáº£ bÃ i kiá»ƒm tra
              vÃ  cÃ¡c khÃ³a há»c cáº§n quay láº¡i Ä‘Ãºng lÃºc.
            </p>
          </div>
        </div>

        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="text"
            placeholder="TÃ¬m theo tÃªn khÃ³a há»c..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
      </section>

      {loading ? (
        <div className={styles.stateBox}>Äang táº£i tiáº¿n Ä‘á»™ há»c táº­p...</div>
      ) : errorText ? (
        <div className={styles.errorBox}>{errorText}</div>
      ) : (
        <>
          <section className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statIcon}>
                <Clock3 size={18} />
              </span>
              <div>
                <p>Thá»i gian há»c Ä‘Ã£ ghi nháº­n</p>
                <strong>{formatDuration(summary.totalLearningSeconds)}</strong>
              </div>
            </div>

            <div className={styles.statCard}>
              <span className={styles.statIcon}>
                <CircleCheckBig size={18} />
              </span>
              <div>
                <p>BÃ i Ä‘Ã£ hoÃ n thÃ nh</p>
                <strong>{summary.totalCompletedLessons || 0}</strong>
              </div>
            </div>

            <div className={styles.statCard}>
              <span className={styles.statIcon}>
                <GraduationCap size={18} />
              </span>
              <div>
                <p>KhÃ³a há»c Ä‘ang há»c</p>
                <strong>{summary.activeCourses || 0}</strong>
              </div>
            </div>

            <div className={styles.statCard}>
              <span className={styles.statIcon}>
                <Trophy size={18} />
              </span>
              <div>
                <p>Tiáº¿n Ä‘á»™ trung bÃ¬nh</p>
                <strong>{averageProgress}%</strong>
              </div>
            </div>
          </section>

          {recommendedCourse ? (
            <section
              className={`${styles.spotlight} ${
                openingCourseId === recommendedCourse.courseId
                  ? styles.spotlightBusy
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
              <div className={styles.spotlightBadge}>
                <ArrowRight size={16} />
                <span>NÃªn há»c tiáº¿p</span>
              </div>

              <div className={styles.spotlightBody}>
                <div>
                  <h2>{recommendedCourse.courseTitle}</h2>
                  <p>
                    KhÃ³a há»c nÃ y Ä‘Æ°á»£c gá»£i Ã½ dá»±a trÃªn tiáº¿n Ä‘á»™ hiá»‡n táº¡i vÃ  láº§n
                    truy cáº­p gáº§n nháº¥t cá»§a báº¡n.
                  </p>
                </div>

                <div className={styles.spotlightMeta}>
                  <strong>
                    {Math.max(0, Math.min(100, recommendedCourse.progressPercent))}
                    %
                  </strong>
                  <span>ÄÃ£ hoÃ n thÃ nh</span>
                </div>
              </div>
            </section>
          ) : null}

          <section className={styles.dashboardGrid}>
            <article className={styles.panelCard}>
              <div className={styles.panelHead}>
                <div>
                  <h3>HoÃ n thÃ nh theo ngÃ y</h3>
                  <p>7 ngÃ y gáº§n nháº¥t</p>
                </div>
                <CalendarRange size={18} />
              </div>

              <div className={styles.chartBars}>
                {dailyCompletions.map((item) => {
                  const value = Number(item?.value) || 0;
                  const height = `${Math.max(10, (value / maxDailyValue) * 100)}%`;

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
            </article>

            <article className={styles.panelCard}>
              <div className={styles.panelHead}>
                <div>
                  <h3>HoÃ n thÃ nh theo tuáº§n</h3>
                  <p>6 tuáº§n gáº§n nháº¥t</p>
                </div>
                <CalendarRange size={18} />
              </div>

              <div className={styles.timelineList}>
                {weeklyCompletions.map((item) => {
                  const value = Number(item?.value) || 0;
                  const width = `${(value / maxWeeklyValue) * 100}%`;

                  return (
                    <div key={item.key} className={styles.timelineRow}>
                      <span>{item.label}</span>
                      <div className={styles.timelineTrack}>
                        <div className={styles.timelineFill} style={{ width }} />
                      </div>
                      <strong>{value}</strong>
                    </div>
                  );
                })}
              </div>
            </article>
          </section>

          <section className={styles.dashboardGrid}>
            <article className={styles.panelCard}>
              <div className={styles.panelHead}>
                <div>
                  <h3>Káº¿t quáº£ bÃ i kiá»ƒm tra</h3>
                  <p>CÃ¡c bÃ i kiá»ƒm tra Ä‘á»™c láº­p Ä‘Ã£ lÃ m</p>
                </div>
                <BrainCircuit size={18} />
              </div>

              {independentQuizzes.length === 0 ? (
                <div className={styles.panelEmpty}>
                  ChÆ°a cÃ³ dá»¯ liá»‡u bÃ i kiá»ƒm tra Ä‘á»™c láº­p.
                </div>
              ) : (
                <div className={styles.quizList}>
                  {independentQuizzes.map((quiz) => (
                    <div key={quiz.quizId} className={styles.quizItem}>
                      <div>
                        <h4>{quiz.title}</h4>
                        <p>{quiz.attemptCount || 0} lÆ°á»£t lÃ m</p>
                      </div>
                      <div className={styles.quizScores}>
                        <span>Tá»‘t nháº¥t {Math.round(quiz.bestScorePercent || 0)}%</span>
                        <span>Gáº§n nháº¥t {Math.round(quiz.lastScorePercent || 0)}%</span>
                        <span>Má»‘c Ä‘áº¡t {Math.round(quiz.passingScorePercent || 0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className={styles.panelCard}>
              <div className={styles.panelHead}>
                <div>
                  <h3>BÃ i há»c Ä‘ang dá»«ng</h3>
                  <p>CÃ¡c bÃ i há»c cÃ²n dang dá»Ÿ gáº§n Ä‘Ã¢y</p>
                </div>
                <PauseCircle size={18} />
              </div>

              {pausedLessons.length === 0 ? (
                <div className={styles.panelEmpty}>
                  ChÆ°a cÃ³ bÃ i há»c nÃ o Ä‘ang dá»«ng giá»¯a chá»«ng.
                </div>
              ) : (
                <div className={styles.pauseList}>
                  {pausedLessons.map((lesson) => (
                    <div key={lesson.lessonId} className={styles.pauseItem}>
                      <div>
                        <h4>{lesson.lessonTitle}</h4>
                        <p>{lesson.courseTitle || "KhÃ´ng rÃµ khÃ³a há»c"}</p>
                      </div>
                      <div className={styles.pauseMeta}>
                        <span>Dá»«ng á»Ÿ {lesson.lastPositionSec || 0}s</span>
                        <span>
                          ÄÃ£ há»c {Math.round(lesson.completionPercent || 0)}%
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
                <h3>KhÃ³a há»c cáº§n chÃº Ã½</h3>
                <p>
                  Cáº£nh bÃ¡o dá»±a trÃªn láº§n truy cáº­p gáº§n nháº¥t, Ä‘á»™ lá»‡ch tiáº¿n Ä‘á»™ vÃ  sá»‘
                  bÃ i Ä‘Ã£ hoÃ n thÃ nh.
                </p>
              </div>
              <AlertTriangle size={18} />
            </div>

            {atRiskCourses.length === 0 ? (
              <div className={styles.panelEmpty}>
                Hiá»‡n táº¡i chÆ°a cÃ³ khÃ³a há»c nÃ o bá»‹ Ä‘Ã¡nh dáº¥u cáº§n chÃº Ã½.
              </div>
            ) : (
              <div className={styles.riskList}>
                {atRiskCourses.map((course) => (
                  <div key={course.courseId} className={styles.riskItem}>
                    <div className={styles.riskTitleRow}>
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

                    <div className={styles.riskMetrics}>
                      <span>Hiá»‡n táº¡i {Math.round(course.progressPercent || 0)}%</span>
                      <span>
                        Ká»³ vá»ng {Math.round(course.expectedProgressPercent || 0)}%
                      </span>
                      <span>
                        {course.completedLessons || 0}/{course.totalLessons || 0} bÃ i
                      </span>
                      <span>Váº¯ng {course.daysSinceLastAccess || 0} ngÃ y</span>
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
