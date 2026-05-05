import { useEffect, useState } from "react";
import api from "../../api/axios";
import styles from "./Settings.module.scss";

const SETTING_ITEMS = [
  {
    key: "newAssignmentEmail",
    title: "Bài tập mới",
    description: "Nhận email khi khóa học có bài tập mới được giao.",
  },
  {
    key: "newLessonEmail",
    title: "Bài học mới trong khóa",
    description: "Nhận email khi giảng viên xuất bản bài học mới.",
  },
  {
    key: "weeklyProgressEmail",
    title: "Báo cáo học tập hằng tuần",
    description: "Nhận email tóm tắt tiến độ học tập của bạn mỗi tuần.",
  },
];

export default function Settings() {
  const [settings, setSettings] = useState({
    newLessonEmail: true,
    newAssignmentEmail: true,
    weeklyProgressEmail: true,
  });
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setErrorText("");
      const res = await api.get("/notification-settings/me");
      setSettings((prev) => ({
        ...prev,
        ...(res?.data?.result || {}),
      }));
    } catch (error) {
      setErrorText(
        error?.response?.data?.message ||
          "Không tải được cài đặt thông báo email.",
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleSetting = async (key) => {
    const nextValue = !settings[key];
    const nextState = {
      ...settings,
      [key]: nextValue,
    };

    setSettings(nextState);
    setSavingKey(key);
    setMessage("");
    setErrorText("");

    try {
      const res = await api.put("/notification-settings/me", {
        [key]: nextValue,
      });

      setSettings((prev) => ({
        ...prev,
        ...(res?.data?.result || {}),
      }));
      setMessage("Đã cập nhật cài đặt email.");
    } catch (error) {
      setSettings((prev) => ({
        ...prev,
        [key]: !nextValue,
      }));
      setErrorText(
        error?.response?.data?.message ||
          "Không cập nhật được cài đặt email.",
      );
    } finally {
      setSavingKey("");
    }
  };

  const sendTestEmail = async () => {
    try {
      setSendingTest(true);
      setMessage("");
      setErrorText("");
      const res = await api.post("/notification-settings/me/test-email");
      setMessage(res?.data?.result || "Đã gửi email test.");
    } catch (error) {
      setErrorText(
        error?.response?.data?.message || "Không gửi được email test.",
      );
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div>
          <h1>Thông báo qua email</h1>
          <p>
            Quản lý các email học tập mà hệ thống gửi đến bạn. Tôi chỉ giữ các
            mục phù hợp với LMS của đồ án: bài tập mới, bài học mới và báo cáo
            tiến độ tuần.
          </p>
        </div>

        <button
          type="button"
          className={styles.testBtn}
          onClick={sendTestEmail}
          disabled={sendingTest || loading}
        >
          {sendingTest ? "Đang gửi email test..." : "Gửi email test"}
        </button>
      </div>

      {message ? <div className={styles.successBox}>{message}</div> : null}
      {errorText ? <div className={styles.errorBox}>{errorText}</div> : null}

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>Tùy chọn email</h2>
          <span>{loading ? "Đang tải..." : "Bật hoặc tắt theo nhu cầu"}</span>
        </div>

        <div className={styles.card}>
          {SETTING_ITEMS.map((item) => (
            <div key={item.key} className={styles.settingRow}>
              <div className={styles.settingContent}>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </div>

              <button
                type="button"
                className={`${styles.toggle} ${settings[item.key] ? styles.toggleActive : ""}`}
                onClick={() => toggleSetting(item.key)}
                disabled={loading || savingKey === item.key}
                aria-pressed={settings[item.key]}
                aria-label={item.title}
              >
                <span className={styles.toggleKnob} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.noteCard}>
        <h3>Cách test nhanh</h3>
        <p>
          Sau khi cấu hình SMTP và restart backend, chỉ cần bấm nút
          `Gửi email test`. Hệ thống sẽ gửi một email mẫu vào đúng địa chỉ email
          của tài khoản hiện tại.
        </p>
      </section>
    </div>
  );
}
