import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Search,
  RefreshCw,
  ArrowRight,
  BookOpen,
  Layers3,
  Clock3,
  CircleCheck,
} from "lucide-react";
import { useCourseApi } from "../../api/courseApi";
import { enrollCourse, getMyEnrollments } from "../../api/enrollmentApi";
import styles from "./Courses.module.scss";

function normalizeCourse(rawCourse) {
  return {
    id: rawCourse?.id || "",
    title: rawCourse?.title || "Khóa học không xác định",
    description: rawCourse?.description || "",
    thumbnailUrl: rawCourse?.thumbnailUrl || "",
    instructorName: rawCourse?.instructorName || "Chưa cập nhật",
    categoryName: rawCourse?.categoryName || "Chưa phân loại",
    status: rawCourse?.status || "DRAFT",
    visibility: rawCourse?.visibility || "PUBLIC",
    level: rawCourse?.level || "BEGINNER",
    estimatedHours: Number(rawCourse?.estimatedHours) || 0,
  };
}

function getLevelLabel(level) {
  switch (level) {
    case "ADVANCED":
      return "Nâng cao";
    case "INTERMEDIATE":
      return "Trung cấp";
    case "BEGINNER":
    default:
      return "Cơ bản";
  }
}

export default function Courses() {
  const navigate = useNavigate();
  const { listCourses } = useCourseApi();

  const [courses, setCourses] = useState([]);
  const [myCourseIds, setMyCourseIds] = useState([]);
  const [inputKeyword, setInputKeyword] = useState("");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [enrollingId, setEnrollingId] = useState("");
  const [errorText, setErrorText] = useState("");

  const [page, setPage] = useState(0);
  const [size] = useState(6);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const fetchMyEnrollments = async () => {
    try {
      const res = await getMyEnrollments();
      const items = Array.isArray(res?.result) ? res.result : [];
      setMyCourseIds(items.map((item) => item?.courseId).filter(Boolean));
    } catch (error) {
      console.error("Fetch my enrollments error:", error);
    }
  };

  const fetchCourses = async (nextPage = page, nextKeyword = keyword) => {
    try {
      setLoading(true);
      setErrorText("");

      const res = await listCourses({
        keyword: nextKeyword || "",
        page: nextPage,
        size,
      });

      const pageData = res?.result || {};
      const content = Array.isArray(pageData?.content) ? pageData.content : [];

      const studentVisibleCourses = content
        .map(normalizeCourse)
        .filter(
          (course) =>
            course.status === "PUBLISHED" && course.visibility !== "PRIVATE",
        );

      setCourses(studentVisibleCourses);
      setPage(Number(pageData?.page) || 0);
      setTotalPages(Number(pageData?.totalPages) || 0);
      setTotalElements(Number(pageData?.totalElements) || 0);
    } catch (error) {
      setErrorText(
        error?.body?.message ||
          error?.message ||
          "Không tải được danh sách khóa học.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses(0, "");
    fetchMyEnrollments();
  }, []);

  const publishedCourses = useMemo(
    () => courses.filter((course) => course.status === "PUBLISHED"),
    [courses],
  );

  const enrolledVisibleCount = useMemo(
    () => courses.filter((course) => myCourseIds.includes(course.id)).length,
    [courses, myCourseIds],
  );

  const handleSearch = () => {
    const nextKeyword = inputKeyword.trim();
    setKeyword(nextKeyword);
    fetchCourses(0, nextKeyword);
  };

  const handleRefresh = () => {
    setInputKeyword("");
    setKeyword("");
    fetchCourses(0, "");
    fetchMyEnrollments();
  };

  const handleEnroll = async (course) => {
    try {
      setEnrollingId(course.id);
      await enrollCourse({ courseId: course.id });
      await fetchMyEnrollments();
    } catch (error) {
      alert(
        error?.response?.data?.message ||
          error?.body?.message ||
          error?.message ||
          "Đăng ký khóa học thất bại.",
      );
    } finally {
      setEnrollingId("");
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.headerCard}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <GraduationCap size={24} />
          </div>

          <div>
            <h1>Khóa học</h1>
            <p>
              Xem danh sách khóa học đang mở, tìm kiếm nhanh và đăng ký học trực
              tiếp.
            </p>
          </div>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Tìm theo tên khóa học..."
            value={inputKeyword}
            onChange={(e) => setInputKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
          />
        </div>

        <button
          type="button"
          className={styles.primaryBtn}
          onClick={handleSearch}
        >
          <Search size={16} />
          <span>Tìm kiếm</span>
        </button>

        <button
          type="button"
          className={styles.refreshBtn}
          onClick={handleRefresh}
        >
          <RefreshCw size={16} />
          <span>Làm mới</span>
        </button>
      </div>

      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <span>Tổng khóa học</span>
          <strong>{totalElements}</strong>
        </div>

        <div className={styles.summaryCard}>
          <span>Đang hiển thị</span>
          <strong>{courses.length}</strong>
        </div>

        <div className={styles.summaryCard}>
          <span>Đã publish</span>
          <strong>{publishedCourses.length}</strong>
        </div>

        <div className={styles.summaryCard}>
          <span>Đã đăng ký</span>
          <strong>{enrolledVisibleCount}</strong>
        </div>
      </div>

      {loading ? (
        <div className={styles.stateBox}>Đang tải danh sách khóa học...</div>
      ) : errorText ? (
        <div className={styles.errorBox}>{errorText}</div>
      ) : courses.length === 0 ? (
        <div className={styles.stateBox}>Không có khóa học phù hợp.</div>
      ) : (
        <>
          <div className={styles.grid}>
            {courses.map((course) => {
              const isEnrolled = myCourseIds.includes(course.id);

              return (
                <div key={course.id} className={styles.courseCard}>
                  <div className={styles.thumbnailWrap}>
                    {course.thumbnailUrl ? (
                      <img
                        src={course.thumbnailUrl}
                        alt={course.title}
                        className={styles.thumbnail}
                      />
                    ) : (
                      <div className={styles.thumbnailPlaceholder}>
                        <BookOpen size={28} />
                      </div>
                    )}
                  </div>

                  <div className={styles.cardBody}>
                    <div className={styles.badgeRow}>
                      <span className={styles.statusBadge}>
                        {course.status}
                      </span>
                      <span className={styles.levelBadge}>
                        {getLevelLabel(course.level)}
                      </span>
                    </div>

                    <h3>{course.title}</h3>

                    <p className={styles.description}>
                      {course.description || "Chưa có mô tả khóa học."}
                    </p>

                    <div className={styles.metaList}>
                      <div className={styles.metaItem}>
                        <Layers3 size={15} />
                        <span>{course.categoryName}</span>
                      </div>

                      <div className={styles.metaItem}>
                        <Clock3 size={15} />
                        <span>{course.estimatedHours} giờ</span>
                      </div>

                      <div className={styles.metaItem}>
                        <BookOpen size={15} />
                        <span>{course.instructorName}</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      className={styles.viewBtn}
                      onClick={() => navigate(`/courses/${course.id}`)}
                    >
                      <ArrowRight size={16} />
                      <span>Xem chi tiết</span>
                    </button>

                    {isEnrolled ? (
                      <button
                        type="button"
                        className={styles.enrolledBtn}
                        onClick={() => navigate("/my-courses")}
                      >
                        <CircleCheck size={16} />
                        <span>Đã đăng ký</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={styles.enrollBtn}
                        onClick={() => handleEnroll(course)}
                        disabled={enrollingId === course.id}
                      >
                        <GraduationCap size={16} />
                        <span>
                          {enrollingId === course.id
                            ? "Đang đăng ký..."
                            : "Đăng ký học"}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.pagination}>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={page <= 0}
              onClick={() => fetchCourses(page - 1, keyword)}
            >
              Trước
            </button>

            <span className={styles.pageInfo}>
              Trang {page + 1} / {Math.max(totalPages, 1)}
            </span>

            <button
              type="button"
              className={styles.pageBtn}
              disabled={page + 1 >= totalPages}
              onClick={() => fetchCourses(page + 1, keyword)}
            >
              Sau
            </button>
          </div>
        </>
      )}
    </div>
  );
}
