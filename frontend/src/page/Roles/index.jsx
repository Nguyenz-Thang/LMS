import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  Plus,
  Search,
  Pencil,
  Trash2,
  RefreshCw,
  X,
  Save,
} from "lucide-react";
import {
  getAllRoles,
  createRole,
  updateRole,
  deleteRole,
} from "../../api/roleApi";
import styles from "./Roles.module.scss";

const INITIAL_FORM = {
  name: "",
  description: "",
};

const SYSTEM_ROLES = ["ADMIN", "STUDENT"];

function normalizeRole(rawRole) {
  return {
    name: rawRole?.name || "",
    description: rawRole?.description || "",
  };
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
        role.description.toLowerCase().includes(normalizedKeyword)
      );
    });
  }, [roles, keyword]);

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

  const handleFormChange = (e) => {
    const { name, value } = e.target;
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

  const handleSubmit = async (e) => {
    e.preventDefault();

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
      `Bạn có chắc muốn xóa vai trò "${role.name}" không?`,
    );

    if (!confirmed) return;

    try {
      await deleteRole(role.name);
      await fetchRoles();
    } catch (error) {
      alert(
        error?.response?.data?.message ||
          error?.message ||
          "Xóa vai trò thất bại.",
      );
    }
  };

  const totalRoles = roles.length;
  const systemRolesCount = roles.filter((role) =>
    SYSTEM_ROLES.includes(role.name),
  ).length;
  const customRolesCount = Math.max(0, totalRoles - systemRolesCount);

  return (
    <div className={styles.page}>
      <div className={styles.headerCard}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <ShieldCheck size={24} />
          </div>

          <div>
            <h1>Quản lý vai trò</h1>
            <p>
              Quản lý danh sách vai trò hệ thống, tạo mới, cập nhật và kiểm soát
              phân quyền theo vai trò.
            </p>
          </div>
        </div>

        <button
          type="button"
          className={styles.primaryBtn}
          onClick={openCreateModal}
        >
          <Plus size={16} />
          <span>Thêm vai trò</span>
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Tìm theo tên vai trò hoặc mô tả..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        <button
          type="button"
          className={styles.refreshBtn}
          onClick={fetchRoles}
        >
          <RefreshCw size={16} />
          <span>Làm mới</span>
        </button>
      </div>

      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <span>Tổng vai trò</span>
          <strong>{totalRoles}</strong>
        </div>

        <div className={styles.summaryCard}>
          <span>Vai trò hệ thống</span>
          <strong>{systemRolesCount}</strong>
        </div>

        <div className={styles.summaryCard}>
          <span>Vai trò tùy chỉnh</span>
          <strong>{customRolesCount}</strong>
        </div>

        <div className={styles.summaryCard}>
          <span>Kết quả hiển thị</span>
          <strong>{filteredRoles.length}</strong>
        </div>
      </div>

      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.stateBox}>Đang tải danh sách vai trò...</div>
        ) : errorText ? (
          <div className={styles.errorBox}>{errorText}</div>
        ) : filteredRoles.length === 0 ? (
          <div className={styles.stateBox}>Không có vai trò nào phù hợp.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: "70px" }}>STT</th>
                  <th style={{ width: "220px" }}>Tên vai trò</th>
                  <th>Mô tả</th>
                  <th style={{ width: "170px" }}>Loại</th>
                  <th style={{ width: "230px" }}>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {filteredRoles.map((role, index) => {
                  const isSystemRole = SYSTEM_ROLES.includes(role.name);

                  return (
                    <tr key={role.name}>
                      <td>{index + 1}</td>

                      <td>
                        <div className={styles.roleCell}>
                          <span className={styles.roleName}>{role.name}</span>
                        </div>
                      </td>

                      <td>
                        <span className={styles.descriptionText}>
                          {role.description || "Không có mô tả"}
                        </span>
                      </td>

                      <td>
                        {isSystemRole ? (
                          <span className={styles.typeSystem}>Hệ thống</span>
                        ) : (
                          <span className={styles.typeCustom}>Tùy chỉnh</span>
                        )}
                      </td>

                      <td>
                        <div className={styles.actionGroup}>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            onClick={() => openEditModal(role)}
                            title="Chỉnh sửa"
                          >
                            <Pencil size={16} />
                            <span>Sửa</span>
                          </button>

                          {!isSystemRole ? (
                            <button
                              type="button"
                              className={styles.dangerBtn}
                              onClick={() => handleDelete(role)}
                              title="Xóa vai trò"
                            >
                              <Trash2 size={16} />
                              <span>Xóa</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={styles.disabledBtn}
                              disabled
                              title="Không thể xóa vai trò hệ thống"
                            >
                              <Trash2 size={16} />
                              <span>Khóa</span>
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
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <h2>{isEditMode ? "Chỉnh sửa vai trò" : "Thêm vai trò mới"}</h2>
                <p>
                  {isEditMode
                    ? "Cập nhật thông tin mô tả vai trò."
                    : "Tạo mới một vai trò để phục vụ phân quyền hệ thống."}
                </p>
              </div>

              <button
                type="button"
                className={styles.closeBtn}
                onClick={closeModal}
                disabled={saving}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label htmlFor="name">Tên vai trò</label>
                <input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  placeholder="Ví dụ: INSTRUCTOR"
                  disabled={isEditMode || saving}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="description">Mô tả</label>
                <textarea
                  id="description"
                  name="description"
                  rows="4"
                  value={form.description}
                  onChange={handleFormChange}
                  placeholder="Nhập mô tả vai trò..."
                  disabled={saving}
                />
              </div>

              {modalErrorText ? (
                <div className={styles.modalErrorBox}>{modalErrorText}</div>
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

                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={saving}
                >
                  <Save size={16} />
                  <span>{saving ? "Đang lưu..." : "Lưu thay đổi"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
