import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "./Register.module.scss";
import logo from "../../assets/img/logo.png";
import heroImage from "../../assets/img/logo.png";

const API_BASE_URL = "http://localhost:8080/lms";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!form.username.trim()) {
      setErrorText("Vui lòng nhập tên đăng nhập.");
      return false;
    }

    if (!form.email.trim()) {
      setErrorText("Vui lòng nhập email.");
      return false;
    }

    if (!/\S+@\S+\.\S+/.test(form.email)) {
      setErrorText("Email không đúng định dạng.");
      return false;
    }

    if (!form.password.trim()) {
      setErrorText("Vui lòng nhập mật khẩu.");
      return false;
    }

    if (form.password.length < 6) {
      setErrorText("Mật khẩu phải có ít nhất 6 ký tự.");
      return false;
    }

    if (!form.confirmPassword.trim()) {
      setErrorText("Vui lòng nhập lại mật khẩu.");
      return false;
    }

    if (form.password !== form.confirmPassword) {
      setErrorText("Mật khẩu xác nhận không khớp.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorText("");
    setSuccessText("");

    if (!validateForm()) return;

    try {
      setLoading(true);

      await axios.post(`${API_BASE_URL}/auth/register`, {
        username: form.username,
        email: form.email,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });

      setSuccessText(
        "Đăng ký thành công. Bạn sẽ được chuyển sang trang đăng nhập.",
      );

      setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (error) {
      const backendMessage =
        error?.response?.data?.message ||
        error?.response?.data?.result?.message;

      setErrorText(backendMessage || "Đăng ký thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.registerPage}>
      <div className={styles.overlay} />

      <div className={styles.container}>
        <div className={styles.left}>
          <div className={styles.brand}>
            <img src={logo} alt="UTT Logo" className={styles.logo} />
            <div>
              <h1>UTT LMS</h1>
              <p>Tạo tài khoản mới để bắt đầu học tập trên hệ thống.</p>
            </div>
          </div>

          <div className={styles.heroCard}>
            <img
              src={heroImage}
              alt="Register illustration"
              className={styles.heroImage}
            />
            <div className={styles.heroContent}>
              <h2>Khởi tạo hành trình học tập của bạn</h2>
              <p>
                Sau khi đăng ký, bạn có thể đăng nhập để xem khóa học, theo dõi
                tiến độ học và tham gia quiz trực tiếp trên nền tảng.
              </p>
            </div>
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.formCard}>
            <div className={styles.formHeader}>
              <h2>Đăng ký tài khoản</h2>
              <p>Điền đầy đủ thông tin để tạo tài khoản mới.</p>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="username">Tên đăng nhập</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Nhập username"
                  value={form.username}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Nhập email"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="password">Mật khẩu</label>
                <div className={styles.passwordWrap}>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Nhập mật khẩu"
                    value={form.password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className={styles.toggleBtn}
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? "Ẩn" : "Hiện"}
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="confirmPassword">Nhập lại mật khẩu</label>
                <div className={styles.passwordWrap}>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Nhập lại mật khẩu"
                    value={form.confirmPassword}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className={styles.toggleBtn}
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                  >
                    {showConfirmPassword ? "Ẩn" : "Hiện"}
                  </button>
                </div>
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
                {loading ? "Đang đăng ký..." : "Tạo tài khoản"}
              </button>
            </form>

            <div className={styles.footer}>
              <span>Đã có tài khoản?</span>
              <Link to="/login">Đăng nhập</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
