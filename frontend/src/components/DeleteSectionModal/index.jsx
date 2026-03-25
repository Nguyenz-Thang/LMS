import { useState } from "react";
import PropTypes from "prop-types";
import { AlertTriangle, Trash2 } from "lucide-react";
import Modal from "../Modal";
import api from "../../api/axios";
import styles from "./DeleteSectionModal.module.scss";

function DeleteSectionModal({ isOpen, onClose, onDeleted, section }) {
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  const handleClose = () => {
    if (loading) return;
    setErrorText("");
    onClose();
  };

  const handleDelete = async () => {
    if (!section?.id) {
      setErrorText("Không tìm thấy section để xóa.");
      return;
    }

    try {
      setLoading(true);
      setErrorText("");

      await api.delete(`/sections/${section.id}`);

      onClose();
      if (onDeleted) onDeleted();
    } catch (error) {
      setErrorText(error?.response?.data?.message || "Xóa section thất bại.");
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
          <h2>Xóa section</h2>
          <p>
            Bạn có chắc muốn xóa section{" "}
            <strong>{section?.title || "này"}</strong> không?
          </p>
          <span>
            Mọi lesson bên trong section này cũng có thể bị ảnh hưởng.
          </span>
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
            <span>{loading ? "Đang xóa..." : "Xóa section"}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}

DeleteSectionModal.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
  onDeleted: PropTypes.func,
  section: PropTypes.object,
};

export default DeleteSectionModal;
