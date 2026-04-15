import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import Modal from "../Modal";
import styles from "./EditLessonModal.module.scss";
import { useLessonApi } from "../../api/LessonApi";

function EditLessonModal({ isOpen, onClose, onUpdated, lesson, section }) {
  const navigate = useNavigate();
  const { updateLesson } = useLessonApi();

  const [form, setForm] = useState({
    title: "",
    description: "",
    content: "",
    videoUrl: "",
    thumbnailUrl: "",
    durationMinutes: 0,
    isPreview: false,
    isPublished: true,
    orderIndex: 1,
    lessonType: "VIDEO",

    quizTitle: "",
    quizDescription: "",

    assignmentTitle: "",
    assignmentDescription: "",
    assignmentType: "ESSAY",
  });

  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    if (!isOpen || !lesson) return;

    setForm({
      title: lesson.title || "",
      description: lesson.description || "",
      content: lesson.content || "",
      videoUrl: lesson.videoUrl || "",
      thumbnailUrl: lesson.thumbnailUrl || "",
      durationMinutes: lesson.durationMinutes ?? 0,
      isPreview: !!lesson.isPreview,
      isPublished: lesson.isPublished ?? true,
      orderIndex: lesson.orderIndex || 1,
      lessonType: lesson.lessonType || "VIDEO",

      quizTitle: lesson.quizTitle || lesson.title || "",
      quizDescription: lesson.quizDescription || "",

      assignmentTitle: lesson.assignmentTitle || lesson.title || "",
      assignmentDescription: lesson.assignmentDescription || "",
      assignmentType: lesson.assignmentType || "ESSAY",
    });

    setErrorText("");
  }, [isOpen, lesson]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => {
      const nextValue =
        type === "checkbox"
          ? checked
          : name === "durationMinutes" || name === "orderIndex"
            ? value === ""
              ? ""
              : Number(value)
            : value;

      const nextForm = {
        ...prev,
        [name]: nextValue,
      };

      if (name === "lessonType") {
        const nextType = value;

        if (nextType !== "VIDEO") {
          nextForm.videoUrl = "";
          nextForm.durationMinutes = 0;
        }

        if (nextType === "QUIZ") {
          nextForm.content = "";
          nextForm.videoUrl = "";
          nextForm.durationMinutes = 0;
          nextForm.thumbnailUrl = "";
          nextForm.assignmentTitle = "";
          nextForm.assignmentDescription = "";
          nextForm.assignmentType = "ESSAY";
          nextForm.isPreview = false;
        }

        if (nextType === "READING") {
          nextForm.videoUrl = "";
          nextForm.quizTitle = "";
          nextForm.quizDescription = "";
          nextForm.assignmentTitle = "";
          nextForm.assignmentDescription = "";
          nextForm.assignmentType = "ESSAY";
        }

        if (nextType === "ASSIGNMENT") {
          nextForm.videoUrl = "";
          nextForm.durationMinutes = 0;
          nextForm.quizTitle = "";
          nextForm.quizDescription = "";
        }

        if (nextType === "VIDEO") {
          nextForm.content = "";
          nextForm.quizTitle = "";
          nextForm.quizDescription = "";
          nextForm.assignmentTitle = "";
          nextForm.assignmentDescription = "";
          nextForm.assignmentType = "ESSAY";
        }
      }

      return nextForm;
    });
  };

  const handleClose = () => {
    if (loading) return;
    setErrorText("");
    onClose();
  };

  const validateForm = () => {
    if (!lesson?.id) {
      return "Không tìm thấy bài học để cập nhật.";
    }

    if (!section?.id) {
      return "Không tìm thấy section.";
    }

    if (!form.title.trim()) {
      return "Vui lòng nhập tiêu đề bài học.";
    }

    if (!form.lessonType) {
      return "Vui lòng chọn loại bài học.";
    }

    if (form.durationMinutes !== "" && Number(form.durationMinutes) < 0) {
      return "Thời lượng không được nhỏ hơn 0.";
    }

    if (!form.orderIndex || Number(form.orderIndex) < 1) {
      return "Thứ tự bài học phải lớn hơn 0.";
    }

    if (form.lessonType === "VIDEO" && !form.videoUrl.trim()) {
      return "Bài học video phải có video URL.";
    }

    if (
      (form.lessonType === "READING" || form.lessonType === "ASSIGNMENT") &&
      !form.content.trim()
    ) {
      return "Loại bài học này cần có nội dung.";
    }

    return "";
  };

  const buildPayload = () => {
    const basePayload = {
      title: form.title.trim(),
      description: form.description.trim(),
      content: "",
      videoUrl: "",
      thumbnailUrl: "",
      durationMinutes: 0,
      isPreview: form.lessonType === "QUIZ" ? false : form.isPreview,
      isPublished: form.isPublished,
      orderIndex: Number(form.orderIndex),
      sectionId: section.id,
      lessonType: form.lessonType,

      quizTitle: "",
      quizDescription: "",

      assignmentTitle: "",
      assignmentDescription: "",
      assignmentType: "",
    };

    switch (form.lessonType) {
      case "VIDEO":
        return {
          ...basePayload,
          videoUrl: form.videoUrl.trim(),
          thumbnailUrl: form.thumbnailUrl.trim(),
          durationMinutes: Number(form.durationMinutes) || 0,
        };

      case "READING":
        return {
          ...basePayload,
          content: form.content.trim(),
          thumbnailUrl: form.thumbnailUrl.trim(),
        };

      case "QUIZ":
        return {
          ...basePayload,
          quizTitle: form.quizTitle.trim(),
          quizDescription: form.quizDescription.trim(),
        };

      case "ASSIGNMENT":
        return {
          ...basePayload,
          content: form.content.trim(),
          thumbnailUrl: form.thumbnailUrl.trim(),
          assignmentTitle: form.assignmentTitle.trim(),
          assignmentDescription: form.assignmentDescription.trim(),
          assignmentType: form.assignmentType || "ESSAY",
        };

      default:
        return basePayload;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setErrorText(validationError);
      return;
    }

    try {
      setLoading(true);
      setErrorText("");

      const payload = buildPayload();
      await updateLesson(lesson.id, payload);

      onClose();
      if (onUpdated) onUpdated();
    } catch (error) {
      setErrorText(
        error?.body?.message || error?.message || "Cập nhật bài học thất bại.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoToQuizEditor = () => {
    if (!lesson?.quizId) return;
    onClose();
    navigate(`/admin/quizzes/${lesson.quizId}/edit`);
  };

  return (
    <Modal isOpen={isOpen} onRequestClose={handleClose}>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h2>Sửa bài học</h2>
          <p>Section: {section?.title || "—"}</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="title">Tiêu đề bài học</label>
            <input
              id="title"
              name="title"
              placeholder="Ví dụ: Giới thiệu khóa học"
              value={form.title}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="lessonType">Loại bài học</label>
            <select
              id="lessonType"
              name="lessonType"
              value={form.lessonType}
              onChange={handleChange}
            >
              <option value="VIDEO">Video</option>
              <option value="READING">Bài đọc</option>
              <option value="QUIZ">Quiz</option>
              <option value="ASSIGNMENT">Bài tập</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">Mô tả ngắn</label>
            <textarea
              id="description"
              name="description"
              rows="3"
              placeholder="Nhập mô tả ngắn cho bài học..."
              value={form.description}
              onChange={handleChange}
            />
          </div>

          {form.lessonType === "VIDEO" && (
            <>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="videoUrl">Video URL</label>
                  <input
                    id="videoUrl"
                    name="videoUrl"
                    placeholder="https://..."
                    value={form.videoUrl}
                    onChange={handleChange}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="thumbnailUrl">Thumbnail URL</label>
                  <input
                    id="thumbnailUrl"
                    name="thumbnailUrl"
                    placeholder="https://..."
                    value={form.thumbnailUrl}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="durationMinutes">Thời lượng (phút)</label>
                  <input
                    id="durationMinutes"
                    name="durationMinutes"
                    type="number"
                    min="0"
                    value={form.durationMinutes}
                    onChange={handleChange}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="orderIndex">Thứ tự bài học</label>
                  <input
                    id="orderIndex"
                    name="orderIndex"
                    type="number"
                    min="1"
                    value={form.orderIndex}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </>
          )}

          {form.lessonType === "READING" && (
            <>
              <div className={styles.formGroup}>
                <label htmlFor="content">Nội dung bài đọc</label>
                <textarea
                  id="content"
                  name="content"
                  rows="6"
                  placeholder="Nhập nội dung bài học..."
                  value={form.content}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="thumbnailUrl">Thumbnail URL</label>
                <input
                  id="thumbnailUrl"
                  name="thumbnailUrl"
                  placeholder="https://..."
                  value={form.thumbnailUrl}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="orderIndex">Thứ tự bài học</label>
                <input
                  id="orderIndex"
                  name="orderIndex"
                  type="number"
                  min="1"
                  value={form.orderIndex}
                  onChange={handleChange}
                />
              </div>
            </>
          )}

          {form.lessonType === "QUIZ" && (
            <>
              <div className={styles.formGroup}>
                <label htmlFor="quizTitle">Tiêu đề quiz</label>
                <input
                  id="quizTitle"
                  name="quizTitle"
                  placeholder="Ví dụ: Quiz chương 1"
                  value={form.quizTitle}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="quizDescription">Mô tả quiz</label>
                <textarea
                  id="quizDescription"
                  name="quizDescription"
                  rows="3"
                  placeholder="Nhập mô tả quiz..."
                  value={form.quizDescription}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="orderIndex">Thứ tự bài học</label>
                <input
                  id="orderIndex"
                  name="orderIndex"
                  type="number"
                  min="1"
                  value={form.orderIndex}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.formGroup}>
                <div className={styles.noteBox}>
                  <p>
                    Đây là bài học dạng quiz. Nội dung câu hỏi và đáp án sẽ được
                    sửa ở trang quản lý quiz riêng.
                  </p>

                  {lesson?.quizId ? (
                    <button
                      type="button"
                      className={styles.submitBtn}
                      onClick={handleGoToQuizEditor}
                    >
                      Đi tới sửa quiz
                    </button>
                  ) : (
                    <p className={styles.noteError}>
                      Bài học này chưa có quizId để mở trang sửa quiz.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {form.lessonType === "ASSIGNMENT" && (
            <>
              <div className={styles.formGroup}>
                <label htmlFor="assignmentTitle">Tiêu đề bài tập</label>
                <input
                  id="assignmentTitle"
                  name="assignmentTitle"
                  placeholder="Ví dụ: Bài tập chương 1"
                  value={form.assignmentTitle}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="assignmentDescription">Mô tả bài tập</label>
                <textarea
                  id="assignmentDescription"
                  name="assignmentDescription"
                  rows="3"
                  placeholder="Nhập mô tả bài tập..."
                  value={form.assignmentDescription}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="assignmentType">Loại nộp bài</label>
                <select
                  id="assignmentType"
                  name="assignmentType"
                  value={form.assignmentType}
                  onChange={handleChange}
                >
                  <option value="ESSAY">Tự luận</option>
                  <option value="FILE_UPLOAD">Nộp file</option>
                  <option value="IMAGE_UPLOAD">Nộp ảnh</option>
                  <option value="MIXED">Kết hợp</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="content">Nội dung bài tập</label>
                <textarea
                  id="content"
                  name="content"
                  rows="6"
                  placeholder="Nhập yêu cầu / đề bài..."
                  value={form.content}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="thumbnailUrl">Thumbnail URL</label>
                <input
                  id="thumbnailUrl"
                  name="thumbnailUrl"
                  placeholder="https://..."
                  value={form.thumbnailUrl}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="orderIndex">Thứ tự bài học</label>
                <input
                  id="orderIndex"
                  name="orderIndex"
                  type="number"
                  min="1"
                  value={form.orderIndex}
                  onChange={handleChange}
                />
              </div>
            </>
          )}

          <div className={styles.checkRow}>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                name="isPreview"
                checked={form.lessonType === "QUIZ" ? false : form.isPreview}
                onChange={handleChange}
                disabled={form.lessonType === "QUIZ"}
              />
              <span>Cho phép học thử</span>
            </label>

            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                name="isPublished"
                checked={form.isPublished}
                onChange={handleChange}
              />
              <span>Hiển thị bài học</span>
            </label>
          </div>

          {errorText && <div className={styles.error}>{errorText}</div>}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={handleClose}
              disabled={loading}
            >
              Hủy
            </button>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
            >
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
  lesson: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    title: PropTypes.string,
    description: PropTypes.string,
    content: PropTypes.string,
    videoUrl: PropTypes.string,
    thumbnailUrl: PropTypes.string,
    durationMinutes: PropTypes.number,
    isPreview: PropTypes.bool,
    isPublished: PropTypes.bool,
    orderIndex: PropTypes.number,
    lessonType: PropTypes.string,
    quizId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    assignmentId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    quizTitle: PropTypes.string,
    quizDescription: PropTypes.string,
    assignmentTitle: PropTypes.string,
    assignmentDescription: PropTypes.string,
    assignmentType: PropTypes.string,
  }),
  section: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    title: PropTypes.string,
  }),
};

export default EditLessonModal;
