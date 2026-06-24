import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Eye, RotateCcw } from "lucide-react";
import { useLearningApi } from "../../api/learningApi";
import styles from "./Summary.module.scss";

function formatPercent(score, totalScore) {
  if (!totalScore) return "0%";
  return `${Math.round(((score || 0) / totalScore) * 100)}%`;
}

function formatDuration(startedAt, submittedAt) {
  if (!startedAt) return "Chưa bắt đầu";

  const start = new Date(startedAt).getTime();
  const end = submittedAt ? new Date(submittedAt).getTime() : Date.now();

  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return "Không rõ";
  }

  const totalSeconds = Math.max(0, Math.round((end - start) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes <= 0) return `${seconds} giây`;
  return `${minutes} phút ${seconds} giây`;
}

function formatDateTime(value) {
  if (!value) return "Chưa có";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có";

  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function QuizResultSummary() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const { getQuizAttemptReview } = useLearningApi();

  const [quizData, setQuizData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    let mounted = true;

    const fetchAttempt = async () => {
      try {
        setLoading(true);
        setErrorText("");
        const res = await getQuizAttemptReview(attemptId);
        if (mounted) {
          setQuizData(res?.result || null);
        }
      } catch (error) {
        if (mounted) {
          setErrorText(
            error?.body?.message ||
              error?.message ||
              "Không tải được kết quả bài kiểm tra.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchAttempt();
    return () => {
      mounted = false;
    };
  }, [attemptId, getQuizAttemptReview]);

  const answeredCount = useMemo(
    () =>
      (quizData?.questions || []).filter((item) =>
        item.questionType === "MULTIPLE_CHOICE"
          ? (item.selectedOptionIds || []).length > 0
          : Boolean(item.selectedOptionId),
      ).length,
    [quizData],
  );

  if (loading) {
    return <div className={styles.stateBox}>Đang tải kết quả...</div>;
  }

  if (errorText) {
    return <div className={styles.stateBox}>{errorText}</div>;
  }

  if (!quizData) {
    return <div className={styles.stateBox}>Không có dữ liệu kết quả.</div>;
  }

  const totalQuestions = quizData.questions?.length || 0;
  const correctCount = (quizData.questions || []).filter(
    (question) => question.correct === true,
  ).length;
  const wrongCount = Math.max(0, answeredCount - correctCount);
  const skippedCount = Math.max(0, totalQuestions - answeredCount);

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        Bài kiểm tra <span>\</span> Kết quả vừa nộp
      </div>

      <button
        type="button"
        className={styles.backBtn}
        onClick={() => navigate("/quizzes")}
      >
        <ArrowLeft size={18} />
        <span>Quay lại danh sách quiz</span>
      </button>

      <section className={styles.resultCard}>
        <div className={styles.heroGrid}>
          <div className={styles.heroMain}>
            <span className={styles.sectionLabel}>Đã nộp bài</span>
            <h1>{quizData.title}</h1>
            <p>{quizData.description || "Bài làm của bạn đã được ghi nhận."}</p>
          </div>

          <div className={styles.sideStats}>
            <div>
              <span>Câu hỏi</span>
              <strong>{totalQuestions}</strong>
            </div>
            <div>
              <span>Thời gian làm</span>
              <strong>
                {formatDuration(quizData.startedAt, quizData.submittedAt)}
              </strong>
            </div>
            <div>
              <span>Nộp lúc</span>
              <strong>{formatDateTime(quizData.submittedAt)}</strong>
            </div>
          </div>
        </div>

        <div className={styles.answerSummary}>
          <div className={styles.correctBox}>
            <span>Trả lời đúng</span>
            <strong>{correctCount}</strong>
          </div>
          <div className={styles.wrongBox}>
            <span>Trả lời sai</span>
            <strong>{wrongCount}</strong>
          </div>
          <div className={styles.skippedBox}>
            <span>Bỏ qua</span>
            <strong>{skippedCount}</strong>
          </div>
          <div className={styles.percentBox}>
            <span>Tỷ lệ đúng</span>
            <strong>{formatPercent(quizData.score, quizData.totalScore)}</strong>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => navigate(`/quiz-results/${attemptId}`)}
          >
            <Eye size={16} />
            <span>Xem đáp án</span>
          </button>

          {quizData.quizId ? (
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => navigate(`/quizzes/${quizData.quizId}/take`)}
            >
              <RotateCcw size={16} />
              <span>Làm lại bài</span>
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
