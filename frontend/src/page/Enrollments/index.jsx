import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Search,
  RefreshCw,
  Filter,
  BookOpen,
  CircleCheck,
  Ban,
  ArrowRight,
  User,
  CalendarDays,
} from "lucide-react";
import {
  getAllEnrollments,
  markEnrollmentAccess,
} from "../../api/enrollmentApi";
import styles from "./Enrollments.module.scss";

const STATUS_OPTIONS = {
  ALL: "ALL",
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
};

function formatDateTime(value) {
  if (!value) return "Chưa cập nhật";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";

  return date.toLocaleString("vi-VN");
}

function normalizeEnrollment(rawEnrollment) {
  return {
    id: rawEnrollment?.id || "",
    userId: rawEnrollment?.userId || "",
    username: rawEnrollment?.username || "Không xác định",
    courseId: rawEnrollment?.courseId || "",
    courseTitle: rawEnrollment?.courseTitle || "Khóa học không xác định",
    status: rawEnrollment?.status || "ACTIVE",
    progressPercent: Number(rawEnrollment?.progressPercent) || 0,
    enrolledAt: rawEnrollment?.enrolledAt || null,
    lastAccessedAt: rawEnrollment?.lastAccessedAt || null,
  };
}

function getStatusLabel(status) {
  switch (status) {
    case "COMPLETED":
      return "Hoàn thành";
    case "CANCELLED":
      return "Đã hủy";
    case "ACTIVE":
    default:
      return "Đang học";
  }
}

function getProgressText(progressPercent) {
  const normalized = Math.max(0, Math.min(100, Number(progressPercent) || 0));
  return `${normalized}%`;
}

export default function EnrollmentManagement() {
  const navigate = useNavigate();

  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState(STATUS_OPTIONS.ALL);
  const [errorText, setErrorText] = useState("");
  const [accessingCourseId, setAccessingCourseId] = useState("");

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      setErrorText("");

      const res = await getAllEnrollments();
      const data = Array.isArray(res?.result) ? res.result : [];

      setEnrollments(data.map(normalizeEnrollment));
    } catch (error) {
      setErrorText(
        error?.response?.data?.message ||
          error?.message ||
          "Không tải được danh sách đăng ký học.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const handleViewCourse = async (enrollment) => {
    try {
      setAccessingCourseId(enrollment.courseId);

      const res = await markEnrollmentAccess(enrollment.courseId);
      const updated = res?.result;

      setEnrollments((prev) =>
        prev.map((item) =>
          item.id === enrollment.id
            ? normalizeEnrollment({
                ...item,
                ...updated,
              })
            : item,
        ),
      );

      navigate(`/courses/${enrollment.courseId}`);
    } catch (error) {
      console.error("Mark enrollment access error:", error);
      navigate(`/courses/${enrollment.courseId}`);
    } finally {
      setAccessingCourseId("");
    }
  };

  const filteredEnrollments = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return enrollments.filter((enrollment) => {
      const matchesKeyword =
        !normalizedKeyword ||
        enrollment.courseTitle.toLowerCase().includes(normalizedKeyword) ||
        enrollment.courseId.toLowerCase().includes(normalizedKeyword) ||
        enrollment.username.toLowerCase().includes(normalizedKeyword) ||
        enrollment.userId.toLowerCase().includes(normalizedKeyword);

      const matchesStatus =
        statusFilter === STATUS_OPTIONS.ALL ||
        enrollment.status === statusFilter;

      return matchesKeyword && matchesStatus;
    });
  }, [enrollments, keyword, statusFilter]);

  const totalCount = enrollments.length;
  const activeCount = enrollments.filter(
    (item) => item.status === "ACTIVE",
  ).length;
  const completedCount = enrollments.filter(
    (item) => item.status === "COMPLETED",
  ).length;
  const cancelledCount = enrollments.filter(
    (item) => item.status === "CANCELLED",
  ).length;

  return (
    <div className={styles.page}>
      <div className={styles.headerCard}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <GraduationCap size={24} />
          </div>

          <div>
            <h1>Quản lý đăng ký học</h1>
            <p>
              Theo dõi danh sách người học đã đăng ký khóa học, trạng thái học
              tập và tiến độ hoàn thành.
            </p>
          </div>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Tìm theo người học, khóa học hoặc mã..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        <div className={styles.filterBox}>
          <div className={styles.filterLabel}>
            <Filter size={16} />
            <span>Trạng thái</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value={STATUS_OPTIONS.ALL}>Tất cả</option>
            <option value={STATUS_OPTIONS.ACTIVE}>Đang học</option>
            <option value={STATUS_OPTIONS.COMPLETED}>Hoàn thành</option>
            <option value={STATUS_OPTIONS.CANCELLED}>Đã hủy</option>
          </select>
        </div>

        <button
          type="button"
          className={styles.refreshBtn}
          onClick={fetchEnrollments}
        >
          <RefreshCw size={16} />
          <span>Làm mới</span>
        </button>
      </div>

      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <span>Tổng đăng ký</span>
          <strong>{totalCount}</strong>
        </div>

        <div className={styles.summaryCard}>
          <span>Đang học</span>
          <strong>{activeCount}</strong>
        </div>

        <div className={styles.summaryCard}>
          <span>Hoàn thành</span>
          <strong>{completedCount}</strong>
        </div>

        <div className={styles.summaryCard}>
          <span>Đã hủy</span>
          <strong>{cancelledCount}</strong>
        </div>
      </div>

      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.stateBox}>
            Đang tải danh sách đăng ký học...
          </div>
        ) : errorText ? (
          <div className={styles.errorBox}>{errorText}</div>
        ) : filteredEnrollments.length === 0 ? (
          <div className={styles.stateBox}>Không có dữ liệu phù hợp.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: "70px" }}>STT</th>
                  <th style={{ width: "220px" }}>Người học</th>
                  <th>Khóa học</th>
                  <th style={{ width: "180px" }}>Trạng thái</th>
                  <th style={{ width: "220px" }}>Tiến độ</th>
                  <th style={{ width: "190px" }}>Ngày đăng ký</th>
                  <th style={{ width: "190px" }}>Truy cập gần nhất</th>
                  <th style={{ width: "180px" }}>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {filteredEnrollments.map((enrollment, index) => (
                  <tr key={enrollment.id}>
                    <td>{index + 1}</td>

                    <td>
                      <div className={styles.userCell}>
                        <div className={styles.userNameRow}>
                          <User size={14} />
                          <span className={styles.userName}>
                            {enrollment.username}
                          </span>
                        </div>
                        <span className={styles.userId}>
                          {enrollment.userId || "Không có mã"}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className={styles.courseCell}>
                        <span className={styles.courseTitle}>
                          {enrollment.courseTitle}
                        </span>
                        <span className={styles.courseId}>
                          {enrollment.courseId}
                        </span>
                      </div>
                    </td>

                    <td>
                      {enrollment.status === "COMPLETED" ? (
                        <span className={styles.statusCompleted}>
                          <CircleCheck size={14} />
                          <span>{getStatusLabel(enrollment.status)}</span>
                        </span>
                      ) : enrollment.status === "CANCELLED" ? (
                        <span className={styles.statusCancelled}>
                          <Ban size={14} />
                          <span>{getStatusLabel(enrollment.status)}</span>
                        </span>
                      ) : (
                        <span className={styles.statusActive}>
                          <BookOpen size={14} />
                          <span>{getStatusLabel(enrollment.status)}</span>
                        </span>
                      )}
                    </td>

                    <td>
                      <div className={styles.progressCell}>
                        <div className={styles.progressTrack}>
                          <div
                            className={styles.progressBar}
                            style={{
                              width: `${Math.max(
                                0,
                                Math.min(
                                  100,
                                  Number(enrollment.progressPercent) || 0,
                                ),
                              )}%`,
                            }}
                          />
                        </div>
                        <span className={styles.progressText}>
                          {getProgressText(enrollment.progressPercent)}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className={styles.timeCell}>
                        <CalendarDays size={14} />
                        <span>{formatDateTime(enrollment.enrolledAt)}</span>
                      </div>
                    </td>

                    <td>
                      <div className={styles.timeCell}>
                        <CalendarDays size={14} />
                        <span>{formatDateTime(enrollment.lastAccessedAt)}</span>
                      </div>
                    </td>

                    <td>
                      <div className={styles.actionGroup}>
                        <button
                          type="button"
                          className={styles.primaryActionBtn}
                          onClick={() => handleViewCourse(enrollment)}
                          disabled={accessingCourseId === enrollment.courseId}
                        >
                          <ArrowRight size={16} />
                          <span>
                            {accessingCourseId === enrollment.courseId
                              ? "Đang mở..."
                              : "Xem khóa học"}
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
