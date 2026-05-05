import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardCheck,
  Eye,
  Filter,
  PlayCircle,
  RefreshCw,
  RotateCcw,
  Search,
  Trophy,
} from "lucide-react";
import { useLearningApi } from "../../api/learningApi";
import styles from "./Quizzes.module.scss";

const FILTER_OPTIONS = {
  ALL: "ALL",
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  DONE: "DONE",
};

function formatDateTime(value) {
  if (!value) return "Chưa làm";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa làm";

  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getFilterLabel(value) {
  switch (value) {
    case FILTER_OPTIONS.NOT_STARTED:
      return "Chưa làm";
    case FILTER_OPTIONS.IN_PROGRESS:
      return "Đang làm";
    case FILTER_OPTIONS.DONE:
      return "Đã làm";
    case FILTER_OPTIONS.ALL:
    default:
      return "Tất cả";
  }
}

function getQuizState(quiz) {
  if (quiz.latestAttemptStatus === "IN_PROGRESS" && quiz.latestAttemptId) {
    return FILTER_OPTIONS.IN_PROGRESS;
  }

  if ((quiz.attemptCount || 0) > 0) {
    return FILTER_OPTIONS.DONE;
  }

  return FILTER_OPTIONS.NOT_STARTED;
}

function getQuizStateLabel(quiz) {
  return getFilterLabel(getQuizState(quiz));
}

export default function Quizzes() {
  const navigate = useNavigate();
  const { getIndependentQuizzes } = useLearningApi();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState(FILTER_OPTIONS.ALL);

  const fetchQuizzes = useCallback(async () => {
    try {
      setLoading(true);
      setErrorText("");
      const res = await getIndependentQuizzes();
      setQuizzes(Array.isArray(res?.result) ? res.result : []);
    } catch (error) {
      setErrorText(
        error?.body?.message ||
          error?.message ||
          "Không tải được danh sách bài kiểm tra.",
      );
    } finally {
      setLoading(false);
    }
  }, [getIndependentQuizzes]);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  const stats = useMemo(() => {
    const totalAttempts = quizzes.reduce(
      (sum, item) => sum + (item.attemptCount || 0),
      0,
    );
    const attempted = quizzes.filter((item) => (item.attemptCount || 0) > 0).length;
    const inProgress = quizzes.filter(
      (item) => getQuizState(item) === FILTER_OPTIONS.IN_PROGRESS,
    ).length;

    return {
      total: quizzes.length,
      attempted,
      inProgress,
      totalAttempts,
    };
  }, [quizzes]);

  const filteredQuizzes = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return quizzes.filter((quiz) => {
      const matchesKeyword =
        !normalizedKeyword ||
        quiz?.title?.toLowerCase().includes(normalizedKeyword) ||
        quiz?.description?.toLowerCase().includes(normalizedKeyword);

      const matchesStatus =
        statusFilter === FILTER_OPTIONS.ALL || getQuizState(quiz) === statusFilter;

      return matchesKeyword && matchesStatus;
    });
  }, [keyword, quizzes, statusFilter]);

  return (
    <div className={styles.page}>
      <div className={styles.headerBlock}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <ClipboardCheck size={24} />
          </div>
          <div>
            <h1>Bài kiểm tra</h1>
            <p>
              Làm bài kiểm tra, tiếp tục lượt đang dở và xem lại kết quả các lần
              làm gần nhất.
            </p>
          </div>
        </div>

        <button type="button" className={styles.refreshBtn} onClick={fetchQuizzes}>
          <RefreshCw size={16} />
          <span>Làm mới</span>
        </button>
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
            <option value={FILTER_OPTIONS.ALL}>Tất cả trạng thái</option>
            <option value={FILTER_OPTIONS.NOT_STARTED}>Chưa làm</option>
            <option value={FILTER_OPTIONS.IN_PROGRESS}>Đang làm</option>
            <option value={FILTER_OPTIONS.DONE}>Đã làm</option>
          </select>
        </div>
      </div>

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span>Tổng bài kiểm tra</span>
          <strong>{stats.total}</strong>
        </div>
        <div className={styles.statCard}>
          <span>Đã từng làm</span>
          <strong>{stats.attempted}</strong>
        </div>
        <div className={styles.statCard}>
          <span>Đang làm dở</span>
          <strong>{stats.inProgress}</strong>
        </div>
        <div className={styles.statCard}>
          <span>Tổng lượt làm</span>
          <strong>{stats.totalAttempts}</strong>
        </div>
      </section>

      {loading ? <div className={styles.stateBox}>Đang tải bài kiểm tra...</div> : null}
      {!loading && errorText ? <div className={styles.errorBox}>{errorText}</div> : null}

      {!loading && !errorText ? (
        filteredQuizzes.length === 0 ? (
          <div className={styles.stateBox}>
            Không có bài kiểm tra phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <div className={styles.grid}>
            {filteredQuizzes.map((quiz) => {
              const resume =
                quiz.latestAttemptStatus === "IN_PROGRESS" && quiz.latestAttemptId;
              const state = getQuizState(quiz);

              return (
                <article key={quiz.quizId} className={styles.card}>
                  <div className={styles.cardHead}>
                    <div className={styles.iconWrap}>
                      <ClipboardCheck size={22} />
                    </div>

                    <div className={styles.badges}>
                      <span className={styles.badgeNeutral}>
                        {quiz.questionCount || 0} câu
                      </span>
                      <span
                        className={
                          state === FILTER_OPTIONS.IN_PROGRESS
                            ? styles.badgeWarning
                            : state === FILTER_OPTIONS.DONE
                              ? styles.badgeSuccess
                              : styles.badgeNeutral
                        }
                      >
                        {getQuizStateLabel(quiz)}
                      </span>
                    </div>
                  </div>

                  <div className={styles.cardContent}>
                    <h3>{quiz.title}</h3>
                    <p>{quiz.description || "Chưa có mô tả cho bài kiểm tra này."}</p>
                  </div>

                  <div className={styles.infoGrid}>
                    <div>
                      <span>Điểm tốt nhất</span>
                      <strong>{Math.round(quiz.bestScorePercent || 0)}%</strong>
                    </div>
                    <div>
                      <span>Số lượt làm</span>
                      <strong>{quiz.attemptCount || 0}</strong>
                    </div>
                    <div>
                      <span>Lần gần nhất</span>
                      <strong>
                        {formatDateTime(quiz.latestSubmittedAt || quiz.latestStartedAt)}
                      </strong>
                    </div>
                  </div>

                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.primaryBtn}
                      onClick={() => navigate(`/quizzes/${quiz.quizId}/take`)}
                    >
                      {resume ? <RotateCcw size={16} /> : <PlayCircle size={16} />}
                      <span>{resume ? "Tiếp tục làm" : "Vào làm bài"}</span>
                    </button>

                    {quiz.latestAttemptId ? (
                      <button
                        type="button"
                        className={styles.ghostBtn}
                        onClick={() =>
                          navigate(`/quiz-results/${quiz.latestAttemptId}`)
                        }
                      >
                        {state === FILTER_OPTIONS.DONE ? (
                          <Trophy size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                        <span>Xem kết quả</span>
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )
      ) : null}
    </div>
  );
}
