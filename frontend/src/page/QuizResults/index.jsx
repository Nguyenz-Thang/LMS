import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  Eye,
  Filter,
  RotateCcw,
  Search,
  Trophy,
} from "lucide-react";
import { useLearningApi } from "../../api/learningApi";
import styles from "./QuizResults.module.scss";

const FILTER_OPTIONS = {
  ALL: "ALL",
  SUBMITTED: "SUBMITTED",
  IN_PROGRESS: "IN_PROGRESS",
  PASSED: "PASSED",
  NOT_PASSED: "NOT_PASSED",
};

function formatDateTime(value, fallback = "Đang làm dở") {
  if (!value) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatCorrectAnswers(score, totalScore) {
  return `${Math.round(score || 0)}/${Math.round(totalScore || 0)}`;
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

function getAttemptStatusLabel(attempt) {
  if (attempt.attemptStatus === "IN_PROGRESS") return "Đang làm";
  if (attempt.passed === true) return "Đạt";
  if (attempt.passed === false) return "Chưa đạt";
  return "Đã nộp";
}

function matchesFilter(attempt, filter) {
  switch (filter) {
    case FILTER_OPTIONS.SUBMITTED:
      return attempt.attemptStatus === "SUBMITTED" || attempt.attemptStatus === "GRADED";
    case FILTER_OPTIONS.IN_PROGRESS:
      return attempt.attemptStatus === "IN_PROGRESS";
    case FILTER_OPTIONS.PASSED:
      return attempt.passed === true;
    case FILTER_OPTIONS.NOT_PASSED:
      return attempt.passed === false;
    case FILTER_OPTIONS.ALL:
    default:
      return true;
  }
}

export default function QuizResults() {
  const navigate = useNavigate();
  const { getQuizAttemptHistory } = useLearningApi();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState(FILTER_OPTIONS.ALL);

  const fetchAttempts = useCallback(async () => {
    try {
      setLoading(true);
      setErrorText("");
      const res = await getQuizAttemptHistory();
      setAttempts(Array.isArray(res?.result) ? res.result : []);
    } catch (error) {
      setErrorText(
        error?.body?.message ||
          error?.message ||
          "Không tải được lịch sử kết quả bài kiểm tra.",
      );
    } finally {
      setLoading(false);
    }
  }, [getQuizAttemptHistory]);

  useEffect(() => {
    fetchAttempts();
  }, [fetchAttempts]);

  const filteredAttempts = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return attempts.filter((attempt) => {
      const matchesKeyword =
        !normalizedKeyword ||
        attempt?.quizTitle?.toLowerCase().includes(normalizedKeyword) ||
        attempt?.quizDescription?.toLowerCase().includes(normalizedKeyword);

      return matchesKeyword && matchesFilter(attempt, statusFilter);
    });
  }, [attempts, keyword, statusFilter]);

  const summary = useMemo(() => {
    const submitted = attempts.filter(
      (item) => item.attemptStatus === "SUBMITTED" || item.attemptStatus === "GRADED",
    );
    const inProgress = attempts.filter(
      (item) => item.attemptStatus === "IN_PROGRESS",
    );
    const passed = attempts.filter((item) => item.passed === true);
    const avgScore =
      submitted.length === 0
        ? 0
        : submitted.reduce((sum, item) => sum + (item.scorePercent || 0), 0) /
          submitted.length;

    return {
      total: attempts.length,
      submitted: submitted.length,
      inProgress: inProgress.length,
      passed: passed.length,
      avgScore: Math.round(avgScore),
    };
  }, [attempts]);

  return (
    <div className={styles.page}>
      <div className={styles.headerBlock}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <Trophy size={24} />
          </div>
          <div>
            <h1>Kết quả bài kiểm tra</h1>
            <p>
              Theo dõi lịch sử làm bài, xem lại từng câu trả lời và làm lại bài
              kiểm tra khi cần.
            </p>
          </div>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc mô tả bài kiểm tra..."
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>

        <div className={styles.filterBox}>
          <Filter size={16} />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value={FILTER_OPTIONS.ALL}>Tất cả kết quả</option>
            <option value={FILTER_OPTIONS.SUBMITTED}>Đã nộp</option>
            <option value={FILTER_OPTIONS.IN_PROGRESS}>Đang làm</option>
            <option value={FILTER_OPTIONS.PASSED}>Đạt</option>
            <option value={FILTER_OPTIONS.NOT_PASSED}>Chưa đạt</option>
          </select>
        </div>
      </div>

      <section className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <BarChart3 size={18} />
          <span>Tổng lượt làm</span>
          <strong>{summary.total}</strong>
        </div>
        <div className={styles.summaryCard}>
          <Trophy size={18} />
          <span>Đã nộp bài</span>
          <strong>{summary.submitted}</strong>
        </div>
        <div className={styles.summaryCard}>
          <RotateCcw size={18} />
          <span>Đang làm dở</span>
          <strong>{summary.inProgress}</strong>
        </div>
        <div className={styles.summaryCard}>
          <Trophy size={18} />
          <span>Điểm trung bình</span>
          <strong>{summary.avgScore}%</strong>
        </div>
      </section>

      {loading ? <div className={styles.stateBox}>Đang tải kết quả...</div> : null}
      {!loading && errorText ? <div className={styles.errorBox}>{errorText}</div> : null}

      {!loading && !errorText ? (
        filteredAttempts.length === 0 ? (
          <div className={styles.stateBox}>
            Không có kết quả phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <div className={styles.list}>
            {filteredAttempts.map((attempt) => (
              <article key={attempt.attemptId} className={styles.card}>
                <div className={styles.cardTop}>
                  <div>
                    <h3>{attempt.quizTitle}</h3>
                    <p>{attempt.quizDescription || "Chưa có mô tả."}</p>
                  </div>

                  <span
                    className={
                      attempt.attemptStatus === "IN_PROGRESS"
                        ? styles.badgeWarning
                        : attempt.passed === true
                          ? styles.badgeSuccess
                          : attempt.passed === false
                            ? styles.badgeDanger
                            : styles.badgeNeutral
                    }
                  >
                    {getAttemptStatusLabel(attempt)}
                  </span>
                </div>

                <div className={styles.metrics}>
                  <div>
                    <span>Lần làm</span>
                    <strong>#{attempt.attemptNo || 1}</strong>
                  </div>
                  <div>
                    <span>Số câu đúng</span>
                    <strong>
                      {formatCorrectAnswers(attempt.score, attempt.totalScore)}
                    </strong>
                  </div>
                  <div>
                    <span>Tỷ lệ đúng</span>
                    <strong>{Math.round(attempt.scorePercent || 0)}%</strong>
                  </div>
                  <div>
                    <span>Thời gian làm</span>
                    <strong>
                      {formatDuration(
                        attempt.startedAt,
                        attempt.submittedAt,
                        attempt.attemptStatus,
                      )}
                    </strong>
                  </div>
                  <div>
                    <span>Nộp lúc</span>
                    <strong>
                      {formatDateTime(attempt.submittedAt || attempt.startedAt)}
                    </strong>
                  </div>
                </div>

                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.ghostBtn}
                    onClick={() => navigate(`/quiz-results/${attempt.attemptId}`)}
                  >
                    <Eye size={16} />
                    <span>Xem chi tiết</span>
                  </button>

                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={() => navigate(`/quizzes/${attempt.quizId}/take`)}
                  >
                    <RotateCcw size={16} />
                    <span>
                      {attempt.attemptStatus === "IN_PROGRESS"
                        ? "Tiếp tục làm"
                        : "Làm lại"}
                    </span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
