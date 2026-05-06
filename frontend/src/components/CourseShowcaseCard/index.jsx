import { BookOpen, Clock3, PlayCircle, UserRound, Users } from "lucide-react";
import styles from "./CourseShowcaseCard.module.scss";

function getImageSrc(value, baseUrl) {
  if (!value) return "";
  if (value.startsWith("http")) return value;
  if (value.startsWith("/")) return `${baseUrl}${value}`;
  return `${baseUrl}/${value}`;
}

function trimText(text = "", fallback = "") {
  const normalized = String(text || "").trim();
  return normalized || fallback;
}

function formatDuration(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return "0 phút";

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hours > 0 && mins > 0) return `${hours} giờ ${mins} phút`;
  if (hours > 0) return `${hours} giờ`;
  return `${mins} phút`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("vi-VN");
}

export default function CourseShowcaseCard({
  course,
  stats,
  baseUrl,
  onClick,
  busy = false,
}) {
  const categoryName = trimText(course?.categoryName, "Khóa học");
  const title = trimText(course?.title, "Khóa học đang cập nhật");
  const description = trimText(course?.description, "Chưa có mô tả khóa học.");
  const instructorName = trimText(course?.instructorName, "Chưa cập nhật");
  const instructorAvatar = getImageSrc(course?.instructorAvatar, baseUrl);
  const thumbnail = getImageSrc(course?.thumbnailUrl, baseUrl);

  return (
    <article
      className={`${styles.card} ${busy ? styles.cardBusy : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick?.();
        }
      }}
    >
      <div className={styles.thumbnailWrap}>
        {thumbnail ? (
          <img src={thumbnail} alt={title} className={styles.thumbnail} />
        ) : (
          <div className={styles.thumbnailFallback}>
            <BookOpen size={30} />
          </div>
        )}
      </div>

      <div className={styles.body}>
        <div className={styles.titleRow}>
          <div>
            <span className={styles.categoryText}>{categoryName}</span>
            <h3>{title}</h3>
          </div>
        </div>

        <p className={styles.description}>{description}</p>

        <div className={styles.statsRow}>
          <span>
            <PlayCircle size={14} />
            <span>{formatNumber(stats?.totalLessons)} bài</span>
          </span>
          <span>
            <Users size={14} />
            <span>{formatNumber(course?.enrollmentCount)} người học</span>
          </span>
          <span>
            <Clock3 size={14} />
            <span>{formatDuration(stats?.totalDurationMinutes)}</span>
          </span>
        </div>

        <div className={styles.instructorRow}>
          <span className={styles.avatar}>
            {instructorAvatar ? (
              <img src={instructorAvatar} alt={instructorName} />
            ) : (
              <UserRound size={15} />
            )}
          </span>
          <span>{instructorName}</span>
        </div>
      </div>
    </article>
  );
}
