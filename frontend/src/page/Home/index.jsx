import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  GraduationCap,
  MessageSquareText,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import {
  getMyEnrollments,
  getMyProgressDashboard,
  markEnrollmentAccess,
} from "../../api/enrollmentApi";
import styles from "./Home.module.scss";

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

function formatNumber(value) {
  return Number(value || 0).toLocaleString("vi-VN");
}

function formatPercent(value) {
  return `${Math.round(Number(value) || 0)}%`;
}

function formatDuration(seconds) {
  const total = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  if (hours <= 0) return `${minutes} phút`;
  if (minutes <= 0) return `${hours} giờ`;
  return `${hours} giờ ${minutes} phút`;
}

function formatDateTime(value) {
  if (!value) return "Chưa truy cập";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa truy cập";

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const Home = () => {
  const navigate = useNavigate();

  const [enrollments, setEnrollments] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [keyword, setKeyword] = useState("");
  const [openingCourseId, setOpeningCourseId] = useState("");

  const fetchOverview = async () => {
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
          "Không tải được dữ liệu tổng quan cá nhân.",
      );
      setEnrollments([]);
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const summary = dashboard?.summary || {};

  const averageProgress =
    enrollments.length === 0
      ? Number(summary.averageProgressPercent) || 0
      : enrollments.reduce(
          (total, item) => total + Math.max(0, Math.min(100, item.progressPercent)),
          0,
        ) / enrollments.length;

  const filteredEnrollments = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return enrollments.filter((item) => {
      if (!normalizedKeyword) return true;
      return item.courseTitle.toLowerCase().includes(normalizedKeyword);
    });
  }, [enrollments, keyword]);

  const recommendedCourse = useMemo(() => {
    return [...enrollments]
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
  }, [enrollments]);

  const openCourse = async (courseId) => {
    try {
      setOpeningCourseId(courseId);
      await markEnrollmentAccess(courseId);
      navigate(`/learning/${courseId}`);
    } catch {
      navigate(`/courses/${courseId}`);
    } finally {
      setOpeningCourseId("");
    }
  };

  const quickLinks = [
    {
      icon: GraduationCap,
      title: "Khóa học của tôi",
      description: "Xem các khóa học bạn đã đăng ký.",
      path: "/my-courses",
    },
    {
      icon: ClipboardCheck,
      title: "Quiz",
      description: "Làm bài kiểm tra và luyện tập.",
      path: "/quizzes",
    },
    {
      icon: BarChart3,
      title: "Tiến độ học",
      description: "Xem chi tiết tiến độ và cảnh báo học tập.",
      path: "/progress",
    },
    {
      icon: MessageSquareText,
      title: "Thảo luận",
      description: "Trao đổi câu hỏi trong cộng đồng học tập.",
      path: "/discussions",
    },
  ];

  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Tổng quan cá nhân</span>
          <h1 className={styles.heading}>Không gian học tập của bạn</h1>
          <p className={styles.subheading}>
            Theo dõi nhanh các khóa đã đăng ký, tiến độ học, thời gian học và
            kết quả kiểm tra của riêng tài khoản hiện tại.
          </p>
        </div>

        <button className={styles.refreshBtn} type="button" onClick={fetchOverview}>
          <RefreshCw size={17} />
          Làm mới
        </button>
      </section>

      {errorText ? <div className={styles.errorBox}>{errorText}</div> : null}

      <section className={styles.statsGrid}>
        <article className={styles.statCard}>
          <GraduationCap size={20} />
          <span>Khóa đang học</span>
          <strong>{formatNumber(summary.activeCourses)}</strong>
        </article>
        <article className={styles.statCard}>
          <CheckCircle2 size={20} />
          <span>Bài đã hoàn thành</span>
          <strong>{formatNumber(summary.totalCompletedLessons)}</strong>
        </article>
        <article className={styles.statCard}>
          <Clock3 size={20} />
          <span>Thời gian học</span>
          <strong>{formatDuration(summary.totalLearningSeconds)}</strong>
        </article>
        <article className={styles.statCard}>
          <ClipboardCheck size={20} />
          <span>Lượt làm quiz</span>
          <strong>{formatNumber(summary.totalIndependentQuizAttempts)}</strong>
        </article>
      </section>

      <section className={styles.overviewGrid}>
        <article className={styles.panel}>
          <div className={styles.sectionHead}>
            <div>
              <h2>Tiến độ của tôi</h2>
              <p>Các số liệu được tính từ khóa học bạn đã đăng ký.</p>
            </div>
            <BarChart3 size={20} />
          </div>

          <div className={styles.metricList}>
            <div>
              <span>Tổng khóa đã đăng ký</span>
              <strong>{formatNumber(enrollments.length)}</strong>
            </div>
            <div>
              <span>Đã hoàn thành khóa</span>
              <strong>{formatNumber(summary.completedCourses)}</strong>
            </div>
            <div>
              <span>Tiến độ trung bình</span>
              <strong>{formatPercent(averageProgress)}</strong>
            </div>
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.sectionHead}>
            <div>
              <h2>Truy cập nhanh</h2>
              <p>Các khu vực hay dùng trong quá trình học.</p>
            </div>
            <Sparkles size={20} />
          </div>

          <div className={styles.quickGrid}>
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  type="button"
                  className={styles.quickLink}
                  key={item.path}
                  onClick={() => navigate(item.path)}
                >
                  <Icon size={18} />
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </article>
      </section>

      {recommendedCourse ? (
        <section className={styles.continuePanel}>
          <div>
            <span className={styles.eyebrowLight}>Nên học tiếp</span>
            <h2>{recommendedCourse.courseTitle}</h2>
            <p>
              Gợi ý dựa trên tiến độ hiện tại và lần truy cập gần nhất của bạn.
            </p>
          </div>
          <div className={styles.continueActions}>
            <strong>{formatPercent(recommendedCourse.progressPercent)}</strong>
            <button
              type="button"
              onClick={() => openCourse(recommendedCourse.courseId)}
              disabled={openingCourseId === recommendedCourse.courseId}
            >
              {openingCourseId === recommendedCourse.courseId
                ? "Đang mở..."
                : "Học tiếp"}
            </button>
          </div>
        </section>
      ) : null}

      <section className={styles.courseSection}>
        <div className={styles.sectionHead}>
          <div>
            <span className={styles.eyebrowLight}>Khóa học của tôi</span>
            <h2>Các khóa đã đăng ký</h2>
            <p>Chỉ hiển thị các khóa thuộc tài khoản đang đăng nhập.</p>
          </div>

          <label className={styles.searchBox}>
            <Search size={17} />
            <input
              type="text"
              placeholder="Tìm khóa học..."
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </label>
        </div>

        {loading ? (
          <div className={styles.emptyBox}>Đang tải tổng quan cá nhân...</div>
        ) : filteredEnrollments.length === 0 ? (
          <div className={styles.emptyBox}>
            Bạn chưa có khóa học nào phù hợp để hiển thị.
          </div>
        ) : (
          <div className={styles.myCourseList}>
            {filteredEnrollments.map((item) => (
              <article key={item.id || item.courseId} className={styles.myCourseItem}>
                <div>
                  <strong>{item.courseTitle}</strong>
                  <span>
                    {item.status === "COMPLETED" ? "Đã hoàn thành" : "Đang học"} -{" "}
                    truy cập gần nhất: {formatDateTime(item.lastAccessedAt)}
                  </span>
                </div>
                <div className={styles.courseProgress}>
                  <strong>{formatPercent(item.progressPercent)}</strong>
                  <button
                    type="button"
                    onClick={() => openCourse(item.courseId)}
                    disabled={openingCourseId === item.courseId}
                  >
                    {openingCourseId === item.courseId ? "Đang mở..." : "Vào học"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
