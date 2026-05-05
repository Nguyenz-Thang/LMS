import { useEffect, useMemo, useState } from "react";
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from "../../api/categoryApi";
import {
  FileText,
  FolderTree,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import styles from "./Category.module.scss";

const INITIAL_FORM = {
  name: "",
  description: "",
};

function formatDate(value) {
  if (!value) return "Chưa có";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có";

  return date.toLocaleString("vi-VN");
}

export default function Category() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [search, setSearch] = useState("");
  const [errorText, setErrorText] = useState("");
  const [modalError, setModalError] = useState("");

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setErrorText("");
      const data = await getCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Load categories failed:", error);
      setCategories([]);
      setErrorText("Không tải được danh sách danh mục.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const filteredCategories = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return categories;

    return categories.filter((category) => {
      const name = category?.name?.toLowerCase() || "";
      const description = category?.description?.toLowerCase() || "";
      return name.includes(keyword) || description.includes(keyword);
    });
  }, [categories, search]);

  const openCreateModal = () => {
    setForm(INITIAL_FORM);
    setEditingCategory(null);
    setModalError("");
    setIsModalOpen(true);
  };

  const openEditModal = (category) => {
    setForm({
      name: category.name || "",
      description: category.description || "",
    });
    setEditingCategory(category);
    setModalError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setForm(INITIAL_FORM);
    setModalError("");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setModalError("Tên danh mục không được để trống.");
      return;
    }

    try {
      setSaving(true);
      setErrorText("");
      setModalError("");

      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
      };

      if (editingCategory?.id) {
        await updateCategory(editingCategory.id, payload);
      } else {
        await createCategory(payload);
      }

      closeModal();
      await fetchCategories();
    } catch (error) {
      console.error("Save category failed:", error);
      setModalError("Lưu danh mục thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa danh mục "${category.name}"?`,
    );
    if (!confirmed) return;

    try {
      setDeletingId(category.id);
      setErrorText("");
      await deleteCategory(category.id);
      await fetchCategories();
    } catch (error) {
      console.error("Delete category failed:", error);
      setErrorText("Xóa danh mục thất bại.");
    } finally {
      setDeletingId("");
    }
  };

  const resetSearch = () => {
    setSearch("");
  };

  return (
    <div className={styles.categoryPage}>
      <div className={styles.headerBar}>
        <div className={styles.titleGroup}>
          <span className={styles.titleIcon}>
            <FolderTree size={22} />
          </span>
          <div>
            <h1>Quản lý danh mục</h1>
            <p>Quản lý nhóm khóa học dùng để phân loại nội dung trong hệ thống.</p>
          </div>
        </div>

        <button
          type="button"
          className={styles.addBtn}
          onClick={openCreateModal}
        >
          <Plus size={18} />
          <span>Thêm danh mục</span>
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm tên hoặc mô tả danh mục..."
          />
        </div>

        <button
          type="button"
          className={styles.resetBtn}
          onClick={resetSearch}
          title="Đặt lại tìm kiếm"
          aria-label="Đặt lại tìm kiếm"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {errorText ? <div className={styles.errorBox}>{errorText}</div> : null}

      <div className={styles.summaryStrip}>
        <div>
          <span>Tổng danh mục</span>
          <strong>{categories.length}</strong>
        </div>
        <div>
          <span>Đang hiển thị</span>
          <strong>{filteredCategories.length}</strong>
        </div>
      </div>

      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.stateBox}>Đang tải danh sách danh mục...</div>
        ) : filteredCategories.length === 0 ? (
          <div className={styles.stateBox}>
            Không có danh mục phù hợp với tìm kiếm hiện tại.
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.categoryTable}>
              <thead>
                <tr>
                  <th>Danh mục</th>
                  <th>Mô tả</th>
                  <th>Ngày tạo</th>
                  <th>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {filteredCategories.map((category) => (
                  <tr key={category.id}>
                    <td>
                      <div className={styles.categoryCell}>
                        <span className={styles.categoryIcon}>
                          <FolderTree size={18} />
                        </span>
                        <strong>{category.name || "Chưa đặt tên"}</strong>
                      </div>
                    </td>

                    <td>
                      <span className={styles.descriptionCell}>
                        <FileText size={15} />
                        {category.description || "Chưa có mô tả"}
                      </span>
                    </td>

                    <td>
                      <span className={styles.dateCell}>
                        {formatDate(category.createdAt)}
                      </span>
                    </td>

                    <td>
                      <div className={styles.actionGroup}>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          onClick={() => openEditModal(category)}
                          title="Sửa danh mục"
                          aria-label="Sửa danh mục"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          className={`${styles.iconBtn} ${styles.deleteAction}`}
                          onClick={() => handleDelete(category)}
                          disabled={deletingId === category.id}
                          title="Xóa danh mục"
                          aria-label="Xóa danh mục"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
                <h2>
                  {editingCategory ? "Sửa danh mục" : "Thêm danh mục"}
                </h2>
                <p>
                  {editingCategory
                    ? "Cập nhật tên và mô tả danh mục khóa học."
                    : "Tạo danh mục mới để sắp xếp các khóa học."}
                </p>
              </div>

              <button
                type="button"
                className={styles.iconBtn}
                onClick={closeModal}
                title="Đóng"
                aria-label="Đóng"
              >
                <X size={17} />
              </button>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              {modalError ? (
                <div className={styles.modalError}>{modalError}</div>
              ) : null}

              <label className={styles.formGroup}>
                <span>Tên danh mục</span>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Nhập tên danh mục"
                  autoFocus
                />
              </label>

              <label className={styles.formGroup}>
                <span>Mô tả</span>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Nhập mô tả ngắn cho danh mục"
                  rows="4"
                />
              </label>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={closeModal}
                  disabled={saving}
                  title="Hủy"
                  aria-label="Hủy"
                >
                  <X size={17} />
                </button>

                <button
                  type="submit"
                  className={`${styles.iconBtn} ${styles.saveAction}`}
                  disabled={saving}
                  title={editingCategory ? "Lưu thay đổi" : "Thêm danh mục"}
                  aria-label={editingCategory ? "Lưu thay đổi" : "Thêm danh mục"}
                >
                  <Save size={17} />
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
