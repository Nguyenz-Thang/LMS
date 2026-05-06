import { useEffect, useMemo, useState } from "react";
import {
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import {
  createRole,
  deleteRole,
  getAllRoles,
  updateRole,
} from "../../api/roleApi";
import styles from "./Roles.module.scss";

const INITIAL_FORM = {
  name: "",
  description: "",
};

const SYSTEM_ROLES = ["ADMIN", "INSTRUCTOR", "STUDENT"];

function normalizeRole(rawRole) {
  return {
    name: rawRole?.name || "",
    description: rawRole?.description || "",
  };
}

function getRoleLabel(roleName) {
  switch (roleName) {
    case "ADMIN":
      return "Quản trị viên";
    case "INSTRUCTOR":
      return "Giảng viên";
    case "STUDENT":
      return "Học viên";
    default:
      return roleName;
  }
}

export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingRoleName, setEditingRoleName] = useState("");
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingName, setDeletingName] = useState("");
  const [errorText, setErrorText] = useState("");
  const [modalErrorText, setModalErrorText] = useState("");

  const fetchRoles = async () => {
    try {
      setLoading(true);
      setErrorText("");

      const res = await getAllRoles();
      const data = Array.isArray(res?.result) ? res.result : [];
      setRoles(data.map(normalizeRole));
    } catch (error) {
      setRoles([]);
      setErrorText(
        error?.response?.data?.message ||
          error?.message ||
          "Không tải được danh sách vai trò.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const filteredRoles = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return roles.filter((role) => {
      if (!normalizedKeyword) return true;

      return (
        role.name.toLowerCase().includes(normalizedKeyword) ||
        role.description.toLowerCase().includes(normalizedKeyword) ||
        getRoleLabel(role.name).toLowerCase().includes(normalizedKeyword)
      );
    });
  }, [roles, keyword]);

  const systemRolesCount = roles.filter((role) =>
    SYSTEM_ROLES.includes(role.name),
  ).length;
  const customRolesCount = Math.max(0, roles.length - systemRolesCount);

  const openCreateModal = () => {
    setIsModalOpen(true);
    setIsEditMode(false);
    setEditingRoleName("");
    setForm(INITIAL_FORM);
    setModalErrorText("");
  };

  const openEditModal = (role) => {
    setIsModalOpen(true);
    setIsEditMode(true);
    setEditingRoleName(role.name);
    setForm({
      name: role.name,
      description: role.description || "",
    });
    setModalErrorText("");
  };

  const closeModal = () => {
    if (saving) return;

    setIsModalOpen(false);
    setIsEditMode(false);
    setEditingRoleName("");
    setForm(INITIAL_FORM);
    setModalErrorText("");
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!form.name.trim() && !isEditMode) {
      return "Vui lòng nhập tên vai trò.";
    }

    if (!form.description.trim()) {
      return "Vui lòng nhập mô tả vai trò.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setModalErrorText(validationError);
      return;
    }

    try {
      setSaving(true);
      setModalErrorText("");

      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
      };

      if (isEditMode) {
        await updateRole(editingRoleName, {
          description: payload.description,
        });
      } else {
        await createRole(payload);
      }

      closeModal();
      await fetchRoles();
    } catch (error) {
      setModalErrorText(
        error?.response?.data?.message ||
          error?.message ||
          "Lưu vai trò thất bại.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa vai trò "${getRoleLabel(role.name)}"?`,
    );
    if (!confirmed) return;

    try {
      setDeletingName(role.name);
      setErrorText("");
      await deleteRole(role.name);
      await fetchRoles();
    } catch (error) {
      setErrorText(
        error?.response?.data?.message ||
          error?.message ||
          "Xóa vai trò thất bại.",
      );
    } finally {
      setDeletingName("");
    }
  };

  const resetSearch = () => {
    setKeyword("");
  };

  return (
    <div className={styles.page}>
      <div className={styles.headerBar}>
        <div className={styles.titleGroup}>
          <span className={styles.titleIcon}>
            <ShieldCheck size={22} />
          </span>
          <div>
            <h1>Quản lý vai trò</h1>
            <p>Quản lý danh sách vai trò và phân quyền trong hệ thống.</p>
          </div>
        </div>

        <button
          type="button"
          className={styles.addBtn}
          onClick={openCreateModal}
        >
          <Plus size={18} />
          <span>Thêm vai trò</span>
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Tìm tên vai trò hoặc mô tả..."
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
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

      <div className={styles.listHeader}>
        <div>
          <h2>Danh sách vai trò</h2>
          <p>
            Hiển thị {filteredRoles.length} / {roles.length} vai trò. Hệ thống{" "}
            {systemRolesCount}, tùy chỉnh {customRolesCount}.
          </p>
        </div>
      </div>

      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.stateBox}>Đang tải danh sách vai trò...</div>
        ) : filteredRoles.length === 0 ? (
          <div className={styles.stateBox}>
            Không có vai trò phù hợp với tìm kiếm hiện tại.
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.roleTable}>
              <thead>
                <tr>
                  <th>Vai trò</th>
                  <th>Mô tả</th>
                  <th>Loại</th>
                  <th>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {filteredRoles.map((role) => {
                  const isSystemRole = SYSTEM_ROLES.includes(role.name);

                  return (
                    <tr key={role.name}>
                      <td>
                        <div className={styles.roleCell}>
                          <span className={styles.roleIcon}>
                            <ShieldCheck size={17} />
                          </span>
                          <div>
                            <strong>{getRoleLabel(role.name)}</strong>
                            <span>{role.name}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className={styles.descriptionText}>
                          {role.description || "Chưa có mô tả"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={
                            isSystemRole ? styles.typeSystem : styles.typeCustom
                          }
                        >
                          {isSystemRole ? "Hệ thống" : "Tùy chỉnh"}
                        </span>
                      </td>

                      <td>
                        <div className={styles.actionGroup}>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            onClick={() => openEditModal(role)}
                            title="Sửa vai trò"
                            aria-label="Sửa vai trò"
                          >
                            <Pencil size={16} />
                          </button>

                          {!isSystemRole ? (
                            <button
                              type="button"
                              className={`${styles.iconBtn} ${styles.deleteAction}`}
                              onClick={() => handleDelete(role)}
                              disabled={deletingName === role.name}
                              title="Xóa vai trò"
                              aria-label="Xóa vai trò"
                            >
                              <Trash2 size={16} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={styles.iconBtn}
                              disabled
                              title="Không thể xóa vai trò hệ thống"
                              aria-label="Không thể xóa vai trò hệ thống"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
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
                <h2>{isEditMode ? "Sửa vai trò" : "Thêm vai trò"}</h2>
                <p>
                  {isEditMode
                    ? "Cập nhật mô tả vai trò."
                    : "Tạo vai trò mới để phân quyền trong hệ thống."}
                </p>
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

            <form onSubmit={handleSubmit} className={styles.form}>
              {modalErrorText ? (
                <div className={styles.modalError}>{modalErrorText}</div>
              ) : null}

              <label className={styles.formGroup}>
                <span>Tên vai trò</span>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  placeholder="Ví dụ: INSTRUCTOR"
                  disabled={isEditMode || saving}
                />
              </label>

              <label className={styles.formGroup}>
                <span>Mô tả</span>
                <textarea
                  name="description"
                  rows="4"
                  value={form.description}
                  onChange={handleFormChange}
                  placeholder="Nhập mô tả vai trò"
                  disabled={saving}
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
                  title="Lưu thay đổi"
                  aria-label="Lưu thay đổi"
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
