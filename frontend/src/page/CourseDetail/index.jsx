import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  CirclePlay,
  FileText,
  HelpCircle,
  Pencil,
  BookOpen,
  Clock3,
  User,
  Tag,
  Layers3,
  GraduationCap,
  Copy,
  CreditCard,
  X,
} from "lucide-react";
import styles from "./CourseDetail.module.scss";
import { LMS_BASE_URL, useCourseApi } from "../../api/courseApi";
import { useLearningApi } from "../../api/learningApi";
import { createCoursePayment, getPayment } from "../../api/paymentApi";

const FALLBACK_THUMB =
  "https://images.unsplash.com/photo-1513258496099-48168024aec0?q=80&w=1200&auto=format&fit=crop";

function formatDuration(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return "Chưa cập nhật";

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hours > 0 && mins > 0) return `${hours} giờ ${mins} phút`;
  if (hours > 0) return `${hours} giờ`;
  return `${mins} phút`;
}

function formatClockDuration(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return "--:--";

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  }

  return `00:${String(mins).padStart(2, "0")}`;
}

function formatLevel(level) {
  const map = {
    BEGINNER: "Cơ bản",
    INTERMEDIATE: "Trung cấp",
    ADVANCED: "Nâng cao",
  };

  return map[level] || level || "Chưa cập nhật";
}

function formatPrice(course) {
  const price = Number(course?.price || 0);
  if (!course?.paid || price <= 0) return "Miễn phí";
  return `${price.toLocaleString("vi-VN")} ${course?.currency || "VND"}`;
}

function formatPaymentAmount(payment) {
  const amount = Number(payment?.amount || 0);
  return `${amount.toLocaleString("vi-VN")} ${payment?.currency || "VND"}`;
}

function getLessonIcon(lessonType) {
  switch (lessonType) {
    case "VIDEO":
      return <CirclePlay size={15} />;
    case "READING":
      return <FileText size={15} />;
    case "QUIZ":
      return <HelpCircle size={15} />;
    case "ASSIGNMENT":
      return <Pencil size={15} />;
    default:
      return <BookOpen size={15} />;
  }
}

function getLessonTypeLabel(lessonType) {
  const map = {
    VIDEO: "Video",
    READING: "Bài đọc",
    QUIZ: "Quiz",
    ASSIGNMENT: "Bài tập",
    FILE: "Tài liệu",
    LESSON: "Bài học",
  };

  return map[lessonType] || lessonType || "Bài học";
}

function toPlainText(html = "") {
  return String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getCourseById, getCourseCurriculum } = useCourseApi();
  const { startLearning, getLearningCourse } = useLearningApi();

  const [course, setCourse] = useState(null);
  const [curriculum, setCurriculum] = useState(null);
  const [openSections, setOpenSections] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [starting, setStarting] = useState(false);
  const [learningCourse, setLearningCourse] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [payment, setPayment] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  useEffect(() => {
    fetchDetail();
  }, [id]);

  useEffect(() => {
    if (!showPayment || !payment?.id || payment.status === "PAID") {
      return undefined;
    }

    const timer = window.setInterval(async () => {
      try {
        const res = await getPayment(payment.id);
        const nextPayment = res?.result || null;
        if (!nextPayment) return;

        setPayment(nextPayment);
        if (nextPayment.status === "PAID") {
          window.clearInterval(timer);
          await startCourse();
        }
      } catch {
        // Keep the payment dialog open while waiting for the next poll.
      }
    }, 3000);

    return () => window.clearInterval(timer);
  }, [showPayment, payment?.id, payment?.status]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      setErrorText("");

      try {
        const learningRes = await getLearningCourse(id);
        const learningData = learningRes?.result || null;
        setLearningCourse(learningData);

        if (learningData?.enrolled && learningData?.currentLessonId) {
          navigate(`/learning/${id}/${learningData.currentLessonId}`, {
            replace: true,
          });
          return;
        }
      } catch {
        // ignore, continue load detail
        setLearningCourse(null);
      }

      const [courseRes, curriculumRes] = await Promise.all([
        getCourseById(id),
        getCourseCurriculum(id),
      ]);

      const courseData = courseRes?.result || null;
      const curriculumData = curriculumRes?.result || null;

      setCourse(courseData);
      setCurriculum(curriculumData);

      const initialOpenState = {};
      (curriculumData?.sections || []).forEach((section, index) => {
        initialOpenState[section.id] = index === 0;
      });
      setOpenSections(initialOpenState);
    } catch (error) {
      setErrorText(
        error?.body?.message ||
          error?.message ||
          "Không tải được chi tiết khóa học.",
      );
    } finally {
      setLoading(false);
    }
  };

  const getImageSrc = (thumbnailUrl) => {
    if (!thumbnailUrl) return FALLBACK_THUMB;
    if (thumbnailUrl.startsWith("http")) return thumbnailUrl;
    if (thumbnailUrl.startsWith("/")) return `${LMS_BASE_URL}${thumbnailUrl}`;
    return `${LMS_BASE_URL}/${thumbnailUrl}`;
  };

  const toggleSection = (sectionId) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const stats = useMemo(() => {
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
  }, [curriculum]);

  const startCourse = async (payload = null) => {
    try {
      setStarting(true);
      setShowPayment(false);
      const res = await startLearning(id, payload);
      const data = res?.result || null;

      if (data?.firstLessonId) {
        navigate(`/learning/${id}/${data.firstLessonId}`, {
          state: { from: `/courses/${id}` },
        });
        return;
      }

      navigate(`/learning/${id}`, {
        state: { from: `/courses/${id}` },
      });
    } catch (error) {
      setErrorText(
        error?.body?.message || error?.message || "Không thể bắt đầu khóa học.",
      );
    } finally {
      setStarting(false);
    }
  };

  const isEnrolled = Boolean(learningCourse?.enrolled);
  const hasCoursePrice = course?.paid && Number(course?.price || 0) > 0;

  const handleStartLearning = async () => {
    if (isEnrolled) {
      await startCourse();
      return;
    }

    if (hasCoursePrice) {
      setShowPayment(true);
      await loadPayment();
      return;
    }

    await startCourse();
  };

  const isAlreadyEnrolledError = (error) => {
    const message =
      error?.response?.data?.message ||
      error?.body?.message ||
      error?.message ||
      "";
    const code = error?.response?.data?.code || error?.body?.code;
    const normalizedMessage = message
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d");

    return code === 1013 || normalizedMessage.includes("dang ky");
  };

  const loadPayment = async () => {
    try {
      setPaymentLoading(true);
      setPaymentError("");
      const res = await createCoursePayment(id);
      setPayment(res?.result || null);
    } catch (error) {
      if (isAlreadyEnrolledError(error)) {
        setPaymentError("");
        setShowPayment(false);
        await startCourse();
        return;
      }

      setPaymentError(
        error?.response?.data?.message ||
          error?.body?.message ||
          error?.message ||
          "Không tạo được đơn thanh toán.",
      );
    } finally {
      setPaymentLoading(false);
    }
  };

  const copyText = async (value) => {
    try {
      await navigator.clipboard?.writeText(value);
    } catch {
      // Clipboard support is optional for this basic demo.
    }
  };

  if (loading) {
    return <div className={styles.stateBox}>Đang tải chi tiết khóa học...</div>;
  }

  if (errorText) {
    return <div className={styles.errorBox}>{errorText}</div>;
  }

  if (!course || !curriculum) {
    return <div className={styles.stateBox}>Không tìm thấy khóa học.</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate("/courses")}
        >
          <ArrowLeft size={18} />
          <span>Quay lại</span>
        </button>
      </div>

      <div className={styles.leftCol}>
        <h1>{course.title}</h1>

        <p className={styles.description}>
          {course.description || "Chưa có mô tả cho khóa học này."}
        </p>

        <div className={styles.metaLine}>
          <span className={styles.metaItem}>
            <User size={15} />
            <span>{course.instructorName || "Chưa có giảng viên"}</span>
          </span>

          <span className={styles.metaItem}>
            <Tag size={15} />
            <span>{course.categoryName || "Chưa có danh mục"}</span>
          </span>
        </div>

        <div className={styles.summaryLine}>
          <span>
            <Layers3 size={15} />
            {stats.sectionCount} chương
          </span>
          <span>
            <BookOpen size={15} />
            {stats.totalLessons} bài học
          </span>
          <span>
            <Clock3 size={15} />
            {formatDuration(stats.totalDurationMinutes)}
          </span>
        </div>
      </div>

      <div className={styles.rightCol}>
        <div className={styles.thumbWrap}>
          <img
            src={getImageSrc(course.thumbnailUrl || curriculum.thumbnailUrl)}
            alt={course.title}
            className={styles.thumbnail}
          />
        </div>

        <div className={styles.sideContent}>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={handleStartLearning}
            disabled={starting}
          >
            {starting
              ? "Đang xử lý..."
              : isEnrolled
                ? "Vào học"
                : hasCoursePrice
                  ? "Thanh toán để học"
                : "Bắt đầu học"}
          </button>

          <div className={styles.sideInfo}>
            <div className={styles.priceBox}>
              <CreditCard size={17} />
              <span>{formatPrice(course)}</span>
            </div>

            <div className={styles.sideInfoItem}>
              <GraduationCap size={15} />
              <span>Trình độ: {formatLevel(course.level)}</span>
            </div>

            <div className={styles.sideInfoItem}>
              <BookOpen size={15} />
              <span>Tổng số bài học: {stats.totalLessons}</span>
            </div>

            <div className={styles.sideInfoItem}>
              <Clock3 size={15} />
              <span>
                Thời lượng: {formatDuration(stats.totalDurationMinutes)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.contentSection}>
        <div className={styles.sectionHead}>
          <h2>Nội dung khóa học</h2>
          <p>
            {stats.sectionCount} chương • {stats.totalLessons} bài học •{" "}
            {formatDuration(stats.totalDurationMinutes)}
          </p>
        </div>

        <div className={styles.sectionList}>
          {(curriculum.sections || []).map((section, sectionIndex) => {
            const isOpen = !!openSections[section.id];

            return (
              <div key={section.id} className={styles.sectionBlock}>
                <button
                  type="button"
                  className={styles.sectionToggle}
                  onClick={() => toggleSection(section.id)}
                >
                  <div className={styles.sectionLeft}>
                    <div className={styles.sectionTitleRow}>
                      <span className={styles.sectionIndex}>
                        {isOpen ? "−" : "+"}
                      </span>
                      <h3>
                        {sectionIndex + 1}. {section.title}
                      </h3>
                    </div>
                  </div>

                  <div className={styles.sectionRight}>
                    <span>{section.totalLessons || 0} bài học</span>
                    <span className={styles.sectionChevron}>
                      {isOpen ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </span>
                  </div>
                </button>

                {isOpen ? (
                  <div className={styles.lessonList}>
                    {(section.lessons || []).map((lesson, lessonIndex) => (
                      <div key={lesson.id} className={styles.lessonRow}>
                        <div className={styles.lessonLeft}>
                          <span className={styles.lessonIcon}>
                            {getLessonIcon(lesson.lessonType)}
                          </span>

                          <div className={styles.lessonContent}>
                            <h4>
                              {lesson.orderIndex ?? lessonIndex + 1}.{" "}
                              {lesson.title}
                            </h4>

                            <div className={styles.lessonInlineMeta}>
                              <span>
                                {getLessonTypeLabel(lesson.lessonType)}
                              </span>
                              {toPlainText(lesson.description) ? (
                                <span className={styles.lessonShortDesc}>
                                  {toPlainText(lesson.description)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className={styles.lessonRight}>
                          <span className={styles.lessonTime}>
                            {formatClockDuration(lesson.durationMinutes)}
                          </span>

                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {showPayment ? (
        <div className={styles.paymentOverlay} role="dialog" aria-modal="true">
          <div className={styles.paymentModal}>
            <div className={styles.paymentHeader}>
              <div>
                <h2>Quét mã QR để thanh toán</h2>
                <p>
                  Chuyển khoản đúng nội dung{" "}
                  <strong>{payment?.paymentCode || "đang tạo..."}</strong>. Hệ thống sẽ tự mở khóa khi SePay xác nhận.
                </p>
              </div>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => setShowPayment(false)}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            {paymentLoading ? (
              <div className={styles.paymentState}>Đang tạo mã thanh toán...</div>
            ) : paymentError ? (
              <div className={styles.paymentState}>{paymentError}</div>
            ) : payment ? (
              <div className={styles.paymentBody}>
                <div className={styles.qrBox}>
                  <img src={payment.qrUrl} alt="QR thanh toán khóa học" />
                </div>

                <div className={styles.paymentInfo}>
                  <div>
                    <span>Trạng thái</span>
                    <strong>{payment.status === "PAID" ? "Đã thanh toán" : "Đang chờ chuyển khoản"}</strong>
                  </div>
                  <div>
                    <span>Ngân hàng</span>
                    <strong>{payment.bankName}</strong>
                  </div>
                  <div>
                    <span>Số tài khoản</span>
                    <strong>{payment.accountNumber}</strong>
                    <button type="button" onClick={() => copyText(payment.accountNumber)}>
                      <Copy size={16} />
                    </button>
                  </div>
                  <div>
                    <span>Tên tài khoản</span>
                    <strong>{payment.accountName}</strong>
                  </div>
                  <div>
                    <span>Số tiền</span>
                    <strong>{formatPaymentAmount(payment)}</strong>
                    <button type="button" onClick={() => copyText(String(Math.round(Number(payment.amount || 0))))}>
                      <Copy size={16} />
                    </button>
                  </div>
                  <div>
                    <span>Nội dung</span>
                    <strong>{payment.paymentCode}</strong>
                    <button type="button" onClick={() => copyText(payment.paymentCode)}>
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className={styles.paymentActions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => setShowPayment(false)}
              >
                Để sau
              </button>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={loadPayment}
                disabled={paymentLoading}
              >
                Làm mới mã
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
