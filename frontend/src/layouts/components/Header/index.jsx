import { useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import styles from "./Header.module.scss";
import logo from "../../../assets/img/utt.png"; // đổi đúng tên file của bạn

export default function Header() {
  const { user } = useContext(AuthContext);

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <img src={logo} alt="F8 Logo" className={styles.logo} />
        <span className={styles.title}>HỆ THỐNG QUẢN LÝ HỌC TẬP</span>
      </div>

      <div className={styles.search}>
        <input
          type="text"
          placeholder="Tìm kiếm khóa học, bài viết, video, ..."
        />
      </div>

      <div className={styles.right}>
        <Link to="/my-courses" className={styles.link}>
          Khóa học của tôi
        </Link>

        <span className={styles.icon}>🔔</span>
        <span className={styles.icon}>💡</span>

        <div className={styles.avatar}>
          {user?.username?.charAt(0)?.toUpperCase() || "U"}
        </div>
      </div>
    </header>
  );
}
