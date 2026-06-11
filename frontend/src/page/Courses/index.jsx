import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import styles from "./Courses.module.scss";
import { LMS_BASE_URL, useCourseApi } from "../../api/courseApi";
import { useLearningApi } from "../../api/learningApi";
import CourseShowcaseCard from "../../components/CourseShowcaseCard";
import LoadingSpinner from "../../components/LoadingSpinner";

const PAGE_SIZE = 8;

export default function Courses() {
  const navigate = useNavigate();
  const { listCourses } = useCourseApi();
  const { getLearningCourse } = useLearningApi();

  const [courses, setCourses] = useState([]);
  const [pageInfo, setPageInfo] = useState({
    page: 0,
    size: PAGE_SIZE,
    totalElements: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(0);
  const [openingCourseId, setOpeningCourseId] = useState("");

  useEffect(() => {
    fetchCourses(page);
  }, [page]);

  const fetchCourses = async (currentPage = 0) => {
    try {
      setLoading(true);
      setErrorText("");

      const res = await listCourses({
        page: currentPage,
        size: PAGE_SIZE,
      });

      const payload = res?.result || {};
      const content = Array.isArray(payload?.content) ? payload.content : [];

      setCourses(content);
      setPageInfo({
        page: payload?.page ?? 0,
        size: payload?.size ?? PAGE_SIZE,
        totalElements: payload?.totalElements ?? 0,
        totalPages: payload?.totalPages ?? 0,
      });
    } catch (error) {
      setCourses([]);
      setErrorText(
        error?.body?.message ||
          error?.message ||
          "Không tải được danh sách khóa học.",
      );
    } finally {
      setLoading(false);
    }
  };

  const visibleCourses = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    if (!text) return courses;

    return courses.filter((course) => {
      return (
        course?.title?.toLowerCase().includes(text) ||
        course?.description?.toLowerCase().includes(text) ||
        course?.instructorName?.toLowerCase().includes(text) ||
        course?.categoryName?.toLowerCase().includes(text)
      );
    });
  }, [courses, keyword]);

  const handleOpenCourse = async (courseId) => {
    try {
      setOpeningCourseId(courseId);
      const res = await getLearningCourse(courseId);
      const learningData = res?.result || null;

      if (learningData?.enrolled && learningData?.currentLessonId) {
        navigate(`/learning/${courseId}/${learningData.currentLessonId}`);
        return;
      }

      if (learningData?.enrolled) {
        navigate(`/learning/${courseId}`);
        return;
      }

      navigate(`/courses/${courseId}`);
    } catch {
      navigate(`/courses/${courseId}`);
    } finally {
      setOpeningCourseId("");
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        Khóa học <span>\</span> Danh sách khóa học
      </div>

      <section className={styles.header}>
        <div>
          <h1>Khóa học</h1>
          <p>
            Chọn khóa học phù hợp để xem chi tiết hoặc vào tiếp phần học hiện
            tại nếu bạn đã đăng ký.
          </p>
        </div>

        <label className={styles.searchBox}>
          <Search size={17} />
          <input
            type="text"
            placeholder="Tìm khóa học, giảng viên, danh mục..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </label>
      </section>

      <section className={styles.toolbar}>
        <div>
          <h2>Danh sách khóa học</h2>
          <p>
            Hiển thị {visibleCourses.length} / {pageInfo.totalElements || 0} khóa
            học.
          </p>
        </div>
      </section>

      {errorText ? <div className={styles.errorBox}>{errorText}</div> : null}

      {loading ? (
        <LoadingSpinner text="�ang t?i danh s�ch kh�a h?c..." />
      ) : visibleCourses.length === 0 ? (
        <div className={styles.stateBox}>
          Không có khóa học phù hợp với từ khóa hiện tại.
        </div>
      ) : (
        <div className={styles.courseGrid}>
          {visibleCourses.map((course) => (
            <CourseShowcaseCard
              key={course.id}
              course={course}
              baseUrl={LMS_BASE_URL}
              onClick={() => handleOpenCourse(course.id)}
              busy={openingCourseId === course.id}
            />
          ))}
        </div>
      )}

      <div className={styles.pagination}>
        <button
          type="button"
          className={styles.pageBtn}
          onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
          disabled={page === 0}
        >
          Trước
        </button>

        <div className={styles.pageInfo}>
          Trang <strong>{pageInfo.page + 1}</strong> /{" "}
          <strong>{Math.max(pageInfo.totalPages, 1)}</strong>
        </div>

        <button
          type="button"
          className={styles.pageBtn}
          onClick={() =>
            setPage((prev) =>
              prev + 1 < pageInfo.totalPages ? prev + 1 : prev,
            )
          }
          disabled={
            pageInfo.totalPages === 0 || page + 1 >= pageInfo.totalPages
          }
        >
          Sau
        </button>
      </div>
    </div>
  );
}
