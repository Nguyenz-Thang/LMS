import { useEffect, useMemo, useState } from "react";
import {
  ChartColumn,
  BookOpen,
  Users,
  GraduationCap,
  Clock3,
  RefreshCw,
  TriangleAlert,
  Trophy,
} from "lucide-react";
import { useReportApi } from "../../../api/reportApi";
import styles from "./Reports.module.scss";

function formatPercent(value) {
  return `${Number(value || 0).toFixed(0)}%`;
}

function formatHours(value) {
  return `${Number(value || 0).toFixed(1)} giờ`;
}

function formatDateTime(value) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
  return date.toLocaleString("vi-VN");
}

export default function Reports() {
  const { getDashboard } = useReportApi();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setErrorText("");
      const res = await getDashboard();
      setDashboard(res?.result || null);
    } catch (error) {
      setErrorText(
        error?.body?.message ||
          error?.message ||
          "Không tải được dữ liệu báo cáo.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const summaryCards = useMemo(() => {
    const summary = dashboard?.summary || {};
    return [
      {
        key: "courses",
        label: "Khóa học trong phạm vi",
        value: summary.totalCourses || 0,
        icon: BookOpen,
      },
      {
        key: "learners",
        label: "Người học",
        value: summary.totalLearners || 0,
        icon: Users,
      },
      {
        key: "active",
        label: "Đăng ký đang học",
        value: summary.activeEnrollments || 0,
        icon: GraduationCap,
      },
      {
        key: "progress",
        label: "Tiến độ trung bình",
        value: formatPercent(summary.averageProgressPercent),
        icon: ChartColumn,
      },
      {
        key: "hours",
        label: "Tổng giờ học ghi nhận",
        value: formatHours(summary.totalLearningHours),
        icon: Clock3,
      },
      {
        key: "quizAttempts",
        label: "Lượt làm quiz",
        value: summary.totalQuizAttempts || 0,
        icon: Trophy,
      },
    ];
  }, [dashboard]);

  const trendMax = Math.max(
    ...(dashboard?.enrollmentTrend || []).map((item) => Number(item.value) || 0),
    1,
  );

  return (
    <div className={styles.page}>
      <div className={styles.heroCard}>
        <div className={styles.heroCopy}>
          <div className={styles.heroIcon}>
            <ChartColumn size={24} />
          </div>
          <div>
            <h1>Dashboard báo cáo giảng viên / admin</h1>
            <p>
              Theo dõi tăng trưởng ghi danh, chất lượng học tập, khóa học nổi
              bật và cảnh báo học viên có nguy cơ chậm tiến độ.
            </p>
          </div>
        </div>

        <div className={styles.heroActions}>
          <div className={styles.scopeBadge}>
            {dashboard?.scope === "ADMIN"
              ? "Phạm vi toàn hệ thống"
              : "Phạm vi giảng viên"}
          </div>
          <button
            type="button"
            className={styles.refreshBtn}
            onClick={fetchDashboard}
          >
            <RefreshCw size={16} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className={styles.stateBox}>Đang tải báo cáo...</div>
      ) : errorText ? (
        <div className={styles.errorBox}>{errorText}</div>
      ) : !dashboard ? (
        <div className={styles.stateBox}>Chưa có dữ liệu báo cáo.</div>
      ) : (
        <>
          <div className={styles.summaryGrid}>
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.key} className={styles.summaryCard}>
                  <div className={styles.summaryIcon}>
                    <Icon size={18} />
                  </div>
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                </div>
              );
            })}
          </div>

          <div className={styles.panelGrid}>
            <div className={styles.panelCard}>
              <div className={styles.panelHead}>
                <h2>Ghi danh 7 ngày gần đây</h2>
                <span>Xu hướng đăng ký học</span>
              </div>

              <div className={styles.trendChart}>
                {(dashboard.enrollmentTrend || []).map((item) => (
                  <div key={item.key} className={styles.trendItem}>
                    <div className={styles.trendBarWrap}>
                      <div
                        className={styles.trendBar}
                        style={{
                          height: `${Math.max(
                            12,
                            ((Number(item.value) || 0) / trendMax) * 140,
                          )}px`,
                        }}
                      />
                    </div>
                    <strong>{item.value || 0}</strong>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.panelCard}>
              <div className={styles.panelHead}>
                <h2>Cảnh báo tiến độ</h2>
                <span>
                  {(dashboard.alerts || []).length} học viên cần theo dõi
                </span>
              </div>

              <div className={styles.alertList}>
                {(dashboard.alerts || []).length === 0 ? (
                  <div className={styles.emptyBox}>
                    Chưa có cảnh báo đáng chú ý trong phạm vi hiện tại.
                  </div>
                ) : (
                  dashboard.alerts.map((alert, index) => (
                    <div key={`${alert.userId}-${index}`} className={styles.alertItem}>
                      <div
                        className={
                          alert.severity === "HIGH"
                            ? styles.alertSeverityHigh
                            : styles.alertSeverityMedium
                        }
                      >
                        <TriangleAlert size={16} />
                        <span>{alert.severity}</span>
                      </div>
                      <strong>{alert.title}</strong>
                      <p>{alert.description}</p>
                      <span className={styles.alertMeta}>
                        {alert.courseTitle} • {alert.username} •{" "}
                        {formatDateTime(alert.lastAccessedAt)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className={styles.tablePanel}>
            <div className={styles.panelHead}>
              <h2>Top khóa học</h2>
              <span>Ưu tiên theo lượt ghi danh và tiến độ</span>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Khóa học</th>
                    <th>Giảng viên</th>
                    <th>Ghi danh</th>
                    <th>Đang học</th>
                    <th>Hoàn thành</th>
                    <th>Tiến độ TB</th>
                    <th>Điểm quiz TB</th>
                    <th>Giờ học</th>
                  </tr>
                </thead>
                <tbody>
                  {(dashboard.topCourses || []).map((course) => (
                    <tr key={course.courseId}>
                      <td>{course.courseTitle}</td>
                      <td>{course.instructorName || "Chưa có"}</td>
                      <td>{course.enrollmentCount || 0}</td>
                      <td>{course.activeLearnerCount || 0}</td>
                      <td>{course.completedLearnerCount || 0}</td>
                      <td>{formatPercent(course.averageProgressPercent)}</td>
                      <td>{formatPercent(course.averageQuizScorePercent)}</td>
                      <td>{formatHours(course.totalLearningHours)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {dashboard.scope === "ADMIN" ? (
            <div className={styles.tablePanel}>
              <div className={styles.panelHead}>
                <h2>Top giảng viên</h2>
                <span>Theo quy mô lớp học và tiến độ trung bình</span>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Giảng viên</th>
                      <th>Số khóa học</th>
                      <th>Số học viên</th>
                      <th>Tiến độ TB</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboard.topInstructors || []).length === 0 ? (
                      <tr>
                        <td colSpan="4" className={styles.emptyCell}>
                          Chưa có dữ liệu giảng viên.
                        </td>
                      </tr>
                    ) : (
                      dashboard.topInstructors.map((instructor) => (
                        <tr key={instructor.instructorId}>
                          <td>{instructor.instructorName}</td>
                          <td>{instructor.courseCount || 0}</td>
                          <td>{instructor.learnerCount || 0}</td>
                          <td>{formatPercent(instructor.averageProgressPercent)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
