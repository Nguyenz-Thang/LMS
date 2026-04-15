import { useState } from "react";
import PropTypes from "prop-types";
import { AlertTriangle, Trash2 } from "lucide-react";
import Modal from "../Modal";
import styles from "./DeleteLessonModal.module.scss";
import { useLessonApi } from "../../api/LessonApi";

function DeleteLessonModal({ isOpen, onClose, onDeleted, lesson }) {
  const { deleteLesson } = useLessonApi();

  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  const handleClose = () => {
    if (loading) return;
    setErrorText("");
    onClose();
  };

  const handleDelete = async () => {
    if (!lesson?.id) {
      setErrorText("Không tìm thấy lesson để xóa.");
      return;
    }

    try {
      setLoading(true);
      setErrorText("");

      await deleteLesson(lesson.id);

      onClose();
      if (onDeleted) onDeleted();
    } catch (error) {
      setErrorText(
        error?.body?.message || error?.message || "Xóa lesson thất bại.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onRequestClose={handleClose}>
      <div className={styles.wrapper}>
        <div className={styles.iconWrap}>
          <AlertTriangle size={28} />
        </div>

        <div className={styles.content}>
          <h2>Xóa bài học</h2>
          <p>
            Bạn có chắc muốn xóa{" "}
            <strong>{lesson?.title || "bài học này"}</strong> không?
          </p>
          <span>Hành động này không thể hoàn tác.</span>
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
            <span>{loading ? "Đang xóa..." : "Xóa"}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}

DeleteLessonModal.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
  onDeleted: PropTypes.func,
  lesson: PropTypes.object,
};

export default DeleteLessonModal;
