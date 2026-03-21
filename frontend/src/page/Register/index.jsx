import { useState } from "react";
import styles from "./Register.module.scss";

export default function Register() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      setError("Mật khẩu không khớp!");
      return;
    }

    setError("");
    console.log("Register:", form);

    // TODO: call API
  };

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <h2>Đăng ký LMS</h2>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="username"
            placeholder="Tên người dùng"
            onChange={handleChange}
            required
          />

          <input
            type="email"
            name="email"
            placeholder="Email"
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Mật khẩu"
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="confirmPassword"
            placeholder="Xác nhận mật khẩu"
            onChange={handleChange}
            required
          />

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit">Đăng ký</button>
        </form>

        <p>
          Đã có tài khoản? <a href="/login">Đăng nhập</a>
        </p>
      </div>
    </div>
  );
}
