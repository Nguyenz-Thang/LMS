import styles from "./LoadingSpinner.module.scss";

export default function LoadingSpinner({ text = "Đang tải...", compact = false }) {
  return (
    <div className={`${styles.loadingState} ${compact ? styles.compact : ""}`}>
      <div className={styles.spinner} aria-hidden="true" />
      {text ? <p className={styles.text}>{text}</p> : null}
    </div>
  );
}
