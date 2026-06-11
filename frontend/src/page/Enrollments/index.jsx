import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Ban,
  BookOpen,
  CalendarDays,
  Check,
  Eye,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  UserRound,
  X,
} from "lucide-react";
import {
  enrollCourse,
  getAllEnrollments,
} from "../../api/enrollmentApi";
import { searchUsers } from "../../api/userApi";
import { getCourses, LMS_BASE_URL } from "../../api/courseApi";
import { AuthContext } from "../../context/AuthContext";
import styles from "./Enrollments.module.scss";
import LoadingSpinner from "../../components/LoadingSpinner";

const INITIAL_FORM = {
  userId: "",
  courseId: "",
  paymentConfirmed: false,
};

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

function normalizeUser(rawUser) {
  return {
    id: rawUser?.id || "",
    username: rawUser?.username || "",
    fullName: rawUser?.fullName || "",
    email: rawUser?.email || "",
    role:
      rawUser?.role?.name ||
      rawUser?.role ||
      (Array.isArray(rawUser?.roles) ? rawUser.roles[0]?.name : "") ||
      "",
  };
}

function normalizeCourse(rawCourse) {
  return {
    id: rawCourse?.id || "",
    title: rawCourse?.title || "Khóa học không xác định",
    paid: Boolean(rawCourse?.paid),
    price: Number(rawCourse?.price) || 0,
    currency: rawCourse?.currency || "VND",
    status: rawCourse?.status || "",
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
  const { hasRole } = useContext(AuthContext);
  const canCreateEnrollment = hasRole("ADMIN");

  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [errorText, setErrorText] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [modalErrorText, setModalErrorText] = useState("");
  const [studentKeyword, setStudentKeyword] = useState("");
  const [courseKeyword, setCourseKeyword] = useState("");
  const [studentResults, setStudentResults] = useState([]);
  const [courseResults, setCourseResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);

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

  useEffect(() => {
    if (!isModalOpen) return undefined;

    const timeoutId = window.setTimeout(async () => {
      try {
        setLoadingStudents(true);
        const res = await searchUsers({
          keyword: studentKeyword.trim(),
          role: "STUDENT",
          page: 0,
          size: 10,
        });
        const data = Array.isArray(res?.result?.content)
          ? res.result.content
          : [];
        setStudentResults(data.map(normalizeUser));
      } catch (error) {
        setStudentResults([]);
        setModalErrorText(
          error?.response?.data?.message ||
            error?.message ||
            "Không tải được danh sách học viên.",
        );
      } finally {
        setLoadingStudents(false);
      }
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [isModalOpen, studentKeyword]);

  useEffect(() => {
    if (!isModalOpen) return undefined;

    const timeoutId = window.setTimeout(async () => {
      try {
        setLoadingCourses(true);
        const res = await getCourses({
          keyword: courseKeyword.trim(),
          manageOnly: true,
          page: 0,
          size: 10,
        });
        const data = Array.isArray(res?.result?.content)
          ? res.result.content
          : [];
        setCourseResults(data.map(normalizeCourse));
      } catch (error) {
        setCourseResults([]);
        setModalErrorText(
          error?.response?.data?.message ||
            error?.message ||
            "Không tải được danh sách khóa học.",
        );
      } finally {
        setLoadingCourses(false);
      }
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [isModalOpen, courseKeyword]);

  const handleViewCourse = (enrollment) => {
    if (!enrollment.courseId) return;
    navigate(`/admin/courses/${enrollment.courseId}`);
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

  const requiresPayment =
    selectedCourse?.paid && Number(selectedCourse?.price) > 0;

  const openCreateModal = () => {
    setIsModalOpen(true);
    setModalErrorText("");
    setForm(INITIAL_FORM);
    setStudentKeyword("");
    setCourseKeyword("");
    setStudentResults([]);
    setCourseResults([]);
    setSelectedStudent(null);
    setSelectedCourse(null);
  };

  const closeModal = () => {
    if (saving) return;

    setIsModalOpen(false);
    setModalErrorText("");
    setForm(INITIAL_FORM);
    setStudentKeyword("");
    setCourseKeyword("");
    setStudentResults([]);
    setCourseResults([]);
    setSelectedStudent(null);
    setSelectedCourse(null);
  };

  const handleFormChange = (event) => {
    const { name, value, checked, type } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validateForm = () => {
    if (!form.userId) return "Vui lòng chọn học viên.";
    if (!form.courseId) return "Vui lòng chọn khóa học.";
    if (requiresPayment && !form.paymentConfirmed) {
      return "Vui lòng xác nhận thanh toán trước khi thêm vào khóa học trả phí.";
    }
    return "";
  };

  const handleAddEnrollment = async (event) => {
    event.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setModalErrorText(validationError);
      return;
    }

    try {
      setSaving(true);
      setModalErrorText("");

      await enrollCourse({
        userId: form.userId,
        courseId: form.courseId,
        paymentConfirmed: form.paymentConfirmed,
      });

      await fetchEnrollments();
      closeModal();
    } catch (error) {
      setModalErrorText(
        error?.response?.data?.message ||
          error?.message ||
          "Thêm học viên vào khóa học thất bại.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setForm((prev) => ({
      ...prev,
      userId: student.id,
    }));
    setStudentKeyword(student.fullName || student.username || student.email);
  };

  const handleSelectCourse = (course) => {
    setSelectedCourse(course);
    setForm((prev) => ({
      ...prev,
      courseId: course.id,
      paymentConfirmed: false,
    }));
    setCourseKeyword(course.title);
  };

  return (
    <div className={styles.page}>
      <div className={styles.headerBar}>
        <div>
          <div className={styles.breadcrumb}>Quản trị \ Đăng ký học</div>
          <h1>Quản lí đăng ký học</h1>
          <p>Theo dõi học viên đã đăng ký khóa học và tiến độ học tập.</p>
        </div>

        {canCreateEnrollment ? (
          <button type="button" className={styles.addBtn} onClick={openCreateModal}>
            <Plus size={18} />
            <span>Thêm học viên</span>
          </button>
        ) : null}
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
          <LoadingSpinner text="Đang tải danh sách đăng ký học..." />
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

      {isModalOpen ? (
        <div className={styles.modalOverlay} role="presentation">
          <div className={styles.modal} role="dialog" aria-modal="true">
            <div className={styles.modalHeader}>
              <div>
                <h2>Thêm học viên</h2>
                <p>Chọn học viên và khóa học để tạo đăng ký học mới.</p>
              </div>

              <button
                type="button"
                className={styles.iconBtn}
                onClick={closeModal}
                disabled={saving}
                title="Đóng"
                aria-label="Đóng"
              >
                <X size={17} />
              </button>
            </div>

            <form className={styles.form} onSubmit={handleAddEnrollment}>
              {modalErrorText ? (
                <div className={styles.modalError}>{modalErrorText}</div>
              ) : null}

              <div className={styles.formGroup}>
                <span>Học viên</span>
                <div className={styles.searchSelect}>
                  <Search size={16} />
                  <input
                    value={studentKeyword}
                    onChange={(event) => {
                      setStudentKeyword(event.target.value);
                      setSelectedStudent(null);
                      setForm((prev) => ({ ...prev, userId: "" }));
                    }}
                    placeholder="Tìm theo tên, email hoặc username"
                    disabled={saving}
                  />
                </div>

                {selectedStudent ? (
                  <div className={styles.selectedItem}>
                    <UserRound size={16} />
                    <div>
                      <strong>
                        {selectedStudent.fullName || selectedStudent.username}
                      </strong>
                      <span>{selectedStudent.email || selectedStudent.username}</span>
                    </div>
                  </div>
                ) : (
                  <div className={styles.resultList}>
                    {loadingStudents ? (
                      <div className={styles.resultState}>Đang tìm học viên...</div>
                    ) : studentResults.length === 0 ? (
                      <div className={styles.resultState}>
                        Không có học viên phù hợp.
                      </div>
                    ) : (
                      studentResults.map((student) => (
                        <button
                          key={student.id}
                          type="button"
                          className={styles.resultItem}
                          onClick={() => handleSelectStudent(student)}
                          disabled={saving}
                        >
                          <UserRound size={16} />
                          <div>
                            <strong>{student.fullName || student.username}</strong>
                            <span>{student.email || student.username}</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <span>Khóa học</span>
                <div className={styles.searchSelect}>
                  <Search size={16} />
                  <input
                    value={courseKeyword}
                    onChange={(event) => {
                      setCourseKeyword(event.target.value);
                      setSelectedCourse(null);
                      setForm((prev) => ({
                        ...prev,
                        courseId: "",
                        paymentConfirmed: false,
                      }));
                    }}
                    placeholder="Tìm theo tên khóa học"
                    disabled={saving}
                  />
                </div>

                {selectedCourse ? (
                  <div className={styles.selectedItem}>
                    <BookOpen size={16} />
                    <div>
                      <strong>{selectedCourse.title}</strong>
                      <span>
                        {selectedCourse.paid && selectedCourse.price > 0
                          ? `Trả phí - ${selectedCourse.price.toLocaleString(
                              "vi-VN",
                            )} ${selectedCourse.currency}`
                          : "Miễn phí"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className={styles.resultList}>
                    {loadingCourses ? (
                      <div className={styles.resultState}>Đang tìm khóa học...</div>
                    ) : courseResults.length === 0 ? (
                      <div className={styles.resultState}>
                        Không có khóa học phù hợp.
                      </div>
                    ) : (
                      courseResults.map((course) => (
                        <button
                          key={course.id}
                          type="button"
                          className={styles.resultItem}
                          onClick={() => handleSelectCourse(course)}
                          disabled={saving}
                        >
                          <BookOpen size={16} />
                          <div>
                            <strong>{course.title}</strong>
                            <span>
                              {course.paid && course.price > 0
                                ? `Trả phí - ${course.price.toLocaleString(
                                    "vi-VN",
                                  )} ${course.currency}`
                                : "Miễn phí"}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {requiresPayment ? (
                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    name="paymentConfirmed"
                    checked={form.paymentConfirmed}
                    onChange={handleFormChange}
                    disabled={saving}
                  />
                  <span>Đã xác nhận thanh toán cho khóa học trả phí</span>
                </label>
              ) : null}

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={closeModal}
                  disabled={saving}
                >
                  Hủy
                </button>

                <button type="submit" className={styles.submitBtn} disabled={saving}>
                  {saving ? "Đang thêm..." : "Thêm học viên"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
