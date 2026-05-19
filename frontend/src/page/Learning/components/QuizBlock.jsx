import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [selectedOptionIds, setSelectedOptionIds] = useState([]);
  const [answered, setAnswered] = useState(false);
  const [answerCorrect, setAnswerCorrect] = useState(null);
  const autoStartedQuizRef = useRef("");

  useEffect(() => {
    let isMounted = true;

    const fetchQuiz = async () => {
      try {
        setLoadingQuiz(true);
        setQuizError("");
        setSelectedOptionIds([]);
        setAnswered(false);
        setAnswerCorrect(null);

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

  const handleStartQuiz = useCallback(async () => {
    try {
      setStartingQuiz(true);
      setQuizError("");
      const res = await startLearningQuiz(quizId);
      setQuizData(res?.result || null);
    } catch (error) {
      autoStartedQuizRef.current = "";
      setQuizError(error?.body?.message || error?.message || "Không thể mở quiz.");
    } finally {
      setStartingQuiz(false);
    }
  }, [quizId, startLearningQuiz]);

  useEffect(() => {
    if (
      loadingQuiz ||
      !quizData ||
      quizData.attemptId ||
      startingQuiz ||
      autoStartedQuizRef.current === quizId
    ) {
      return;
    }

    autoStartedQuizRef.current = quizId;
    handleStartQuiz();
  }, [handleStartQuiz, loadingQuiz, quizData, quizId, startingQuiz]);

  const question = quizData?.questions?.[0] || null;
  const correctOptionIds = useMemo(() => {
    if (!question) return [];
    if (question.correctOptionId) return [question.correctOptionId];
    return question.correctOptionIds || [];
  }, [question]);

  const hasSelected = selectedOptionIds.length > 0;
  const isMultipleChoice =
    String(question?.questionType || "").toUpperCase() === "MULTIPLE_CHOICE";

  const isSelectionCorrect = () => {
    if (!question || !hasSelected) return false;
    const selected = [...selectedOptionIds].sort();
    const correct = [...correctOptionIds].sort();
    return (
      selected.length === correct.length &&
      selected.every((optionId, index) => optionId === correct[index])
    );
  };

  const handleSelectOption = (optionId) => {
    if (submittingQuiz) return;

    setAnswered(false);
    setAnswerCorrect(null);

    setSelectedOptionIds((prev) => {
      if (!isMultipleChoice) {
        return [optionId];
      }

      return prev.includes(optionId)
        ? prev.filter((id) => id !== optionId)
        : [...prev, optionId];
    });
  };

  const persistUnlockIfNeeded = async () => {
    if (!quizData?.attemptId || quizData?.attemptStatus !== "IN_PROGRESS") {
      await onQuizSubmitted?.({ autoNavigate: false });
      return;
    }

    const payload = {
      questionId: question.id,
      selectedOptionId: isMultipleChoice ? null : selectedOptionIds[0],
      selectedOptionIds: isMultipleChoice ? selectedOptionIds : [],
    };

    const savedRes = await saveQuizAnswer(quizData.attemptId, payload);
    const savedData = savedRes?.result || quizData;
    setQuizData(savedData);

    const submitRes = await submitLearningQuiz(savedData.attemptId);
    const submittedData = submitRes?.result || savedData;
    setQuizData(submittedData);

    await onQuizSubmitted?.({ autoNavigate: false, skipSave: true });
  };

  const handleAnswer = async () => {
    if (!hasSelected || !question || submittingQuiz) return;

    const correct = isSelectionCorrect();
    setAnswered(true);
    setAnswerCorrect(correct);

    if (!correct) return;

    try {
      setSubmittingQuiz(true);
      setQuizError("");
      await persistUnlockIfNeeded();
    } catch (error) {
      setQuizError(error?.body?.message || error?.message || "Không mở được bài tiếp.");
    } finally {
      setSubmittingQuiz(false);
    }
  };

  if (loadingQuiz || startingQuiz) {
    return <div className={styles.quizState}>Đang tải câu hỏi...</div>;
  }

  if (quizError) {
    return <div className={styles.quizError}>{quizError}</div>;
  }

  if (!quizData?.attemptId || !quizData?.attemptStatus) {
    return <div className={styles.quizState}>Đang mở quiz...</div>;
  }

  if (!question) {
    return <div className={styles.quizState}>Quiz chưa có câu hỏi.</div>;
  }

  return (
    <div className={styles.quizSingle}>
      <div className={styles.quizSingleHead}>
        <div
          className={styles.quizRichText}
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(question.questionText || ""),
          }}
        />
        <p>Chọn câu trả lời đúng.</p>
      </div>

      <div className={styles.quizOptionsSimple}>
        {(question.options || []).map((option) => {
          const checked = selectedOptionIds.includes(option.id);
          const optionClasses = [
            styles.quizOptionSimple,
            checked ? styles.quizOptionSimpleSelected : "",
            answered && checked && answerCorrect ? styles.quizOptionSimpleCorrect : "",
            answered && checked && answerCorrect === false
              ? styles.quizOptionSimpleWrong
              : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={option.id}
              type="button"
              className={optionClasses}
              onClick={() => handleSelectOption(option.id)}
              disabled={submittingQuiz}
            >
              {option.optionText}
            </button>
          );
        })}
      </div>

      <div className={styles.quizSingleActions}>
        <button
          type="button"
          className={styles.quizPrimaryBtn}
          onClick={handleAnswer}
          disabled={!hasSelected || submittingQuiz}
        >
          {submittingQuiz ? "ĐANG LƯU TIẾN ĐỘ..." : "TRẢ LỜI"}
        </button>
      </div>

      {answered ? (
        <div className={styles.quizExplanationPanel}>
          {answerCorrect === false ? (
            <p className={styles.quizAnswerNote}>
              Đáp án này chưa đúng. Hãy chọn lại đáp án khác.
            </p>
          ) : null}

          {answerCorrect === true ? (
            <>
              <h4>Giải thích</h4>
              {question.explanation ? (
                <div
                  className={`${styles.quizExplanationContent} ${styles.quizRichText}`}
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(question.explanation || ""),
                  }}
                />
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
