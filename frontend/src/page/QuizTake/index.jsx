import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useLearningApi } from "../../api/learningApi";
import StandaloneQuizPlayer from "../Quizzes/components/StandaloneQuizPlayer";
import styles from "./QuizTake.module.scss";

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

  useEffect(() => {
    let mounted = true;

    const fetchQuiz = async () => {
      try {
        setLoading(true);
        setErrorText("");
        const res = await getLearningQuiz(quizId);
        if (mounted) {
          setQuizData(res?.result || null);
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
        navigate(`/quiz-results/${nextData.attemptId}`);
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
        error={errorText}
        starting={starting}
        submitting={submitting}
        onStart={handleStart}
        onSelectOption={handleSelectOption}
        onSubmit={handleSubmit}
        onRetake={handleRetake}
      />
    </div>
  );
}
