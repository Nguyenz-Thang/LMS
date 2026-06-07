import { Youtube, Facebook, Music2 } from "lucide-react";
import styles from "./Footer.module.scss";
import logo from "../../../../assets/img/logo.png";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.colBrand}>
            <div className={styles.brand}>
              <img src={logo} alt="LMS Logo" className={styles.logo} />
              <h3>LMS</h3>
            </div>

            <p className={styles.description}>
              Nền tảng quản lý học tập trực tuyến hỗ trợ khóa học, bài học,
              quiz, bài tập, thanh toán và theo dõi tiến độ.
            </p>

            <ul className={styles.infoList}>
              <li>
                <strong>Điện thoại:</strong> 08 6541 6387
              </li>
              <li>
                <strong>Email:</strong> tatthang204@gmail.com
              </li>
              <li>
                <strong>Địa chỉ liên hệ:</strong> Số 17, ngõ 179, Phường Thanh
                Liệt, Thành phố Hà Nội
              </li>
            </ul>
          </div>

          <div className={styles.col}>
            <h4>VỀ LMS</h4>
            <a href="/home">Giới thiệu hệ thống</a>
            <a href="/courses">Khóa học</a>
            <a href="/my-courses">Lộ trình học tập</a>
            <a href="/chatbot">Hỗ trợ học tập AI</a>
            <a href="/profile">Liên hệ</a>
          </div>

          <div className={styles.col}>
            <h4>HỖ TRỢ</h4>
            <a href="/courses">Hướng dẫn đăng ký khóa học</a>
            <a href="/my-courses">Hướng dẫn thanh toán</a>
            <a href="/settings">Cài đặt thông báo</a>
            <a href="/settings">Chính sách bảo mật</a>
          </div>

          <div className={styles.col}>
            <h4>CÔNG CỤ</h4>
            <a href="/my-courses">Khóa học của tôi</a>
            <a href="/quizzes">Quiz</a>
            <a href="/quiz-results">Kết quả quiz</a>
            <a href="/progress">Tiến độ học tập</a>
            <a href="/chatbot">Chatbot AI</a>
          </div>

          <div className={styles.colCompany}>
            <h4>QUẢN LÝ HỌC TẬP</h4>
            <a href="/admin/courses">Quản lý khóa học</a>
            <a href="/admin/categories">Quản lý danh mục</a>
            <a href="/admin/users">Quản lý học viên</a>
            <a href="/admin/enrollments">Quản lý đăng ký học</a>
            <a href="/admin/reports">Báo cáo - thống kê</a>
          </div>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copy}>
            © 2026 LMS. Đồ án hệ thống quản lý học tập trực tuyến.
          </p>

          <div className={styles.socials}>
            <a href="/" aria-label="YouTube" className={styles.socialBtn}>
              <Youtube size={18} />
            </a>
            <a href="/" aria-label="Facebook" className={styles.socialBtn}>
              <Facebook size={18} />
            </a>
            <a href="/" aria-label="TikTok" className={styles.socialBtn}>
              <Music2 size={18} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
