import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import styles from "../Login/Login.module.scss";
import logo from "../../assets/img/logo.png";
import heroImage from "../../assets/img/logo.png";

const API_BASE_URL = "http://localhost:8080/lms";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [form, setForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!token) {
      setErrorText("Liên kết đặt lại mật khẩu không hợp lệ.");
      return false;
    }

    if (form.newPassword.length < 6) {
      setErrorText("Mật khẩu phải có ít nhất 6 ký tự.");
      return false;
    }

    if (form.newPassword !== form.confirmPassword) {
      setErrorText("Mật khẩu xác nhận không khớp.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorText("");
    setSuccessText("");

    if (!validateForm()) return;

    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/auth/reset-password`, {
        token,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });

      setSuccessText(response?.data?.message || "Đặt lại mật khẩu thành công.");
      setForm({
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      const backendMessage =
        error?.response?.data?.message ||
        error?.response?.data?.result?.message;

      setErrorText(backendMessage || "Không thể đặt lại mật khẩu.");
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
              <h2>Tạo mật khẩu mới</h2>
              <p>
                Sau khi đặt lại mật khẩu, bạn có thể đăng nhập bằng mật khẩu
                mới ngay lập tức.
              </p>
            </div>
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.formCard}>
            <div className={styles.formHeader}>
              <h2>Đặt lại mật khẩu</h2>
              <p>Nhập mật khẩu mới cho tài khoản của bạn.</p>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="newPassword">Mật khẩu mới</label>
                <div className={styles.passwordWrap}>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Nhập mật khẩu mới"
                    value={form.newPassword}
                    onChange={handleChange}
                    autoComplete="new-password"
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
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Nhập lại mật khẩu"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                />
              </div>

              {errorText && <div className={styles.errorBox}>{errorText}</div>}
              {successText && (
                <div className={styles.successBox}>{successText}</div>
              )}

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={loading || !token}
              >
                {loading ? "Đang cập nhật..." : "Đặt lại mật khẩu"}
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
