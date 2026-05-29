import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Monitor, Settings, User } from "lucide-react";
import api from "../../../../api/axios";
import { AuthContext } from "../../../../context/AuthContext";
import styles from "./AdminHeader.module.scss";

export default function AdminHeader() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <div className={styles.mark}>LMS</div>
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

        <div className={styles.userMenu} ref={menuRef}>
          <button
            type="button"
            className={styles.userButton}
            onClick={() => setMenuOpen((prev) => !prev)}
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
