import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Download,
  FileCheck2,
  RefreshCw,
  Search,
} from "lucide-react";
import { LMS_BASE_URL } from "../../../api/courseApi";
import { useAssignmentApi } from "../../../api/assignmentApi";
import styles from "./AssignmentSubmissions.module.scss";

function formatDateTime(value) {
  if (!value) return "Chua nop";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chua cap nhat";
  return date.toLocaleString("vi-VN");
}

function getStatusLabel(status) {
  switch ((status || "").toUpperCase()) {
    case "GRADED":
      return "Da cham";
    case "LATE":
      return "Nop muon";
    case "SUBMITTED":
      return "Da nop";
    case "DRAFT":
      return "Ban nhap";
    default:
      return "Chua ro";
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
          "Khong tai duoc danh sach bai nop.",
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
      setErrorText("Diem cham khong hop le.");
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
      setMessage("Da luu diem va nhan xet.");
      await fetchSubmissions();
    } catch (error) {
      setErrorText(
        error?.body?.message || error?.message || "Khong cham duoc bai nop.",
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
          <span>Quay lai</span>
        </button>

        <button type="button" className={styles.refreshBtn} onClick={fetchSubmissions}>
          <RefreshCw size={16} />
          <span>Lam moi</span>
        </button>
      </div>

      <section className={styles.headerCard}>
        <div className={styles.headerIcon}>
          <FileCheck2 size={24} />
        </div>
        <div>
          <h1>Cham bai tap</h1>
          <p>
            {assignmentInfo.assignmentTitle || "Bai tap"} -{" "}
            {assignmentInfo.courseTitle || "Khoa hoc"}
          </p>
        </div>
      </section>

      <section className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <span>Tong bai nop</span>
          <strong>{submissions.length}</strong>
        </div>
        <div className={styles.summaryCard}>
          <span>Da cham</span>
          <strong>{gradedCount}</strong>
        </div>
        <div className={styles.summaryCard}>
          <span>Dang cho cham</span>
          <strong>{Math.max(0, submissions.length - gradedCount)}</strong>
        </div>
      </section>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Tim hoc vien, username, email..."
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>
      </div>

      {message ? <div className={styles.successBox}>{message}</div> : null}
      {errorText ? <div className={styles.errorBox}>{errorText}</div> : null}

      {loading ? (
        <div className={styles.stateBox}>Dang tai danh sach bai nop...</div>
      ) : filteredSubmissions.length === 0 ? (
        <div className={styles.stateBox}>Chua co bai nop phu hop.</div>
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
                    <h2>{submission.studentName || "Hoc vien"}</h2>
                    <p>
                      {submission.studentUsername || "username"} -{" "}
                      {submission.studentEmail || "chua co email"}
                    </p>
                  </div>
                  <span className={graded ? styles.statusGraded : styles.statusSubmitted}>
                    {graded ? <CheckCircle2 size={14} /> : <Clock3 size={14} />}
                    {getStatusLabel(submission.status)}
                  </span>
                </div>

                <div className={styles.metaRow}>
                  <span>Nop luc: {formatDateTime(submission.submittedAt)}</span>
                  {submission.gradedAt ? (
                    <span>Cham luc: {formatDateTime(submission.gradedAt)}</span>
                  ) : null}
                  {submission.gradedByName ? (
                    <span>Nguoi cham: {submission.gradedByName}</span>
                  ) : null}
                </div>

                <div className={styles.contentGrid}>
                  <div className={styles.answerBox}>
                    <h3>Noi dung nop</h3>
                    <p>{submission.submissionText || "Hoc vien khong nhap noi dung."}</p>

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
                      <span>Diem / {maxScore}</span>
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
                      <span>Nhan xet</span>
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
                      {savingId === submission.id ? "Dang luu..." : "Luu diem"}
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
