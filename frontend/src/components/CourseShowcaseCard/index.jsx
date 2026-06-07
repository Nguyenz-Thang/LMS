import { BookOpen, Clock3, Layers3, Tag, UserRound, Users } from "lucide-react";
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

function formatNumber(value) {
  return Number(value || 0).toLocaleString("vi-VN");
}

function formatPrice(course) {
  const price = Number(course?.price || 0);
  if (!course?.paid || price <= 0) return "Miễn phí";
  return `${price.toLocaleString("vi-VN")} ${course?.currency || "VND"}`;
}

function formatEstimatedHours(value) {
  const hours = Number(value || 0);
  if (hours <= 0) return "Đang cập nhật";
  return `${hours.toLocaleString("vi-VN")} giờ`;
}

export default function CourseShowcaseCard({
  course,
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
          <span className={styles.priceText}>
            <Tag size={14} />
            <span>{formatPrice(course)}</span>
          </span>
          <span>
            <Layers3 size={14} />
            <span>{trimText(course?.level, "Cơ bản")}</span>
          </span>
          <span>
            <Users size={14} />
            <span>{formatNumber(course?.enrollmentCount)}</span>
          </span>
          <span>
            <Clock3 size={14} />
            <span>{formatEstimatedHours(course?.estimatedHours)}</span>
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
