import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, LayoutDashboard, Mail, Phone } from "lucide-react";
import { AuthContext } from "../../../context/AuthContext";
import styles from "./Header.module.scss";
import logo from "../../../assets/img/logo.png";
import api from "../../../api/axios";
import { LMS_BASE_URL } from "../../../api/authFetch";
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../../api/notificationApi";

function formatRelativeTime(value) {
  if (!value) return "Vừa xong";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Gần đây";

  const diffMinutes = Math.max(
    1,
    Math.floor((Date.now() - date.getTime()) / 60000),
  );

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
  return `${LMS_BASE_URL}${value.startsWith("/") ? "" : "/"}${value}`;
}

function CourseThumb({ src, title }) {
  if (src) {
    return (
      <img
        src={formatThumbUrl(src)}
        alt={title}
        className={styles.notificationThumb}
      />
    );
  }

  return (
    <div className={styles.notificationThumbFallback}>
      {(title || "T").trim().charAt(0).toUpperCase()}
    </div>
  );
}

function getNotificationTone(type) {
  const warningTypes = new Set([
    "LEARNING_REMINDER",
    "COURSE_PENDING_APPROVAL",
  ]);
  return warningTypes.has(type) ? "warning" : "info";
}

function getNotificationSubtitle(type) {
  switch (type) {
    case "ASSIGNMENT_GRADED":
      return "Kết quả bài tập";
    case "COURSE_PURCHASED":
    case "COURSE_ENROLLED":
      return "Khóa học";
    case "LEARNING_REMINDER":
      return "Nhắc học tập";
    case "INSTRUCTOR_NEW_ENROLLMENT":
      return "Quản lý đăng ký";
    case "ASSIGNMENT_SUBMITTED":
      return "Bài nộp";
    case "COURSE_PENDING_APPROVAL":
      return "Duyệt khóa học";
    default:
      return "Thông báo hệ thống";
  }
}

export default function Header() {
  const { user, logout, hasRole } = useContext(AuthContext);
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

  const buildImageUrl = (value) => {
    if (!value) return "";
    if (value.startsWith("http")) return value;
    return `${LMS_BASE_URL}${value}`;
  };

  const displayName = user?.fullName?.trim() || user?.username || "Người dùng";

  const avatarLetter = useMemo(
    () => displayName.trim().charAt(0).toUpperCase() || "U",
    [displayName],
  );

  const unreadCount = notificationItems.filter((item) => !item.read).length;
  const canOpenAdmin = hasRole("ADMIN") || hasRole("INSTRUCTOR");

  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      setNotificationError("");

      const notifications = await getMyNotifications();
      setNotificationItems(
        notifications.map((item) => ({
          id: item.id,
          type: item.type,
          title: item.title || "Thông báo",
          subtitle: getNotificationSubtitle(item.type),
          description: item.message || "",
          time: formatRelativeTime(item.createdAt),
          route: item.targetUrl || "/home",
          tone: getNotificationTone(item.type),
          read: Boolean(item.read),
        })),
      );
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

  const openNotificationItem = async (item) => {
    setNotificationOpen(false);
    if (!item.read) {
      try {
        await markNotificationRead(item.id);
        setNotificationItems((prev) =>
          prev.map((notification) =>
            notification.id === item.id
              ? { ...notification, read: true }
              : notification,
          ),
        );
      } catch (error) {
        console.error("Mark notification read error:", error);
      }
    }
    navigate(item.route || "/home");
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotificationItems((prev) =>
        prev.map((notification) => ({ ...notification, read: true })),
      );
    } catch (error) {
      console.error("Mark all notifications read error:", error);
    }
  };

  const triggerLabel = `Mở menu tài khoản của ${displayName}`;

  return (
    <header className={styles.header}>
      <Link to="/home" className={styles.left}>
        <img src={logo} alt="Logo" className={styles.logo} />
        <span className={styles.title}>HỆ THỐNG QUẢN LÝ HỌC TẬP</span>
      </Link>

      <div className={styles.contactStrip} aria-label="Thông tin liên hệ">
        <a href="tel:0865416387" className={styles.contactPill}>
          <span className={styles.contactIcon}>
            <Phone size={16} />
          </span>
          <span>08 6541 6387</span>
        </a>

        <a href="mailto:tatthang204@gmail.com" className={styles.contactPill}>
          <span className={styles.contactIcon}>
            <Mail size={16} />
          </span>
          <span>tatthang204@gmail.com</span>
        </a>
      </div>

      <div className={styles.right}>
        {canOpenAdmin ? (
          <Link to="/admin/courses" className={styles.adminLink}>
            <LayoutDashboard size={17} />
            <span>Trang quản trị</span>
          </Link>
        ) : null}

        <span className={styles.greeting}>Xin chào, {displayName}</span>

        <div className={styles.notificationWrap} ref={notificationRef}>
          <button
            type="button"
            className={styles.notificationButton}
            aria-label="Thông báo"
            aria-haspopup="menu"
            aria-expanded={notificationOpen}
            onClick={() => {
              setNotificationOpen((prev) => !prev);
              setMenuOpen(false);
              if (!notificationOpen) {
                fetchNotifications();
              }
            }}
          >
            <span className={styles.notificationIcon}>
              <Bell size={16} />
            </span>
            <span>Thông báo</span>
            {unreadCount > 0 ? (
              <span className={styles.badge}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </button>

          {notificationOpen ? (
            <div
              className={`${styles.dropdown} ${styles.notificationDropdown}`}
            >
              <div className={styles.dropdownHeader}>
                <strong>Thông báo</strong>
                <span>
                  {loadingNotifications
                    ? "Đang tải..."
                    : `${unreadCount} thông báo chưa đọc`}
                </span>
              </div>

              <div className={styles.notificationList}>
                {notificationError ? (
                  <div className={styles.notificationEmpty}>
                    {notificationError}
                  </div>
                ) : loadingNotifications ? (
                  <div className={styles.notificationEmpty}>
                    Đang tải thông báo...
                  </div>
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
                      } ${item.read ? styles.notificationRead : ""}`}
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
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0}
              >
                Đánh dấu tất cả đã đọc
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
