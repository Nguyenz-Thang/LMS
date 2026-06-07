import { useContext, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Hash,
  Image as ImageIcon,
  Mail,
  PencilLine,
  ShieldCheck,
  User,
  Users,
  X,
} from "lucide-react";
import api from "../../api/axios";
import { AuthContext } from "../../context/AuthContext";
import styles from "./Profile.module.scss";

const BACKEND_BASE_URL = "http://localhost:8080/lms";

export default function Profile() {
  const { user: authUser, login, token } = useContext(AuthContext);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");

  const [profileForm, setProfileForm] = useState({
    fullName: "",
    email: "",
    avatar: "",
    dob: "",
  });

  useEffect(() => {
    fetchMyInfo();
  }, []);

  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const displayName = useMemo(() => {
    return (
      user?.fullName?.trim() ||
      authUser?.fullName?.trim() ||
      user?.username ||
      authUser?.username ||
      "Người dùng"
    );
  }, [user, authUser]);

  const avatarLetter = useMemo(() => {
    return displayName.trim().charAt(0).toUpperCase() || "U";
  }, [displayName]);

  const formatDate = (date, fallback = "Chưa cập nhật") => {
    if (!date) return fallback;
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return fallback;
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

  const getRoleText = (profile) => {
    const roleName =
      profile?.role?.name ||
      profile?.role ||
      (Array.isArray(profile?.roles) ? profile.roles[0]?.name : "") ||
      "";
    return roleName || "Chưa có vai trò";
  };

  const buildImageUrl = (value) => {
    if (!value) return "";
    if (value.startsWith("http")) return value;
    return `${BACKEND_BASE_URL}${value}`;
  };

  const getJoinedDate = () => {
    const value = user?.createdAt || user?.createdDate || user?.joinedAt;
    return formatDate(value, "Chưa có dữ liệu");
  };

  const syncFormFromUser = (profile) => {
    setProfileForm({
      fullName: profile?.fullName || "",
      email: profile?.email || "",
      avatar: profile?.avatar || "",
      dob: normalizeDateInput(profile?.dob),
    });
    setAvatarPreview(profile?.avatar ? buildImageUrl(profile.avatar) : "");
  };

  const fetchMyInfo = async () => {
    try {
      setLoading(true);
      setErrorText("");
      setMessage("");

      const res = await api.get("/users/myInfo");
      const profile = res?.data?.result || null;

      setUser(profile);
      syncFormFromUser(profile);
    } catch (error) {
      setErrorText(
        error?.response?.data?.message || "Không tải được thông tin cá nhân.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleProfileInput = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "avatar") {
      setAvatarPreview(buildImageUrl(value.trim()));
    }
  };

  const openEditModal = () => {
    syncFormFromUser(user);
    setMessage("");
    setErrorText("");
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    if (savingProfile || uploadingAvatar) return;
    syncFormFromUser(user);
    setShowEditModal(false);
  };

  const uploadAvatar = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await api.post("/courses/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return res?.data?.result || "";
  };

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorText("Vui lòng chọn file ảnh hợp lệ.");
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setAvatarPreview(localPreview);

    try {
      setUploadingAvatar(true);
      setErrorText("");
      setMessage("");

      const uploadedAvatarUrl = await uploadAvatar(file);

      setProfileForm((prev) => ({
        ...prev,
        avatar: uploadedAvatarUrl,
      }));
    } catch (error) {
      setErrorText(
        error?.response?.data?.message || "Upload ảnh avatar thất bại.",
      );
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const handleSaveProfile = async (event) => {
    event?.preventDefault();
    if (!user?.id) return;

    try {
      setSavingProfile(true);
      setMessage("");
      setErrorText("");

      const payload = {
        fullName: profileForm.fullName || null,
        email: profileForm.email || null,
        avatar: profileForm.avatar || null,
        dob: profileForm.dob || null,
      };

      await api.put("/users/myInfo", payload);

      const profileRes = await api.get("/users/myInfo");
      const freshUser = profileRes?.data?.result || null;

      setUser(freshUser);
      setShowEditModal(false);
      setMessage("Cập nhật thông tin thành công.");

      if (freshUser && token) {
        login({ user: freshUser, token });
      }

      syncFormFromUser(freshUser);
    } catch (error) {
      setErrorText(
        error?.response?.data?.message || "Cập nhật thông tin thất bại.",
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const renderInfoRow = ({ icon, label, value }) => (
    <div className={styles.detailRow}>
      <div className={styles.detailLabel}>
        {icon}
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
    </div>
  );

  if (loading) {
    return <div className={styles.loading}>Đang tải thông tin cá nhân...</div>;
  }

  return (
    <div className={styles.profilePage}>
      <div className={styles.breadcrumb}>
        Tài khoản <span>\</span> Thông tin cá nhân
      </div>

      {message && <div className={styles.successBox}>{message}</div>}
      {errorText && <div className={styles.errorBox}>{errorText}</div>}

      <div className={styles.profileLayout}>
        <aside className={styles.profileSide}>
          <div className={styles.avatarBlock}>
            {user?.avatar ? (
              <img
                src={buildImageUrl(user.avatar)}
                alt={displayName}
                className={styles.avatarImage}
              />
            ) : (
              <div className={styles.avatar}>{avatarLetter}</div>
            )}
          </div>

          <div className={styles.userMeta}>
            <h1>{displayName}</h1>
            <p>@{user?.username || authUser?.username || "user"}</p>
          </div>

          <div className={styles.quickInfo}>
            <div>
              <Users size={16} />
              <span>{getRoleText(user)}</span>
            </div>
            <div>
              <CalendarDays size={16} />
              <span>Tham gia: {getJoinedDate()}</span>
            </div>
            <div>
              <Mail size={16} />
              <span>{user?.email || "Chưa cập nhật email"}</span>
            </div>
          </div>
        </aside>

        <section className={styles.detailCard}>
          <div className={styles.sectionHead}>
            <div>
              <h2>Thông tin cá nhân</h2>
              <p>Các thông tin cơ bản của tài khoản.</p>
            </div>

            <button
              type="button"
              className={styles.editProfileBtn}
              onClick={openEditModal}
            >
              <PencilLine size={16} />
              Chỉnh sửa
            </button>
          </div>

          {renderInfoRow({
            icon: <Hash size={18} />,
            label: "ID",
            value: user?.id || "Chưa có",
          })}

          {renderInfoRow({
            icon: <User size={18} />,
            label: "Tên đăng nhập",
            value: user?.username || "Chưa cập nhật",
          })}

          {renderInfoRow({
            icon: <User size={18} />,
            label: "Họ tên",
            value: user?.fullName || "Chưa cập nhật",
          })}

          {renderInfoRow({
            icon: <Mail size={18} />,
            label: "Email",
            value: user?.email || "Chưa cập nhật",
          })}

          {renderInfoRow({
            icon: <CalendarDays size={18} />,
            label: "Ngày sinh",
            value: formatDate(user?.dob),
          })}

          {renderInfoRow({
            icon: <CalendarDays size={18} />,
            label: "Ngày tham gia",
            value: getJoinedDate(),
          })}

          {renderInfoRow({
            icon: <ShieldCheck size={18} />,
            label: "Vai trò",
            value: getRoleText(user),
          })}
        </section>
      </div>

      {showEditModal ? (
        <div className={styles.modalBackdrop} role="presentation">
          <form className={styles.modal} onSubmit={handleSaveProfile}>
            <div className={styles.modalHead}>
              <div>
                <h2>Chỉnh sửa thông tin</h2>
                <p>Cập nhật hồ sơ cá nhân của bạn.</p>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={closeEditModal}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <label className={styles.formField}>
              <span>Họ tên</span>
              <input
                name="fullName"
                value={profileForm.fullName}
                onChange={handleProfileInput}
                placeholder="Nhập họ và tên"
              />
            </label>

            <label className={styles.formField}>
              <span>Email</span>
              <input
                name="email"
                type="email"
                value={profileForm.email}
                onChange={handleProfileInput}
                placeholder="Nhập email"
              />
            </label>

            <label className={styles.formField}>
              <span>Ngày sinh</span>
              <input
                type="date"
                name="dob"
                value={profileForm.dob}
                onChange={handleProfileInput}
              />
            </label>

            <div className={styles.formField}>
              <span>Avatar</span>
              <div className={styles.avatarEditor}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  className={styles.fileInput}
                />

                {avatarPreview ? (
                  <div className={styles.avatarPreviewBox}>
                    <img src={avatarPreview} alt="Avatar preview" />
                  </div>
                ) : (
                  <div className={styles.emptyPreview}>Chưa có ảnh xem trước</div>
                )}

                <p className={styles.uploadHint}>
                  {uploadingAvatar
                    ? "Đang upload ảnh..."
                    : profileForm.avatar
                      ? "Ảnh đã sẵn sàng, bấm Lưu để cập nhật avatar."
                      : "Chọn ảnh để upload avatar."}
                </p>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={closeEditModal}
                disabled={savingProfile || uploadingAvatar}
              >
                Hủy
              </button>
              <button
                type="submit"
                className={styles.saveBtn}
                disabled={savingProfile || uploadingAvatar}
              >
                {uploadingAvatar
                  ? "Đang upload..."
                  : savingProfile
                    ? "Đang lưu..."
                    : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
