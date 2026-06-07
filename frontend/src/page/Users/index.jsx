import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Mail,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import {
  createUser,
  deleteUser,
  getUsers,
  updateUser,
} from "../../api/userApi";
import { getAllRoles } from "../../api/roleApi";
import { LMS_BASE_URL } from "../../api/courseApi";
import styles from "./Users.module.scss";

const INITIAL_FORM = {
  username: "",
  email: "",
  password: "",
  fullName: "",
  dob: "",
  avatar: "",
  role: "",
};

function normalizeUser(rawUser) {
  return {
    id: rawUser?.id || "",
    username: rawUser?.username || "",
    email: rawUser?.email || "",
    fullName: rawUser?.fullName || "",
    avatar: rawUser?.avatar || "",
    dob: rawUser?.dob || "",
    role:
      rawUser?.role?.name ||
      rawUser?.role ||
      (Array.isArray(rawUser?.roles) ? rawUser.roles[0]?.name : "") ||
      "",
  };
}

function normalizeRole(rawRole) {
  return {
    name: rawRole?.name || "",
    description: rawRole?.description || "",
  };
}

function formatDate(value) {
  if (!value) return "Chưa cập nhật";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("vi-VN");
}

function buildImageUrl(value) {
  if (!value) return "";
  if (value.startsWith("http")) return value;
  if (value.startsWith("/")) return `${LMS_BASE_URL}${value}`;
  return `${LMS_BASE_URL}/${value}`;
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

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [keyword, setKeyword] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [errorText, setErrorText] = useState("");
  const [modalErrorText, setModalErrorText] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState("");
  const [form, setForm] = useState(INITIAL_FORM);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setErrorText("");

      const res = await getUsers();
      const data = Array.isArray(res?.result) ? res.result : [];
      setUsers(data.map(normalizeUser));
    } catch (error) {
      setUsers([]);
      setErrorText(
        error?.response?.data?.message ||
          error?.message ||
          "Không tải được danh sách người dùng.",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      setLoadingRoles(true);
      const res = await getAllRoles();
      const data = Array.isArray(res?.result) ? res.result : [];
      setRoles(data.map(normalizeRole));
    } catch (error) {
      console.error("Fetch roles error:", error);
    } finally {
      setLoadingRoles(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const filteredUsers = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return users.filter((user) => {
      const searchableText = [
        user.username,
        user.email,
        user.fullName,
        user.id,
        user.role,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesKeyword =
        !normalizedKeyword || searchableText.includes(normalizedKeyword);

      const matchesRole =
        roleFilter === "ALL" || user.role === roleFilter;

      return matchesKeyword && matchesRole;
    });
  }, [users, keyword, roleFilter]);

  const adminCount = users.filter((user) => user.role === "ADMIN").length;
  const instructorCount = users.filter((user) => user.role === "INSTRUCTOR").length;
  const studentCount = users.filter((user) => user.role === "STUDENT").length;

  const resetFilters = () => {
    setKeyword("");
    setRoleFilter("ALL");
  };

  const openCreateModal = () => {
    setIsModalOpen(true);
    setIsEditMode(false);
    setEditingUserId("");
    setModalErrorText("");
    setForm(INITIAL_FORM);
  };

  const openEditModal = (user) => {
    setIsModalOpen(true);
    setIsEditMode(true);
    setEditingUserId(user.id);
    setModalErrorText("");
    setForm({
      username: user.username || "",
      email: user.email || "",
      password: "",
      fullName: user.fullName || "",
      dob: user.dob || "",
      avatar: user.avatar || "",
      role: user.role || "",
    });
  };

  const closeModal = () => {
    if (saving) return;

    setIsModalOpen(false);
    setIsEditMode(false);
    setEditingUserId("");
    setModalErrorText("");
    setForm(INITIAL_FORM);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRoleChange = (roleName) => {
    setForm((prev) => ({
      ...prev,
      role: roleName,
    }));
  };

  const validateForm = () => {
    if (!form.username.trim()) return "Vui lòng nhập tên đăng nhập.";
    if (!isEditMode && !form.email.trim()) return "Vui lòng nhập email.";
    if (!isEditMode && !form.password.trim()) return "Vui lòng nhập mật khẩu.";
    return "";
  };

  const buildCreatePayload = () => ({
    username: form.username.trim(),
    email: form.email.trim(),
    password: form.password,
    fullName: form.fullName.trim(),
    dob: form.dob || null,
    role: form.role || null,
  });

  const buildUpdatePayload = () => ({
    email: form.email.trim(),
    password: form.password.trim() || null,
    fullName: form.fullName.trim(),
    avatar: form.avatar.trim(),
    dob: form.dob || null,
    role: form.role || null,
  });

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

      if (isEditMode) {
        await updateUser(editingUserId, buildUpdatePayload());
      } else {
        await createUser(buildCreatePayload());
      }

      await fetchUsers();
      closeModal();
    } catch (error) {
      setModalErrorText(
        error?.response?.data?.message ||
          error?.message ||
          "Lưu người dùng thất bại.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa người dùng "${user.username}"?`,
    );
    if (!confirmed) return;

    try {
      setDeletingId(user.id);
      setErrorText("");
      await deleteUser(user.id);
      await fetchUsers();
    } catch (error) {
      setErrorText(
        error?.response?.data?.message ||
          error?.message ||
          "Xóa người dùng thất bại.",
      );
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.headerBar}>
        <div className={styles.titleGroup}>
          <span className={styles.titleIcon}>
            <Users size={22} />
          </span>
          <div>
            <h1>Quản lý người dùng</h1>
            <p>Quản lý tài khoản, thông tin cá nhân và vai trò trong hệ thống.</p>
          </div>
        </div>

        <button
          type="button"
          className={styles.addBtn}
          onClick={openCreateModal}
        >
          <Plus size={18} />
          <span>Thêm người dùng</span>
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Tìm tên đăng nhập, email, họ tên hoặc vai trò..."
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>

        <div className={styles.filterBox}>
          <Shield size={16} />
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            aria-label="Lọc vai trò"
          >
            <option value="ALL">Tất cả vai trò</option>
            {roles.map((role) => (
              <option key={role.name} value={role.name}>
                {getRoleLabel(role.name)}
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
          <h2>Danh sách người dùng</h2>
          <p>
            Hiển thị {filteredUsers.length} / {users.length} người dùng. Quản
            trị {adminCount}, giảng viên {instructorCount}, học viên{" "}
            {studentCount}.
          </p>
        </div>
      </div>

      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.stateBox}>
            Đang tải danh sách người dùng...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className={styles.stateBox}>
            Không có người dùng phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.userTable}>
              <thead>
                <tr>
                  <th>Người dùng</th>
                  <th>Email</th>
                  <th>Họ tên</th>
                  <th>Ngày sinh</th>
                  <th>Vai trò</th>
                  <th>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className={styles.userCell}>
                        <span className={styles.avatar}>
                          {user.avatar ? (
                            <img
                              src={buildImageUrl(user.avatar)}
                              alt={user.username}
                            />
                          ) : (
                            <UserRound size={17} />
                          )}
                        </span>
                        <div>
                          <strong>{user.username || "Chưa có tên đăng nhập"}</strong>
                          <span>{user.id}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className={styles.infoCell}>
                        <Mail size={14} />
                        {user.email || "Chưa cập nhật"}
                      </span>
                    </td>

                    <td>
                      <span className={styles.textCell}>
                        {user.fullName || "Chưa cập nhật"}
                      </span>
                    </td>

                    <td>
                      <span className={styles.infoCell}>
                        <CalendarDays size={14} />
                        {formatDate(user.dob)}
                      </span>
                    </td>

                    <td>
                      <div className={styles.roleList}>
                        {user.role ? (
                          <span className={styles.roleTag}>
                            {getRoleLabel(user.role)}
                          </span>
                        ) : (
                          <span className={styles.emptyRole}>
                            Chưa có vai trò
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <div className={styles.actionGroup}>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          onClick={() => openEditModal(user)}
                          title="Sửa người dùng"
                          aria-label="Sửa người dùng"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          className={`${styles.iconBtn} ${styles.deleteAction}`}
                          onClick={() => handleDelete(user)}
                          disabled={deletingId === user.id}
                          title="Xóa người dùng"
                          aria-label="Xóa người dùng"
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
                <h2>{isEditMode ? "Sửa người dùng" : "Thêm người dùng"}</h2>
                <p>
                  {isEditMode
                    ? "Cập nhật thông tin tài khoản và vai trò người dùng."
                    : "Tạo tài khoản người dùng mới trong hệ thống."}
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

              <div className={styles.formGrid}>
                <label className={styles.formGroup}>
                  <span>Tên đăng nhập</span>
                  <input
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    disabled={isEditMode || saving}
                    placeholder="Nhập tên đăng nhập"
                  />
                </label>

                <label className={styles.formGroup}>
                  <span>Email</span>
                  <input
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="Nhập email"
                  />
                </label>

                <label className={styles.formGroup}>
                  <span>Họ tên</span>
                  <input
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="Nhập họ tên"
                  />
                </label>

                <label className={styles.formGroup}>
                  <span>Ngày sinh</span>
                  <input
                    name="dob"
                    type="date"
                    value={form.dob}
                    onChange={handleChange}
                    disabled={saving}
                  />
                </label>

                <label className={styles.formGroup}>
                  <span>{isEditMode ? "Mật khẩu mới" : "Mật khẩu"}</span>
                  <input
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder={
                      isEditMode ? "Để trống nếu không đổi" : "Nhập mật khẩu"
                    }
                  />
                </label>

                <label className={styles.formGroup}>
                  <span>Ảnh đại diện</span>
                  <input
                    name="avatar"
                    value={form.avatar}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="Nhập đường dẫn ảnh đại diện"
                  />
                </label>
              </div>

              <label className={styles.formGroup}>
                <span>Vai trò</span>
                <div className={styles.rolePicker}>
                  {loadingRoles ? (
                    <div className={styles.roleLoading}>
                      Đang tải vai trò...
                    </div>
                  ) : roles.length === 0 ? (
                    <div className={styles.roleLoading}>Không có vai trò.</div>
                  ) : (
                    roles.map((role) => (
                      <label key={role.name} className={styles.roleOption}>
                        <input
                          type="radio"
                          name="role"
                          checked={form.role === role.name}
                          onChange={() => handleRoleChange(role.name)}
                          disabled={saving}
                        />
                        <span>{getRoleLabel(role.name)}</span>
                      </label>
                    ))
                  )}
                </div>
              </label>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelAction}
                  onClick={closeModal}
                  disabled={saving}
                  title="Hủy"
                  aria-label="Hủy"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  className={styles.saveAction}
                  disabled={saving}
                  title={isEditMode ? "Lưu thay đổi" : "Thêm người dùng"}
                  aria-label={isEditMode ? "Lưu thay đổi" : "Thêm người dùng"}
                >
                  {saving
                    ? "Đang lưu..."
                    : isEditMode
                      ? "Lưu thay đổi"
                      : "Thêm người dùng"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
