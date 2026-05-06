import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, X } from "lucide-react";
import { useLearningApi } from "../../api/learningApi";
import StandaloneQuizPlayer from "../Quizzes/components/StandaloneQuizPlayer";
import styles from "./QuizTake.module.scss";

function isSubmittedAttempt(data) {
  return data?.attemptStatus === "SUBMITTED" || data?.attemptStatus === "GRADED";
}

function toTakeStartData(data) {
  if (!isSubmittedAttempt(data)) return data;

  return {
    ...data,
    attemptId: null,
    attemptNo: null,
    attemptStatus: null,
    score: 0,
    startedAt: null,
    submittedAt: null,
    questions: Array.isArray(data?.questions)
      ? data.questions.map((question) => ({
          ...question,
          selectedOptionId: null,
          selectedOptionIds: [],
          correct: null,
        }))
      : [],
  };
}

export default function QuizTake() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const {
    getLearningQuiz,
    startLearningQuiz,
    saveQuizAnswer,
    submitLearningQuiz,
  } = useLearningApi();

  const [quizData, setQuizData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState("");

  const formatErrorMessage = (message) => {
    if (!message) return "Không thể thực hiện thao tác này.";
    const quoted = message.match(/"([^"]+)"/);
    return quoted?.[1] || message.replace(/^400\s+BAD_REQUEST\s*/i, "").trim();
  };

  useEffect(() => {
    let mounted = true;

    const fetchQuiz = async () => {
      try {
        setLoading(true);
        setErrorText("");
        const res = await getLearningQuiz(quizId);
        if (mounted) {
          setQuizData(toTakeStartData(res?.result || null));
        }
      } catch (error) {
        if (mounted) {
          setErrorText(
            error?.body?.message || error?.message || "Không tải được quiz.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchQuiz();
    return () => {
      mounted = false;
    };
  }, [quizId, getLearningQuiz]);

  const handleStart = async () => {
    try {
      setStarting(true);
      setErrorText("");
      const res = await startLearningQuiz(quizId);
      setQuizData(res?.result || null);
    } catch (error) {
      setErrorText(
        error?.body?.message || error?.message || "Không thể bắt đầu quiz.",
      );
    } finally {
      setStarting(false);
    }
  };

  const handleSelectOption = async (
    questionId,
    selectedOptionId,
    selectedOptionIds,
  ) => {
    if (!quizData?.attemptId) return;

    try {
      const res = await saveQuizAnswer(quizData.attemptId, {
        questionId,
        selectedOptionId,
        selectedOptionIds,
      });
      setQuizData(res?.result || null);
    } catch (error) {
      setErrorText(
        error?.body?.message || error?.message || "Không lưu được đáp án.",
      );
    }
  };

  const handleSubmit = async () => {
    if (!quizData?.attemptId) return;

    try {
      setSubmitting(true);
      setErrorText("");
      const res = await submitLearningQuiz(quizData.attemptId);
      const nextData = res?.result || null;
      setQuizData(nextData);
      if (nextData?.attemptId) {
        navigate(`/quiz-results/${nextData.attemptId}/summary`);
      }
    } catch (error) {
      setErrorText(
        error?.body?.message || error?.message || "Không nộp được quiz.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetake = async () => {
    await handleStart();
  };

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        Bài kiểm tra <span>\</span> Làm bài
      </div>

      <button
        type="button"
        className={styles.backBtn}
        onClick={() => navigate("/quizzes")}
      >
        <ArrowLeft size={18} />
        <span>Quay lại danh sách quiz</span>
      </button>

      <StandaloneQuizPlayer
        mode="take"
        quizData={quizData}
        loading={loading}
        error=""
        starting={starting}
        submitting={submitting}
        onStart={handleStart}
        onSelectOption={handleSelectOption}
        onSubmit={handleSubmit}
        onRetake={handleRetake}
      />

      {errorText ? (
        <div className={styles.modalOverlay} role="presentation">
          <div className={styles.errorModal} role="dialog" aria-modal="true">
            <button
              type="button"
              className={styles.closeBtn}
              onClick={() => setErrorText("")}
              aria-label="Đóng thông báo"
            >
              <X size={18} />
            </button>

            <div className={styles.modalIcon}>
              <AlertCircle size={24} />
            </div>

            <h2>Không thể làm bài</h2>
            <p>{formatErrorMessage(errorText)}</p>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => setErrorText("")}
              >
                Đóng
              </button>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => navigate("/quizzes")}
              >
                Quay lại danh sách quiz
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
