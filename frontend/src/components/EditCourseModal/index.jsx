import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Save, Upload, X } from "lucide-react";
import Modal from "../Modal";
import styles from "./EditCourseModal.module.scss";
import { LMS_BASE_URL, useCourseApi } from "../../api/courseApi";

function EditCourseModal({
  isOpen,
  onClose,
  onUpdated,
  course,
  categories = [],
}) {
  const { updateCourse, uploadCourseImage } = useCourseApi();
  const isAdmin = true;

  const [form, setForm] = useState({
    title: "",
    description: "",
    thumbnailUrl: "",
    categoryId: "",
    status: "PUBLISHED",
    visibility: "PUBLIC",
    level: "BEGINNER",
    estimatedHours: 0,
    price: 0,
  });

  const [thumbnailMode, setThumbnailMode] = useState("url");
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [errorText, setErrorText] = useState("");

  const currentCategoryId = useMemo(() => {
    if (course?.categoryId) return course.categoryId;
    const matched = categories.find((item) => item.name === course?.categoryName);
    return matched?.id || "";
  }, [course, categories]);

  const buildImageUrl = (value) => {
    if (!value) return "";
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }
    if (trimmed.startsWith("/")) return `${LMS_BASE_URL}${trimmed}`;
    return `${LMS_BASE_URL}/${trimmed}`;
  };

  useEffect(() => {
    if (!isOpen || !course) return;
    setForm({
      title: course.title || "",
      description: course.description || "",
      thumbnailUrl: course.thumbnailUrl || "",
      categoryId: currentCategoryId || "",
      status: course.status || "DRAFT",
      visibility: course.visibility || "PUBLIC",
      level: course.level || "BEGINNER",
      estimatedHours: course.estimatedHours ?? 0,
      price: course.price ?? 0,
    });
    setThumbnailMode("url");
    setPreviewUrl(buildImageUrl(course.thumbnailUrl || ""));
    setErrorText("");
  }, [isOpen, course, currentCategoryId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

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
      setErrorText("Ảnh chưa upload xong hoặc upload thất bại.");
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
        price: Number(form.price) || 0,
        currency: "VND",
        paid: Number(form.price) > 0,
      };

      await updateCourse(course.id, payload);
      onClose();
      onUpdated?.();
    } catch (error) {
      setErrorText(
        error?.body?.message || error?.message || "Cập nhật khóa học thất bại.",
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
          <p>
            {isAdmin
              ? "Admin có thể cập nhật nội dung và trạng thái hiển thị của khóa học."
              : "Sau khi giảng viên sửa, khóa học sẽ quay lại trạng thái chờ duyệt."}
          </p>
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
                id="edit-thumbnailUrl"
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

          {isAdmin ? (
            <>
              <div className={styles.formGroup}>
                <label htmlFor="edit-status">Trạng thái</label>
                <select
                  id="edit-status"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                >
                  <option value="DRAFT">Nháp</option>
                  <option value="PENDING_APPROVAL">Chờ duyệt</option>
                  <option value="PUBLISHED">Đã duyệt</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="edit-visibility">Hiển thị</label>
                <select
                  id="edit-visibility"
                  name="visibility"
                  value={form.visibility}
                  onChange={handleChange}
                >
                  <option value="PUBLIC">Công khai</option>
                  <option value="PRIVATE">Riêng tư</option>
                </select>
              </div>
            </>
          ) : (
            <div className={styles.formGroup}>
              <label>Trạng thái phê duyệt</label>
              <input
                type="text"
                readOnly
                value={`Hiện tại: ${course?.status || "PENDING_APPROVAL"} - Sau khi sửa sẽ quay lại Chờ duyệt.`}
              />
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="edit-level">Cấp độ</label>
            <select
              id="edit-level"
              name="level"
              value={form.level}
              onChange={handleChange}
            >
              <option value="BEGINNER">Cơ bản</option>
              <option value="INTERMEDIATE">Trung cấp</option>
              <option value="ADVANCED">Nâng cao</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="edit-estimatedHours">Số giờ ước tính</label>
            <input
              id="edit-estimatedHours"
              name="estimatedHours"
              type="number"
              min="0"
              value={form.estimatedHours}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="edit-price">Giá khóa học (VND)</label>
            <input
              id="edit-price"
              name="price"
              type="number"
              min="0"
              step="1000"
              value={form.price}
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
            >
              <X size={17} />
              <span>Hủy</span>
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading || uploadingImage}
            >
              {uploadingImage ? (
                "Đang upload ảnh..."
              ) : loading ? (
                "Đang lưu..."
              ) : (
                <>
                  <Save size={17} />
                  <span>Lưu thay đổi</span>
                </>
              )}
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
