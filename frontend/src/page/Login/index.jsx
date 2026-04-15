import { useContext, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";
import styles from "./Login.module.scss";
import logo from "../../assets/img/utt.png";
import heroImage from "../../assets/img/utt.png";

const API_BASE_URL = "http://localhost:8080/lms";

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

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

    if (!form.password.trim()) {
      setErrorText("Vui lòng nhập mật khẩu.");
      return false;
    }

    return true;
  };

  const getRedirectByRole = (user) => {
    const roles = user?.roles?.map((role) => role.name) || [];

    if (roles.includes("ADMIN")) return "/admin";
    if (roles.includes("INSTRUCTOR")) return "/instructor";
    return "/home";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorText("");

    if (!validateForm()) return;

    try {
      setLoading(true);

      const loginRes = await axios.post(`${API_BASE_URL}/auth/token`, {
        username: form.username,
        password: form.password,
      });

      const token = loginRes?.data?.result?.token;
      const authenticated = loginRes?.data?.result?.authenticated;

      if (!token || !authenticated) {
        throw new Error("Đăng nhập thất bại.");
      }

      const meRes = await axios.get(`${API_BASE_URL}/users/myInfo`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const user = meRes?.data?.result;

      if (!user) {
        throw new Error("Không lấy được thông tin người dùng.");
      }

      login({ user, token });

      const from = location.state?.from?.pathname;
      navigate(from || getRedirectByRole(user), { replace: true });
    } catch (error) {
      const backendMessage =
        error?.response?.data?.message ||
        error?.response?.data?.result?.message;

      setErrorText(backendMessage || "Sai tài khoản hoặc mật khẩu.");
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
              <h2>Chào mừng bạn quay trở lại</h2>
              <p>
                Đăng nhập để tiếp tục học tập, theo dõi tiến độ khóa học và làm
                quiz ngay trên hệ thống của bạn.
              </p>
            </div>
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.formCard}>
            <div className={styles.formHeader}>
              <h2>Đăng nhập</h2>
              <p>Sử dụng tài khoản của bạn để truy cập hệ thống.</p>
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
                  autoComplete="username"
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
                    autoComplete="current-password"
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

              {errorText && <div className={styles.errorBox}>{errorText}</div>}

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={loading}
              >
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </button>
            </form>

            <div className={styles.footer}>
              <span>Chưa có tài khoản?</span>
              <Link to="/register">Đăng ký</Link>
            </div>

            <div className={styles.demoBox}>
              <strong>Demo:</strong>
              <span> admin / admin </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
