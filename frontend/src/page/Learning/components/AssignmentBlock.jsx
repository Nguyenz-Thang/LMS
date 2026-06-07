import { useEffect, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import styles from "../Learning.module.scss";
import { LMS_BASE_URL } from "../../../api/learningApi";

export default function AssignmentBlock({
  assignmentId,
  getLearningAssignment,
  saveAssignmentSubmission,
  uploadAssignmentSubmissionFiles,
  deleteAssignmentSubmissionFile,
  onAssignmentSubmitted,
}) {
  const [assignmentData, setAssignmentData] = useState(null);
  const [draftText, setDraftText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loadingAssignment, setLoadingAssignment] = useState(true);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState("");
  const [assignmentError, setAssignmentError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchAssignment = async () => {
      try {
        setLoadingAssignment(true);
        setAssignmentError("");
        const res = await getLearningAssignment(assignmentId);
        const data = res?.result || null;

        if (isMounted) {
          setAssignmentData(data);
          setDraftText(data?.submissionText || "");
        }
      } catch (error) {
        if (isMounted) {
          setAssignmentError(
            error?.body?.message || error?.message || "Không tải được bài tập.",
          );
        }
      } finally {
        if (isMounted) setLoadingAssignment(false);
      }
    };

    fetchAssignment();

    return () => {
      isMounted = false;
    };
  }, [assignmentId, getLearningAssignment]);

  const handleSaveDraft = async () => {
    try {
      setSavingAssignment(true);
      setAssignmentError("");
      const res = await saveAssignmentSubmission(assignmentId, {
        submissionText: draftText,
        submitNow: false,
      });
      setAssignmentData(res?.result || null);
    } catch (error) {
      setAssignmentError(
        error?.body?.message || error?.message || "Không lưu được bài làm.",
      );
    } finally {
      setSavingAssignment(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setSavingAssignment(true);
      setAssignmentError("");
      const res = await saveAssignmentSubmission(assignmentId, {
        submissionText: draftText,
        submitNow: true,
      });
      setAssignmentData(res?.result || null);
      await onAssignmentSubmitted?.({ autoNavigate: false });
    } catch (error) {
      setAssignmentError(
        error?.body?.message || error?.message || "Không nộp được bài tập.",
      );
    } finally {
      setSavingAssignment(false);
    }
  };

  const handleUploadFiles = async () => {
    if (!selectedFiles.length) return;

    try {
      setUploadingFiles(true);
      setAssignmentError("");
      const res = await uploadAssignmentSubmissionFiles(
        assignmentId,
        selectedFiles,
      );
      setAssignmentData(res?.result || null);
      setSelectedFiles([]);
    } catch (error) {
      setAssignmentError(
        error?.body?.message || error?.message || "Không upload được file.",
      );
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleDeleteFile = async (fileId) => {
    try {
      setDeletingFileId(fileId);
      setAssignmentError("");
      const res = await deleteAssignmentSubmissionFile(assignmentId, fileId);
      setAssignmentData(res?.result || null);
    } catch (error) {
      setAssignmentError(
        error?.body?.message || error?.message || "Không xóa được file.",
      );
    } finally {
      setDeletingFileId("");
    }
  };

  if (loadingAssignment) {
    return <div className={styles.assignmentState}>Đang tải bài tập...</div>;
  }

  if (assignmentError) {
    return <div className={styles.assignmentError}>{assignmentError}</div>;
  }

  if (!assignmentData) {
    return (
      <div className={styles.assignmentState}>Không có dữ liệu bài tập.</div>
    );
  }

  const submitted =
    assignmentData.submissionStatus === "SUBMITTED" ||
    assignmentData.submissionStatus === "LATE" ||
    assignmentData.submissionStatus === "GRADED";

  return (
    <div className={styles.assignmentBox}>
      <div className={styles.assignmentHeader}>
        <div>
          <h3>{assignmentData.title}</h3>
          <p>
            {assignmentData.description || "Bài tập thực hành của bài học này."}
          </p>
        </div>

        <div className={styles.assignmentMeta}>
          <span>Loại: {assignmentData.assignmentType || "Bài tập"}</span>
        </div>
      </div>

      <textarea
        className={styles.assignmentTextarea}
        value={draftText}
        onChange={(e) => setDraftText(e.target.value)}
        placeholder="Nhập nội dung bài làm của bạn tại đây..."
        disabled={submitted}
      />

      {!submitted ? (
        <div className={styles.assignmentUploadRow}>
          <label className={styles.assignmentFilePicker}>
            <Upload size={15} />
            <span>
              {selectedFiles.length
                ? `${selectedFiles.length} file đã chọn`
                : "Chọn file đính kèm"}
            </span>
            <input
              type="file"
              multiple
              onChange={(e) =>
                setSelectedFiles(Array.from(e.target.files || []))
              }
              hidden
            />
          </label>

          <button
            type="button"
            className={styles.assignmentGhostBtn}
            onClick={handleUploadFiles}
            disabled={!selectedFiles.length || uploadingFiles}
          >
            {uploadingFiles ? "Đang upload..." : "Upload file"}
          </button>
        </div>
      ) : null}

      {selectedFiles.length > 0 && !submitted ? (
        <div className={styles.assignmentSelectedFiles}>
          {selectedFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className={styles.assignmentSelectedFile}
            >
              {file.name}
            </div>
          ))}
        </div>
      ) : null}

      {(assignmentData.files || []).length > 0 ? (
        <div className={styles.assignmentFiles}>
          {(assignmentData.files || []).map((file) => (
            <div key={file.id} className={styles.assignmentFileRow}>
              <a
                href={
                  file.fileUrl?.startsWith("http")
                    ? file.fileUrl
                    : `${LMS_BASE_URL}${file.fileUrl?.startsWith("/") ? "" : "/"}${file.fileUrl}`
                }
                target="_blank"
                rel="noreferrer"
                className={styles.assignmentFileLink}
              >
                {file.fileName}
              </a>

              {!submitted ? (
                <button
                  type="button"
                  className={styles.assignmentDeleteBtn}
                  onClick={() => handleDeleteFile(file.id)}
                  disabled={deletingFileId === file.id}
                >
                  <Trash2 size={14} />
                  <span>
                    {deletingFileId === file.id ? "Đang xóa..." : "Xóa"}
                  </span>
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {!submitted ? (
        <div className={styles.assignmentActions}>
          <button
            type="button"
            className={styles.assignmentGhostBtn}
            onClick={handleSaveDraft}
            disabled={savingAssignment}
          >
            {savingAssignment ? "Đang lưu..." : "Lưu nháp"}
          </button>

          <button
            type="button"
            className={styles.assignmentPrimaryBtn}
            onClick={handleSubmit}
            disabled={savingAssignment || !draftText.trim()}
          >
            {savingAssignment ? "Đang nộp..." : "Nộp bài"}
          </button>
        </div>
      ) : (
        <div className={styles.assignmentSummary}>
          Trạng thái: {assignmentData.submissionStatus}
          {assignmentData.submittedAt
            ? ` • Nộp lúc ${assignmentData.submittedAt}`
            : ""}
          {assignmentData.score != null
            ? ` • Điểm ${assignmentData.score}`
            : ""}
          {assignmentData.feedback
            ? ` • Nhận xét: ${assignmentData.feedback}`
            : ""}
        </div>
      )}
    </div>
  );
}
