import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useLearningApi } from "../../api/learningApi";
import StandaloneQuizPlayer from "../Quizzes/components/StandaloneQuizPlayer";
import styles from "./Detail.module.scss";

export default function QuizResultDetail() {
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
              "Không tải được kết quả.",
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

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        Bài kiểm tra <span>\</span> Chi tiết kết quả
      </div>

      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate("/quiz-results")}
        >
          <ArrowLeft size={18} />
          <span>Quay lại kết quả bài kiểm tra</span>
        </button>

      </div>

      <StandaloneQuizPlayer
        mode="review"
        quizData={quizData}
        loading={loading}
        error={errorText}
        onRetake={
          quizData?.quizId
            ? () => navigate(`/quizzes/${quizData.quizId}/take`)
            : undefined
        }
      />
    </div>
  );
}
