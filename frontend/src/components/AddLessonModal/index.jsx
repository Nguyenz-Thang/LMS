import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import Modal from "../Modal";
import api from "../../api/axios";
import styles from "./AddLessonModal.module.scss";

function AddLessonModal({
  isOpen,
  onClose,
  onCreated,
  section,
  nextOrderIndex = 1,
}) {
  const [form, setForm] = useState({
    title: "",
    content: "",
    videoUrl: "",
    duration: "",
    lessonType: "VIDEO",
    isPreview: false,
    orderIndex: nextOrderIndex,
  });

  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    setForm({
      title: "",
      content: "",
      videoUrl: "",
      duration: "",
      lessonType: "VIDEO",
      isPreview: false,
      orderIndex: nextOrderIndex,
    });

    setErrorText("");
  }, [isOpen, nextOrderIndex]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();

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
        ...form,
        sectionId: section.id,
      };

      await api.post("/lessons", payload);

      onClose();
      onCreated();
    } catch (err) {
      setErrorText(err?.response?.data?.message || "Tạo lesson thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onRequestClose={onClose}>
      <div className={styles.wrapper}>
        <h2>Thêm bài học</h2>
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
            value={form.orderIndex}
            onChange={handleChange}
          />

          {errorText && <div className={styles.error}>{errorText}</div>}

          <div className={styles.actions}>
            <button type="button" onClick={onClose}>
              Hủy
            </button>

            <button type="submit" disabled={loading}>
              {loading ? "Đang tạo..." : "Tạo"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

AddLessonModal.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
  onCreated: PropTypes.func,
  section: PropTypes.object,
  nextOrderIndex: PropTypes.number,
};

export default AddLessonModal;
