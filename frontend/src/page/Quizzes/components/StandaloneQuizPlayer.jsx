import { useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { CheckCircle2, CircleHelp, RotateCcw } from "lucide-react";
import styles from "./StandaloneQuizPlayer.module.scss";

function formatScore(score, totalScore) {
  return `${Math.round(score || 0)}/${Math.round(totalScore || 0)}`;
}

function formatPercent(score, totalScore) {
  if (!totalScore) return "0%";
  return `${Math.round(((score || 0) / totalScore) * 100)}%`;
}

function formatAttemptStatus(status) {
  switch (status) {
    case "IN_PROGRESS":
      return "Đang làm";
    case "SUBMITTED":
      return "Đã nộp";
    case "GRADED":
      return "Đã chấm";
    default:
      return "Chưa bắt đầu";
  }
}

export default function StandaloneQuizPlayer({
  mode = "take",
  quizData,
  loading,
  error,
  starting,
  submitting,
  onStart,
  onSelectOption,
  onSubmit,
  onRetake,
}) {
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  const questions = useMemo(() => quizData?.questions || [], [quizData]);
  const totalQuestions = questions.length;
  const safeQuestionIndex = Math.min(
    Math.max(activeQuestionIndex, 0),
    Math.max(totalQuestions - 1, 0),
  );
  const activeQuestion = questions[safeQuestionIndex] || null;
  const canAnswer = mode === "take" && quizData?.attemptStatus === "IN_PROGRESS";
  const submitted =
    quizData?.attemptStatus === "SUBMITTED" ||
    quizData?.attemptStatus === "GRADED";
  const answeredCount = questions.filter((item) =>
    item.questionType === "MULTIPLE_CHOICE"
      ? (item.selectedOptionIds || []).length > 0
      : Boolean(item.selectedOptionId),
  ).length;
  const isLastQuestion = safeQuestionIndex === totalQuestions - 1;

  const handleOptionClick = (question, optionId) => {
    if (!onSelectOption) return;

    if (question.questionType === "MULTIPLE_CHOICE") {
      const currentIds = question.selectedOptionIds || [];
      const nextIds = currentIds.includes(optionId)
        ? currentIds.filter((id) => id !== optionId)
        : [...currentIds, optionId];
      onSelectOption(question.id, optionId, nextIds);
      return;
    }

    onSelectOption(question.id, optionId);
  };

  if (loading) {
    return <div className={styles.stateBox}>Đang tải bài kiểm tra...</div>;
  }

  if (error) {
    return <div className={styles.errorBox}>{error}</div>;
  }

  if (!quizData) {
    return <div className={styles.stateBox}>Không có dữ liệu bài kiểm tra.</div>;
  }

  if (!quizData.attemptId && mode === "take") {
    return (
      <div className={styles.startCard}>
        <div className={styles.startHeader}>
          <div>
            <span className={styles.sectionLabel}>Bài kiểm tra</span>
            <h1>{quizData.title}</h1>
            <p>
              {quizData.description ||
                "Làm bài theo từng câu, nộp bài và xem kết quả sau khi hoàn thành."}
            </p>
          </div>

          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}>
              <span>Câu hỏi</span>
              <strong>{totalQuestions}</strong>
            </div>
          </div>
        </div>

        <div className={styles.stepList}>
          <div className={styles.stepCard}>
            <CircleHelp size={18} />
            <div>
              <strong>1. Bắt đầu</strong>
              <p>Tạo một lượt làm mới hoặc tiếp tục lượt đang dở.</p>
            </div>
          </div>
          <div className={styles.stepCard}>
            <CheckCircle2 size={18} />
            <div>
              <strong>2. Trả lời từng câu</strong>
              <p>Chọn đáp án rồi chuyển qua câu tiếp theo.</p>
            </div>
          </div>
          <div className={styles.stepCard}>
            <RotateCcw size={18} />
            <div>
              <strong>3. Nộp bài</strong>
              <p>Kết quả và giải thích được lưu ở trang kết quả.</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          className={styles.primaryBtn}
          onClick={onStart}
          disabled={starting}
        >
          {starting ? "Đang bắt đầu..." : "Bắt đầu làm bài"}
        </button>
      </div>
    );
  }

  if (!activeQuestion) {
    return <div className={styles.stateBox}>Bài kiểm tra chưa có câu hỏi.</div>;
  }

  return (
    <div className={styles.player}>
      <div className={styles.headCard}>
        <div>
          <span className={styles.sectionLabel}>
            {mode === "review" ? "Xem lại kết quả" : "Đang làm bài"}
          </span>
          <h1>{quizData.title}</h1>
          <p>{quizData.description || "Chưa có mô tả."}</p>
        </div>

        <div className={styles.headMeta}>
          <div className={styles.metaItem}>
            <span>Đã trả lời</span>
            <strong>
              {answeredCount}/{totalQuestions}
            </strong>
          </div>
          <div className={styles.metaItem}>
            <span>Số câu đúng</span>
            <strong>{formatScore(quizData.score || 0, quizData.totalScore || 0)}</strong>
          </div>
          <div className={styles.metaItem}>
            <span>Tỷ lệ đúng</span>
            <strong>
              {formatPercent(quizData.score || 0, quizData.totalScore || 0)}
            </strong>
          </div>
        </div>
      </div>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          {canAnswer ? (
            <button
              type="button"
              className={styles.submitSidebarBtn}
              onClick={onSubmit}
              disabled={submitting}
            >
              {submitting ? "Đang nộp..." : "Nộp bài"}
            </button>
          ) : null}

          {!canAnswer && onRetake ? (
            <button
              type="button"
              className={styles.submitSidebarBtn}
              onClick={onRetake}
            >
              Làm lại bài
            </button>
          ) : null}

          <div className={styles.sidebarCard}>
            <div className={styles.sidebarTitle}>Câu hỏi</div>
            <div className={styles.questionNav}>
              {questions.map((question, index) => {
                const answered =
                  question.questionType === "MULTIPLE_CHOICE"
                    ? (question.selectedOptionIds || []).length > 0
                    : Boolean(question.selectedOptionId);
                const itemClass = [
                  styles.questionNavItem,
                  submitted && question.correct === true
                    ? styles.questionNavItemCorrect
                    : "",
                  submitted && question.correct === false
                    ? styles.questionNavItemWrong
                    : "",
                  index === safeQuestionIndex ? styles.questionNavItemActive : "",
                  answered ? styles.questionNavItemDone : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <button
                    key={question.id}
                    type="button"
                    className={itemClass}
                    onClick={() => setActiveQuestionIndex(index)}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.sidebarCard}>
            <div className={styles.sidebarTitle}>Tổng quan</div>
            <div className={styles.statRow}>
              <span>Trạng thái</span>
              <strong>{formatAttemptStatus(quizData.attemptStatus)}</strong>
            </div>
            <div className={styles.statRow}>
              <span>Số câu hỏi</span>
              <strong>{totalQuestions}</strong>
            </div>
            <div className={styles.statRow}>
              <span>Đã trả lời</span>
              <strong>{answeredCount}</strong>
            </div>
          </div>
        </aside>

        <section className={styles.content}>
          <div className={styles.questionCard}>
            <div className={styles.questionHeader}>
              <span>
                Câu {safeQuestionIndex + 1} / {totalQuestions}
              </span>
            </div>

            <div
              className={styles.richText}
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(activeQuestion.questionText || ""),
              }}
            />

            <div className={styles.optionList}>
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
                const optionClass = [
                  styles.optionItem,
                  checked ? styles.optionItemSelected : "",
                  revealCorrect ? styles.optionItemCorrect : "",
                  revealWrong ? styles.optionItemWrong : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                if (!canAnswer) {
                  return (
                    <div key={option.id} className={optionClass}>
                      {option.optionText}
                    </div>
                  );
                }

                return (
                  <button
                    key={option.id}
                    type="button"
                    className={optionClass}
                    onClick={() => handleOptionClick(activeQuestion, option.id)}
                  >
                    {option.optionText}
                  </button>
                );
              })}
            </div>
          </div>

          {submitted ? (
            <div className={styles.explainCard}>
              <h3>Giải thích</h3>
              {!activeQuestion.correct ? (
                <p className={styles.answerNote}>
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
                <p className={styles.answerNote}>Bạn đã chọn đáp án đúng.</p>
              )}

              {activeQuestion.explanation ? (
                <div
                  className={styles.richText}
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(activeQuestion.explanation || ""),
                  }}
                />
              ) : (
                <p className={styles.answerNote}>
                  Câu hỏi này chưa có giải thích.
                </p>
              )}
            </div>
          ) : null}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.ghostBtn}
              onClick={() =>
                setActiveQuestionIndex((prev) => Math.max(prev - 1, 0))
              }
              disabled={safeQuestionIndex === 0}
            >
              Câu trước
            </button>

            {canAnswer ? (
              <div className={styles.reviewActions}>
                {!isLastQuestion ? (
                  <button
                    type="button"
                    className={styles.ghostBtn}
                    onClick={() => setActiveQuestionIndex((prev) => prev + 1)}
                  >
                    Câu tiếp theo
                  </button>
                ) : null}
              </div>
            ) : (
              <div className={styles.reviewActions}>
                <button
                  type="button"
                  className={styles.ghostBtn}
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
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
