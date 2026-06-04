import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import styles from "../Login/Login.module.scss";
import logo from "../../assets/img/logo.png";
import heroImage from "../../assets/img/logo.png";

const API_BASE_URL = "http://localhost:8080/lms";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorText("");
    setSuccessText("");

    if (!email.trim()) {
      setErrorText("Vui lòng nhập email.");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setErrorText("Email không đúng định dạng.");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/auth/forgot-password`, {
        email: email.trim(),
      });

      setSuccessText(
        response?.data?.message ||
          "Nếu email tồn tại, hệ thống đã gửi liên kết đặt lại mật khẩu.",
      );
    } catch (error) {
      const backendMessage =
        error?.response?.data?.message ||
        error?.response?.data?.result?.message;

      setErrorText(backendMessage || "Không thể gửi email đặt lại mật khẩu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.overlay} />

      <div className={styles.container}>
        <div className={styles.left}>
          <div className={styles.brand}>
            <img src={logo} alt="UTT Logo" className={styles.logo} />
            <div>
              <h1>LMS</h1>
              <p>Nền tảng học tập trực tuyến hiện đại và trực quan.</p>
            </div>
          </div>

          <div className={styles.heroCard}>
            <img
              src={heroImage}
              alt="Learning illustration"
              className={styles.heroImage}
            />
            <div className={styles.heroContent}>
              <h2>Khôi phục quyền truy cập</h2>
              <p>
                Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu và tiếp
                tục sử dụng hệ thống.
              </p>
            </div>
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.formCard}>
            <div className={styles.formHeader}>
              <h2>Quên mật khẩu</h2>
              <p>Hệ thống sẽ gửi liên kết đặt lại mật khẩu tới email của bạn.</p>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Nhập email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                />
              </div>

              {errorText && <div className={styles.errorBox}>{errorText}</div>}
              {successText && (
                <div className={styles.successBox}>{successText}</div>
              )}

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={loading}
              >
                {loading ? "Đang gửi..." : "Gửi liên kết"}
              </button>
            </form>

            <div className={styles.footer}>
              <Link to="/login">Quay lại đăng nhập</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
