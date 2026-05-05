import React from "react";
import {
  BookOpen,
  FileText,
  HelpCircle,
  Pencil,
  PlayCircle,
} from "lucide-react";

export function formatDuration(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return "0 phút";
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hours > 0 && mins > 0) return `${hours} giờ ${mins} phút`;
  if (hours > 0) return `${hours} giờ`;
  return `${mins} phút`;
}

export function formatClockDuration(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return "--:--";
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  }

  return `00:${String(mins).padStart(2, "0")}`;
}

export function getLessonIcon(lessonType) {
  switch (lessonType) {
    case "VIDEO":
      return <PlayCircle size={15} />;
    case "READING":
      return <FileText size={15} />;
    case "QUIZ":
      return <HelpCircle size={15} />;
    case "ASSIGNMENT":
      return <Pencil size={15} />;
    case "FILE":
      return <FileText size={15} />;
    default:
      return <BookOpen size={15} />;
  }
}

export function getBlockTitle(blockType) {
  const map = {
    TEXT: "Nội dung",
    VIDEO: "Video",
    IMAGE: "Hình ảnh",
    QUIZ: "Quiz",
    FILE: "Tài liệu",
    ASSIGNMENT: "Bài tập",
  };

  return map[blockType] || blockType;
}

export function isYoutubeUrl(url = "") {
  return (
    url.includes("youtube.com/watch") ||
    url.includes("youtu.be/") ||
    url.includes("youtube.com/embed/")
  );
}

export function toYoutubeEmbedUrl(url = "") {
  if (!url) return "";
  if (url.includes("youtube.com/embed/")) return url;

  if (url.includes("youtu.be/")) {
    const videoId = url.split("youtu.be/")[1]?.split("?")[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
  }

  if (url.includes("youtube.com/watch")) {
    try {
      const parsed = new URL(url);
      const videoId = parsed.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
    } catch {
      return "";
    }
  }

  return "";
}
