import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Ban,
  BookOpen,
  CalendarDays,
  Check,
  Eye,
  GraduationCap,
  RotateCcw,
  Search,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import {
  getAllEnrollments,
  markEnrollmentAccess,
} from "../../api/enrollmentApi";
import { LMS_BASE_URL } from "../../api/courseApi";
import styles from "./Enrollments.module.scss";

const STATUS_OPTIONS = [
  { value: "ALL", label: "Tất cả trạng thái" },
  { value: "ACTIVE", label: "Đang học" },
  { value: "COMPLETED", label: "Hoàn thành" },
  { value: "CANCELLED", label: "Đã hủy" },
];

const FALLBACK_THUMB =
  "https://images.unsplash.com/photo-1513258496099-48168024aec0?q=80&w=1200&auto=format&fit=crop";

function formatDateTime(value) {
  if (!value) return "Chưa cập nhật";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";

  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function normalizeEnrollment(rawEnrollment) {
  return {
    id: rawEnrollment?.id || "",
    userId: rawEnrollment?.userId || "",
    username: rawEnrollment?.username || "Không xác định",
    fullName: rawEnrollment?.fullName || "",
    email: rawEnrollment?.email || "",
    avatar: rawEnrollment?.avatar || "",
    courseId: rawEnrollment?.courseId || "",
    courseTitle: rawEnrollment?.courseTitle || "Khóa học không xác định",
    courseThumbnailUrl: rawEnrollment?.courseThumbnailUrl || "",
    status: rawEnrollment?.status || "ACTIVE",
    progressPercent: Number(rawEnrollment?.progressPercent) || 0,
    enrolledAt: rawEnrollment?.enrolledAt || null,
    lastAccessedAt: rawEnrollment?.lastAccessedAt || null,
  };
}

function getStatusMeta(status) {
  if (status === "COMPLETED") {
    return {
      label: "Hoàn thành",
      className: "statusCompleted",
      icon: Check,
    };
  }

  if (status === "CANCELLED") {
    return {
      label: "Đã hủy",
      className: "statusCancelled",
      icon: Ban,
    };
  }

  return {
    label: "Đang học",
    className: "statusActive",
    icon: BookOpen,
  };
}

function getProgressValue(progressPercent) {
  return Math.max(0, Math.min(100, Number(progressPercent) || 0));
}

function getImageSrc(thumbnailUrl) {
  if (!thumbnailUrl) return FALLBACK_THUMB;
  if (thumbnailUrl.startsWith("http")) return thumbnailUrl;
  if (thumbnailUrl.startsWith("/")) return `${LMS_BASE_URL}${thumbnailUrl}`;
  return `${LMS_BASE_URL}/${thumbnailUrl}`;
}

function buildImageUrl(value) {
  if (!value) return "";
  if (value.startsWith("http")) return value;
  if (value.startsWith("/")) return `${LMS_BASE_URL}${value}`;
  return `${LMS_BASE_URL}/${value}`;
}

export default function EnrollmentManagement() {
  const navigate = useNavigate();

  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
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
      setEnrollments([]);
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
    if (!enrollment.courseId) return;

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
      const searchableText = [
        enrollment.courseTitle,
        enrollment.courseId,
        enrollment.username,
        enrollment.fullName,
        enrollment.email,
        enrollment.userId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesKeyword =
        !normalizedKeyword || searchableText.includes(normalizedKeyword);

      const matchesStatus =
        statusFilter === "ALL" || enrollment.status === statusFilter;

      return matchesKeyword && matchesStatus;
    });
  }, [enrollments, keyword, statusFilter]);

  const resetFilters = () => {
    setKeyword("");
    setStatusFilter("ALL");
  };

  return (
    <div className={styles.page}>
      <div className={styles.headerBar}>
        <div>
          <div className={styles.breadcrumb}>Quản trị \ Đăng ký học</div>
          <h1>Quản lí đăng ký học</h1>
          <p>Theo dõi học viên đã đăng ký khóa học và tiến độ học tập.</p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Tìm học viên, email, khóa học hoặc mã..."
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>

        <div className={styles.filterBox}>
          <SlidersHorizontal size={16} />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Lọc trạng thái đăng ký học"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className={styles.resetBtn}
          onClick={resetFilters}
          title="Đặt lại bộ lọc"
          aria-label="Đặt lại bộ lọc"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {errorText ? <div className={styles.errorBox}>{errorText}</div> : null}

      <div className={styles.listHeader}>
        <div>
          <h2>Danh sách đăng ký</h2>
          <p>
            Hiển thị {filteredEnrollments.length} / {enrollments.length} đăng ký.
          </p>
        </div>
      </div>

      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.stateBox}>
            Đang tải danh sách đăng ký học...
          </div>
        ) : filteredEnrollments.length === 0 ? (
          <div className={styles.stateBox}>
            Không có đăng ký học phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.enrollmentTable}>
              <thead>
                <tr>
                  <th>Học viên</th>
                  <th>Khóa học</th>
                  <th>Trạng thái</th>
                  <th>Tiến độ</th>
                  <th>Ngày đăng ký</th>
                  <th>Truy cập gần nhất</th>
                  <th>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {filteredEnrollments.map((enrollment) => {
                  const statusMeta = getStatusMeta(enrollment.status);
                  const StatusIcon = statusMeta.icon;
                  const progress = getProgressValue(enrollment.progressPercent);

                  return (
                    <tr key={enrollment.id}>
                      <td>
                        <div className={styles.userCell}>
                          <span className={styles.userIcon}>
                            {enrollment.avatar ? (
                              <img
                                src={buildImageUrl(enrollment.avatar)}
                                alt={enrollment.fullName || enrollment.username}
                              />
                            ) : (
                              <UserRound size={17} />
                            )}
                          </span>
                          <div>
                            <strong>
                              {enrollment.fullName || enrollment.username}
                            </strong>
                            <span>{enrollment.email || enrollment.username}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className={styles.courseCell}>
                          <img
                            src={getImageSrc(enrollment.courseThumbnailUrl)}
                            alt={enrollment.courseTitle}
                            className={styles.thumb}
                          />
                          <div>
                            <strong>{enrollment.courseTitle}</strong>
                            <span>{enrollment.courseId || "Chưa có mã"}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            styles[statusMeta.className]
                          }`}
                        >
                          <StatusIcon size={15} />
                          {statusMeta.label}
                        </span>
                      </td>

                      <td>
                        <div className={styles.progressCell}>
                          <div className={styles.progressTrack}>
                            <div
                              className={styles.progressBar}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span>{progress}%</span>
                        </div>
                      </td>

                      <td>
                        <span className={styles.timeCell}>
                          <CalendarDays size={14} />
                          {formatDateTime(enrollment.enrolledAt)}
                        </span>
                      </td>

                      <td>
                        <span className={styles.timeCell}>
                          <CalendarDays size={14} />
                          {formatDateTime(enrollment.lastAccessedAt)}
                        </span>
                      </td>

                      <td>
                        <div className={styles.actionGroup}>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            onClick={() => handleViewCourse(enrollment)}
                            disabled={accessingCourseId === enrollment.courseId}
                            title="Xem khóa học"
                            aria-label="Xem khóa học"
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
