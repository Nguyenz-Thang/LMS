import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, LogOut, Monitor, Settings, User } from "lucide-react";
import api from "../../../../api/axios";
import { AuthContext } from "../../../../context/AuthContext";
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../../../api/notificationApi";
import logo from "../../../../assets/img/logo.png";
import styles from "./AdminHeader.module.scss";

function formatRelativeTime(value) {
  if (!value) return "Vừa xong";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Gần đây";

  const diffMinutes = Math.max(
    1,
    Math.floor((Date.now() - date.getTime()) / 60000),
  );

  if (diffMinutes < 60) return `${diffMinutes} phút trước`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;

  return `${Math.floor(diffHours / 24)} ngày trước`;
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

export default function AdminHeader() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationItems, setNotificationItems] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const menuRef = useRef(null);
  const notificationRef = useRef(null);

  const displayName = user?.fullName?.trim() || user?.username || "Admin";
  const avatarLetter = useMemo(
    () => displayName.trim().charAt(0).toUpperCase() || "A",
    [displayName],
  );

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
          route: item.targetUrl || "/admin/courses",
          read: Boolean(item.read),
        })),
      );
    } catch (error) {
      console.error("Load admin notifications error:", error);
      setNotificationError("Không tải được thông báo.");
      setNotificationItems([]);
    } finally {
      setLoadingNotifications(false);
    }
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

    navigate(item.route || "/admin/courses");
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
    if (user?.id) fetchNotifications();
  }, [user?.id]);

  const unreadCount = notificationItems.filter((item) => !item.read).length;

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <img src={logo} alt="LMS Logo" className={styles.mark} />
        <div>
          <strong>LMS Admin</strong>
          <span>Quản lý hệ thống học tập</span>
        </div>
      </div>

      <div className={styles.actions}>
        <Link to="/home" className={styles.siteLink}>
          <Monitor size={17} />
          <span>Về trang học viên</span>
        </Link>

        <span className={styles.greeting}>Xin chào, {displayName}</span>

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
              if (!notificationOpen) fetchNotifications();
            }}
          >
            <Bell size={17} />
            {unreadCount > 0 ? (
              <span className={styles.badge}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </button>

          {notificationOpen ? (
            <div className={styles.notificationDropdown}>
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
                        item.read ? styles.notificationRead : ""
                      }`}
                      onClick={() => openNotificationItem(item)}
                    >
                      <span className={styles.notificationIcon}>
                        {(item.subtitle || "T").charAt(0).toUpperCase()}
                      </span>

                      <span className={styles.notificationBody}>
                        <strong>{item.title}</strong>
                        <em>{item.subtitle}</em>
                        <span>{item.description}</span>
                        <small>{item.time}</small>
                      </span>
                    </button>
                  ))
                )}
              </div>

              <button
                type="button"
                className={styles.markAllBtn}
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
            className={styles.userButton}
            onClick={() => {
              setMenuOpen((prev) => !prev);
              setNotificationOpen(false);
            }}
          >
            <span className={styles.avatar}>{avatarLetter}</span>
            <span className={styles.userName}>{displayName}</span>
          </button>

          {menuOpen ? (
            <div className={styles.dropdown}>
              <button
                type="button"
                className={styles.menuItem}
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/profile");
                }}
              >
                <User size={16} />
                <span>Hồ sơ</span>
              </button>

              <button
                type="button"
                className={styles.menuItem}
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/settings");
                }}
              >
                <Settings size={16} />
                <span>Cài đặt</span>
              </button>

              <button
                type="button"
                className={`${styles.menuItem} ${styles.danger}`}
                onClick={handleLogout}
              >
                <LogOut size={16} />
                <span>Đăng xuất</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
