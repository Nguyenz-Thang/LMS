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
import api from "../../api/axios";
import AddCourseModal from "../../components/AddCourseModal";
import EditCourseModal from "../../components/EditCourseModal";
import DeleteCourseModal from "../../components/DeleteCourseModal";
import styles from "./Courses.module.scss";
import { useNavigate } from "react-router-dom";
const PAGE_SIZE = 6;
const BACKEND_BASE_URL = "http://localhost:8080/lms";
const FALLBACK_THUMB =
  "https://images.unsplash.com/photo-1513258496099-48168024aec0?q=80&w=1200&auto=format&fit=crop";

// Thay id bằng category thật trong DB của bạn
const MOCK_CATEGORIES = [
  {
    id: "89d47524-23b2-11f1-bec9-1a3a6529bc34",
    name: "Programming",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Frontend",
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    name: "Backend",
  },
];

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [pageInfo, setPageInfo] = useState({
    page: 0,
    size: PAGE_SIZE,
    totalElements: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [page, setPage] = useState(0);

  const [isOpenAddModal, setIsOpenAddModal] = useState(false);
  const [isOpenEditModal, setIsOpenEditModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [isOpenDeleteModal, setIsOpenDeleteModal] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState(null);
  const navigate = useNavigate();
  useEffect(() => {
    fetchCourses(page);
  }, [page]);

  const fetchCourses = async (currentPage = 0) => {
    try {
      setLoading(true);
      setErrorText("");

      const res = await api.get("/courses", {
        params: {
          page: currentPage,
          size: PAGE_SIZE,
        },
      });

      const payload = res?.data?.result || {};
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
        error?.response?.data?.message || "Không tải được danh sách khóa học.",
      );
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    const raw = courses.map((item) => item?.categoryName).filter(Boolean);
    const fromCourseList = [...new Set(raw)].map((name) => ({
      id: name,
      name,
    }));

    return fromCourseList.length > 0 ? fromCourseList : MOCK_CATEGORIES;
  }, [courses]);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchSearch =
        !search ||
        course?.title?.toLowerCase().includes(search.toLowerCase()) ||
        course?.description?.toLowerCase().includes(search.toLowerCase()) ||
        course?.instructorName?.toLowerCase().includes(search.toLowerCase());

      const matchCategory =
        !selectedCategory || course?.categoryName === selectedCategory;

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
  };

  const getImageSrc = (thumbnailUrl) => {
    if (!thumbnailUrl) return FALLBACK_THUMB;
    if (thumbnailUrl.startsWith("http")) return thumbnailUrl;
    return `${BACKEND_BASE_URL}${thumbnailUrl}`;
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
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((category) => (
            <option key={category.id} value={category.name}>
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
                  {course.categoryName || "Chưa phân loại"}
                </span>
              </div>

              <div className={styles.cardBody}>
                <h3>{course.title}</h3>
                <p>{course.description || "Chưa có mô tả cho khóa học này."}</p>

                <div className={styles.metaList}>
                  <div className={styles.metaItem}>
                    <BookOpen size={16} />
                    <span>ID: {course.id?.slice(0, 8)}...</span>
                  </div>

                  <div className={styles.metaItem}>
                    <User size={16} />
                    <span>{course.instructorName || "Chưa có giảng viên"}</span>
                  </div>

                  <div className={styles.metaItem}>
                    <Tag size={16} />
                    <span>{course.categoryName || "Chưa có danh mục"}</span>
                  </div>

                  <div className={styles.metaItem}>
                    <FileText size={16} />
                    <span>Mô tả ngắn</span>
                  </div>
                </div>

                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.outlineBtn}
                    onClick={() => navigate(`/admin/lessons/${course.id}`)}
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
        categories={MOCK_CATEGORIES}
      />

      <EditCourseModal
        isOpen={isOpenEditModal}
        onClose={() => {
          setIsOpenEditModal(false);
          setEditingCourse(null);
        }}
        onUpdated={handleUpdatedCourse}
        course={editingCourse}
        categories={MOCK_CATEGORIES}
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
