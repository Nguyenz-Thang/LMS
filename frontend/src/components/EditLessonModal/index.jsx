import { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import Modal from "../Modal";
import styles from "./EditLessonModal.module.scss";
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

const initialResourceForm = {
  fileName: "",
  fileUrl: "",
  fileType: "",
  fileSize: "",
};

function EditLessonModal({ isOpen, onClose, onUpdated, lesson, section }) {
  const navigate = useNavigate();
  const {
    updateLesson,
    getLessonResources,
    createLessonResource,
    updateLessonResource,
    deleteLessonResource,
  } = useLessonApi();
  const quillRef = useRef(null);

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
  const [resources, setResources] = useState([]);
  const [resourceForm, setResourceForm] = useState(initialResourceForm);
  const [editingResourceId, setEditingResourceId] = useState("");
  const [resourceLoading, setResourceLoading] = useState(false);
  const [resourceSaving, setResourceSaving] = useState(false);
  const [deletingResourceId, setDeletingResourceId] = useState("");
  const [resourceError, setResourceError] = useState("");
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
          headers: {
            Authorization: `Bearer ${token}`,
          },
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

  useEffect(() => {
    if (!isOpen || !lesson?.id) return;

    let active = true;

    const fetchResources = async () => {
      try {
        setResourceLoading(true);
        setResourceError("");
        const res = await getLessonResources(lesson.id);
        if (active) {
          setResources(Array.isArray(res?.result) ? res.result : []);
        }
      } catch (error) {
        if (active) {
          setResources([]);
          setResourceError(
            error?.body?.message ||
              error?.message ||
              "Khong tai duoc tai lieu dinh kem.",
          );
        }
      } finally {
        if (active) {
          setResourceLoading(false);
        }
      }
    };

    fetchResources();

    return () => {
      active = false;
    };
  }, [isOpen, lesson?.id, getLessonResources]);

  const resetResourceForm = () => {
    setEditingResourceId("");
    setResourceForm(initialResourceForm);
    setResourceError("");
  };

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

  const handleReadingContentChange = (value) => {
    setForm((prev) => ({
      ...prev,
      content: value,
    }));
  };

  const handleResourceChange = (e) => {
    const { name, value } = e.target;
    setResourceForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateResourceForm = () => {
    if (!lesson?.id) return "Khong tim thay bai hoc de cap nhat tai lieu.";
    if (!resourceForm.fileName.trim()) return "Vui long nhap ten tai lieu.";
    if (!resourceForm.fileUrl.trim()) return "Vui long nhap duong dan tai lieu.";
    if (resourceForm.fileSize !== "" && Number(resourceForm.fileSize) < 0) {
      return "Kich thuoc file khong duoc nho hon 0.";
    }
    return "";
  };

  const handleSubmitResource = async () => {
    const validationError = validateResourceForm();
    if (validationError) {
      setResourceError(validationError);
      return;
    }

    try {
      setResourceSaving(true);
      setResourceError("");

      const payload = {
        fileName: resourceForm.fileName.trim(),
        fileUrl: resourceForm.fileUrl.trim(),
        fileType: resourceForm.fileType.trim(),
        fileSize:
          resourceForm.fileSize === ""
            ? 0
            : Math.max(0, Number(resourceForm.fileSize) || 0),
      };

      const res = editingResourceId
        ? await updateLessonResource(lesson.id, editingResourceId, payload)
        : await createLessonResource(lesson.id, payload);

      const savedResource = res?.result;
      if (!savedResource) return;

      setResources((prev) => {
        if (editingResourceId) {
          return prev.map((resource) =>
            resource.id === savedResource.id ? savedResource : resource,
          );
        }

        return [...prev, savedResource];
      });

      resetResourceForm();
    } catch (error) {
      setResourceError(
        error?.body?.message ||
          error?.message ||
          "Khong luu duoc tai lieu dinh kem.",
      );
    } finally {
      setResourceSaving(false);
    }
  };

  const handleEditResource = (resource) => {
    setEditingResourceId(resource.id);
    setResourceForm({
      fileName: resource.fileName || "",
      fileUrl: resource.fileUrl || "",
      fileType: resource.fileType || "",
      fileSize:
        resource.fileSize === null || resource.fileSize === undefined
          ? ""
          : String(resource.fileSize),
    });
    setResourceError("");
  };

  const handleDeleteResource = async (resourceId) => {
    if (!lesson?.id) return;

    try {
      setDeletingResourceId(resourceId);
      setResourceError("");
      await deleteLessonResource(lesson.id, resourceId);
      setResources((prev) => prev.filter((resource) => resource.id !== resourceId));
      if (editingResourceId === resourceId) {
        resetResourceForm();
      }
    } catch (error) {
      setResourceError(
        error?.body?.message ||
          error?.message ||
          "Khong xoa duoc tai lieu dinh kem.",
      );
    } finally {
      setDeletingResourceId("");
    }
  };

  const handleClose = () => {
    if (loading) return;
    setErrorText("");
    onClose();
  };

  const validateForm = () => {
    if (!lesson?.id) return "Không tìm thấy bài học để cập nhật.";
    if (!section?.id) return "Không tìm thấy section.";
    if (!form.title.trim()) return "Vui lòng nhập tiêu đề bài học.";
    if (!form.lessonType) return "Vui lòng chọn loại bài học.";

    if (form.durationMinutes !== "" && Number(form.durationMinutes) < 0) {
      return "Thời lượng không được nhỏ hơn 0.";
    }

    if (!form.orderIndex || Number(form.orderIndex) < 1) {
      return "Thứ tự bài học phải lớn hơn 0.";
    }

    if (form.lessonType === "VIDEO" && !form.videoUrl.trim()) {
      return "Bài học video phải có video URL.";
    }

    if (form.lessonType === "READING" && !stripHtml(form.content)) {
      return "Bài đọc cần có nội dung.";
    }

    if (form.lessonType === "ASSIGNMENT" && !form.content.trim()) {
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
          content: form.content,
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
      onUpdated?.();
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

          <div className={styles.resourceSection}>
            <div className={styles.resourceHeader}>
              <div>
                <h3>Tai lieu dinh kem</h3>
                <p>
                  Quan ly file/link bo tro cho bai hoc nay ngay trong modal sua.
                </p>
              </div>
              <span className={styles.resourceCount}>
                {resourceLoading ? "Dang tai..." : `${resources.length} tai lieu`}
              </span>
            </div>

            <div className={styles.resourceForm}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="resourceFileName">Ten tai lieu</label>
                  <input
                    id="resourceFileName"
                    name="fileName"
                    value={resourceForm.fileName}
                    onChange={handleResourceChange}
                    placeholder="Vi du: Slide chuong 1"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="resourceFileType">Loai file</label>
                  <input
                    id="resourceFileType"
                    name="fileType"
                    value={resourceForm.fileType}
                    onChange={handleResourceChange}
                    placeholder="PDF, DOCX, Link..."
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="resourceFileUrl">Duong dan</label>
                  <input
                    id="resourceFileUrl"
                    name="fileUrl"
                    value={resourceForm.fileUrl}
                    onChange={handleResourceChange}
                    placeholder="https://... hoac /uploads/..."
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="resourceFileSize">Kich thuoc (bytes)</label>
                  <input
                    id="resourceFileSize"
                    name="fileSize"
                    type="number"
                    min="0"
                    value={resourceForm.fileSize}
                    onChange={handleResourceChange}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className={styles.resourceActions}>
                {editingResourceId ? (
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={resetResourceForm}
                    disabled={resourceSaving}
                  >
                    Huy sua tai lieu
                  </button>
                ) : null}

                <button
                  type="button"
                  className={styles.submitBtn}
                  disabled={resourceSaving}
                  onClick={handleSubmitResource}
                >
                  {resourceSaving
                    ? "Dang luu tai lieu..."
                    : editingResourceId
                      ? "Cap nhat tai lieu"
                      : "Them tai lieu"}
                </button>
              </div>

              {resourceError ? (
                <div className={styles.error}>{resourceError}</div>
              ) : null}
            </div>

            <div className={styles.resourceList}>
              {resourceLoading ? (
                <div className={styles.resourceEmpty}>Dang tai danh sach tai lieu...</div>
              ) : resources.length === 0 ? (
                <div className={styles.resourceEmpty}>
                  Lesson nay chua co tai lieu dinh kem.
                </div>
              ) : (
                resources.map((resource) => (
                  <div key={resource.id} className={styles.resourceItem}>
                    <div className={styles.resourceInfo}>
                      <strong>{resource.fileName}</strong>
                      <span>{resource.fileType || "File"}</span>
                      <a
                        href={resource.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.resourceLink}
                      >
                        {resource.fileUrl}
                      </a>
                    </div>

                    <div className={styles.resourceItemActions}>
                      <button
                        type="button"
                        className={styles.cancelBtn}
                        onClick={() => handleEditResource(resource)}
                        disabled={resourceSaving}
                      >
                        Sua
                      </button>
                      <button
                        type="button"
                        className={styles.submitBtn}
                        onClick={() => handleDeleteResource(resource.id)}
                        disabled={deletingResourceId === resource.id}
                      >
                        {deletingResourceId === resource.id ? "Dang xoa..." : "Xoa"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

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
