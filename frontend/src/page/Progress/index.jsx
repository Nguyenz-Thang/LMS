import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarRange,
  CheckCircle2,
  Clock3,
  GraduationCap,
} from "lucide-react";
import {
  getMyEnrollments,
  getMyProgressDashboard,
} from "../../api/enrollmentApi";
import styles from "./Progress.module.scss";

const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const MONTH_LABELS = [
  "Thg 1",
  "Thg 2",
  "Thg 3",
  "Thg 4",
  "Thg 5",
  "Thg 6",
  "Thg 7",
  "Thg 8",
  "Thg 9",
  "Thg 10",
  "Thg 11",
  "Thg 12",
];

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

function formatDuration(seconds) {
  const total = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  if (hours <= 0) return `${minutes} phút`;
  if (minutes <= 0) return `${hours} giờ`;
  return `${hours} giờ ${minutes} phút`;
}

function getMonthIndex(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return -1;
  return date.getMonth();
}

function getYear(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return -1;
  return date.getFullYear();
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
  const [enrollments, setEnrollments] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [selectedYear, setSelectedYear] = useState(null);

  useEffect(() => {
    const fetchProgressDashboard = async () => {
      try {
        setLoading(true);
        setErrorText("");

        const [enrollmentRes, dashboardRes] = await Promise.all([
          getMyEnrollments(),
          getMyProgressDashboard(selectedYear ? { year: selectedYear } : {}),
        ]);

        const enrollmentData = Array.isArray(enrollmentRes?.result)
          ? enrollmentRes.result
          : [];
        const dashboardData = dashboardRes?.result || null;

        setEnrollments(enrollmentData.map(normalizeEnrollment));
        setDashboard(dashboardData);
        setSelectedYear((currentYear) =>
          currentYear || dashboardData?.selectedYear || null,
        );
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
  }, [selectedYear]);

  const summary = dashboard?.summary || {};
  const dailyCompletions = Array.isArray(dashboard?.dailyCompletions)
    ? dashboard.dailyCompletions
    : [];
  const weeklyCompletions = Array.isArray(dashboard?.weeklyCompletions)
    ? dashboard.weeklyCompletions
    : [];
  const activityYears = Array.isArray(dashboard?.activityYears)
    ? dashboard.activityYears
    : [];
  const activeHeatmapYear =
    selectedYear || dashboard?.selectedYear || new Date().getFullYear();

  const averageProgress =
    enrollments.length === 0
      ? 0
      : Math.round(
          enrollments.reduce(
            (total, item) => total + clampPercent(item.progressPercent),
            0,
          ) / enrollments.length,
        );

  const maxWeeklyValue = Math.max(
    1,
    ...weeklyCompletions.map((item) => Number(item?.value) || 0),
  );
  const maxDailyValue = Math.max(
    1,
    ...dailyCompletions.map((item) => Number(item?.value) || 0),
  );

  const heatmapWeeks = useMemo(() => {
    const normalizedDays = dailyCompletions.map((item) => ({
      key: item?.key || "",
      label: item?.label || "",
      value: Number(item?.value) || 0,
    }));

    const weeks = [];
    for (let index = 0; index < normalizedDays.length; index += 7) {
      weeks.push(normalizedDays.slice(index, index + 7));
    }

    return weeks;
  }, [dailyCompletions]);

  const heatmapMonthLabels = heatmapWeeks.map((week, index) => {
    const currentMonthDay =
      week.find((day) => getYear(day.key) === activeHeatmapYear) || week[0];
    const previousMonthDay =
      heatmapWeeks[index - 1]?.find(
        (day) => getYear(day.key) === activeHeatmapYear,
      ) || heatmapWeeks[index - 1]?.[0];
    const currentMonth = getMonthIndex(currentMonthDay?.key);
    const previousMonth = getMonthIndex(previousMonthDay?.key);

    if (currentMonth < 0) return "";
    return index === 0 || currentMonth !== previousMonth
      ? MONTH_LABELS[currentMonth]
      : "";
  });

  const totalHeatmapCompletions = dailyCompletions.reduce(
    (total, item) => total + (Number(item?.value) || 0),
    0,
  );

  const getHeatLevel = (value) => {
    if (value <= 0) return 0;
    if (maxDailyValue <= 1) return 2;
    return Math.max(1, Math.ceil((value / maxDailyValue) * 4));
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
            Theo dõi thời lượng học, số bài đã hoàn thành và nhịp học trong các
            tuần gần đây.
          </p>
        </div>
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

          <section className={styles.dashboardGrid}>
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

          <article className={styles.panelCard}>
            <div className={styles.panelHead}>
              <div>
                <h3>Heatmap hoạt động học</h3>
                <p>Hoạt động theo năm, tính theo số bài hoàn thành mỗi ngày.</p>
              </div>
              <div className={styles.panelTools}>
                {activityYears.length > 0 ? (
                  <select
                    value={activeHeatmapYear}
                    onChange={(event) => setSelectedYear(Number(event.target.value))}
                    aria-label="Chọn năm hoạt động học"
                  >
                    {activityYears.map((year) => (
                      <option key={year} value={year}>
                        Năm {year}
                      </option>
                    ))}
                  </select>
                ) : null}
                <BarChart3 size={18} />
              </div>
            </div>

            {dailyCompletions.length === 0 ? (
              <div className={styles.panelEmpty}>Chưa có dữ liệu hoạt động.</div>
            ) : (
              <div className={styles.heatmapWrap}>
                <div className={styles.heatmapStats}>
                  <strong>{totalHeatmapCompletions}</strong>
                  <span>bài hoàn thành trong năm {activeHeatmapYear}</span>
                </div>

                <div
                  className={styles.heatmapBoard}
                  style={{ "--heatmap-week-count": heatmapWeeks.length }}
                >
                  <div className={styles.heatmapMonthSpacer} />

                  {heatmapMonthLabels.map((label, index) => (
                    <span
                      key={`${label}-${index}`}
                      className={styles.heatmapWeekLabel}
                    >
                      {label}
                    </span>
                  ))}

                  <div className={styles.heatmapDayLabels}>
                    {WEEKDAY_LABELS.map((label) => (
                      <span key={label}>{label}</span>
                    ))}
                  </div>

                  <div className={styles.heatmapGrid}>
                    {heatmapWeeks.map((week, weekIndex) => (
                      <div
                        key={`week-${weekIndex}`}
                        className={styles.heatmapWeek}
                      >
                        {week.map((day) => {
                          const level = getHeatLevel(day.value);

                          return (
                            <span
                              key={day.key}
                              className={`${styles.heatmapCell} ${
                                styles[`heatLevel${level}`]
                              }`}
                              title={`${day.label}: ${day.value} bài hoàn thành`}
                              aria-label={`${day.label}: ${day.value} bài hoàn thành`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.heatmapLegend}>
                  <span>Ít</span>
                  {[0, 1, 2, 3, 4].map((level) => (
                    <i
                      key={level}
                      className={`${styles.heatmapCell} ${
                        styles[`heatLevel${level}`]
                      }`}
                    />
                  ))}
                  <span>Nhiều</span>
                </div>
              </div>
            )}
          </article>
        </>
      )}
    </div>
  );
}
