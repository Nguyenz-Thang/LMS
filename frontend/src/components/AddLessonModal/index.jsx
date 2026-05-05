import { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import Modal from "../Modal";
import styles from "./AddLessonModal.module.scss";
import { useLessonApi } from "../../api/LessonApi";

const READING_EDITOR_FORMATS = [
  "header",
  "size",
  "bold",
  "italic",
  "underline",
  "strike",
  "color",
  "background",
  "align",
  "list",
  "bullet",
  "indent",
  "script",
  "blockquote",
  "code-block",
  "link",
  "image",
];

function stripHtml(html = "") {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function AddLessonModal({
  isOpen,
  onClose,
  onCreated,
  section,
  nextOrderIndex = 1,
}) {
  const { createLesson } = useLessonApi();
  const quillRef = useRef(null);

  const initialForm = useMemo(
    () => ({
      title: "",
      description: "",
      lessonType: "VIDEO",
      content: "",
      videoUrl: "",
      thumbnailUrl: "",
      durationMinutes: 0,
      isPreview: false,
      isPublished: true,
      orderIndex: nextOrderIndex,

      quizTitle: "",
      quizDescription: "",

      assignmentTitle: "",
      assignmentDescription: "",
      assignmentType: "ESSAY",
    }),
    [nextOrderIndex],
  );

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  function resolveUploadedImageUrl(data) {
    const raw =
      data?.result?.url ||
      data?.result?.fileUrl ||
      data?.result?.path ||
      data?.result?.imageUrl ||
      data?.url ||
      data?.fileUrl ||
      data?.path ||
      data?.imageUrl ||
      (typeof data?.result === "string" ? data.result : "");

    if (!raw) return "";

    return raw.startsWith("http")
      ? raw
      : `http://localhost:8080/lms${raw.startsWith("/") ? "" : "/"}${raw}`;
  }
  const handleEditorImageUpload = () => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const formData = new FormData();
        formData.append("file", file);
        const token = localStorage.getItem("token");

        const res = await fetch("http://localhost:8080/lms/courses/upload", {
          method: "POST",
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : undefined,
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || "Upload ảnh thất bại");
        }

        const imageUrl = resolveUploadedImageUrl(data);

        if (!imageUrl) {
          console.log("UPLOAD_IMAGE_RESPONSE =", data);
          throw new Error("Không lấy được URL ảnh");
        }

        const editor = quillRef.current?.getEditor();
        if (!editor) return;

        const range = editor.getSelection(true);
        editor.insertEmbed(
          range?.index ?? editor.getLength(),
          "image",
          imageUrl.startsWith("http")
            ? imageUrl
            : `http://localhost:8080/lms${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`,
        );
      } catch (error) {
        setErrorText(error?.message || "Upload ảnh thất bại.");
      }
    };
  };

  const readingEditorModules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, 4, false] }],
          [{ size: ["small", false, "large", "huge"] }],
          ["bold", "italic", "underline", "strike"],
          [{ color: [] }, { background: [] }],
          [{ align: ["", "center", "right", "justify"] }],
          [{ list: "ordered" }, { list: "bullet" }],
          [{ indent: "-1" }, { indent: "+1" }],
          [{ script: "sub" }, { script: "super" }],
          ["blockquote", "code-block"],
          ["link", "image"],
          ["clean"],
        ],
        handlers: {
          image: handleEditorImageUpload,
        },
      },
    }),
    [],
  );

  useEffect(() => {
    if (!isOpen) return;
    setForm(initialForm);
    setErrorText("");
  }, [isOpen, initialForm]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : name === "durationMinutes" || name === "orderIndex"
            ? value === ""
              ? ""
              : Number(value)
            : value,
    }));
  };

  const handleReadingContentChange = (value) => {
    setForm((prev) => ({
      ...prev,
      content: value,
    }));
  };

  const handleClose = () => {
    if (loading) return;
    setErrorText("");
    onClose();
  };

  const validateForm = () => {
    if (!section?.id) return "Không tìm thấy section.";
    if (!form.title.trim()) return "Vui lòng nhập tiêu đề bài học.";

    if (form.lessonType === "VIDEO" && !form.videoUrl.trim()) {
      return "Vui lòng nhập video URL.";
    }

    if (form.lessonType === "READING" && !stripHtml(form.content)) {
      return "Vui lòng nhập nội dung bài đọc.";
    }

    if (!form.orderIndex || Number(form.orderIndex) < 1) {
      return "Thứ tự bài học phải lớn hơn 0.";
    }

    return "";
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

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        lessonType: form.lessonType,
        content: form.lessonType === "READING" ? form.content : "",
        videoUrl: form.lessonType === "VIDEO" ? form.videoUrl.trim() : "",
        thumbnailUrl: form.thumbnailUrl.trim(),
        durationMinutes: Number(form.durationMinutes) || 0,
        isPreview: form.isPreview,
        isPublished: form.isPublished,
        orderIndex: Number(form.orderIndex),
        sectionId: section.id,

        quizTitle: form.lessonType === "QUIZ" ? form.quizTitle.trim() : "",
        quizDescription:
          form.lessonType === "QUIZ" ? form.quizDescription.trim() : "",

        assignmentTitle:
          form.lessonType === "ASSIGNMENT" ? form.assignmentTitle.trim() : "",
        assignmentDescription:
          form.lessonType === "ASSIGNMENT"
            ? form.assignmentDescription.trim()
            : "",
        assignmentType:
          form.lessonType === "ASSIGNMENT" ? form.assignmentType : "",
      };

      await createLesson(payload);

      onClose();
      onCreated?.();
    } catch (error) {
      setErrorText(
        error?.body?.message || error?.message || "Tạo bài học thất bại.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onRequestClose={handleClose}>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h2>Thêm bài học</h2>
          <p>Section: {section?.title || "—"}</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="title">Tiêu đề bài học</label>
            <input
              id="title"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Ví dụ: Giới thiệu khóa học"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">Mô tả ngắn</label>
            <textarea
              id="description"
              name="description"
              rows="3"
              value={form.description}
              onChange={handleChange}
              placeholder="Nhập mô tả ngắn..."
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

          {form.lessonType === "VIDEO" && (
            <div className={styles.formGroup}>
              <label htmlFor="videoUrl">Video URL</label>
              <input
                id="videoUrl"
                name="videoUrl"
                value={form.videoUrl}
                onChange={handleChange}
                placeholder="https://..."
              />
            </div>
          )}

          {form.lessonType === "READING" && (
            <div className={styles.formGroup}>
              <label>Nội dung bài đọc</label>
              <div className={styles.editorWrap}>
                <ReactQuill
                  ref={quillRef}
                  theme="snow"
                  value={form.content}
                  onChange={handleReadingContentChange}
                  modules={readingEditorModules}
                  formats={READING_EDITOR_FORMATS}
                  placeholder="Soạn nội dung bài đọc..."
                  className={styles.editor}
                />
              </div>
              <p className={styles.editorHint}>
                Có thể dùng in đậm, nghiêng, tiêu đề, danh sách, link, ảnh...
              </p>
            </div>
          )}

          {form.lessonType === "QUIZ" && (
            <>
              <div className={styles.formGroup}>
                <label htmlFor="quizTitle">Tiêu đề quiz</label>
                <input
                  id="quizTitle"
                  name="quizTitle"
                  value={form.quizTitle}
                  onChange={handleChange}
                  placeholder="Ví dụ: Quiz chương 1"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="quizDescription">Mô tả quiz</label>
                <textarea
                  id="quizDescription"
                  name="quizDescription"
                  rows="3"
                  value={form.quizDescription}
                  onChange={handleChange}
                  placeholder="Nhập mô tả quiz..."
                />
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
                  value={form.assignmentTitle}
                  onChange={handleChange}
                  placeholder="Ví dụ: Bài tập chương 1"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="assignmentDescription">Mô tả bài tập</label>
                <textarea
                  id="assignmentDescription"
                  name="assignmentDescription"
                  rows="3"
                  value={form.assignmentDescription}
                  onChange={handleChange}
                  placeholder="Nhập yêu cầu bài tập..."
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
            </>
          )}

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="thumbnailUrl">Thumbnail URL</label>
              <input
                id="thumbnailUrl"
                name="thumbnailUrl"
                value={form.thumbnailUrl}
                onChange={handleChange}
                placeholder="https://..."
              />
            </div>

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
          </div>

          <div className={styles.formRow}>
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

          <div className={styles.checkRow}>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                name="isPreview"
                checked={form.isPreview}
                onChange={handleChange}
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
              {loading ? "Đang tạo..." : "Tạo bài học"}
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
