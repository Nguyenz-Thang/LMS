import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import styles from "../Learning.module.scss";

export default function QuizBlock({
  quizId,
  getLearningQuiz,
  startLearningQuiz,
  saveQuizAnswer,
  submitLearningQuiz,
  onQuizSubmitted,
}) {
  const [quizData, setQuizData] = useState(null);
  const [loadingQuiz, setLoadingQuiz] = useState(true);
  const [startingQuiz, setStartingQuiz] = useState(false);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [quizError, setQuizError] = useState("");
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchQuiz = async () => {
      try {
        setLoadingQuiz(true);
        setQuizError("");
        const res = await getLearningQuiz(quizId);
        if (isMounted) setQuizData(res?.result || null);
      } catch (error) {
        if (isMounted) {
          setQuizError(
            error?.body?.message || error?.message || "Không tải được quiz.",
          );
        }
      } finally {
        if (isMounted) setLoadingQuiz(false);
      }
    };

    fetchQuiz();

    return () => {
      isMounted = false;
    };
  }, [quizId, getLearningQuiz]);

  useEffect(() => {
    setActiveQuestionIndex(0);
  }, [quizData?.attemptId, quizData?.quizId]);

  const questions = quizData?.questions || [];

  const handleStartQuiz = async () => {
    try {
      setStartingQuiz(true);
      setQuizError("");
      const res = await startLearningQuiz(quizId);
      setQuizData(res?.result || null);
    } catch (error) {
      setQuizError(
        error?.body?.message || error?.message || "Không thể bắt đầu quiz.",
      );
    } finally {
      setStartingQuiz(false);
    }
  };

  const handleSaveAnswer = async (payload) => {
    if (!quizData?.attemptId) return;

    try {
      const res = await saveQuizAnswer(quizData.attemptId, payload);
      setQuizData(res?.result || null);
    } catch (error) {
      setQuizError(
        error?.body?.message || error?.message || "Không lưu được đáp án.",
      );
    }
  };

  const handleSelectOption = async (questionId, selectedOptionId) => {
    await handleSaveAnswer({
      questionId,
      selectedOptionId,
    });
  };

  const handleToggleMultipleOption = async (questionId, optionId) => {
    const question = questions.find((item) => item.id === questionId);
    const currentOptionIds = question?.selectedOptionIds || [];
    const nextOptionIds = currentOptionIds.includes(optionId)
      ? currentOptionIds.filter((id) => id !== optionId)
      : [...currentOptionIds, optionId];

    await handleSaveAnswer({
      questionId,
      selectedOptionIds: nextOptionIds,
    });
  };

  const handleSubmitQuiz = async () => {
    if (!quizData?.attemptId) return;

    try {
      setSubmittingQuiz(true);
      const res = await submitLearningQuiz(quizData.attemptId);
      const nextData = res?.result || null;
      setQuizData(nextData);
      await onQuizSubmitted?.({
        autoNavigate: false,
      });
    } catch (error) {
      setQuizError(
        error?.body?.message || error?.message || "Không nộp được quiz.",
      );
    } finally {
      setSubmittingQuiz(false);
    }
  };

  if (loadingQuiz) {
    return <div className={styles.quizState}>Đang tải quiz...</div>;
  }

  if (quizError) {
    return <div className={styles.quizError}>{quizError}</div>;
  }

  if (!quizData) {
    return <div className={styles.quizState}>Không có dữ liệu quiz.</div>;
  }

  const canAnswer = quizData.attemptStatus === "IN_PROGRESS";
  const submitted =
    quizData.attemptStatus === "SUBMITTED" ||
    quizData.attemptStatus === "GRADED";
  const totalQuestions = questions.length;
  const answeredCount = questions.filter((question) =>
    question.questionType === "MULTIPLE_CHOICE"
      ? (question.selectedOptionIds || []).length > 0
      : Boolean(question.selectedOptionId),
  ).length;
  const allAnswered = totalQuestions > 0 && answeredCount === totalQuestions;
  const safeQuestionIndex = Math.min(activeQuestionIndex, totalQuestions - 1);
  const activeQuestion = questions[safeQuestionIndex] || null;
  const isLastQuestion = safeQuestionIndex === totalQuestions - 1;

  const submitLabel = submittingQuiz
    ? "Đang trả lời..."
    : totalQuestions <= 1
      ? "Trả lời"
      : "Hoàn thành";

  if (!quizData.attemptId || !quizData.attemptStatus) {
    return (
      <div className={styles.quizStartCard}>
        <div className={styles.quizHeader}>
          <div>
            <h3>{quizData.title}</h3>
            <p>
              {quizData.description || "Quiz kiểm tra mức độ hiểu bài của bạn."}
            </p>
          </div>

          <div className={styles.quizMeta}>
            <span>{totalQuestions} câu hỏi</span>
            <span>Giới hạn: {quizData.maxAttempts ?? 1} lượt</span>
          </div>
        </div>

        <button
          type="button"
          className={styles.quizPrimaryBtn}
          onClick={handleStartQuiz}
          disabled={startingQuiz}
        >
          {startingQuiz ? "Đang bắt đầu..." : "Bắt đầu quiz"}
        </button>
      </div>
    );
  }

  if (!activeQuestion) {
    return <div className={styles.quizState}>Quiz chưa có câu hỏi.</div>;
  }

  return (
    <div className={styles.quizSingle}>
      <div className={styles.quizSingleHead}>
        <div
          className={styles.quizRichText}
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(activeQuestion.questionText || ""),
          }}
        />
        <p>
          {totalQuestions > 1
            ? `Câu ${safeQuestionIndex + 1} / ${totalQuestions}`
            : "Chọn câu trả lời đúng."}
        </p>
      </div>

      {totalQuestions > 1 ? (
        <div className={styles.quizStepper}>
          {questions.map((question, index) => {
            const answered =
              question.questionType === "MULTIPLE_CHOICE"
                ? (question.selectedOptionIds || []).length > 0
                : Boolean(question.selectedOptionId);

            const itemClasses = [
              styles.quizStep,
              index === safeQuestionIndex ? styles.quizStepActive : "",
              answered ? styles.quizStepDone : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <button
                key={question.id}
                type="button"
                className={itemClasses}
                onClick={() => setActiveQuestionIndex(index)}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className={styles.quizOptionsSimple}>
        {(activeQuestion.options || []).map((option) => {
          const checked =
            activeQuestion.questionType === "MULTIPLE_CHOICE"
              ? (activeQuestion.selectedOptionIds || []).includes(option.id)
              : activeQuestion.selectedOptionId === option.id;
          const revealCorrect =
            submitted &&
            (activeQuestion.questionType === "MULTIPLE_CHOICE"
              ? (activeQuestion.correctOptionIds || []).includes(option.id)
              : activeQuestion.correctOptionId === option.id);
          const revealWrong = submitted && checked && !revealCorrect;
          const optionClasses = [
            styles.quizOptionSimple,
            checked ? styles.quizOptionSimpleSelected : "",
            revealCorrect ? styles.quizOptionSimpleCorrect : "",
            revealWrong ? styles.quizOptionSimpleWrong : "",
          ]
            .filter(Boolean)
            .join(" ");

          if (!canAnswer) {
            return (
              <div key={option.id} className={optionClasses}>
                {option.optionText}
              </div>
            );
          }

          return (
            <button
              key={option.id}
              type="button"
              className={optionClasses}
              onClick={() =>
                activeQuestion.questionType === "MULTIPLE_CHOICE"
                  ? handleToggleMultipleOption(activeQuestion.id, option.id)
                  : handleSelectOption(activeQuestion.id, option.id)
              }
            >
              {option.optionText}
            </button>
          );
        })}
      </div>

      {canAnswer ? (
        <div className={styles.quizSingleActions}>
          {totalQuestions > 1 && !isLastQuestion ? (
            <button
              type="button"
              className={styles.quizGhostBtn}
              onClick={() => setActiveQuestionIndex((prev) => prev + 1)}
              disabled={
                activeQuestion.questionType === "MULTIPLE_CHOICE"
                  ? (activeQuestion.selectedOptionIds || []).length === 0
                  : !activeQuestion.selectedOptionId
              }
            >
              Câu tiếp theo
            </button>
          ) : (
            <button
              type="button"
              className={styles.quizPrimaryBtn}
              onClick={handleSubmitQuiz}
              disabled={submittingQuiz || !allAnswered}
            >
              {submitLabel}
            </button>
          )}
        </div>
      ) : null}

      {submitted ? (
        <>
          <div className={styles.quizSingleActions}>
            {totalQuestions > 1 ? (
              <div className={styles.quizPager}>
                <button
                  type="button"
                  className={styles.quizGhostBtn}
                  onClick={() =>
                    setActiveQuestionIndex((prev) => Math.max(prev - 1, 0))
                  }
                  disabled={safeQuestionIndex === 0}
                >
                  Câu trước
                </button>

                <button
                  type="button"
                  className={styles.quizGhostBtn}
                  onClick={() =>
                    setActiveQuestionIndex((prev) =>
                      Math.min(prev + 1, totalQuestions - 1),
                    )
                  }
                  disabled={safeQuestionIndex === totalQuestions - 1}
                >
                  Câu tiếp theo
                </button>
              </div>
            ) : null}
          </div>

          <div className={styles.quizExplanationPanel}>
            <h4>Giải thích</h4>
            {!activeQuestion.correct ? (
              <p className={styles.quizAnswerNote}>
                Đáp án đúng:
                <strong>
                  {" "}
                  {activeQuestion.questionType === "MULTIPLE_CHOICE"
                    ? (activeQuestion.correctOptionTexts || []).join(", ") ||
                      "Chưa có"
                    : activeQuestion.correctOptionText || "Chưa có"}
                </strong>
              </p>
            ) : (
              <p className={styles.quizAnswerNote}>Bạn đã chọn đáp án đúng.</p>
            )}

            {activeQuestion.explanation ? (
              <div
                className={`${styles.quizExplanationContent} ${styles.quizRichText}`}
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(activeQuestion.explanation || ""),
                }}
              />
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
