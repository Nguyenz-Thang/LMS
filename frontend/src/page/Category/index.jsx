import { useEffect, useState } from "react";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../../api/categoryApi";
import styles from "./Category.module.scss";
import { Pencil, Trash2, Plus, Tag } from "lucide-react";

export default function Category() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error("Load categories failed:", error);
      alert("Không tải được danh mục");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const resetForm = () => {
    setForm({ name: "", description: "" });
    setEditingId(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("Tên danh mục không được để trống");
      return;
    }

    try {
      if (editingId) {
        await updateCategory(editingId, form);
        alert("Cập nhật danh mục thành công");
      } else {
        await createCategory(form);
        alert("Thêm danh mục thành công");
      }

      resetForm();
      fetchCategories();
    } catch (error) {
      console.error("Save category failed:", error);
      alert("Lưu danh mục thất bại");
    }
  };

  const handleEdit = (category) => {
    setForm({
      name: category.name || "",
      description: category.description || "",
    });
    setEditingId(category.id);
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Bạn có chắc muốn xoá danh mục này?");
    if (!confirmed) return;

    try {
      await deleteCategory(id);
      alert("Xoá danh mục thành công");
      fetchCategories();
    } catch (error) {
      console.error("Delete category failed:", error);
      alert("Xoá danh mục thất bại");
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.titleBox}>
          <Tag size={28} />
          <div>
            <h1>Quản lý danh mục</h1>
            <p>Thêm, sửa, xoá danh mục khóa học</p>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.formCard}>
          <h2>{editingId ? "Cập nhật danh mục" : "Thêm danh mục mới"}</h2>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label>Tên danh mục</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Nhập tên danh mục"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Mô tả</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Nhập mô tả danh mục"
                rows="4"
              />
            </div>

            <div className={styles.actions}>
              <button type="submit" className={styles.saveBtn}>
                <Plus size={18} />
                {editingId ? "Cập nhật" : "Thêm mới"}
              </button>

              {editingId && (
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={resetForm}
                >
                  Huỷ
                </button>
              )}
            </div>
          </form>
        </div>

        <div className={styles.tableCard}>
          <h2>Danh sách danh mục</h2>

          {loading ? (
            <p className={styles.loadingText}>Đang tải dữ liệu...</p>
          ) : categories.length === 0 ? (
            <p className={styles.emptyText}>Chưa có danh mục nào</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Tên danh mục</th>
                  <th>Mô tả</th>
                  <th>Ngày tạo</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td>{category.name}</td>
                    <td>{category.description || "—"}</td>
                    <td>
                      {category.createdAt
                        ? new Date(category.createdAt).toLocaleString("vi-VN")
                        : "—"}
                    </td>
                    <td>
                      <div className={styles.actionBtns}>
                        <button
                          className={styles.editBtn}
                          onClick={() => handleEdit(category)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => handleDelete(category.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
