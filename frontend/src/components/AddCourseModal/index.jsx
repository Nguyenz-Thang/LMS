import { useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import Modal from "../Modal";
import styles from "./AddCourseModal.module.scss";
import { LMS_BASE_URL, useCourseApi } from "../../api/courseApi";
import { AuthContext } from "../../context/AuthContext";
import { Plus, Upload, X } from "lucide-react";

function AddCourseModal({ isOpen, onClose, onCreated, categories = [] }) {
  const { createCourse, uploadCourseImage } = useCourseApi();
  const { hasRole } = useContext(AuthContext);
  const isAdmin = hasRole("ADMIN");

  const [form, setForm] = useState({
    title: "",
    description: "",
    thumbnailUrl: "",
    categoryId: "",
    status: "DRAFT",
    visibility: "PUBLIC",
    level: "BEGINNER",
    estimatedHours: 0,
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
    return `${LMS_BASE_URL}${value}`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === "thumbnailUrl" && thumbnailMode === "url") {
      setPreviewUrl(buildImageUrl(value.trim()));
    }
  };

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      thumbnailUrl: "",
      categoryId: "",
      status: "DRAFT",
      visibility: "PUBLIC",
      level: "BEGINNER",
      estimatedHours: 0,
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

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrorText("Vui lòng chọn file ảnh hợp lệ.");
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));

    try {
      setUploadingImage(true);
      setErrorText("");
      const res = await uploadCourseImage(file);
      const imageUrl = res?.result || "";
      setForm((prev) => ({ ...prev, thumbnailUrl: imageUrl }));
    } catch (error) {
      setErrorText(
        error?.body?.message || error?.message || "Upload ảnh thất bại.",
      );
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
        status: form.status,
        visibility: form.visibility,
        level: form.level,
        estimatedHours: Number(form.estimatedHours) || 0,
      };

      await createCourse(payload);
      resetForm();
      onClose();
      onCreated?.();
    } catch (error) {
      setErrorText(
        error?.body?.message || error?.message || "Thêm khóa học thất bại.",
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
          <h2>Thêm khóa học</h2>
          <p>
            {isAdmin
              ? "Admin có thể tạo khóa học và quyết định trạng thái hiển thị."
              : "Khóa học của giảng viên sẽ mặc định ở trạng thái chờ duyệt và ẩn với học viên cho đến khi admin duyệt."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="title">Tên khóa học</label>
            <input
              id="title"
              name="title"
              type="text"
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
                onClick={() => setThumbnailMode("url")}
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
                onClick={() => setThumbnailMode("file")}
              >
                <Upload size={15} />
                <span>Chọn ảnh</span>
              </button>
            </div>

            {thumbnailMode === "url" ? (
              <input
                id="thumbnailUrl"
                name="thumbnailUrl"
                type="text"
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
                <img src={previewUrl} alt="Xem trước thumbnail" />
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

          {isAdmin ? (
            <>
              <div className={styles.formGroup}>
                <label htmlFor="status">Trạng thái</label>
                <select
                  id="status"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                >
                  <option value="DRAFT">Nháp</option>
                  <option value="PUBLISHED">Đã duyệt</option>
                  <option value="ARCHIVED">Lưu trữ</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="visibility">Hiển thị</label>
                <select
                  id="visibility"
                  name="visibility"
                  value={form.visibility}
                  onChange={handleChange}
                >
                  <option value="PUBLIC">Công khai</option>
                  <option value="PRIVATE">Riêng tư</option>
                  <option value="UNLISTED">Không liệt kê</option>
                </select>
              </div>
            </>
          ) : (
            <div className={styles.formGroup}>
              <label>Trạng thái phê duyệt</label>
              <input
                type="text"
                readOnly
                value="Mặc định: Chờ duyệt, ẩn với học viên cho đến khi admin duyệt."
              />
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="level">Cấp độ</label>
            <select id="level" name="level" value={form.level} onChange={handleChange}>
              <option value="BEGINNER">Cơ bản</option>
              <option value="INTERMEDIATE">Trung cấp</option>
              <option value="ADVANCED">Nâng cao</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="estimatedHours">Số giờ ước tính</label>
            <input
              id="estimatedHours"
              name="estimatedHours"
              type="number"
              min="0"
              value={form.estimatedHours}
              onChange={handleChange}
            />
          </div>

          {errorText ? <div className={styles.errorBox}>{errorText}</div> : null}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={handleClose}
              disabled={loading || uploadingImage}
              title="Hủy"
              aria-label="Hủy"
            >
              <X size={17} />
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading || uploadingImage}
              title="Tạo khóa học"
              aria-label="Tạo khóa học"
            >
              {uploadingImage
                ? "Đang upload ảnh..."
                : loading
                  ? "Đang tạo..."
                  : <Plus size={17} />}
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
