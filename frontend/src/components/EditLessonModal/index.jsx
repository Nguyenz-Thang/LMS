import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import Modal from "../Modal";
import api from "../../api/axios";
import styles from "./EditLessonModal.module.scss";

function EditLessonModal({ isOpen, onClose, onUpdated, lesson, section }) {
  const [form, setForm] = useState({
    title: "",
    content: "",
    videoUrl: "",
    duration: "",
    lessonType: "VIDEO",
    isPreview: false,
    orderIndex: 1,
  });

  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    if (!isOpen || !lesson) return;

    setForm({
      title: lesson.title || "",
      content: lesson.content || "",
      videoUrl: lesson.videoUrl || "",
      duration: lesson.duration || "",
      lessonType: lesson.type || "VIDEO",
      isPreview: !!lesson.isPreview,
      orderIndex: lesson.orderIndex || 1,
    });

    setErrorText("");
  }, [isOpen, lesson]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : name === "duration" || name === "orderIndex"
            ? Number(value)
            : value,
    }));
  };

  const handleClose = () => {
    if (loading) return;
    setErrorText("");
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!lesson?.id) {
      setErrorText("Không tìm thấy lesson để cập nhật.");
      return;
    }

    if (!section?.id) {
      setErrorText("Không tìm thấy section.");
      return;
    }

    if (!form.title.trim()) {
      setErrorText("Vui lòng nhập tiêu đề.");
      return;
    }

    try {
      setLoading(true);
      setErrorText("");

      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        videoUrl: form.videoUrl.trim(),
        duration: form.duration || 0,
        lessonType: form.lessonType,
        isPreview: form.isPreview,
        orderIndex: Number(form.orderIndex),
        sectionId: section.id,
      };

      await api.put(`/lessons/${lesson.id}`, payload);

      onClose();
      if (onUpdated) onUpdated();
    } catch (err) {
      setErrorText(err?.response?.data?.message || "Cập nhật lesson thất bại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onRequestClose={handleClose}>
      <div className={styles.wrapper}>
        <h2>Sửa bài học</h2>
        <p>Section: {section?.title}</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            name="title"
            placeholder="Tiêu đề"
            value={form.title}
            onChange={handleChange}
          />

          <textarea
            name="content"
            placeholder="Nội dung"
            value={form.content}
            onChange={handleChange}
          />

          <input
            name="videoUrl"
            placeholder="Video URL"
            value={form.videoUrl}
            onChange={handleChange}
          />

          <input
            name="duration"
            type="number"
            placeholder="Thời lượng (giây)"
            value={form.duration}
            onChange={handleChange}
          />

          <select
            name="lessonType"
            value={form.lessonType}
            onChange={handleChange}
          >
            <option value="VIDEO">Video</option>
            <option value="ARTICLE">Bài viết</option>
            <option value="QUIZ">Quiz</option>
          </select>

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              name="isPreview"
              checked={form.isPreview}
              onChange={handleChange}
            />
            Preview
          </label>

          <input
            name="orderIndex"
            type="number"
            min="1"
            value={form.orderIndex}
            onChange={handleChange}
          />

          {errorText && <div className={styles.error}>{errorText}</div>}

          <div className={styles.actions}>
            <button type="button" onClick={handleClose} disabled={loading}>
              Hủy
            </button>

            <button type="submit" disabled={loading}>
              {loading ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

EditLessonModal.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
  onUpdated: PropTypes.func,
  lesson: PropTypes.object,
  section: PropTypes.object,
};

export default EditLessonModal;
