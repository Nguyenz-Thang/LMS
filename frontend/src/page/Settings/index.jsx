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
    key: "weeklyProgressEmail",
    title: "Báo cáo học tập hằng tuần",
    description: "Nhận email tóm tắt tiến độ học tập của bạn mỗi tuần.",
  },
];

export default function Settings() {
  const [settings, setSettings] = useState({
    newAssignmentEmail: true,
    weeklyProgressEmail: true,
  });
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
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
    setErrorText("");

    try {
      const res = await api.put("/notification-settings/me", {
        [key]: nextValue,
      });

      setSettings((prev) => ({
        ...prev,
        ...(res?.data?.result || {}),
      }));
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

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>Cài đặt tài khoản</span>
          <h1>Thông báo qua email</h1>
          <p>
            Chọn những thông báo học tập bạn muốn nhận trong quá trình tham gia
            khóa học.
          </p>
        </div>
      </div>

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

              <div className={styles.settingAction}>
                <span className={styles.statusText}>
                  {settings[item.key] ? "Đang bật" : "Đã tắt"}
                </span>
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
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
