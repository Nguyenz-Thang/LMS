import { useEffect, useCallback } from "react";
import styles from "./Modal.module.scss";
import PropTypes from "prop-types";

function Modal({
  isOpen = false,
  children,
  closeTimeoutMS = 0,
  bodyOpenClassName = "",
  onRequestClose,
}) {
  const handleRequestClose = useCallback(() => {
    if (!onRequestClose) return;
    setTimeout(onRequestClose, closeTimeoutMS);
  }, [onRequestClose, closeTimeoutMS]);

  useEffect(() => {
    const handle = (e) => {
      if (e.code === "Escape") {
        handleRequestClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keyup", handle);
    }

    return () => {
      document.removeEventListener("keyup", handle);
    };
  }, [isOpen, handleRequestClose]);

  useEffect(() => {
    if (!isOpen || !bodyOpenClassName) return;

    document.body.classList.add(bodyOpenClassName);
    return () => {
      document.body.classList.remove(bodyOpenClassName);
    };
  }, [isOpen, bodyOpenClassName]);

  if (!isOpen) return null;

  return (
    <div className={styles.modal}>
      <div className={styles.content}>
        <button className={styles.closeBtn} onClick={handleRequestClose}>
          &times;
        </button>
        <div className={styles.body}>{children}</div>
      </div>
      <div className={styles.overlay} onClick={handleRequestClose} />
    </div>
  );
}

Modal.propTypes = {
  isOpen: PropTypes.bool,
  children: PropTypes.node.isRequired,
  onRequestClose: PropTypes.func,
  closeTimeoutMS: PropTypes.number,
  bodyOpenClassName: PropTypes.string,
};

export default Modal;
