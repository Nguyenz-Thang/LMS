import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Clock,
  FileQuestion,
  RotateCcw,
  Search,
  UserRound,
} from "lucide-react";
import { getQuizAttempts } from "../../api/quizApi";
import styles from "./QuizAttempts.module.scss";

const STATUS_LABELS = {
  ALL: "Tất cả trạng thái",
  IN_PROGRESS: "Đang làm",
  SUBMITTED: "Đã nộp",
  GRADED: "Đã chấm",
};

function formatDateTime(value) {
  if (!value) return "Chưa có";

  return new Date(value).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDuration(startedAt, submittedAt, status) {
  if (!startedAt) return "Chưa bắt đầu";

  const start = new Date(startedAt).getTime();
  const end = submittedAt ? new Date(submittedAt).getTime() : Date.now();

  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return status === "IN_PROGRESS" ? "Đang làm" : "Không rõ";
  }

  const totalSeconds = Math.max(0, Math.round((end - start) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes <= 0) return `${seconds} giây`;
  return `${minutes} phút ${seconds} giây`;
}

function formatScore(attempt) {
  const score = Math.round(Number(attempt.score || 0));
  const totalScore = Math.round(Number(attempt.totalScore || 0));
  return `${score}/${totalScore}`;
}

function getCorrectCount(attempt) {
  return Math.round(Number(attempt.score || 0));
}

function getWrongCount(attempt) {
  const totalScore = Math.round(Number(attempt.totalScore || 0));
  return Math.max(0, totalScore - getCorrectCount(attempt));
}

function getStatusMeta(status) {
  if (status === "SUBMITTED") {
    return { label: "Đã nộp", className: "statusSubmitted", icon: Check };
  }

  if (status === "GRADED") {
    return { label: "Đã chấm", className: "statusGraded", icon: Check };
  }

  return { label: "Đang làm", className: "statusProgress", icon: Clock };
}

export default function QuizAttempts() {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fetchAttempts = async () => {
    try {
      setLoading(true);
      setErrorText("");
      const res = await getQuizAttempts(quizId);
      setAttempts(Array.isArray(res?.result) ? res.result : []);
    } catch (error) {
      setAttempts([]);
      setErrorText(
        error?.body?.message ||
          error?.message ||
          "Không tải được danh sách lượt làm.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttempts();
  }, [quizId]);

  const filteredAttempts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return attempts.filter((attempt) => {
      const text = [
        attempt.fullName,
        attempt.username,
        attempt.email,
        attempt.quizTitle,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchSearch = !keyword || text.includes(keyword);
      const matchStatus =
        statusFilter === "ALL" || attempt.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [attempts, search, statusFilter]);

  const submittedCount = attempts.filter(
    (attempt) => attempt.status === "SUBMITTED" || attempt.status === "GRADED",
  ).length;
  const inProgressCount = attempts.filter(
    (attempt) => attempt.status === "IN_PROGRESS",
  ).length;
  const quizTitle = attempts[0]?.quizTitle || "Bài kiểm tra";

  return (
    <div className={styles.page}>
      <div className={styles.headerBar}>
        <div className={styles.titleGroup}>
          <span className={styles.titleIcon}>
            <FileQuestion size={22} />
          </span>
          <div>
            <h1>Lượt làm bài kiểm tra</h1>
            <p>{quizTitle}</p>
          </div>
        </div>

        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate("/admin/quizzes")}
        >
          <ArrowLeft size={18} />
          <span>Quay lại</span>
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm học viên, tên đăng nhập hoặc email..."
          />
        </div>

        <div className={styles.filterBox}>
          <Clock size={16} />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Lọc trạng thái lượt làm"
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className={styles.resetBtn}
          onClick={() => {
            setSearch("");
            setStatusFilter("ALL");
          }}
          title="Đặt lại bộ lọc"
          aria-label="Đặt lại bộ lọc"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {errorText ? <div className={styles.errorBox}>{errorText}</div> : null}

      <div className={styles.listHeader}>
        <div>
          <h2>Danh sách lượt làm</h2>
          <p>
            Hiển thị {filteredAttempts.length} / {attempts.length} lượt làm, đã
            nộp {submittedCount}, đang làm {inProgressCount}.
          </p>
        </div>
      </div>

      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.stateBox}>Đang tải danh sách lượt làm...</div>
        ) : filteredAttempts.length === 0 ? (
          <div className={styles.stateBox}>
            Không có lượt làm phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.attemptTable}>
              <thead>
                <tr>
                  <th>Học viên</th>
                  <th>Lần làm</th>
                  <th>Trạng thái</th>
                  <th>Điểm</th>
                  <th>Đúng</th>
                  <th>Sai</th>
                  <th>Tỷ lệ</th>
                  <th>Bắt đầu</th>
                  <th>Nộp bài</th>
                  <th>Thời gian làm</th>
                </tr>
              </thead>

              <tbody>
                {filteredAttempts.map((attempt) => {
                  const statusMeta = getStatusMeta(attempt.status);
                  const StatusIcon = statusMeta.icon;

                  return (
                    <tr key={attempt.attemptId}>
                      <td>
                        <div className={styles.userCell}>
                          <span className={styles.userIcon}>
                            <UserRound size={17} />
                          </span>
                          <div>
                            <strong>
                              {attempt.fullName ||
                                attempt.username ||
                                "Chưa có tên"}
                            </strong>
                            <span>{attempt.email || "Chưa có email"}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className={styles.numberCell}>
                          #{attempt.attemptNo || 1}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            styles[statusMeta.className]
                          }`}
                        >
                          <StatusIcon size={15} />
                          {statusMeta.label}
                        </span>
                      </td>

                      <td>
                        <span className={styles.scoreCell}>
                          {formatScore(attempt)}
                        </span>
                      </td>

                      <td>
                        <span className={styles.correctCell}>
                          {getCorrectCount(attempt)}
                        </span>
                      </td>

                      <td>
                        <span className={styles.wrongCell}>
                          {getWrongCount(attempt)}
                        </span>
                      </td>

                      <td>
                        <span className={styles.scoreCell}>
                          {Math.round(Number(attempt.scorePercent || 0))}%
                        </span>
                      </td>

                      <td>{formatDateTime(attempt.startedAt)}</td>
                      <td>{formatDateTime(attempt.submittedAt)}</td>
                      <td>
                        {formatDuration(
                          attempt.startedAt,
                          attempt.submittedAt,
                          attempt.status,
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
