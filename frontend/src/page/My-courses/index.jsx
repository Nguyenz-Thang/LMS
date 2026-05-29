import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  GraduationCap,
  RefreshCw,
  Search,
  Tag,
} from "lucide-react";
import {
  getMyEnrollments,
  markEnrollmentAccess,
} from "../../api/enrollmentApi";
import { LMS_BASE_URL, useCourseApi } from "../../api/courseApi";
import styles from "./MyCourses.module.scss";

const STATUS_OPTIONS = {
  ALL: "ALL",
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
};

function normalizeEnrollment(rawEnrollment, courseDetail = null) {
  return {
    id: rawEnrollment?.id || "",
    courseId: rawEnrollment?.courseId || "",
    courseTitle:
      rawEnrollment?.courseTitle ||
      courseDetail?.title ||
      "Khóa học không xác định",
    thumbnailUrl: courseDetail?.thumbnailUrl || "",
    categoryName: courseDetail?.categoryName || "Khóa học",
    status: rawEnrollment?.status || "ACTIVE",
    progressPercent: Number(rawEnrollment?.progressPercent) || 0,
    enrolledAt: rawEnrollment?.enrolledAt || null,
    lastAccessedAt: rawEnrollment?.lastAccessedAt || null,
  };
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
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

function getDisplayStatus(course) {
  if (course?.status === "CANCELLED") return "CANCELLED";
  if (course?.status === "COMPLETED" || clampPercent(course?.progressPercent) >= 100) {
    return "COMPLETED";
  }
  return "ACTIVE";
}

function getStatusClass(status) {
  switch (status) {
    case "COMPLETED":
      return styles.statusCompleted;
    case "CANCELLED":
      return styles.statusCancelled;
    case "ACTIVE":
    default:
      return styles.statusActive;
  }
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

function getProgressNote(progress, status) {
  if (status === "COMPLETED") return "Bạn đã hoàn thành khóa học này.";
  if (status === "CANCELLED") return "Khóa học đã dừng, vẫn có thể xem lại.";
  if (progress >= 70) return "Sắp hoàn thành, tiếp tục duy trì tiến độ.";
  if (progress >= 30) return "Tiến độ ổn định, nên học đều mỗi tuần.";
  return "Bạn mới bắt đầu, hãy vào học khi có thời gian.";
}

function getImageSrc(thumbnailUrl) {
  if (!thumbnailUrl) return "";
  if (thumbnailUrl.startsWith("http")) return thumbnailUrl;
  if (thumbnailUrl.startsWith("/")) return `${LMS_BASE_URL}${thumbnailUrl}`;
  return `${LMS_BASE_URL}/${thumbnailUrl}`;
}

function StatCard({ icon, label, value, note }) {
  return (
    <article className={styles.statCard}>
      <span className={styles.statIcon}>{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
    </article>
  );
}

export default function MyCoursesPage() {
  const navigate = useNavigate();
  const { getCourseById } = useCourseApi();

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

      const normalized = await Promise.all(
        data.map(async (item) => {
          try {
            const detailRes = await getCourseById(item.courseId);
            return normalizeEnrollment(item, detailRes?.result || null);
          } catch {
            return normalizeEnrollment(item);
          }
        }),
      );

      setEnrollments(normalized);
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
      const displayStatus = getDisplayStatus(course);
      const matchesKeyword =
        !normalizedKeyword ||
        course.courseTitle.toLowerCase().includes(normalizedKeyword);
      const matchesStatus =
        statusFilter === STATUS_OPTIONS.ALL || displayStatus === statusFilter;

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
            ? {
                ...item,
                ...normalizeEnrollment(
                  {
                    ...item,
                    ...updated,
                  },
                  {
                    thumbnailUrl: item.thumbnailUrl,
                    categoryName: item.categoryName,
                    title: item.courseTitle,
                  },
                ),
              }
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
    (item) => getDisplayStatus(item) === "ACTIVE",
  ).length;
  const completedCount = enrollments.filter(
    (item) => getDisplayStatus(item) === "COMPLETED",
  ).length;
  const averageProgress =
    totalCount === 0
      ? 0
      : Math.round(
          enrollments.reduce(
            (total, item) => total + clampPercent(item.progressPercent),
            0,
          ) / totalCount,
        );

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        Khóa học <span>\</span> Khóa học của tôi
      </div>

      <section className={styles.header}>
        <div>
          <h1>Khóa học của tôi</h1>
          <p>
            Theo dõi các khóa học đã đăng ký, tiến độ hiện tại và lần truy cập
            gần nhất.
          </p>
        </div>

        <button
          type="button"
          className={styles.refreshBtn}
          onClick={fetchMyCourses}
          disabled={loading}
        >
          <RefreshCw size={16} />
          <span>Làm mới</span>
        </button>
      </section>

      <section className={styles.statGrid}>
        <StatCard
          icon={<BookOpen size={20} />}
          label="Tổng khóa học"
          value={totalCount}
          note="Tất cả khóa học đã đăng ký"
        />
        <StatCard
          icon={<GraduationCap size={20} />}
          label="Đang học"
          value={activeCount}
          note="Các khóa còn hoạt động"
        />
        <StatCard
          icon={<CheckCircle2 size={20} />}
          label="Hoàn thành"
          value={completedCount}
          note="Khóa đã hoàn tất"
        />
        <StatCard
          icon={<Clock3 size={20} />}
          label="Tiến độ trung bình"
          value={`${averageProgress}%`}
          note="Tính trên các khóa hiện có"
        />
      </section>

      <section className={styles.toolbar}>
        <div>
          <h2>Danh sách khóa học</h2>
          <p>
            Hiển thị {filteredCourses.length} / {totalCount} khóa học.
          </p>
        </div>

        <div className={styles.controls}>
          <label className={styles.searchBox}>
            <Search size={17} />
            <input
              type="text"
              placeholder="Tìm khóa học..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </label>

          <label className={styles.filterBox}>
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
          </label>
        </div>
      </section>

      {loading ? (
        <div className={styles.stateBox}>Đang tải khóa học của bạn...</div>
      ) : errorText ? (
        <div className={styles.errorBox}>{errorText}</div>
      ) : filteredCourses.length === 0 ? (
        <div className={styles.emptyCard}>
          <BookOpen size={28} />
          <h3>Chưa có khóa học phù hợp</h3>
          <p>
            Bạn chưa đăng ký khóa học nào hoặc không có kết quả khớp với bộ lọc
            hiện tại.
          </p>
        </div>
      ) : (
        <div className={styles.courseGrid}>
          {filteredCourses.map((course) => {
            const progress = clampPercent(course.progressPercent);
            const displayStatus = getDisplayStatus(course);
            const thumbnailSrc = getImageSrc(course.thumbnailUrl);

            return (
              <article
                key={course.id}
                className={`${styles.courseCard} ${
                  openingCourseId === course.courseId
                    ? styles.courseCardBusy
                    : ""
                }`}
                onClick={() => handleOpenCourse(course)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleOpenCourse(course);
                  }
                }}
              >
                <div className={styles.thumbnailWrap}>
                  {thumbnailSrc ? (
                    <img
                      src={thumbnailSrc}
                      alt={course.courseTitle}
                      className={styles.thumbnail}
                    />
                  ) : (
                    <div className={styles.thumbnailFallback}>
                      <BookOpen size={28} />
                    </div>
                  )}
                </div>

                <div className={styles.cardHeader}>
                  <div>
                    <span className={styles.courseType}>
                      {course.categoryName}
                    </span>
                    <h3>{course.courseTitle}</h3>
                  </div>

                  <span
                    className={`${styles.statusBadge} ${getStatusClass(
                      displayStatus,
                    )}`}
                  >
                    {getStatusLabel(displayStatus)}
                  </span>
                </div>

                <div className={styles.metaList}>
                  <div className={styles.metaItem}>
                    <Tag size={15} />
                    <span>{course.categoryName}</span>
                  </div>
                  <div className={styles.metaItem}>
                    <CalendarCheck size={15} />
                    <span>Đăng ký: {formatDateTime(course.enrolledAt)}</span>
                  </div>
                  <div className={styles.metaItem}>
                    <Clock3 size={15} />
                    <span>
                      Truy cập gần nhất: {formatDateTime(course.lastAccessedAt)}
                    </span>
                  </div>
                </div>

                <div className={styles.progressBlock}>
                  <div className={styles.progressHeader}>
                    <span>Tiến độ học tập</span>
                    <strong>{progress}%</strong>
                  </div>
                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressBar}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p>{getProgressNote(progress, displayStatus)}</p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
