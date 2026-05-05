import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  Boxes,
  ClipboardCheck,
  GraduationCap,
  Layers3,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import CourseShowcaseCard from "../../components/CourseShowcaseCard";
import { LMS_BASE_URL, useCourseApi } from "../../api/courseApi";
import { useLearningApi } from "../../api/learningApi";
import { getAllEnrollments } from "../../api/enrollmentApi";
import { getCategories } from "../../api/categoryApi";
import { getAllQuizzes } from "../../api/quizApi";
import { getUsers } from "../../api/userApi";
import styles from "./Home.module.scss";

const OVERVIEW_SIZE = 8;

function buildCourseStats(curriculum) {
  const sections = curriculum?.sections || [];

  let totalLessons = 0;
  let totalDurationMinutes = 0;

  sections.forEach((section) => {
    const lessons = section?.lessons || [];
    totalLessons += section?.totalLessons || lessons.length || 0;
    totalDurationMinutes += section?.totalDurationMinutes || 0;
  });

  return {
    sectionCount: sections.length,
    totalLessons,
    totalDurationMinutes,
  };
}

function unwrapList(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.result)) return response.result;
  if (Array.isArray(response?.data?.result)) return response.data.result;
  if (Array.isArray(response?.result?.content)) return response.result.content;
  return [];
}

function getCoursePayload(response) {
  return response?.result || {};
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("vi-VN");
}

const Home = () => {
  const navigate = useNavigate();
  const { listCourses, getCourseCurriculum } = useCourseApi();
  const { getLearningCourse } = useLearningApi();

  const [courses, setCourses] = useState([]);
  const [courseStatsMap, setCourseStatsMap] = useState({});
  const [categories, setCategories] = useState([]);
  const [totalCourses, setTotalCourses] = useState(0);
  const [totalEnrollments, setTotalEnrollments] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalQuizzes, setTotalQuizzes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [openingCourseId, setOpeningCourseId] = useState("");

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setErrorText("");

      const [
        courseResult,
        categoryResult,
        enrollmentResult,
        quizResult,
        userResult,
      ] = await Promise.allSettled([
        listCourses({ page: 0, size: OVERVIEW_SIZE }),
        getCategories(),
        getAllEnrollments(),
        getAllQuizzes(),
        getUsers(),
      ]);

      if (courseResult.status !== "fulfilled") {
        throw courseResult.reason;
      }

      const coursePayload = getCoursePayload(courseResult.value);
      const courseContent = Array.isArray(coursePayload?.content)
        ? coursePayload.content
        : [];

      setCourses(courseContent);
      setTotalCourses(coursePayload?.totalElements ?? courseContent.length);
      setCategories(
        categoryResult.status === "fulfilled"
          ? unwrapList(categoryResult.value)
          : [],
      );
      setTotalEnrollments(
        enrollmentResult.status === "fulfilled"
          ? unwrapList(enrollmentResult.value).length
          : 0,
      );
      setTotalQuizzes(
        quizResult.status === "fulfilled" ? unwrapList(quizResult.value).length : 0,
      );
      setTotalUsers(
        userResult.status === "fulfilled" ? unwrapList(userResult.value).length : 0,
      );

      const statsEntries = await Promise.all(
        courseContent.map(async (course) => {
          try {
            const curriculumRes = await getCourseCurriculum(course.id);
            return [course.id, buildCourseStats(curriculumRes?.result || null)];
          } catch {
            return [
              course.id,
              {
                sectionCount: 0,
                totalLessons: 0,
                totalDurationMinutes: 0,
              },
            ];
          }
        }),
      );

      setCourseStatsMap(Object.fromEntries(statsEntries));
    } catch (error) {
      setErrorText(
        error?.response?.data?.message ||
          error?.message ||
          "Không tải được dữ liệu tổng quan.",
      );
      setCourses([]);
      setCourseStatsMap({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const aggregateStats = useMemo(() => {
    const stats = Object.values(courseStatsMap);
    return {
      totalLessons: stats.reduce(
        (total, item) => total + Number(item?.totalLessons || 0),
        0,
      ),
      totalHours: Math.round(
        stats.reduce(
          (total, item) => total + Number(item?.totalDurationMinutes || 0),
          0,
        ) / 60,
      ),
    };
  }, [courseStatsMap]);

  const topCategories = useMemo(() => {
    const categoryCourseCount = new Map();

    courses.forEach((course) => {
      const name = course?.categoryName || "Chưa phân loại";
      categoryCourseCount.set(name, (categoryCourseCount.get(name) || 0) + 1);
    });

    return [...categoryCourseCount.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [courses]);

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

  const quickLinks = [
    {
      icon: BookOpen,
      title: "Khám phá khóa học",
      description: "Xem toàn bộ khóa học đang mở trong hệ thống.",
      path: "/courses",
    },
    {
      icon: GraduationCap,
      title: "Khóa học của tôi",
      description: "Quay lại các khóa đã đăng ký.",
      path: "/my-courses",
    },
    {
      icon: ClipboardCheck,
      title: "Quiz",
      description: "Luyện tập và làm bài kiểm tra độc lập.",
      path: "/quizzes",
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
          <span className={styles.eyebrow}>Tổng quan LMS</span>
          <h1 className={styles.heading}>Không gian học tập trực tuyến của bạn</h1>
          <p className={styles.subheading}>
            Theo dõi nhanh những gì hệ thống đang có: khóa học, danh mục, quiz,
            học viên và các lối tắt để bắt đầu học ngay.
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
          <BookOpen size={20} />
          <span>Khóa học</span>
          <strong>{formatNumber(totalCourses)}</strong>
        </article>
        <article className={styles.statCard}>
          <Layers3 size={20} />
          <span>Bài học</span>
          <strong>{formatNumber(aggregateStats.totalLessons)}</strong>
        </article>
        <article className={styles.statCard}>
          <Users size={20} />
          <span>Lượt đăng ký</span>
          <strong>{formatNumber(totalEnrollments)}</strong>
        </article>
        <article className={styles.statCard}>
          <ClipboardCheck size={20} />
          <span>Quiz</span>
          <strong>{formatNumber(totalQuizzes)}</strong>
        </article>
      </section>

      <section className={styles.overviewGrid}>
        <article className={styles.panel}>
          <div className={styles.sectionHead}>
            <div>
              <h2>Nền tảng hiện có</h2>
              <p>Các con số tổng quát để người dùng hiểu nhanh quy mô LMS.</p>
            </div>
            <BarChart3 size={20} />
          </div>

          <div className={styles.metricList}>
            <div>
              <span>Danh mục</span>
              <strong>{formatNumber(categories.length)}</strong>
            </div>
            <div>
              <span>Người dùng</span>
              <strong>{formatNumber(totalUsers)}</strong>
            </div>
            <div>
              <span>Giờ học ước tính</span>
              <strong>{formatNumber(aggregateStats.totalHours)}</strong>
            </div>
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.sectionHead}>
            <div>
              <h2>Truy cập nhanh</h2>
              <p>Các khu vực chính của hệ thống học tập.</p>
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

      <section className={styles.overviewGrid}>
        <article className={styles.panel}>
          <div className={styles.sectionHead}>
            <div>
              <h2>Danh mục nổi bật</h2>
              <p>Các nhóm khóa học xuất hiện trong danh sách đang hiển thị.</p>
            </div>
            <Boxes size={20} />
          </div>

          {topCategories.length === 0 ? (
            <div className={styles.emptyBox}>Chưa có dữ liệu danh mục.</div>
          ) : (
            <div className={styles.categoryList}>
              {topCategories.map((category) => (
                <div key={category.name} className={styles.categoryItem}>
                  <span>{category.name}</span>
                  <strong>{category.count} khóa</strong>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className={styles.panel}>
          <div className={styles.sectionHead}>
            <div>
              <h2>Vai trò của hệ thống</h2>
              <p>LMS hỗ trợ học viên, giảng viên và quản trị cùng một nền tảng.</p>
            </div>
            <ShieldCheck size={20} />
          </div>

          <div className={styles.roleGrid}>
            <div>
              <strong>Học viên</strong>
              <span>Học khóa, làm quiz, theo dõi tiến độ và thảo luận.</span>
            </div>
            <div>
              <strong>Giảng viên</strong>
              <span>Quản lý khóa học, bài học, quiz và bài nộp.</span>
            </div>
            <div>
              <strong>Quản trị</strong>
              <span>Quản lý người dùng, danh mục, đăng ký và báo cáo.</span>
            </div>
          </div>
        </article>
      </section>

      <section className={styles.courseSection}>
        <div className={styles.sectionHead}>
          <div>
            <span className={styles.eyebrowLight}>Danh sách khóa học</span>
            <h2>Khóa học nổi bật</h2>
            <p>Chọn khóa phù hợp để xem chi tiết hoặc vào thẳng màn hình học nếu đã đăng ký.</p>
          </div>
        </div>

        {loading ? (
          <div className={styles.emptyBox}>Đang tải danh sách khóa học...</div>
        ) : courses.length === 0 ? (
          <div className={styles.emptyBox}>Chưa có khóa học nào để hiển thị.</div>
        ) : (
          <div className={styles.grid}>
            {courses.map((course) => (
              <div key={course.id}>
                <CourseShowcaseCard
                  course={course}
                  stats={courseStatsMap[course.id]}
                  baseUrl={LMS_BASE_URL}
                  onClick={() => handleOpenCourse(course.id)}
                  busy={openingCourseId === course.id}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
