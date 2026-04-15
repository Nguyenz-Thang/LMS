import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  BookOpen,
  User,
  Tag,
  FileText,
  Trash2,
} from "lucide-react";
import AddCourseModal from "../../../components/AddCourseModal";
import EditCourseModal from "../../../components/EditCourseModal";
import DeleteCourseModal from "../../../components/DeleteCourseModal";
import styles from "./Courses.module.scss";
import { useNavigate } from "react-router-dom";
import { LMS_BASE_URL, useCourseApi } from "../../../api/courseApi";
import { getCategories } from "../../../api/categoryApi";

const PAGE_SIZE = 6;
const FALLBACK_THUMB =
  "https://images.unsplash.com/photo-1513258496099-48168024aec0?q=80&w=1200&auto=format&fit=crop";

export default function Courses() {
  const navigate = useNavigate();
  const { listCourses } = useCourseApi();

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
  const [page, setPage] = useState(0);

  const [isOpenAddModal, setIsOpenAddModal] = useState(false);
  const [isOpenEditModal, setIsOpenEditModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [isOpenDeleteModal, setIsOpenDeleteModal] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState(null);

  useEffect(() => {
    fetchCourses(page);
  }, [page]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCourses = async (currentPage = 0) => {
    try {
      setLoading(true);
      setErrorText("");

      const res = await listCourses({
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

  const categoryMap = useMemo(() => {
    return categories.reduce((acc, item) => {
      acc[item.id] = item.name;
      return acc;
    }, {});
  }, [categories]);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchSearch =
        !search ||
        course?.title?.toLowerCase().includes(search.toLowerCase()) ||
        course?.description?.toLowerCase().includes(search.toLowerCase()) ||
        course?.instructorName?.toLowerCase().includes(search.toLowerCase());

      const matchCategory =
        !selectedCategory || course?.categoryId === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [courses, search, selectedCategory]);

  const handleResetFilter = () => {
    setSearch("");
    setSelectedCategory("");
  };

  const handleCreatedCourse = async () => {
    setPage(0);
    await fetchCourses(0);
    await fetchCategories();
  };

  const handleOpenEditModal = (course) => {
    setEditingCourse(course);
    setIsOpenEditModal(true);
  };

  const handleOpenDeleteModal = (course) => {
    setDeletingCourse(course);
    setIsOpenDeleteModal(true);
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

  const getImageSrc = (thumbnailUrl) => {
    if (!thumbnailUrl) return FALLBACK_THUMB;
    if (thumbnailUrl.startsWith("http")) return thumbnailUrl;
    return `${LMS_BASE_URL}${thumbnailUrl}`;
  };

  return (
    <div className={styles.coursesPage}>
      <div className={styles.heroCard}>
        <div>
          <h1>Quản lí khóa học</h1>
          <p>
            Theo dõi danh sách course, tìm kiếm nhanh và quản lí nội dung học
            tập trong hệ thống.
          </p>
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
            placeholder="Tìm theo tên khóa học, mô tả, giảng viên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className={styles.categorySelect}
          disabled={loadingCategories}
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          className={styles.resetBtn}
          onClick={handleResetFilter}
        >
          Đặt lại
        </button>
      </div>

      {errorText && <div className={styles.errorBox}>{errorText}</div>}

      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <span>Tổng khóa học</span>
          <strong>{pageInfo.totalElements}</strong>
        </div>

        <div className={styles.summaryCard}>
          <span>Trang hiện tại</span>
          <strong>{pageInfo.page + 1}</strong>
        </div>

        <div className={styles.summaryCard}>
          <span>Hiển thị</span>
          <strong>{filteredCourses.length}</strong>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingBox}>Đang tải danh sách khóa học...</div>
      ) : filteredCourses.length === 0 ? (
        <div className={styles.emptyBox}>
          Không có khóa học phù hợp với bộ lọc hiện tại.
        </div>
      ) : (
        <div className={styles.courseGrid}>
          {filteredCourses.map((course) => (
            <div className={styles.courseCard} key={course.id}>
              <div className={styles.thumbnailWrap}>
                <img
                  src={getImageSrc(course.thumbnailUrl)}
                  alt={course.title}
                  className={styles.thumbnail}
                />
                <span className={styles.categoryBadge}>
                  {course.categoryName ||
                    categoryMap[course.categoryId] ||
                    "Chưa phân loại"}
                </span>
              </div>

              <div className={styles.cardBody}>
                <h3>{course.title}</h3>
                <p>{course.description || "Chưa có mô tả cho khóa học này."}</p>

                <div className={styles.statusRow}>
                  <span className={styles.statusBadge}>
                    {course.status || "DRAFT"}
                  </span>
                  <span className={styles.visibilityBadge}>
                    {course.visibility || "PUBLIC"}
                  </span>
                </div>

                <div className={styles.metaList}>
                  <div className={styles.metaItem}>
                    <User size={16} />
                    <span>{course.instructorName || "Chưa có giảng viên"}</span>
                  </div>

                  <div className={styles.metaItem}>
                    <Tag size={16} />
                    <span>
                      {course.categoryName ||
                        categoryMap[course.categoryId] ||
                        "Chưa có danh mục"}
                    </span>
                  </div>

                  <div className={styles.metaItem}>
                    <BookOpen size={16} />
                    <span>Cấp độ: {course.level || "BEGINNER"}</span>
                  </div>

                  <div className={styles.metaItem}>
                    <FileText size={16} />
                    <span>Thời lượng: {course.estimatedHours ?? 0} giờ</span>
                  </div>
                </div>

                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.outlineBtn}
                    onClick={() => navigate(`/admin/courses/${course.id}`)}
                  >
                    Chi tiết
                  </button>

                  <button
                    type="button"
                    className={styles.editBtn}
                    onClick={() => handleOpenEditModal(course)}
                  >
                    Sửa
                  </button>

                  <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={() => handleOpenDeleteModal(course)}
                  >
                    <Trash2 size={16} />
                    <span>Xóa</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
