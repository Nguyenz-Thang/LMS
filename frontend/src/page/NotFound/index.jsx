import { Link } from "react-router-dom";
import styles from "./NotFound.module.scss";
import logo from "../../assets/img/utt.png";
import heroImage from "../../assets/img/utt.png";

export default function NotFound() {
  return (
    <div className={styles.notFoundPage}>
      <div className={styles.overlay} />

      <div className={styles.card}>
        <div className={styles.left}>
          <img src={logo} alt="UTT Logo" className={styles.logo} />

          <div className={styles.textBlock}>
            <span className={styles.code}>404</span>
            <h1>Không tìm thấy trang</h1>
            <p>
              Trang bạn đang tìm có thể đã bị xóa, đổi đường dẫn hoặc hiện không
              tồn tại trong hệ thống.
            </p>
          </div>

          <div className={styles.actions}>
            <Link to="/" className={styles.primaryBtn}>
              Về trang chủ
            </Link>
            <Link to="/login" className={styles.secondaryBtn}>
              Đăng nhập
            </Link>
          </div>
        </div>

        <div className={styles.right}>
          <img
            src={heroImage}
            alt="Not found illustration"
            className={styles.image}
          />
        </div>
      </div>
    </div>
  );
}
