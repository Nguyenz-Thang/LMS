import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import Modal from "../Modal";
import api from "../../api/axios";
import styles from "./AddSectionModal.module.scss";

function AddSectionModal({
  isOpen,
  onClose,
  onCreated,
  courseId,
  nextOrderIndex = 1,
}) {
  const [form, setForm] = useState({
    title: "",
    orderIndex: nextOrderIndex,
  });
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    setForm({
      title: "",
      orderIndex: nextOrderIndex,
    });
    setErrorText("");
  }, [isOpen, nextOrderIndex]);

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

    if (!courseId) {
      setErrorText("Không tìm thấy course để thêm section.");
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
        orderIndex: Number(form.orderIndex),
        courseId,
      };

      await api.post("/sections", payload);

      onClose();
      if (onCreated) onCreated();
    } catch (error) {
      setErrorText(error?.response?.data?.message || "Thêm section thất bại.");
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
          <h2>Thêm section</h2>
          <p>Tạo chương mới cho khóa học.</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="section-title">Tên section</label>
            <input
              id="section-title"
              name="title"
              type="text"
              placeholder="Ví dụ: Bắt đầu"
              value={form.title}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="section-orderIndex">Thứ tự hiển thị</label>
            <input
              id="section-orderIndex"
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
              {loading ? "Đang tạo..." : "Tạo section"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

AddSectionModal.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
  onCreated: PropTypes.func,
  courseId: PropTypes.string,
  nextOrderIndex: PropTypes.number,
};

export default AddSectionModal;
