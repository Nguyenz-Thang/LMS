import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Download,
  RefreshCw,
  Search,
} from "lucide-react";
import { LMS_BASE_URL } from "../../../api/courseApi";
import { useAssignmentApi } from "../../../api/assignmentApi";
import styles from "./AssignmentSubmissions.module.scss";

function formatDateTime(value) {
  if (!value) return "Chưa nộp";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
  return date.toLocaleString("vi-VN");
}

function getStatusLabel(status) {
  switch ((status || "").toUpperCase()) {
    case "GRADED":
      return "Đã chấm";
    case "LATE":
      return "Nộp muộn";
    case "SUBMITTED":
      return "Đã nộp";
    case "DRAFT":
      return "Bản nháp";
    default:
      return "Chưa rõ";
  }
}

function getFileUrl(fileUrl) {
  if (!fileUrl) return "#";
  if (fileUrl.startsWith("http")) return fileUrl;
  if (fileUrl.startsWith("/")) return `${LMS_BASE_URL}${fileUrl}`;
  return `${LMS_BASE_URL}/${fileUrl}`;
}

export default function AssignmentSubmissions() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const { listSubmissions, gradeSubmission } = useAssignmentApi();

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [keyword, setKeyword] = useState("");
  const [errorText, setErrorText] = useState("");
  const [message, setMessage] = useState("");
  const [gradeForms, setGradeForms] = useState({});

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      setErrorText("");
      const res = await listSubmissions(assignmentId);
      const data = Array.isArray(res?.result) ? res.result : [];
      setSubmissions(data);
      setGradeForms(
        data.reduce((acc, item) => {
          acc[item.id] = {
            score: item.score ?? "",
            feedback: item.feedback || "",
          };
          return acc;
        }, {}),
      );
    } catch (error) {
      setErrorText(
        error?.body?.message ||
          error?.message ||
          "Không tải được danh sách bài nộp.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [assignmentId]);

  const filteredSubmissions = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) return submissions;

    return submissions.filter((item) => {
      return (
        item.studentName?.toLowerCase().includes(normalizedKeyword) ||
        item.studentUsername?.toLowerCase().includes(normalizedKeyword) ||
        item.studentEmail?.toLowerCase().includes(normalizedKeyword)
      );
    });
  }, [keyword, submissions]);

  const assignmentInfo = submissions[0] || {};
  const gradedCount = submissions.filter(
    (item) => (item.status || "").toUpperCase() === "GRADED",
  ).length;

  const updateGradeForm = (submissionId, field, value) => {
    setGradeForms((prev) => ({
      ...prev,
      [submissionId]: {
        ...(prev[submissionId] || {}),
        [field]: value,
      },
    }));
  };

  const handleGrade = async (submission) => {
    const form = gradeForms[submission.id] || {};
    const score = Number(form.score);

    if (Number.isNaN(score)) {
      setErrorText("Điểm chấm không hợp lệ.");
      return;
    }

    try {
      setSavingId(submission.id);
      setErrorText("");
      setMessage("");
      await gradeSubmission(submission.id, {
        score,
        feedback: form.feedback || "",
      });
      setMessage("Đã lưu điểm và nhận xét.");
      await fetchSubmissions();
    } catch (error) {
      setErrorText(
        error?.body?.message || error?.message || "Không chấm được bài nộp.",
      );
    } finally {
      setSavingId("");
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={18} />
          <span>Quay lại</span>
        </button>

        <button type="button" className={styles.refreshBtn} onClick={fetchSubmissions}>
          <RefreshCw size={16} />
          <span>Làm mới</span>
        </button>
      </div>

      <section className={styles.headerCard}>
        <div>
          <div className={styles.breadcrumb}>Quản trị \ Bài nộp</div>
          <h1>Chấm bài tập</h1>
          <p>
            {assignmentInfo.assignmentTitle || "Bài tập"} -{" "}
            {assignmentInfo.courseTitle || "Khóa học"}
          </p>
        </div>
      </section>

      <div className={styles.listHeader}>
        <div>
          <h2>Danh sách bài nộp</h2>
          <p>
            Tổng {submissions.length} bài nộp, đã chấm {gradedCount}, đang chờ{" "}
            {Math.max(0, submissions.length - gradedCount)}.
          </p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Tìm học viên, username, email..."
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>
      </div>

      {message ? <div className={styles.successBox}>{message}</div> : null}
      {errorText ? <div className={styles.errorBox}>{errorText}</div> : null}

      {loading ? (
        <div className={styles.stateBox}>Đang tải danh sách bài nộp...</div>
      ) : filteredSubmissions.length === 0 ? (
        <div className={styles.stateBox}>Chưa có bài nộp phù hợp.</div>
      ) : (
        <div className={styles.submissionList}>
          {filteredSubmissions.map((submission) => {
            const form = gradeForms[submission.id] || {};
            const maxScore = submission.maxScore || 10;
            const graded = (submission.status || "").toUpperCase() === "GRADED";

            return (
              <article key={submission.id} className={styles.submissionCard}>
                <div className={styles.submissionHead}>
                  <div>
                    <h2>{submission.studentName || "Học viên"}</h2>
                    <p>
                      {submission.studentUsername || "username"} -{" "}
                      {submission.studentEmail || "chưa có email"}
                    </p>
                  </div>
                  <span className={graded ? styles.statusGraded : styles.statusSubmitted}>
                    {graded ? <CheckCircle2 size={14} /> : <Clock3 size={14} />}
                    {getStatusLabel(submission.status)}
                  </span>
                </div>

                <div className={styles.metaRow}>
                  <span>Nộp lúc: {formatDateTime(submission.submittedAt)}</span>
                  {submission.gradedAt ? (
                    <span>Chấm lúc: {formatDateTime(submission.gradedAt)}</span>
                  ) : null}
                  {submission.gradedByName ? (
                    <span>Người chấm: {submission.gradedByName}</span>
                  ) : null}
                </div>

                <div className={styles.contentGrid}>
                  <div className={styles.answerBox}>
                    <h3>Nội dung nộp</h3>
                    <p>{submission.submissionText || "Học viên không nhập nội dung."}</p>

                    <div className={styles.fileList}>
                      {(submission.files || []).map((file) => (
                        <a
                          key={file.id}
                          href={getFileUrl(file.fileUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.fileLink}
                        >
                          <Download size={15} />
                          <span>{file.fileName}</span>
                        </a>
                      ))}
                    </div>
                  </div>

                  <div className={styles.gradeBox}>
                    <label>
                      <span>Điểm / {maxScore}</span>
                      <input
                        type="number"
                        min="0"
                        max={maxScore}
                        step="0.1"
                        value={form.score}
                        onChange={(event) =>
                          updateGradeForm(submission.id, "score", event.target.value)
                        }
                      />
                    </label>

                    <label>
                      <span>Nhận xét</span>
                      <textarea
                        rows={5}
                        value={form.feedback}
                        onChange={(event) =>
                          updateGradeForm(
                            submission.id,
                            "feedback",
                            event.target.value,
                          )
                        }
                      />
                    </label>

                    <button
                      type="button"
                      className={styles.gradeBtn}
                      disabled={savingId === submission.id}
                      onClick={() => handleGrade(submission)}
                    >
                      {savingId === submission.id ? "Đang lưu..." : "Lưu điểm"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
