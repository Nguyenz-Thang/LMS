import { Clock3, PlayCircle, UserRound, Users } from "lucide-react";
import styles from "./CourseShowcaseCard.module.scss";

const FALLBACK_THUMB =
  "https://images.unsplash.com/photo-1513258496099-48168024aec0?q=80&w=1200&auto=format&fit=crop";

const PALETTES = [
  ["#1fb6ff", "#4f46e5"],
  ["#facc15", "#fb923c"],
  ["#f43f5e", "#6d28d9"],
  ["#14b8a6", "#0ea5e9"],
  ["#312e81", "#7c3aed"],
  ["#f97316", "#f59e0b"],
  ["#22c55e", "#166534"],
  ["#db2777", "#f97316"],
];

function hashString(value = "") {
  return Array.from(value).reduce(
    (acc, char) => acc + char.charCodeAt(0),
    0,
  );
}

function getPaletteSeed(course) {
  const source = `${course?.id || ""}${course?.title || ""}`;
  return PALETTES[hashString(source) % PALETTES.length];
}

function getImageSrc(value, baseUrl, fallback = FALLBACK_THUMB) {
  if (!value) return fallback;
  if (value.startsWith("http")) return value;
  if (value.startsWith("/")) return `${baseUrl}${value}`;
  return `${baseUrl}/${value}`;
}

function trimText(text = "", fallback = "") {
  const normalized = String(text || "").trim();
  return normalized || fallback;
}

function formatDuration(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return "0";
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hours > 0 && mins > 0) return `${hours}h${mins}p`;
  if (hours > 0) return `${hours}h`;
  return `${mins}p`;
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
  const [startColor, endColor] = getPaletteSeed(course);
  const hasThumb = Boolean(course?.thumbnailUrl);
  const categoryName = trimText(course?.categoryName, "Khóa học");
  const title = trimText(course?.title, "Khóa học đang cập nhật");
  const subtitle = trimText(
    course?.description,
    course?.instructorName || "Khóa học thực hành từ cơ bản đến nâng cao",
  );
  const instructorName = trimText(course?.instructorName, "Chưa cập nhật");
  const instructorAvatar = getImageSrc(course?.instructorAvatar, baseUrl, "");

  return (
    <article
      className={`${styles.card} ${busy ? styles.cardBusy : ""}`}
      onClick={onClick}
    >
      <div
        className={styles.cover}
        style={{
          "--cover-start": startColor,
          "--cover-end": endColor,
          ...(hasThumb
            ? {
                "--cover-image": `url(${getImageSrc(
                  course.thumbnailUrl,
                  baseUrl,
                )})`,
              }
            : {}),
        }}
      >
        <div className={styles.coverOverlay} />
        <div className={styles.coverNoise} />

        <div className={styles.coverTop}>
          <span className={styles.categoryChip}>{categoryName}</span>
        </div>

        <div className={styles.coverBody}>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.bodyTop}>
          <h4>{title}</h4>
        </div>

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
