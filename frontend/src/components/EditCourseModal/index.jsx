import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import Modal from "../Modal";
import api from "../../api/axios";
import styles from "./EditCourseModal.module.scss";

const BACKEND_BASE_URL = "http://localhost:8080/lms";

function EditCourseModal({
  isOpen,
  onClose,
  onUpdated,
  course,
  categories = [],
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    thumbnailUrl: "",
    categoryId: "",
  });

  const [thumbnailMode, setThumbnailMode] = useState("url");
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [errorText, setErrorText] = useState("");

  const currentCategoryId = useMemo(() => {
    if (course?.categoryId) return course.categoryId;

    const matched = categories.find(
      (item) => item.name === course?.categoryName,
    );
    return matched?.id || "";
  }, [course, categories]);

  const buildImageUrl = (value) => {
    if (!value) return "";

    const trimmed = value.trim();
    if (!trimmed) return "";

    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }

    if (trimmed.startsWith("/")) {
      return `${BACKEND_BASE_URL}${trimmed}`;
    }

    return `${BACKEND_BASE_URL}/${trimmed}`;
  };

  useEffect(() => {
    if (!isOpen || !course) return;

    setForm({
      title: course.title || "",
      description: course.description || "",
      thumbnailUrl: course.thumbnailUrl || "",
      categoryId: currentCategoryId || "",
    });

    setThumbnailMode("url");
    setPreviewUrl(buildImageUrl(course.thumbnailUrl));
    setErrorText("");
  }, [isOpen, course, currentCategoryId]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "thumbnailUrl" && thumbnailMode === "url") {
      setPreviewUrl(buildImageUrl(value));
    }
  };

  const handleClose = () => {
    if (loading || uploadingImage) return;
    setErrorText("");
    setPreviewUrl("");
    onClose();
  };

  const handleSwitchMode = (mode) => {
    setThumbnailMode(mode);
    setErrorText("");

    if (mode === "url") {
      setPreviewUrl(buildImageUrl(form.thumbnailUrl));
    } else {
      // vẫn giữ ảnh hiện tại nếu đã có
      setPreviewUrl(buildImageUrl(form.thumbnailUrl));
    }
  };

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await api.post("/courses/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return res?.data?.result || "";
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorText("Vui lòng chọn file ảnh hợp lệ.");
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    try {
      setUploadingImage(true);
      setErrorText("");

      const imageUrl = await uploadImage(file);

      setForm((prev) => ({
        ...prev,
        thumbnailUrl: imageUrl,
      }));
    } catch (error) {
      setErrorText(error?.response?.data?.message || "Upload ảnh thất bại.");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!course?.id) {
      setErrorText("Không tìm thấy khóa học để cập nhật.");
      return;
    }

    if (!form.title.trim()) {
      setErrorText("Vui lòng nhập tên khóa học.");
      return;
    }

    if (!form.description.trim()) {
      setErrorText("Vui lòng nhập mô tả khóa học.");
      return;
    }

    if (!form.categoryId) {
      setErrorText("Vui lòng chọn danh mục.");
      return;
    }

    if (thumbnailMode === "file" && !form.thumbnailUrl) {
      setErrorText("Ảnh đang chưa upload xong hoặc upload thất bại.");
      return;
    }

    try {
      setLoading(true);
      setErrorText("");

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        thumbnailUrl: form.thumbnailUrl.trim(),
        categoryId: form.categoryId,
      };

      await api.put(`/courses/${course.id}`, payload);

      onClose();
      if (onUpdated) onUpdated();
    } catch (error) {
      setErrorText(
        error?.response?.data?.message || "Cập nhật khóa học thất bại.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleClose}
      bodyOpenClassName="modal-open"
    >
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h2>Sửa khóa học</h2>
          <p>Cập nhật thông tin khóa học trong hệ thống LMS.</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="edit-title">Tên khóa học</label>
            <input
              id="edit-title"
              name="title"
              type="text"
              value={form.title}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="edit-description">Mô tả</label>
            <textarea
              id="edit-description"
              name="description"
              rows="4"
              value={form.description}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Thumbnail</label>

            <div className={styles.thumbMode}>
              <button
                type="button"
                className={
                  thumbnailMode === "url"
                    ? `${styles.modeBtn} ${styles.active}`
                    : styles.modeBtn
                }
                onClick={() => handleSwitchMode("url")}
              >
                Dùng URL
              </button>

              <button
                type="button"
                className={
                  thumbnailMode === "file"
                    ? `${styles.modeBtn} ${styles.active}`
                    : styles.modeBtn
                }
                onClick={() => handleSwitchMode("file")}
              >
                Chọn ảnh
              </button>
            </div>

            {thumbnailMode === "url" ? (
              <input
                id="edit-thumbnailUrl"
                name="thumbnailUrl"
                type="text"
                placeholder="https://example.com/image.jpg hoặc /uploads/courses/abc.jpg"
                value={form.thumbnailUrl}
                onChange={handleChange}
              />
            ) : (
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className={styles.fileInput}
              />
            )}

            {previewUrl ? (
              <div className={styles.previewBox}>
                <img
                  src={previewUrl}
                  alt="Thumbnail preview"
                  onError={() => setErrorText("Không tải được ảnh preview.")}
                />
              </div>
            ) : null}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="edit-categoryId">Danh mục</label>
            <select
              id="edit-categoryId"
              name="categoryId"
              value={form.categoryId}
              onChange={handleChange}
            >
              <option value="">-- Chọn danh mục --</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          {errorText && <div className={styles.errorBox}>{errorText}</div>}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={handleClose}
              disabled={loading || uploadingImage}
            >
              Hủy
            </button>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading || uploadingImage}
            >
              {uploadingImage
                ? "Đang upload ảnh..."
                : loading
                  ? "Đang lưu..."
                  : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

EditCourseModal.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
  onUpdated: PropTypes.func,
  course: PropTypes.object,
  categories: PropTypes.array,
};

export default EditCourseModal;
