import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import Modal from "../Modal";
import api from "../../api/axios";
import styles from "./AddCourseModal.module.scss";

const BACKEND_BASE_URL = "http://localhost:8080/lms";

function AddCourseModal({ isOpen, onClose, onCreated, categories = [] }) {
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

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const buildImageUrl = (value) => {
    if (!value) return "";
    if (value.startsWith("http")) return value;
    return `${BACKEND_BASE_URL}${value}`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "thumbnailUrl" && thumbnailMode === "url") {
      const trimmed = value.trim();
      setPreviewUrl(buildImageUrl(trimmed));
    }
  };

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      thumbnailUrl: "",
      categoryId: "",
    });
    setThumbnailMode("url");
    setPreviewUrl("");
    setErrorText("");
  };

  const handleClose = () => {
    if (loading || uploadingImage) return;
    resetForm();
    onClose();
  };

  const handleSwitchMode = (mode) => {
    setThumbnailMode(mode);
    setErrorText("");

    if (mode === "url") {
      setPreviewUrl(buildImageUrl(form.thumbnailUrl));
    } else {
      setPreviewUrl("");
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

      // Không đổi preview sang URL backend ở đây
      // để ảnh local vẫn hiện ổn định
    } catch (error) {
      setErrorText(error?.response?.data?.message || "Upload ảnh thất bại.");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

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

      await api.post("/courses", payload);

      resetForm();
      onClose();
      if (onCreated) onCreated();
    } catch (error) {
      setErrorText(error?.response?.data?.message || "Thêm khóa học thất bại.");
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
          <h2>Thêm khóa học</h2>
          <p>Tạo khóa học mới cho hệ thống LMS.</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="title">Tên khóa học</label>
            <input
              id="title"
              name="title"
              type="text"
              placeholder="Ví dụ: Java Core"
              value={form.title}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">Mô tả</label>
            <textarea
              id="description"
              name="description"
              rows="4"
              placeholder="Nhập mô tả khóa học..."
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
                id="thumbnailUrl"
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
                  onError={() => {
                    setErrorText("Không tải được ảnh preview.");
                  }}
                />
              </div>
            ) : null}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="categoryId">Danh mục</label>
            <select
              id="categoryId"
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
                  ? "Đang tạo..."
                  : "Tạo khóa học"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

AddCourseModal.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
  onCreated: PropTypes.func,
  categories: PropTypes.array,
};

export default AddCourseModal;
