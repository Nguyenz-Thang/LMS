import { useEffect, useMemo, useState } from "react";
import {
  Users,
  Search,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Mail,
  Shield,
  CalendarDays,
  User as UserIcon,
} from "lucide-react";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../../api/userApi";
import { getAllRoles } from "../../api/roleApi";
import styles from "./Users.module.scss";

const INITIAL_FORM = {
  username: "",
  email: "",
  password: "",
  fullName: "",
  dob: "",
  avatar: "",
  roles: [],
};

function normalizeUser(rawUser) {
  return {
    id: rawUser?.id || "",
    username: rawUser?.username || "",
    email: rawUser?.email || "",
    fullName: rawUser?.fullName || "",
    avatar: rawUser?.avatar || "",
    dob: rawUser?.dob || "",
    roles: Array.isArray(rawUser?.roles)
      ? rawUser.roles.map((role) => role?.name).filter(Boolean)
      : [],
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

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [saving, setSaving] = useState(false);

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
      const matchesKeyword =
        !normalizedKeyword ||
        user.username.toLowerCase().includes(normalizedKeyword) ||
        user.email.toLowerCase().includes(normalizedKeyword) ||
        user.fullName.toLowerCase().includes(normalizedKeyword) ||
        user.id.toLowerCase().includes(normalizedKeyword);

      const matchesRole =
        roleFilter === "ALL" || user.roles.includes(roleFilter);

      return matchesKeyword && matchesRole;
    });
  }, [users, keyword, roleFilter]);

  const totalUsers = users.length;
  const adminCount = users.filter((user) =>
    user.roles.includes("ADMIN"),
  ).length;
  const studentCount = users.filter((user) =>
    user.roles.includes("STUDENT"),
  ).length;

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
      roles: Array.isArray(user.roles) ? user.roles : [],
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

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRoleChange = (roleName) => {
    setForm((prev) => {
      const currentRoles = Array.isArray(prev.roles) ? prev.roles : [];
      const exists = currentRoles.includes(roleName);

      return {
        ...prev,
        roles: exists
          ? currentRoles.filter((role) => role !== roleName)
          : [...currentRoles, roleName],
      };
    });
  };

  const validateForm = () => {
    if (!form.username.trim()) {
      return "Vui lòng nhập username.";
    }

    if (!isEditMode && !form.email.trim()) {
      return "Vui lòng nhập email.";
    }

    if (!isEditMode && !form.password.trim()) {
      return "Vui lòng nhập mật khẩu.";
    }

    return "";
  };

  const buildCreatePayload = () => {
    return {
      username: form.username.trim(),
      email: form.email.trim(),
      password: form.password,
      fullName: form.fullName.trim(),
      dob: form.dob || null,
    };
  };

  const buildUpdatePayload = () => {
    return {
      email: form.email.trim(),
      password: form.password.trim() || null,
      fullName: form.fullName.trim(),
      avatar: form.avatar.trim(),
      dob: form.dob || null,
      roles: form.roles,
    };
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
      `Bạn có chắc muốn xóa người dùng "${user.username}" không?`,
    );
    if (!confirmed) return;

    try {
      await deleteUser(user.id);
      await fetchUsers();
    } catch (error) {
      alert(
        error?.response?.data?.message ||
          error?.message ||
          "Xóa người dùng thất bại.",
      );
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.headerCard}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <Users size={24} />
          </div>

          <div>
            <h1>Quản lý người dùng</h1>
            <p>
              Quản lý tài khoản người dùng, thông tin cá nhân và vai trò trong
              hệ thống.
            </p>
          </div>
        </div>

        <button
          type="button"
          className={styles.primaryBtn}
          onClick={openCreateModal}
        >
          <Plus size={16} />
          <span>Thêm người dùng</span>
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Tìm theo username, email, họ tên hoặc mã..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        <div className={styles.filterBox}>
          <div className={styles.filterLabel}>
            <Shield size={16} />
            <span>Vai trò</span>
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="ALL">Tất cả</option>
            {roles.map((role) => (
              <option key={role.name} value={role.name}>
                {role.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className={styles.refreshBtn}
          onClick={fetchUsers}
        >
          <RefreshCw size={16} />
          <span>Làm mới</span>
        </button>
      </div>

      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <span>Tổng người dùng</span>
          <strong>{totalUsers}</strong>
        </div>

        <div className={styles.summaryCard}>
          <span>Quản trị viên</span>
          <strong>{adminCount}</strong>
        </div>

        <div className={styles.summaryCard}>
          <span>Học viên</span>
          <strong>{studentCount}</strong>
        </div>

        <div className={styles.summaryCard}>
          <span>Kết quả hiển thị</span>
          <strong>{filteredUsers.length}</strong>
        </div>
      </div>

      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.stateBox}>
            Đang tải danh sách người dùng...
          </div>
        ) : errorText ? (
          <div className={styles.errorBox}>{errorText}</div>
        ) : filteredUsers.length === 0 ? (
          <div className={styles.stateBox}>Không có người dùng phù hợp.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: "70px" }}>STT</th>
                  <th style={{ width: "220px" }}>Người dùng</th>
                  <th style={{ width: "240px" }}>Email</th>
                  <th>Họ tên</th>
                  <th style={{ width: "160px" }}>Ngày sinh</th>
                  <th style={{ width: "240px" }}>Vai trò</th>
                  <th style={{ width: "220px" }}>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user, index) => (
                  <tr key={user.id}>
                    <td>{index + 1}</td>

                    <td>
                      <div className={styles.userCell}>
                        <div className={styles.userNameRow}>
                          <UserIcon size={14} />
                          <span className={styles.userName}>
                            {user.username || "Không có username"}
                          </span>
                        </div>
                        <span className={styles.userId}>{user.id}</span>
                      </div>
                    </td>

                    <td>
                      <div className={styles.infoCell}>
                        <Mail size={14} />
                        <span>{user.email || "Chưa cập nhật"}</span>
                      </div>
                    </td>

                    <td>
                      <span className={styles.fullNameText}>
                        {user.fullName || "Chưa cập nhật"}
                      </span>
                    </td>

                    <td>
                      <div className={styles.infoCell}>
                        <CalendarDays size={14} />
                        <span>{formatDate(user.dob)}</span>
                      </div>
                    </td>

                    <td>
                      <div className={styles.roleList}>
                        {user.roles.length > 0 ? (
                          user.roles.map((role) => (
                            <span
                              key={`${user.id}-${role}`}
                              className={styles.roleTag}
                            >
                              {role}
                            </span>
                          ))
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
                        >
                          <Pencil size={16} />
                          <span>Sửa</span>
                        </button>

                        <button
                          type="button"
                          className={styles.dangerBtn}
                          onClick={() => handleDelete(user)}
                        >
                          <Trash2 size={16} />
                          <span>Xóa</span>
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
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <h2>
                  {isEditMode ? "Chỉnh sửa người dùng" : "Thêm người dùng mới"}
                </h2>
                <p>
                  {isEditMode
                    ? "Cập nhật thông tin tài khoản và vai trò người dùng."
                    : "Tạo mới tài khoản người dùng trong hệ thống."}
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
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="username">Username</label>
                  <input
                    id="username"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    disabled={isEditMode || saving}
                    placeholder="Nhập username"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="Nhập email"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="fullName">Họ tên</label>
                  <input
                    id="fullName"
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="Nhập họ tên"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="dob">Ngày sinh</label>
                  <input
                    id="dob"
                    name="dob"
                    type="date"
                    value={form.dob}
                    onChange={handleChange}
                    disabled={saving}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="password">
                    {isEditMode ? "Mật khẩu mới" : "Mật khẩu"}
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder={
                      isEditMode ? "Để trống nếu không đổi" : "Nhập mật khẩu"
                    }
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="avatar">Avatar URL</label>
                  <input
                    id="avatar"
                    name="avatar"
                    value={form.avatar}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="Nhập đường dẫn ảnh đại diện"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Vai trò</label>
                <div className={styles.rolePicker}>
                  {loadingRoles ? (
                    <div className={styles.roleLoading}>
                      Đang tải vai trò...
                    </div>
                  ) : roles.length === 0 ? (
                    <div className={styles.roleLoading}>Không có vai trò.</div>
                  ) : (
                    roles.map((role) => {
                      const checked = form.roles.includes(role.name);

                      return (
                        <label key={role.name} className={styles.roleOption}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleRoleChange(role.name)}
                            disabled={saving}
                          />
                          <span>{role.name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
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
