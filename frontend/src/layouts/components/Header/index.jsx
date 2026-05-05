import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import styles from "./Header.module.scss";
import logo from "../../../assets/img/utt.png";
import api from "../../../api/axios";

function formatRelativeTime(value) {
  if (!value) return "Vừa xong";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Gần đây";

  const diffMinutes = Math.max(1, Math.floor((Date.now() - date.getTime()) / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes} phút trước`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} giờ trước`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} ngày trước`;
}

function formatThumbUrl(value) {
  if (!value) return "";
  if (value.startsWith("http")) return value;
  return `http://localhost:8080/lms${value.startsWith("/") ? "" : "/"}${value}`;
}

function CourseThumb({ src, title }) {
  if (src) {
    return <img src={formatThumbUrl(src)} alt={title} className={styles.notificationThumb} />;
  }

  return (
    <div className={styles.notificationThumbFallback}>
      {(title || "K").trim().charAt(0).toUpperCase()}
    </div>
  );
}

export default function Header() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationItems, setNotificationItems] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const menuRef = useRef(null);
  const notificationRef = useRef(null);

  const handleLogout = async () => {
    const token = localStorage.getItem("token");

    try {
      if (token) {
        await api.post("/auth/logout", { token });
      }
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      logout();
      navigate("/login", { replace: true });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }

      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setNotificationOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setNotificationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    fetchNotifications();
  }, [user?.id]);

  const backendBaseUrl = "http://localhost:8080/lms";

  const buildImageUrl = (value) => {
    if (!value) return "";
    if (value.startsWith("http")) return value;
    return `${backendBaseUrl}${value}`;
  };

  const displayName = user?.fullName?.trim() || user?.username || "Người dùng";

  const avatarLetter = useMemo(
    () => displayName.trim().charAt(0).toUpperCase() || "U",
    [displayName],
  );

  const unreadCount = notificationItems.length;

  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      setNotificationError("");

      const res = await api.get("/enrollments/me/dashboard");
      const dashboard = res?.data?.result || {};

      const pausedItems = (dashboard?.pausedLessons || []).slice(0, 4).map((item) => ({
        id: `paused-${item.courseId}-${item.lessonId}`,
        title: item.courseTitle || "Khóa học",
        subtitle: `Tiếp tục bài: ${item.lessonTitle}`,
        description: `Đã xem ${Math.round(item.completionPercent || 0)}%`,
        time: formatRelativeTime(item.lastAccessedAt),
        route: item.lessonId
          ? `/learning/${item.courseId}/${item.lessonId}`
          : `/learning/${item.courseId}`,
        tone: "info",
        thumbnailUrl: item.courseThumbnailUrl || "",
      }));

      const riskItems = (dashboard?.atRiskCourses || []).slice(0, 4).map((item) => ({
        id: `risk-${item.courseId}`,
        title: item.courseTitle || "Khóa học",
        subtitle: "Cần chú ý tiến độ học tập",
        description:
          item.reason || `Tiến độ hiện tại ${Math.round(item.progressPercent || 0)}%`,
        time: item.daysSinceLastAccess
          ? `${item.daysSinceLastAccess} ngày chưa truy cập`
          : "Cần quay lại học",
        route: item.courseId ? `/learning/${item.courseId}` : "/progress",
        tone: "warning",
        thumbnailUrl: item.courseThumbnailUrl || "",
      }));

      setNotificationItems([...riskItems, ...pausedItems].slice(0, 6));
    } catch (error) {
      console.error("Load notifications error:", error);
      setNotificationError("Không tải được thông báo.");
      setNotificationItems([]);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const openProfile = () => {
    setMenuOpen(false);
    navigate("/profile");
  };

  const openSettings = () => {
    setMenuOpen(false);
    navigate("/settings");
  };

  const openNotificationItem = (item) => {
    setNotificationOpen(false);
    navigate(item.route);
  };

  const triggerLabel = `Mở menu tài khoản của ${displayName}`;

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <img src={logo} alt="Logo" className={styles.logo} />
        <span className={styles.title}>HỆ THỐNG QUẢN LÝ HỌC TẬP</span>
      </div>

      <div className={styles.search}>
        <input placeholder="Tìm kiếm..." />
      </div>

      <div className={styles.right}>
        <Link to="/home" className={styles.link}>
          Trang chủ
        </Link>

        <div className={styles.notificationWrap} ref={notificationRef}>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Thông báo"
            aria-haspopup="menu"
            aria-expanded={notificationOpen}
            onClick={() => {
              setNotificationOpen((prev) => !prev);
              setMenuOpen(false);
            }}
          >
            <span className={styles.icon}>🔔</span>
            {unreadCount > 0 ? (
              <span className={styles.badge}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </button>

          {notificationOpen ? (
            <div className={`${styles.dropdown} ${styles.notificationDropdown}`}>
              <div className={styles.dropdownHeader}>
                <strong>Thông báo học tập</strong>
                <span>
                  {loadingNotifications
                    ? "Đang tải..."
                    : `${unreadCount} mục cần chú ý`}
                </span>
              </div>

              <div className={styles.notificationList}>
                {notificationError ? (
                  <div className={styles.notificationEmpty}>{notificationError}</div>
                ) : loadingNotifications ? (
                  <div className={styles.notificationEmpty}>Đang tải thông báo...</div>
                ) : notificationItems.length === 0 ? (
                  <div className={styles.notificationEmpty}>
                    Hiện chưa có thông báo mới.
                  </div>
                ) : (
                  notificationItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`${styles.notificationItem} ${
                        item.tone === "warning"
                          ? styles.notificationWarning
                          : styles.notificationInfo
                      }`}
                      onClick={() => openNotificationItem(item)}
                    >
                      <CourseThumb src={item.thumbnailUrl} title={item.title} />

                      <div className={styles.notificationBody}>
                        <strong>{item.title}</strong>
                        <h4>{item.subtitle}</h4>
                        <p>{item.description}</p>
                        <span>{item.time}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>

              <button
                type="button"
                className={styles.dropdownFooterBtn}
                onClick={() => {
                  setNotificationOpen(false);
                  navigate("/progress");
                }}
              >
                Xem trang tiến độ
              </button>
            </div>
          ) : null}
        </div>

        <div className={styles.userMenu} ref={menuRef}>
          <button
            type="button"
            className={styles.avatarButton}
            aria-label={triggerLabel}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => {
              setMenuOpen((prev) => !prev);
              setNotificationOpen(false);
            }}
          >
            {user?.avatar ? (
              <img
                src={buildImageUrl(user.avatar)}
                alt={displayName}
                className={styles.avatarImg}
              />
            ) : (
              <div className={styles.avatar}>{avatarLetter}</div>
            )}
          </button>

          {menuOpen ? (
            <div className={styles.dropdown} role="menu">
              <div className={styles.dropdownHeader}>
                <strong>{displayName}</strong>
                <span>{user?.email || user?.username || "Tài khoản"}</span>
              </div>

              <button
                type="button"
                className={styles.menuItem}
                onClick={openProfile}
                role="menuitem"
              >
                Trang cá nhân
              </button>

              <button
                type="button"
                className={styles.menuItem}
                onClick={openSettings}
                role="menuitem"
              >
                Cài đặt
              </button>

              <button
                type="button"
                className={`${styles.menuItem} ${styles.menuItemDanger}`}
                onClick={handleLogout}
                role="menuitem"
              >
                Đăng xuất
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
