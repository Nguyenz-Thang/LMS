import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Search,
  RefreshCw,
  BookOpen,
  CircleCheck,
  Ban,
  ArrowRight,
  Clock3,
} from "lucide-react";
import {
  getMyEnrollments,
  markEnrollmentAccess,
} from "../../api/enrollmentApi";
import styles from "./MyCourses.module.scss";

const STATUS_OPTIONS = {
  ALL: "ALL",
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
};

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

function formatDateTime(value) {
  if (!value) return "Chưa cập nhật";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";

  return date.toLocaleString("vi-VN");
}

export default function MyCoursesPage() {
  const navigate = useNavigate();

  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState(STATUS_OPTIONS.ALL);
  const [errorText, setErrorText] = useState("");
  const [openingCourseId, setOpeningCourseId] = useState("");

  const fetchMyCourses = async () => {
    try {
      setLoading(true);
      setErrorText("");

      const res = await getMyEnrollments();
      const data = Array.isArray(res?.result) ? res.result : [];

      setEnrollments(data.map(normalizeEnrollment));
    } catch (error) {
      setErrorText(
        error?.response?.data?.message ||
          error?.message ||
          "Không tải được danh sách khóa học của tôi.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyCourses();
  }, []);

  const filteredCourses = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return enrollments.filter((course) => {
      const matchesKeyword =
        !normalizedKeyword ||
        course.courseTitle.toLowerCase().includes(normalizedKeyword) ||
        course.courseId.toLowerCase().includes(normalizedKeyword);

      const matchesStatus =
        statusFilter === STATUS_OPTIONS.ALL || course.status === statusFilter;

      return matchesKeyword && matchesStatus;
    });
  }, [enrollments, keyword, statusFilter]);

  const handleOpenCourse = async (course) => {
    try {
      setOpeningCourseId(course.courseId);

      const res = await markEnrollmentAccess(course.courseId);
      const updated = res?.result;

      setEnrollments((prev) =>
        prev.map((item) =>
          item.id === course.id
            ? normalizeEnrollment({
                ...item,
                ...updated,
              })
            : item,
        ),
      );
    } catch (error) {
      console.error("Mark enrollment access error:", error);
    } finally {
      setOpeningCourseId("");
      navigate(`/courses/${course.courseId}`);
    }
  };

  const totalCount = enrollments.length;
  const activeCount = enrollments.filter(
    (item) => item.status === "ACTIVE",
  ).length;
  const completedCount = enrollments.filter(
    (item) => item.status === "COMPLETED",
  ).length;

  return (
    <div className={styles.page}>
      <div className={styles.headerCard}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <GraduationCap size={24} />
          </div>

          <div>
            <h1>Khóa học của tôi</h1>
            <p>
              Theo dõi các khóa học đã đăng ký, tiến độ học tập và tiếp tục học
              nhanh chóng.
            </p>
          </div>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Tìm theo tên khóa học hoặc mã khóa học..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        <div className={styles.filterBox}>
          <span>Trạng thái</span>
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
          onClick={fetchMyCourses}
        >
          <RefreshCw size={16} />
          <span>Làm mới</span>
        </button>
      </div>

      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <span>Tổng khóa học</span>
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
          <span>Kết quả hiển thị</span>
          <strong>{filteredCourses.length}</strong>
        </div>
      </div>

      {loading ? (
        <div className={styles.stateBox}>Đang tải khóa học của bạn...</div>
      ) : errorText ? (
        <div className={styles.errorBox}>{errorText}</div>
      ) : filteredCourses.length === 0 ? (
        <div className={styles.emptyCard}>
          <div className={styles.emptyIcon}>
            <BookOpen size={28} />
          </div>
          <h3>Chưa có khóa học phù hợp</h3>
          <p>
            Bạn chưa đăng ký khóa học nào hoặc không có kết quả khớp với bộ lọc
            hiện tại.
          </p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredCourses.map((course) => (
            <div key={course.id} className={styles.courseCard}>
              <div className={styles.cardTop}>
                <div className={styles.cardBadgeWrap}>
                  {course.status === "COMPLETED" ? (
                    <span className={styles.statusCompleted}>
                      <CircleCheck size={14} />
                      <span>{getStatusLabel(course.status)}</span>
                    </span>
                  ) : course.status === "CANCELLED" ? (
                    <span className={styles.statusCancelled}>
                      <Ban size={14} />
                      <span>{getStatusLabel(course.status)}</span>
                    </span>
                  ) : (
                    <span className={styles.statusActive}>
                      <BookOpen size={14} />
                      <span>{getStatusLabel(course.status)}</span>
                    </span>
                  )}
                </div>

                <span className={styles.courseId}>{course.courseId}</span>
              </div>

              <div className={styles.cardBody}>
                <h3>{course.courseTitle}</h3>

                <div className={styles.progressBlock}>
                  <div className={styles.progressLabelRow}>
                    <span>Tiến độ học tập</span>
                    <strong>
                      {Math.max(0, Math.min(100, course.progressPercent))}%
                    </strong>
                  </div>

                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressBar}
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(100, course.progressPercent),
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className={styles.metaList}>
                  <div className={styles.metaItem}>
                    <Clock3 size={15} />
                    <span>Đăng ký: {formatDateTime(course.enrolledAt)}</span>
                  </div>

                  <div className={styles.metaItem}>
                    <Clock3 size={15} />
                    <span>
                      Truy cập gần nhất: {formatDateTime(course.lastAccessedAt)}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.cardActions}>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={() => handleOpenCourse(course)}
                  disabled={openingCourseId === course.courseId}
                >
                  <ArrowRight size={16} />
                  <span>
                    {openingCourseId === course.courseId
                      ? "Đang mở..."
                      : "Tiếp tục học"}
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
