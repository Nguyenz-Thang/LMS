import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import styles from "../Learning.module.scss";

function isMultipleChoice(question) {
  return String(question?.questionType || "").toUpperCase() === "MULTIPLE_CHOICE";
}

function getQuestionSelectedIds(question) {
  if (!question) return [];
  if (isMultipleChoice(question)) return question.selectedOptionIds || [];
  return question.selectedOptionId ? [question.selectedOptionId] : [];
}

function formatScore(score, totalScore) {
  return `${Math.round(Number(score) || 0)}/${Math.round(Number(totalScore) || 0)}`;
}

function formatPassingScore(quizData) {
  return `${Math.round(Number(quizData?.passingScore) || 0)}/${Math.round(
    Number(quizData?.totalScore) || 0,
  )}`;
}

function buildSelections(questions = []) {
  return questions.reduce((acc, question) => {
    acc[question.id] = getQuestionSelectedIds(question);
    return acc;
  }, {});
}

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
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [quizError, setQuizError] = useState("");
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [selectedByQuestion, setSelectedByQuestion] = useState({});
  const autoStartedQuizRef = useRef("");

  const loadQuiz = useCallback(async () => {
    try {
      setLoadingQuiz(true);
      setQuizError("");
      setActiveQuestionIndex(0);

      const res = await getLearningQuiz(quizId);
      const data = res?.result || null;
      setQuizData(data);
      setSelectedByQuestion(buildSelections(data?.questions || []));
    } catch (error) {
      setQuizError(
        error?.body?.message || error?.message || "Không tải được quiz.",
      );
    } finally {
      setLoadingQuiz(false);
    }
  }, [getLearningQuiz, quizId]);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  const handleStartQuiz = useCallback(async () => {
    try {
      setStartingQuiz(true);
      setQuizError("");
      setActiveQuestionIndex(0);

      const res = await startLearningQuiz(quizId);
      const data = res?.result || null;
      setQuizData(data);
      setSelectedByQuestion(buildSelections(data?.questions || []));
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

  const questions = useMemo(() => quizData?.questions || [], [quizData]);
  const totalQuestions = questions.length;
  const safeQuestionIndex = Math.min(
    Math.max(activeQuestionIndex, 0),
    Math.max(totalQuestions - 1, 0),
  );
  const activeQuestion = questions[safeQuestionIndex] || null;
  const submitted =
    quizData?.attemptStatus === "SUBMITTED" || quizData?.attemptStatus === "GRADED";
  const canReviewAnswers = submitted && Boolean(quizData?.passed);
  const canAnswer = quizData?.attemptStatus === "IN_PROGRESS";
  const answeredCount = questions.filter(
    (question) => (selectedByQuestion[question.id] || []).length > 0,
  ).length;
  const allAnswered = totalQuestions > 0 && answeredCount === totalQuestions;

  const handleSelectOption = (question, optionId) => {
    if (!canAnswer || savingQuiz) return;

    setSelectedByQuestion((prev) => {
      const currentIds = prev[question.id] || [];
      const nextIds = isMultipleChoice(question)
        ? currentIds.includes(optionId)
          ? currentIds.filter((id) => id !== optionId)
          : [...currentIds, optionId]
        : [optionId];

      return {
        ...prev,
        [question.id]: nextIds,
      };
    });
  };

  const saveAllAnswers = async () => {
    let latestData = quizData;

    for (const question of questions) {
      const selectedIds = selectedByQuestion[question.id] || [];
      if (selectedIds.length === 0) continue;

      const payload = {
        questionId: question.id,
        selectedOptionId: isMultipleChoice(question) ? null : selectedIds[0],
        selectedOptionIds: isMultipleChoice(question) ? selectedIds : [],
      };

      const savedRes = await saveQuizAnswer(quizData.attemptId, payload);
      latestData = savedRes?.result || latestData;
    }

    return latestData;
  };

  const handleSubmit = async () => {
    if (!canAnswer || !quizData?.attemptId || !allAnswered || savingQuiz) return;

    try {
      setSavingQuiz(true);
      setQuizError("");

      await saveAllAnswers();
      const submitRes = await submitLearningQuiz(quizData.attemptId);
      const submittedData = submitRes?.result || quizData;
      setQuizData(submittedData);
      setSelectedByQuestion(buildSelections(submittedData.questions || []));

      if (submittedData.passed) {
        await onQuizSubmitted?.({ autoNavigate: false, skipSave: true });
      }
    } catch (error) {
      setQuizError(error?.body?.message || error?.message || "Không nộp được quiz.");
    } finally {
      setSavingQuiz(false);
    }
  };

  if (loadingQuiz || startingQuiz) {
    return <div className={styles.quizState}>Đang tải câu hỏi...</div>;
  }

  if (quizError) {
    return <div className={styles.quizError}>{quizError}</div>;
  }

  if (!quizData?.attemptId && !quizData?.attemptStatus) {
    return <div className={styles.quizState}>Đang mở quiz...</div>;
  }

  if (!activeQuestion) {
    return <div className={styles.quizState}>Quiz chưa có câu hỏi.</div>;
  }

  return (
    <div className={styles.quizSingle}>
      <div className={styles.quizSingleHead}>
        <div>
          <h3>{quizData.title || "Quiz"}</h3>
          <p>
            Câu {safeQuestionIndex + 1} / {totalQuestions}
            {submitted
              ? ` - Kết quả: ${formatScore(quizData.score, quizData.totalScore)}`
              : ` - Đã trả lời ${answeredCount}/${totalQuestions}`}
          </p>
        </div>

        <div className={styles.quizStepper}>
          {questions.map((question, index) => {
            const selected = (selectedByQuestion[question.id] || []).length > 0;
            const stepClass = [
              styles.quizStep,
              index === safeQuestionIndex ? styles.quizStepActive : "",
              selected ? styles.quizStepDone : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <button
                key={question.id}
                type="button"
                className={stepClass}
                onClick={() => setActiveQuestionIndex(index)}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={styles.quizRichText}
        dangerouslySetInnerHTML={{
          __html: DOMPurify.sanitize(activeQuestion.questionText || ""),
        }}
      />

      <div className={styles.quizOptionsSimple}>
        {(activeQuestion.options || []).map((option) => {
          const selectedIds = selectedByQuestion[activeQuestion.id] || [];
          const checked = selectedIds.includes(option.id);
          const isCorrectOption = isMultipleChoice(activeQuestion)
            ? (activeQuestion.correctOptionIds || []).includes(option.id)
            : activeQuestion.correctOptionId === option.id;
          const optionClasses = [
            styles.quizOptionSimple,
            checked ? styles.quizOptionSimpleSelected : "",
            canReviewAnswers && isCorrectOption ? styles.quizOptionSimpleCorrect : "",
            canReviewAnswers && checked && !isCorrectOption ? styles.quizOptionSimpleWrong : "",
          ]
            .filter(Boolean)
            .join(" ");

          if (submitted) {
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
              onClick={() => handleSelectOption(activeQuestion, option.id)}
              disabled={!canAnswer || savingQuiz}
            >
              {option.optionText}
            </button>
          );
        })}
      </div>

      {submitted ? (
        <div
          className={`${styles.quizExplanationPanel} ${
            canReviewAnswers ? "" : styles.quizReviewLocked
          }`}
        >
          <p
            className={
              quizData.passed
                ? styles.quizPassNote
                : styles.quizFailNote
            }
          >
            {quizData.passed
              ? "Bạn đã đạt yêu cầu và bài tiếp theo đã được mở."
              : `Bạn chưa đạt. Cần đúng tối thiểu ${formatPassingScore(quizData)} để mở bài tiếp theo.`}
          </p>

          <p className={styles.quizAnswerNote}>
            {activeQuestion.correct
              ? "Bạn đã chọn đáp án đúng."
              : "Đáp án của câu này chưa đúng."}
          </p>

          {canReviewAnswers && !activeQuestion.correct ? (
            <p className={styles.quizAnswerNote}>
              Đáp án đúng:{" "}
              <strong>
                {isMultipleChoice(activeQuestion)
                  ? (activeQuestion.correctOptionTexts || []).join(", ") || "Chưa có"
                  : activeQuestion.correctOptionText || "Chưa có"}
              </strong>
            </p>
          ) : null}

          {canReviewAnswers && activeQuestion.explanation ? (
            <>
              <h4>Giải thích</h4>
              <div
                className={`${styles.quizExplanationContent} ${styles.quizRichText}`}
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(activeQuestion.explanation || ""),
                }}
              />
            </>
          ) : null}
        </div>
      ) : !allAnswered ? (
        <p className={styles.quizAnswerNote}>
          Hãy trả lời đủ tất cả câu hỏi trước khi nộp bài.
        </p>
      ) : null}

      <div className={styles.quizSingleActions}>
        <button
          type="button"
          className={styles.quizGhostBtn}
          onClick={() => setActiveQuestionIndex((prev) => Math.max(prev - 1, 0))}
          disabled={safeQuestionIndex === 0 || savingQuiz}
        >
          Câu trước
        </button>

        {safeQuestionIndex < totalQuestions - 1 ? (
          <button
            type="button"
            className={styles.quizGhostBtn}
            onClick={() =>
              setActiveQuestionIndex((prev) =>
                Math.min(prev + 1, totalQuestions - 1),
              )
            }
            disabled={savingQuiz}
          >
            Câu tiếp theo
          </button>
        ) : null}

        {canAnswer ? (
          <button
            type="button"
            className={styles.quizPrimaryBtn}
            onClick={handleSubmit}
            disabled={!allAnswered || savingQuiz}
          >
            {savingQuiz ? "Đang nộp..." : "Nộp bài"}
          </button>
        ) : null}

        {submitted && !quizData.passed ? (
          <button
            type="button"
            className={styles.quizPrimaryBtn}
            onClick={handleStartQuiz}
            disabled={startingQuiz || savingQuiz}
          >
            {startingQuiz ? "Đang mở..." : "Làm lại"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
