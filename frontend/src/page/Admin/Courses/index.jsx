import { useContext, useEffect, useMemo, useState } from "react";
import {
  Archive,
  Check,
  CircleAlert,
  CircleDashed,
  Eye,
  FileText,
  Globe2,
  Lock,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AddCourseModal from "../../../components/AddCourseModal";
import EditCourseModal from "../../../components/EditCourseModal";
import DeleteCourseModal from "../../../components/DeleteCourseModal";
import { LMS_BASE_URL, useCourseApi } from "../../../api/courseApi";
import { getCategories } from "../../../api/categoryApi";
import { AuthContext } from "../../../context/AuthContext";
import styles from "./Courses.module.scss";

const PAGE_SIZE = 8;
const FALLBACK_THUMB =
  "https://images.unsplash.com/photo-1513258496099-48168024aec0?q=80&w=1200&auto=format&fit=crop";

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Nháp" },
  { value: "PENDING_APPROVAL", label: "Chờ duyệt" },
  { value: "PUBLISHED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Bị từ chối" },
  { value: "ARCHIVED", label: "Lưu trữ" },
];

const VISIBILITY_OPTIONS = [
  { value: "PUBLIC", label: "Công khai" },
  { value: "PRIVATE", label: "Riêng tư" },
  { value: "UNLISTED", label: "Không liệt kê" },
];

function getStatusMeta(status) {
  switch (status) {
    case "PUBLISHED":
      return {
        label: "Đã duyệt",
        className: "statusPublished",
        icon: Check,
      };
    case "PENDING_APPROVAL":
      return {
        label: "Chờ duyệt",
        className: "statusPending",
        icon: CircleAlert,
      };
    case "REJECTED":
      return {
        label: "Bị từ chối",
        className: "statusRejected",
        icon: X,
      };
    case "ARCHIVED":
      return {
        label: "Lưu trữ",
        className: "statusArchived",
        icon: Archive,
      };
    case "DRAFT":
    default:
      return {
        label: "Bản nháp",
        className: "statusDraft",
        icon: CircleDashed,
      };
  }
}

function getVisibilityMeta(visibility) {
  if (visibility === "PRIVATE") {
    return {
      label: "Riêng tư",
      className: "visibilityPrivate",
      icon: Lock,
    };
  }

  if (visibility === "UNLISTED") {
    return {
      label: "Không liệt kê",
      className: "visibilityPrivate",
      icon: Lock,
    };
  }

  return {
    label: "Công khai",
    className: "visibilityPublic",
    icon: Globe2,
  };
}

export default function Courses() {
  const navigate = useNavigate();
  const { listCourses, updateCourse, approveCourse, rejectCourse } =
    useCourseApi();
  const { hasRole } = useContext(AuthContext);

  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pageInfo, setPageInfo] = useState({
    page: 0,
    size: PAGE_SIZE,
    totalElements: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [isOpenAddModal, setIsOpenAddModal] = useState(false);
  const [isOpenEditModal, setIsOpenEditModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [isOpenDeleteModal, setIsOpenDeleteModal] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState(null);
  const [quickSavingKey, setQuickSavingKey] = useState("");

  useEffect(() => {
    fetchCourses(page);
  }, [page, statusFilter]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCourses = async (currentPage = 0) => {
    try {
      setLoading(true);
      setErrorText("");

      const res = await listCourses({
        manageOnly: true,
        status: statusFilter,
        page: currentPage,
        size: PAGE_SIZE,
      });

      const payload = res?.result || {};
      const content = payload?.content || [];

      setCourses(Array.isArray(content) ? content : []);
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

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const data = await getCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Load categories failed:", error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const categoryMap = useMemo(
    () =>
      categories.reduce((acc, item) => {
        acc[item.id] = item.name;
        return acc;
      }, {}),
    [categories],
  );

  const filteredCourses = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return courses.filter((course) => {
      const matchSearch =
        !normalizedSearch ||
        course?.title?.toLowerCase().includes(normalizedSearch) ||
        course?.description?.toLowerCase().includes(normalizedSearch) ||
        course?.instructorName?.toLowerCase().includes(normalizedSearch);

      const matchCategory =
        !selectedCategory || course?.categoryId === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [courses, search, selectedCategory]);

  const handleResetFilter = () => {
    setSearch("");
    setSelectedCategory("");
    setStatusFilter("");
    setPage(0);
  };

  const handleCreatedCourse = async () => {
    setPage(0);
    await fetchCourses(0);
    await fetchCategories();
  };

  const handleDeletedCourse = async () => {
    if (filteredCourses.length === 1 && page > 0) {
      setPage((prev) => prev - 1);
      return;
    }
    await fetchCourses(page);
  };

  const handleUpdatedCourse = async () => {
    await fetchCourses(page);
    await fetchCategories();
  };

  const buildCoursePayload = (course, overrides = {}) => ({
    title: course.title || "",
    description: course.description || "",
    thumbnailUrl: course.thumbnailUrl || "",
    categoryId: course.categoryId || "",
    status: course.status || "DRAFT",
    visibility: course.visibility || "PUBLIC",
    level: course.level || "BEGINNER",
    estimatedHours: Number(course.estimatedHours) || 0,
    ...overrides,
  });

  const handleQuickUpdate = async (course, field, value) => {
    if (!course?.id || course[field] === value) return;

    const savingKey = `${course.id}-${field}`;
    try {
      setQuickSavingKey(savingKey);
      setErrorText("");
      await updateCourse(course.id, buildCoursePayload(course, { [field]: value }));
      await fetchCourses(page);
    } catch (error) {
      setErrorText(
        error?.body?.message ||
          error?.message ||
          "Không cập nhật được khóa học.",
      );
    } finally {
      setQuickSavingKey("");
    }
  };

  const handleApproveCourse = async (courseId) => {
    try {
      setErrorText("");
      await approveCourse(courseId);
      await fetchCourses(page);
    } catch (error) {
      setErrorText(
        error?.body?.message || error?.message || "Duyệt khóa học thất bại.",
      );
    }
  };

  const handleRejectCourse = async (courseId) => {
    try {
      setErrorText("");
      await rejectCourse(courseId);
      await fetchCourses(page);
    } catch (error) {
      setErrorText(
        error?.body?.message || error?.message || "Từ chối khóa học thất bại.",
      );
    }
  };

  const getImageSrc = (thumbnailUrl) => {
    if (!thumbnailUrl) return FALLBACK_THUMB;
    if (thumbnailUrl.startsWith("http")) return thumbnailUrl;
    if (thumbnailUrl.startsWith("/")) return `${LMS_BASE_URL}${thumbnailUrl}`;
    return `${LMS_BASE_URL}/${thumbnailUrl}`;
  };

  return (
    <div className={styles.coursesPage}>
      <div className={styles.headerBar}>
        <div>
          <div className={styles.breadcrumb}>Quản trị \ Khóa học</div>
          <h1>Quản lí khóa học</h1>
          <p>Theo dõi, duyệt và cập nhật khóa học trong hệ thống.</p>
        </div>

        <button
          type="button"
          className={styles.addBtn}
          onClick={() => setIsOpenAddModal(true)}
        >
          <Plus size={18} />
          <span>Thêm khóa học</span>
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Tìm khóa học, mô tả, giảng viên..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className={styles.filterBox}>
          <SlidersHorizontal size={16} />
          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            disabled={loadingCategories}
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterBox}>
          <SlidersHorizontal size={16} />
          <select
            value={statusFilter}
            onChange={(event) => {
              setPage(0);
              setStatusFilter(event.target.value);
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING_APPROVAL">Chờ duyệt</option>
            <option value="PUBLISHED">Đã duyệt</option>
            <option value="REJECTED">Bị từ chối</option>
            <option value="DRAFT">Nháp</option>
            <option value="ARCHIVED">Lưu trữ</option>
          </select>
        </div>

        <button
          type="button"
          className={styles.resetBtn}
          onClick={handleResetFilter}
          title="Đặt lại bộ lọc"
          aria-label="Đặt lại bộ lọc"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {errorText ? <div className={styles.errorBox}>{errorText}</div> : null}

      <div className={styles.listHeader}>
        <div>
          <h2>Danh sách khóa học</h2>
          <p>
            Hiển thị {filteredCourses.length} / {pageInfo.totalElements} khóa học.
          </p>
        </div>
        <span>
          Trang {pageInfo.page + 1} / {Math.max(pageInfo.totalPages, 1)}
        </span>
      </div>

      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.stateBox}>Đang tải danh sách khóa học...</div>
        ) : filteredCourses.length === 0 ? (
          <div className={styles.stateBox}>
            Không có khóa học phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.courseTable}>
              <thead>
                <tr>
                  <th>Khóa học</th>
                  <th>Giảng viên</th>
                  <th>Danh mục</th>
                  <th>Cấp độ</th>
                  <th>Giờ</th>
                  <th>Trạng thái</th>
                  <th>Hiển thị</th>
                  <th>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {filteredCourses.map((course) => {
                  const statusMeta = getStatusMeta(course.status || "DRAFT");
                  const visibilityMeta = getVisibilityMeta(
                    course.visibility || "PUBLIC",
                  );
                  const StatusIcon = statusMeta.icon;
                  const VisibilityIcon = visibilityMeta.icon;

                  return (
                    <tr key={course.id}>
                      <td>
                        <div className={styles.courseCell}>
                          <img
                            src={getImageSrc(course.thumbnailUrl)}
                            alt={course.title}
                            className={styles.thumb}
                          />
                          <div className={styles.courseInfo}>
                            <strong>{course.title}</strong>
                            <span>{course.description || "Chưa có mô tả."}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className={styles.textCell}>
                          {course.instructorName || "Chưa có"}
                        </span>
                      </td>

                      <td>
                        <span className={styles.categoryCell}>
                          {course.categoryName ||
                            categoryMap[course.categoryId] ||
                            "Chưa phân loại"}
                        </span>
                      </td>

                      <td>
                        <span className={styles.textCell}>
                          {course.level || "BEGINNER"}
                        </span>
                      </td>

                      <td>
                        <span className={styles.hoursCell}>
                          <FileText size={15} />
                          {course.estimatedHours ?? 0}
                        </span>
                      </td>

                      <td>
                        <div className={styles.quickEditControl}>
                          <span
                            className={`${styles.iconState} ${styles[statusMeta.className]}`}
                            title={statusMeta.label}
                            aria-label={statusMeta.label}
                          >
                            <StatusIcon size={16} />
                          </span>
                          <select
                            value={course.status || "DRAFT"}
                            onChange={(event) =>
                              handleQuickUpdate(
                                course,
                                "status",
                                event.target.value,
                              )
                            }
                            disabled={
                              !hasRole("ADMIN") ||
                              quickSavingKey === `${course.id}-status`
                            }
                            title="Đổi trạng thái"
                            aria-label="Đổi trạng thái"
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>

                      <td>
                        <div className={styles.quickEditControl}>
                          <span
                            className={`${styles.iconState} ${styles[visibilityMeta.className]}`}
                            title={visibilityMeta.label}
                            aria-label={visibilityMeta.label}
                          >
                            <VisibilityIcon size={16} />
                          </span>
                          <select
                            value={course.visibility || "PUBLIC"}
                            onChange={(event) =>
                              handleQuickUpdate(
                                course,
                                "visibility",
                                event.target.value,
                              )
                            }
                            disabled={
                              !hasRole("ADMIN") ||
                              quickSavingKey === `${course.id}-visibility`
                            }
                            title="Đổi hiển thị"
                            aria-label="Đổi hiển thị"
                          >
                            {VISIBILITY_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>

                      <td>
                        <div className={styles.actionGroup}>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            title="Chi tiết"
                            aria-label="Chi tiết"
                            onClick={() => navigate(`/admin/courses/${course.id}`)}
                          >
                            <Eye size={16} />
                          </button>

                          <button
                            type="button"
                            className={styles.iconBtn}
                            title="Sửa"
                            aria-label="Sửa"
                            onClick={() => {
                              setEditingCourse(course);
                              setIsOpenEditModal(true);
                            }}
                          >
                            <Pencil size={16} />
                          </button>

                          {hasRole("ADMIN") && course.status !== "PUBLISHED" ? (
                            <button
                              type="button"
                              className={`${styles.iconBtn} ${styles.approveAction}`}
                              title="Duyệt"
                              aria-label="Duyệt"
                              onClick={() => handleApproveCourse(course.id)}
                            >
                              <Check size={16} />
                            </button>
                          ) : null}

                          {hasRole("ADMIN") &&
                          course.status === "PENDING_APPROVAL" ? (
                            <button
                              type="button"
                              className={`${styles.iconBtn} ${styles.rejectAction}`}
                              title="Từ chối"
                              aria-label="Từ chối"
                              onClick={() => handleRejectCourse(course.id)}
                            >
                              <X size={16} />
                            </button>
                          ) : null}

                          <button
                            type="button"
                            className={`${styles.iconBtn} ${styles.deleteAction}`}
                            title="Xóa"
                            aria-label="Xóa"
                            onClick={() => {
                              setDeletingCourse(course);
                              setIsOpenDeleteModal(true);
                            }}
                          >
                            <Trash2 size={16} />
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

      <div className={styles.pagination}>
        <button
          type="button"
          onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
          disabled={page === 0}
          className={styles.pageBtn}
        >
          Trước
        </button>

        <div className={styles.pageInfo}>
          Trang <strong>{pageInfo.page + 1}</strong> /{" "}
          <strong>{Math.max(pageInfo.totalPages, 1)}</strong>
        </div>

        <button
          type="button"
          onClick={() =>
            setPage((prev) =>
              prev + 1 < pageInfo.totalPages ? prev + 1 : prev,
            )
          }
          disabled={
            pageInfo.totalPages === 0 || page + 1 >= pageInfo.totalPages
          }
          className={styles.pageBtn}
        >
          Sau
        </button>
      </div>

      <AddCourseModal
        isOpen={isOpenAddModal}
        onClose={() => setIsOpenAddModal(false)}
        onCreated={handleCreatedCourse}
        categories={categories}
      />

      <EditCourseModal
        isOpen={isOpenEditModal}
        onClose={() => {
          setIsOpenEditModal(false);
          setEditingCourse(null);
        }}
        onUpdated={handleUpdatedCourse}
        course={editingCourse}
        categories={categories}
      />

      <DeleteCourseModal
        isOpen={isOpenDeleteModal}
        onClose={() => {
          setIsOpenDeleteModal(false);
          setDeletingCourse(null);
        }}
        course={deletingCourse}
        onDeleted={handleDeletedCourse}
      />
    </div>
  );
}
