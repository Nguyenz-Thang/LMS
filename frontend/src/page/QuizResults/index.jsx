import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Filter, RotateCcw, Search } from "lucide-react";
import { useLearningApi } from "../../api/learningApi";
import styles from "./QuizResults.module.scss";

const FILTER_OPTIONS = {
  ALL: "ALL",
  SUBMITTED: "SUBMITTED",
  IN_PROGRESS: "IN_PROGRESS",
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
  return "Đã nộp";
}

function getAttemptBadgeClass(attempt) {
  if (attempt.attemptStatus === "IN_PROGRESS") return styles.badgeWarning;
  return styles.badgeNeutral;
}

function matchesFilter(attempt, filter) {
  switch (filter) {
    case FILTER_OPTIONS.SUBMITTED:
      return (
        attempt.attemptStatus === "SUBMITTED" ||
        attempt.attemptStatus === "GRADED"
      );
    case FILTER_OPTIONS.IN_PROGRESS:
      return attempt.attemptStatus === "IN_PROGRESS";
    case FILTER_OPTIONS.ALL:
    default:
      return true;
  }
}

function StatCard({ label, value, note }) {
  return (
    <article className={styles.summaryCard}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
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

  const groupedResults = useMemo(() => {
    const groups = new Map();

    filteredAttempts.forEach((attempt) => {
      const key = attempt.quizId || attempt.quizTitle || attempt.attemptId;
      const current = groups.get(key) || {
        quizId: attempt.quizId,
        quizTitle: attempt.quizTitle,
        quizDescription: attempt.quizDescription,
        attempts: [],
      };

      current.attempts.push(attempt);
      groups.set(key, current);
    });

    return Array.from(groups.values()).map((group) => ({
      ...group,
      attempts: group.attempts.sort(
        (a, b) => Number(b.attemptNo || 0) - Number(a.attemptNo || 0),
      ),
    }));
  }, [filteredAttempts]);

  const summary = useMemo(() => {
    const submitted = attempts.filter(
      (item) =>
        item.attemptStatus === "SUBMITTED" || item.attemptStatus === "GRADED",
    );
    const inProgress = attempts.filter(
      (item) => item.attemptStatus === "IN_PROGRESS",
    );
    const avgScore =
      submitted.length === 0
        ? 0
        : submitted.reduce((sum, item) => sum + (item.scorePercent || 0), 0) /
          submitted.length;

    return {
      total: attempts.length,
      submitted: submitted.length,
      inProgress: inProgress.length,
      avgScore: Math.round(avgScore),
    };
  }, [attempts]);

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        Bài kiểm tra <span>\</span> Kết quả
      </div>

      <section className={styles.header}>
        <div>
          <h1>Kết quả bài kiểm tra</h1>
          <p>
            Theo dõi lịch sử làm bài, xem lại từng câu trả lời và làm lại bài
            kiểm tra khi cần.
          </p>
        </div>
      </section>

      <section className={styles.summaryGrid}>
        <StatCard
          label="Tổng lượt làm"
          value={summary.total}
          note="Tất cả lượt làm đã tạo"
        />
        <StatCard
          label="Đã nộp bài"
          value={summary.submitted}
          note="Lượt làm đã hoàn tất"
        />
        <StatCard
          label="Đang làm dở"
          value={summary.inProgress}
          note="Lượt làm chưa nộp"
        />
        <StatCard
          label="Điểm trung bình"
          value={`${summary.avgScore}%`}
          note="Tính trên lượt đã nộp"
        />
      </section>

      <section className={styles.toolbar}>
        <div>
          <h2>Danh sách kết quả</h2>
          <p>
            Hiển thị {groupedResults.length} bài, {filteredAttempts.length} lượt làm.
          </p>
        </div>

        <div className={styles.controls}>
          <label className={styles.searchBox}>
            <Search size={17} />
            <input
              type="text"
              placeholder="Tìm bài kiểm tra..."
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </label>

          <label className={styles.filterBox}>
            <Filter size={16} />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value={FILTER_OPTIONS.ALL}>Tất cả kết quả</option>
              <option value={FILTER_OPTIONS.SUBMITTED}>Đã nộp</option>
              <option value={FILTER_OPTIONS.IN_PROGRESS}>Đang làm</option>
            </select>
          </label>
        </div>
      </section>

      {loading ? <div className={styles.stateBox}>Đang tải kết quả...</div> : null}
      {!loading && errorText ? <div className={styles.errorBox}>{errorText}</div> : null}

      {!loading && !errorText ? (
        groupedResults.length === 0 ? (
          <div className={styles.stateBox}>
            Không có kết quả phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <div className={styles.list}>
            {groupedResults.map((group) => (
              <article key={group.quizId || group.quizTitle} className={styles.card}>
                <div className={styles.cardTop}>
                  <div>
                    <h3>{group.quizTitle}</h3>
                    <p>{group.quizDescription || "Chưa có mô tả."}</p>
                  </div>

                  <button
                    type="button"
                    className={styles.retryBtn}
                    onClick={() => navigate(`/quizzes/${group.quizId}/take`)}
                  >
                    <RotateCcw size={16} />
                    <span>Làm lại</span>
                  </button>
                </div>

                <div className={styles.attemptList}>
                  {group.attempts.map((attempt) => (
                    <button
                      key={attempt.attemptId}
                      type="button"
                      className={styles.attemptRow}
                      onClick={() => navigate(`/quiz-results/${attempt.attemptId}`)}
                    >
                      <div>
                        <span>Lần</span>
                        <strong>#{attempt.attemptNo || 1}</strong>
                      </div>
                      <div>
                        <span>Đúng</span>
                        <strong>
                          {formatCorrectAnswers(attempt.score, attempt.totalScore)}
                        </strong>
                      </div>
                      <div>
                        <span>Tỷ lệ</span>
                        <strong>{Math.round(attempt.scorePercent || 0)}%</strong>
                      </div>
                      <div>
                        <span>Thời gian</span>
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
                      <div className={styles.rowAction}>
                        <span className={getAttemptBadgeClass(attempt)}>
                          {getAttemptStatusLabel(attempt)}
                        </span>
                        <span className={styles.detailHint}>
                          <Eye size={16} />
                          Xem chi tiết
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
