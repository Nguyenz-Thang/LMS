import PropTypes from "prop-types";
import { Trash2, AlertTriangle } from "lucide-react";
import Modal from "../Modal";
import styles from "./DeleteCourseModal.module.scss";
import { useState } from "react";
import { useCourseApi } from "../../api/courseApi";

function DeleteCourseModal({ isOpen, onClose, course, onDeleted }) {
  const { deleteCourse } = useCourseApi();

  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  const handleClose = () => {
    if (loading) return;
    setErrorText("");
    onClose();
  };

  const handleDelete = async () => {
    if (!course?.id) {
      setErrorText("Không tìm thấy khóa học để xóa.");
      return;
    }

    try {
      setLoading(true);
      setErrorText("");

      await deleteCourse(course.id); // ✅ dùng API đã tách

      handleClose();
      if (onDeleted) onDeleted();
    } catch (error) {
      setErrorText(
        error?.body?.message || error?.message || "Xóa khóa học thất bại.",
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
        <div className={styles.iconWrap}>
          <AlertTriangle size={28} />
        </div>

        <div className={styles.content}>
          <h2>Xóa khóa học</h2>
          <p>
            Bạn có chắc muốn xóa khóa học{" "}
            <strong>{course?.title || "này"}</strong> không?
          </p>
          <span>Thao tác này không thể hoàn tác.</span>
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
            type="button"
            className={styles.deleteBtn}
            onClick={handleDelete}
            disabled={loading}
          >
            <Trash2 size={16} />
            <span>{loading ? "Đang xóa..." : "Xóa khóa học"}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}

DeleteCourseModal.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
  course: PropTypes.object,
  onDeleted: PropTypes.func,
};

export default DeleteCourseModal;
