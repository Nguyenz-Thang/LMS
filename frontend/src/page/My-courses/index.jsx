import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Search,
  RefreshCw,
  BookOpen,
  CircleCheck,
  Ban,
  Clock3,
  Trophy,
  LayoutGrid,
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

function getProgressLabel(progress, status) {
  if (status === "COMPLETED") return "Bạn đã hoàn thành khóa học này.";
  if (status === "CANCELLED") {
    return "Khóa học đã dừng, bạn vẫn có thể xem lại khi cần.";
  }
  if (progress >= 75) return "Bạn đang ở chặng cuối, tiếp tục để hoàn thành.";
  if (progress >= 30) {
    return "Tiến độ đang ổn định, tiếp tục học để không bị ngắt quãng.";
  }
  return "Bạn vừa bắt đầu, nên duy trì nhịp học đều mỗi ngày.";
}

function getImageSrc(thumbnailUrl) {
  if (!thumbnailUrl) return "";
  if (thumbnailUrl.startsWith("http")) return thumbnailUrl;
  if (thumbnailUrl.startsWith("/")) return `${LMS_BASE_URL}${thumbnailUrl}`;
  return `${LMS_BASE_URL}/${thumbnailUrl}`;
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
      const matchesKeyword =
        !normalizedKeyword ||
        course.courseTitle.toLowerCase().includes(normalizedKeyword);

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
              Theo dõi các khóa học đã đăng ký, xem tiến độ hiện tại và quay lại
              đúng phần học của bạn.
            </p>
          </div>
        </div>

        <div className={styles.headerStats}>
          <div className={styles.headerStatItem}>
            <LayoutGrid size={16} />
            <span>{totalCount} khóa học</span>
          </div>

          <div className={styles.headerStatItem}>
            <Trophy size={16} />
            <span>{completedCount} đã hoàn thành</span>
          </div>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Tìm theo tên khóa học..."
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
          {filteredCourses.map((course) => {
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
                <div
                  className={styles.cardCover}
                  style={
                    thumbnailSrc
                      ? { "--cover-image": `url(${thumbnailSrc})` }
                      : undefined
                  }
                >
                  <div className={styles.cardCoverOverlay} />

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

                    <span className={styles.progressPill}>
                      {Math.max(0, Math.min(100, course.progressPercent))}%
                    </span>
                  </div>

                  <div className={styles.coverBody}>
                    <span className={styles.categoryChip}>
                      {course.categoryName}
                    </span>
                    <h3>{course.courseTitle}</h3>
                    <p>
                      {getProgressLabel(course.progressPercent, course.status)}
                    </p>
                  </div>
                </div>

                <div className={styles.cardBody}>
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
                        Truy cập gần nhất:{" "}
                        {formatDateTime(course.lastAccessedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
