import { useContext, useEffect, useMemo, useState } from "react";
import {
  PencilLine,
  User,
  Mail,
  CalendarDays,
  ShieldCheck,
  Image as ImageIcon,
  Hash,
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
  const [editingField, setEditingField] = useState(null);
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

  const formatDate = (date) => {
    if (!date) return "Chưa cập nhật";
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

  const getRoleText = (roles) => {
    if (!roles || roles.length === 0) return "Chưa có vai trò";
    return roles.map((role) => role.name).join(", ");
  };

  const buildImageUrl = (value) => {
    if (!value) return "";
    if (value.startsWith("http")) return value;
    return `${BACKEND_BASE_URL}${value}`;
  };

  const fetchMyInfo = async () => {
    try {
      setLoading(true);
      setErrorText("");
      setMessage("");

      const res = await api.get("/users/myInfo");
      const profile = res?.data?.result || null;

      setUser(profile);
      setProfileForm({
        fullName: profile?.fullName || "",
        email: profile?.email || "",
        avatar: profile?.avatar || "",
        dob: normalizeDateInput(profile?.dob),
      });
      setAvatarPreview(profile?.avatar ? buildImageUrl(profile.avatar) : "");
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
      fullName: user?.fullName || "",
      email: user?.email || "",
      avatar: user?.avatar || "",
      dob: normalizeDateInput(user?.dob),
    });
    setAvatarPreview(user?.avatar ? buildImageUrl(user.avatar) : "");
  };

  const uploadAvatar = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    // Nếu backend của bạn có endpoint riêng cho avatar thì đổi lại ở đây
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

  const handleSaveProfile = async () => {
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

      await api.put(`/users/${user.id}`, payload);

      const profileRes = await api.get("/users/myInfo");
      const freshUser = profileRes?.data?.result || null;

      setUser(freshUser);
      setEditingField(null);
      setMessage("Cập nhật thông tin thành công.");

      if (freshUser && token) {
        login({ user: freshUser, token });
      }

      setProfileForm({
        fullName: freshUser?.fullName || "",
        email: freshUser?.email || "",
        avatar: freshUser?.avatar || "",
        dob: normalizeDateInput(freshUser?.dob),
      });
      setAvatarPreview(
        freshUser?.avatar ? buildImageUrl(freshUser.avatar) : "",
      );
    } catch (error) {
      setErrorText(
        error?.response?.data?.message || "Cập nhật thông tin thất bại.",
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const renderEditableValue = (field) => {
    switch (field) {
      case "fullName":
        return (
          <input
            name="fullName"
            value={profileForm.fullName}
            onChange={handleProfileInput}
            placeholder="Nhập họ và tên"
          />
        );

      case "email":
        return (
          <input
            name="email"
            type="email"
            value={profileForm.email}
            onChange={handleProfileInput}
            placeholder="Nhập email"
          />
        );

      case "avatar":
        return (
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

      default:
        return null;
    }
  };

  const DetailRow = ({ icon, label, value, field, editable = true }) => {
    const isEditing = editingField === field;

    return (
      <div className={styles.detailRow}>
        <div className={styles.detailLabel}>
          {icon}
          <span>{label}</span>
        </div>

        <div className={styles.detailValue}>
          {isEditing ? renderEditableValue(field) : <strong>{value}</strong>}
        </div>

        <div className={styles.detailAction}>
          {editable ? (
            isEditing ? (
              <div className={styles.actionGroup}>
                <button
                  type="button"
                  className={styles.saveBtn}
                  onClick={handleSaveProfile}
                  disabled={savingProfile || uploadingAvatar}
                >
                  {uploadingAvatar
                    ? "Đang upload..."
                    : savingProfile
                      ? "Đang lưu..."
                      : "Lưu"}
                </button>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={cancelEditField}
                  disabled={savingProfile || uploadingAvatar}
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
            )
          ) : null}
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
          {user?.avatar ? (
            <img
              src={buildImageUrl(user.avatar)}
              alt={displayName}
              className={styles.avatarImage}
            />
          ) : (
            <div className={styles.avatar}>{avatarLetter}</div>
          )}

          <div className={styles.userMeta}>
            <h1>{displayName}</h1>
            <p>@{user?.username || authUser?.username || "user"}</p>
          </div>
        </div>
      </div>

      {message && <div className={styles.successBox}>{message}</div>}
      {errorText && <div className={styles.errorBox}>{errorText}</div>}

      <div className={styles.detailCard}>
        <h2>Thông tin cá nhân</h2>

        <DetailRow
          icon={<Hash size={18} />}
          label="ID"
          value={user?.id || "Chưa có"}
          editable={false}
        />

        <DetailRow
          icon={<User size={18} />}
          label="Tên đăng nhập"
          value={user?.username || "Chưa cập nhật"}
          editable={false}
        />

        <DetailRow
          icon={<User size={18} />}
          label="Họ tên"
          value={user?.fullName || "Chưa cập nhật"}
          field="fullName"
        />

        <DetailRow
          icon={<Mail size={18} />}
          label="Email"
          value={user?.email || "Chưa cập nhật"}
          field="email"
        />

        <DetailRow
          icon={<ImageIcon size={18} />}
          label="Avatar"
          value={user?.avatar ? "Đã có avatar" : "Chưa cập nhật"}
          field="avatar"
        />

        <DetailRow
          icon={<CalendarDays size={18} />}
          label="Ngày sinh"
          value={formatDate(user?.dob)}
          field="dob"
        />

        <DetailRow
          icon={<ShieldCheck size={18} />}
          label="Vai trò"
          value={getRoleText(user?.roles)}
          editable={false}
        />
      </div>
    </div>
  );
}
