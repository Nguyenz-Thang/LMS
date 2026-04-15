import { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import styles from "./Header.module.scss";
import logo from "../../../assets/img/utt.png";
import api from "../../../api/axios";

export default function Header() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

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
  const BACKEND_BASE_URL = "http://localhost:8080/lms";

  const buildImageUrl = (value) => {
    if (!value) return "";
    if (value.startsWith("http")) return value;
    return `${BACKEND_BASE_URL}${value}`;
  };
  const displayName = user?.fullName?.trim() || user?.username || "Người dùng";

  const avatarLetter = displayName.trim().charAt(0).toUpperCase() || "U";
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

        <span className={styles.icon}>🔔</span>

        {user?.avatar ? (
          <img
            src={buildImageUrl(user.avatar)}
            alt={displayName}
            className={styles.avatarImg}
          />
        ) : (
          <div className={styles.avatar}>{avatarLetter}</div>
        )}

        <button onClick={handleLogout} className={styles.logoutBtn}>
          Đăng xuất
        </button>
      </div>
    </header>
  );
}
