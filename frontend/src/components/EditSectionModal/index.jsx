import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import Modal from "../Modal";
import styles from "./EditSectionModal.module.scss";
import { useSectionApi } from "../../api/sectionApi";

function EditSectionModal({ isOpen, onClose, onUpdated, section, courseId }) {
  const { updateSection } = useSectionApi();

  const [form, setForm] = useState({
    title: "",
    description: "",
    orderIndex: 1,
  });
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    if (!isOpen || !section) return;

    setForm({
      title: section.title || "",
      description: section.description || "",
      orderIndex: section.orderIndex || 1,
    });
    setErrorText("");
  }, [isOpen, section]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: name === "orderIndex" ? Number(value) : value,
    }));
  };

  const handleClose = () => {
    if (loading) return;
    setErrorText("");
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!section?.id) {
      setErrorText("Không tìm thấy section để cập nhật.");
      return;
    }

    if (!courseId) {
      setErrorText("Không tìm thấy course.");
      return;
    }

    if (!form.title.trim()) {
      setErrorText("Vui lòng nhập tên section.");
      return;
    }

    if (!form.orderIndex || form.orderIndex < 1) {
      setErrorText("Thứ tự section phải lớn hơn 0.");
      return;
    }

    try {
      setLoading(true);
      setErrorText("");

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        orderIndex: Number(form.orderIndex),
        courseId,
      };

      await updateSection(section.id, payload);

      onClose();
      if (onUpdated) onUpdated();
    } catch (error) {
      setErrorText(
        error?.body?.message || error?.message || "Cập nhật section thất bại.",
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
          <h2>Sửa section</h2>
          <p>Cập nhật thông tin chương học.</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="edit-section-title">Tên section</label>
            <input
              id="edit-section-title"
              name="title"
              type="text"
              placeholder="Ví dụ: Bắt đầu"
              value={form.title}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="edit-section-description">Mô tả</label>
            <textarea
              id="edit-section-description"
              name="description"
              rows="4"
              placeholder="Nhập mô tả section..."
              value={form.description}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="edit-section-orderIndex">Thứ tự hiển thị</label>
            <input
              id="edit-section-orderIndex"
              name="orderIndex"
              type="number"
              min="1"
              value={form.orderIndex}
              onChange={handleChange}
            />
          </div>

          {errorText && <div className={styles.errorBox}>{errorText}</div>}

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

EditSectionModal.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
  onUpdated: PropTypes.func,
  section: PropTypes.object,
  courseId: PropTypes.string,
};

export default EditSectionModal;
