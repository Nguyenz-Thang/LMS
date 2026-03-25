import { useContext, useEffect, useMemo, useState } from "react";
import {
  PencilLine,
  User,
  Mail,
  Phone,
  CalendarDays,
  ShieldCheck,
  LockKeyhole,
  MapPin,
  History,
} from "lucide-react";
import api from "../../api/axios";
import { AuthContext } from "../../context/AuthContext";
import styles from "./Profile.module.scss";

const TABS = {
  PROFILE: "profile",
  PASSWORD: "password",
  HISTORY: "history",
};

export default function Profile() {
  const { user: authUser, login, token } = useContext(AuthContext);

  const [activeTab, setActiveTab] = useState(TABS.PROFILE);

  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [editingField, setEditingField] = useState(null);

  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dob: "",
    gender: "",
    city: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    fetchMyInfo();
  }, []);

  useEffect(() => {
    if (activeTab === TABS.HISTORY) {
      fetchTestHistory();
    }
  }, [activeTab]);

  const fullName = useMemo(() => {
    const name = [user?.firstName, user?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    return name || user?.fullName || user?.username || "Người dùng";
  }, [user]);

  const avatarLetter = useMemo(() => {
    return (fullName || "U").trim().charAt(0).toUpperCase();
  }, [fullName]);

  const formatDate = (date) => {
    if (!date) return "--";
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return date;
    return d.toLocaleDateString("vi-VN");
  };

  const normalizeDateInput = (date) => {
    if (!date) return "";
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
      return "";
    }
    return d.toISOString().split("T")[0];
  };

  const fetchMyInfo = async () => {
    try {
      setLoading(true);
      setErrorText("");
      setMessage("");

      const res = await api.get("/users/myInfo");
      const profile = res?.data?.result || res?.data || null;

      setUser(profile);
      setProfileForm({
        firstName: profile?.firstName || "",
        lastName: profile?.lastName || "",
        email: profile?.email || profile?.username || "",
        phone: profile?.phone || "",
        dob: normalizeDateInput(profile?.dob),
        gender: profile?.gender || "",
        city: profile?.city || profile?.province || "",
      });
    } catch (error) {
      setErrorText(
        error?.response?.data?.message || "Không tải được thông tin cá nhân.",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchTestHistory = async () => {
    try {
      setLoadingHistory(true);

      // Đổi endpoint này theo backend của bạn nếu tên khác
      const res = await api.get("/users/test-history");
      const data = res?.data?.result || res?.data || [];

      setHistory(Array.isArray(data) ? data : []);
    } catch (error) {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleProfileInput = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordInput = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const startEditField = (field) => {
    setEditingField(field);
    setMessage("");
    setErrorText("");
  };

  const cancelEditField = () => {
    setEditingField(null);
    setMessage("");
    setErrorText("");
    setProfileForm({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || user?.username || "",
      phone: user?.phone || "",
      dob: normalizeDateInput(user?.dob),
      gender: user?.gender || "",
      city: user?.city || user?.province || "",
    });
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;

    try {
      setSavingProfile(true);
      setMessage("");
      setErrorText("");

      const payload = {
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        dob: profileForm.dob || null,
        phone: profileForm.phone || null,
        gender: profileForm.gender || null,
        city: profileForm.city || null,
      };

      // nếu backend cho update email thì mở dòng này
      // payload.email = profileForm.email || null;

      await api.put(`/users/${user.id}`, payload);

      const profileRes = await api.get("/users/myInfo");
      const freshUser = profileRes?.data?.result || profileRes?.data || null;

      setUser(freshUser);
      setEditingField(null);
      setMessage("Cập nhật thông tin thành công.");

      if (freshUser && token) {
        login({ user: freshUser, token });
      }

      setProfileForm({
        firstName: freshUser?.firstName || "",
        lastName: freshUser?.lastName || "",
        email: freshUser?.email || freshUser?.username || "",
        phone: freshUser?.phone || "",
        dob: normalizeDateInput(freshUser?.dob),
        gender: freshUser?.gender || "",
        city: freshUser?.city || freshUser?.province || "",
      });
    } catch (error) {
      setErrorText(
        error?.response?.data?.message || "Cập nhật thông tin thất bại.",
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    try {
      setSavingPassword(true);
      setMessage("");
      setErrorText("");

      if (
        !passwordForm.currentPassword ||
        !passwordForm.newPassword ||
        !passwordForm.confirmPassword
      ) {
        setErrorText("Vui lòng nhập đầy đủ thông tin mật khẩu.");
        return;
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        setErrorText("Mật khẩu mới và xác nhận mật khẩu không khớp.");
        return;
      }

      // Đổi endpoint này theo backend của bạn nếu tên khác
      await api.put("/users/change-password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setMessage("Đổi mật khẩu thành công.");
    } catch (error) {
      setErrorText(error?.response?.data?.message || "Đổi mật khẩu thất bại.");
    } finally {
      setSavingPassword(false);
    }
  };

  const renderEditableValue = (field) => {
    switch (field) {
      case "fullName":
        return (
          <div className={styles.inlineEditor}>
            <input
              name="firstName"
              value={profileForm.firstName}
              onChange={handleProfileInput}
              placeholder="Họ"
            />
            <input
              name="lastName"
              value={profileForm.lastName}
              onChange={handleProfileInput}
              placeholder="Tên"
            />
          </div>
        );

      case "email":
        return (
          <input
            name="email"
            value={profileForm.email}
            onChange={handleProfileInput}
            placeholder="Email"
            disabled
          />
        );

      case "phone":
        return (
          <input
            name="phone"
            value={profileForm.phone}
            onChange={handleProfileInput}
            placeholder="Số điện thoại"
          />
        );

      case "dob":
        return (
          <input
            type="date"
            name="dob"
            value={profileForm.dob}
            onChange={handleProfileInput}
          />
        );

      case "gender":
        return (
          <select
            name="gender"
            value={profileForm.gender}
            onChange={handleProfileInput}
          >
            <option value="">Chưa chọn</option>
            <option value="Nam">Nam</option>
            <option value="Nữ">Nữ</option>
            <option value="Khác">Khác</option>
          </select>
        );

      case "city":
        return (
          <input
            name="city"
            value={profileForm.city}
            onChange={handleProfileInput}
            placeholder="Tỉnh / Thành phố"
          />
        );

      default:
        return null;
    }
  };

  const DetailRow = ({ icon, label, value, field }) => {
    const isEditing = editingField === field;

    return (
      <div className={styles.detailRow}>
        <div className={styles.detailLabel}>
          {icon}
          <span>{label}</span>
        </div>

        <div className={styles.detailValue}>
          {isEditing ? (
            renderEditableValue(field)
          ) : (
            <strong>{value || "Chưa cập nhật"}</strong>
          )}
        </div>

        <div className={styles.detailAction}>
          {isEditing ? (
            <div className={styles.actionGroup}>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? "Đang lưu..." : "Lưu"}
              </button>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={cancelEditField}
                disabled={savingProfile}
              >
                Hủy
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={styles.editBtn}
              onClick={() => startEditField(field)}
            >
              <PencilLine size={16} />
            </button>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className={styles.loading}>Đang tải thông tin cá nhân...</div>;
  }

  return (
    <div className={styles.profilePage}>
      <div className={styles.profileHeader}>
        <div className={styles.cover}></div>

        <div className={styles.userIntro}>
          <div className={styles.avatar}>{avatarLetter}</div>

          <div className={styles.userMeta}>
            <h1>{fullName}</h1>
            <p>Tham gia: {formatDate(user?.createdAt || user?.joinDate)}</p>
          </div>
        </div>
      </div>

      <div className={styles.tabs}>
        <button
          className={activeTab === TABS.PROFILE ? styles.activeTab : ""}
          onClick={() => setActiveTab(TABS.PROFILE)}
        >
          Thông tin cá nhân
        </button>

        <button
          className={activeTab === TABS.PASSWORD ? styles.activeTab : ""}
          onClick={() => setActiveTab(TABS.PASSWORD)}
        >
          Đổi mật khẩu
        </button>

        <button
          className={activeTab === TABS.HISTORY ? styles.activeTab : ""}
          onClick={() => setActiveTab(TABS.HISTORY)}
        >
          Lịch sử làm bài test
        </button>
      </div>

      {message && <div className={styles.successBox}>{message}</div>}
      {errorText && <div className={styles.errorBox}>{errorText}</div>}

      {activeTab === TABS.PROFILE && (
        <div className={styles.detailCard}>
          <h2>Chi tiết</h2>

          <DetailRow
            icon={<User size={18} />}
            label="Họ tên"
            value={fullName}
            field="fullName"
          />

          <DetailRow
            icon={<Mail size={18} />}
            label="Email"
            value={user?.email || user?.username}
            field="email"
          />

          <DetailRow
            icon={<Phone size={18} />}
            label="Số điện thoại"
            value={user?.phone}
            field="phone"
          />

          <DetailRow
            icon={<CalendarDays size={18} />}
            label="Ngày sinh"
            value={formatDate(user?.dob)}
            field="dob"
          />

          <DetailRow
            icon={<ShieldCheck size={18} />}
            label="Giới tính"
            value={user?.gender}
            field="gender"
          />

          <DetailRow
            icon={<MapPin size={18} />}
            label="Tỉnh / Thành phố"
            value={user?.city || user?.province}
            field="city"
          />

          <div className={styles.infoHint}>
            Email đang để khóa để tránh lệch với backend đăng nhập. Nếu backend
            của bạn cho sửa email, chỉ cần bỏ `disabled` ở input email và gửi
            thêm `email` trong payload.
          </div>
        </div>
      )}

      {activeTab === TABS.PASSWORD && (
        <div className={styles.detailCard}>
          <h2>Đổi mật khẩu</h2>

          <form className={styles.passwordForm} onSubmit={handleChangePassword}>
            <div className={styles.formGroup}>
              <label>Mật khẩu hiện tại</label>
              <div className={styles.inputWrap}>
                <LockKeyhole size={18} />
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordInput}
                  placeholder="Nhập mật khẩu hiện tại"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Mật khẩu mới</label>
              <div className={styles.inputWrap}>
                <LockKeyhole size={18} />
                <input
                  type="password"
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordInput}
                  placeholder="Nhập mật khẩu mới"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Xác nhận mật khẩu mới</label>
              <div className={styles.inputWrap}>
                <LockKeyhole size={18} />
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordInput}
                  placeholder="Nhập lại mật khẩu mới"
                />
              </div>
            </div>

            <div className={styles.formActions}>
              <button
                type="submit"
                className={styles.primaryBtn}
                disabled={savingPassword}
              >
                {savingPassword ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === TABS.HISTORY && (
        <div className={styles.detailCard}>
          <h2>Lịch sử làm bài test</h2>

          {loadingHistory ? (
            <div className={styles.emptyState}>Đang tải lịch sử...</div>
          ) : history.length === 0 ? (
            <div className={styles.emptyState}>Chưa có dữ liệu lịch sử.</div>
          ) : (
            <div className={styles.historyList}>
              {history.map((item, index) => (
                <div className={styles.historyItem} key={item.id || index}>
                  <div className={styles.historyIcon}>
                    <History size={18} />
                  </div>

                  <div className={styles.historyContent}>
                    <h3>
                      {item.testName || item.title || `Bài test #${index + 1}`}
                    </h3>
                    <p>
                      Điểm: <strong>{item.score ?? "--"}</strong>
                    </p>
                    <p>
                      Thời gian:{" "}
                      <strong>
                        {formatDate(item.createdAt || item.submittedAt)}
                      </strong>
                    </p>
                  </div>

                  <div className={styles.historyMeta}>
                    {item.status || "Hoàn thành"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
