import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Trash2,
  CircleCheck,
  Save,
  FileQuestion,
} from "lucide-react";
import styles from "./QuizEditor.module.scss";
import { createQuiz, getQuiz, updateQuiz } from "../../api/quizApi";

const QUESTION_TYPES = {
  SINGLE_CHOICE: "SINGLE_CHOICE",
  MULTIPLE_CHOICE: "MULTIPLE_CHOICE",
  TRUE_FALSE: "TRUE_FALSE",
};

function createEmptyOption(content = "") {
  return {
    id: undefined,
    content,
    isCorrect: false,
  };
}

function createDefaultOptionsByType(questionType) {
  if (questionType === QUESTION_TYPES.TRUE_FALSE) {
    return [createEmptyOption("Đúng"), createEmptyOption("Sai")];
  }

  return [createEmptyOption(), createEmptyOption()];
}

function createEmptyQuestion() {
  return {
    id: undefined,
    content: "",
    questionType: QUESTION_TYPES.SINGLE_CHOICE,
    points: 1,
    orderIndex: 0,
    options: createDefaultOptionsByType(QUESTION_TYPES.SINGLE_CHOICE),
  };
}

function normalizeQuestion(rawQuestion, index) {
  const questionType =
    rawQuestion?.questionType || QUESTION_TYPES.SINGLE_CHOICE;

  let options = Array.isArray(rawQuestion?.options)
    ? rawQuestion.options.map((opt) => ({
        id: opt?.id,
        content: opt?.content || opt?.optionText || "",
        isCorrect: !!opt?.isCorrect,
      }))
    : [];

  if (questionType === QUESTION_TYPES.TRUE_FALSE) {
    const trueOption = options[0] || createEmptyOption("Đúng");
    const falseOption = options[1] || createEmptyOption("Sai");

    options = [
      {
        id: trueOption.id,
        content: trueOption.content || "Đúng",
        isCorrect: !!trueOption.isCorrect,
      },
      {
        id: falseOption.id,
        content: falseOption.content || "Sai",
        isCorrect: !!falseOption.isCorrect,
      },
    ];
  }

  if (options.length === 0) {
    options = createDefaultOptionsByType(questionType);
  }

  return {
    id: rawQuestion?.id,
    content: rawQuestion?.content || "",
    questionType,
    points: Number(rawQuestion?.points) || 1,
    orderIndex:
      typeof rawQuestion?.orderIndex === "number"
        ? rawQuestion.orderIndex
        : index,
    options,
  };
}

export default function QuizEditor() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const isCreateMode = useMemo(() => !quizId, [quizId]);
  const courseIdFromQuery = searchParams.get("courseId") || "";

  const [form, setForm] = useState({
    title: "",
    description: "",
    courseId: courseIdFromQuery,
    questions: [createEmptyQuestion()],
  });

  const [loading, setLoading] = useState(!isCreateMode);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    if (isCreateMode) {
      setLoading(false);
      setForm({
        title: "",
        description: "",
        courseId: courseIdFromQuery,
        questions: [createEmptyQuestion()],
      });
      return;
    }

    fetchQuiz();
  }, [quizId, isCreateMode, courseIdFromQuery]);

  const fetchQuiz = async () => {
    try {
      setLoading(true);
      setErrorText("");

      const res = await getQuiz(quizId);
      const data = res?.result || res;

      setForm({
        title: data?.title || "",
        description: data?.description || "",
        courseId: data?.courseId || "",
        questions:
          Array.isArray(data?.questions) && data.questions.length > 0
            ? data.questions.map((q, index) => normalizeQuestion(q, index))
            : [createEmptyQuestion()],
      });
    } catch (error) {
      setErrorText(
        error?.response?.data?.message ||
          error?.message ||
          "Không tải được quiz.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuizChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleQuestionChange = (qIndex, value) => {
    setForm((prev) => {
      const next = [...prev.questions];
      next[qIndex] = {
        ...next[qIndex],
        content: value,
      };
      return { ...prev, questions: next };
    });
  };

  const handleQuestionTypeChange = (qIndex, value) => {
    setForm((prev) => {
      const next = [...prev.questions];
      const oldQuestion = next[qIndex];

      next[qIndex] = {
        ...oldQuestion,
        questionType: value,
        options:
          value === QUESTION_TYPES.TRUE_FALSE
            ? [
                {
                  ...(oldQuestion.options?.[0] || createEmptyOption("Đúng")),
                  content: "Đúng",
                },
                {
                  ...(oldQuestion.options?.[1] || createEmptyOption("Sai")),
                  content: "Sai",
                },
              ]
            : Array.isArray(oldQuestion.options) &&
                oldQuestion.options.length > 0
              ? oldQuestion.options
              : createDefaultOptionsByType(value),
      };

      return { ...prev, questions: next };
    });
  };

  const handleQuestionPointsChange = (qIndex, value) => {
    setForm((prev) => {
      const next = [...prev.questions];
      next[qIndex] = {
        ...next[qIndex],
        points: Math.max(1, Number(value) || 1),
      };
      return { ...prev, questions: next };
    });
  };

  const handleOptionChange = (qIndex, oIndex, value) => {
    setForm((prev) => {
      const next = [...prev.questions];
      const question = next[qIndex];
      const nextOptions = Array.isArray(question.options)
        ? [...question.options]
        : [];

      nextOptions[oIndex] = {
        ...nextOptions[oIndex],
        content: value,
      };

      next[qIndex] = {
        ...question,
        options: nextOptions,
      };

      return { ...prev, questions: next };
    });
  };

  const handleCorrectOption = (qIndex, oIndex) => {
    setForm((prev) => {
      const next = [...prev.questions];
      const question = next[qIndex];
      const options = Array.isArray(question.options) ? question.options : [];

      if (question.questionType === QUESTION_TYPES.MULTIPLE_CHOICE) {
        next[qIndex] = {
          ...question,
          options: options.map((option, index) =>
            index === oIndex
              ? { ...option, isCorrect: !option.isCorrect }
              : option,
          ),
        };
      } else {
        next[qIndex] = {
          ...question,
          options: options.map((option, index) => ({
            ...option,
            isCorrect: index === oIndex,
          })),
        };
      }

      return { ...prev, questions: next };
    });
  };

  const addQuestion = () => {
    setForm((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          ...createEmptyQuestion(),
          orderIndex: prev.questions.length,
        },
      ],
    }));
  };

  const removeQuestion = (qIndex) => {
    setForm((prev) => {
      const remaining =
        prev.questions.length === 1
          ? [createEmptyQuestion()]
          : prev.questions.filter((_, index) => index !== qIndex);

      return {
        ...prev,
        questions: remaining.map((question, index) => ({
          ...question,
          orderIndex: index,
        })),
      };
    });
  };

  const addOption = (qIndex) => {
    setForm((prev) => {
      const next = [...prev.questions];
      const question = next[qIndex];

      if (question.questionType === QUESTION_TYPES.TRUE_FALSE) {
        return prev;
      }

      next[qIndex] = {
        ...question,
        options: [
          ...(Array.isArray(question.options) ? question.options : []),
          createEmptyOption(),
        ],
      };

      return { ...prev, questions: next };
    });
  };

  const removeOption = (qIndex, oIndex) => {
    setForm((prev) => {
      const next = [...prev.questions];
      const question = next[qIndex];

      if (question.questionType === QUESTION_TYPES.TRUE_FALSE) {
        return prev;
      }

      const currentOptions = Array.isArray(question.options)
        ? question.options
        : [];

      let nextOptions =
        currentOptions.length <= 2
          ? createDefaultOptionsByType(question.questionType)
          : currentOptions.filter((_, index) => index !== oIndex);

      next[qIndex] = {
        ...question,
        options: nextOptions,
      };

      return { ...prev, questions: next };
    });
  };

  const validateForm = () => {
    if (!form.title.trim()) {
      return "Vui lòng nhập tiêu đề quiz.";
    }

    if (!Array.isArray(form.questions) || form.questions.length === 0) {
      return "Quiz phải có ít nhất 1 câu hỏi.";
    }

    for (let i = 0; i < form.questions.length; i += 1) {
      const question = form.questions[i];

      if (!question.content.trim()) {
        return `Vui lòng nhập nội dung câu hỏi ${i + 1}.`;
      }

      if (!Array.isArray(question.options) || question.options.length < 2) {
        return `Câu hỏi ${i + 1} phải có ít nhất 2 lựa chọn.`;
      }

      const validOptions = question.options.filter((option) =>
        option.content.trim(),
      );

      if (validOptions.length < 2) {
        return `Câu hỏi ${i + 1} phải có ít nhất 2 lựa chọn có nội dung.`;
      }

      const correctCount = question.options.filter(
        (option) => !!option.isCorrect,
      ).length;

      if (question.questionType === QUESTION_TYPES.MULTIPLE_CHOICE) {
        if (correctCount < 1) {
          return `Câu hỏi ${i + 1} phải có ít nhất 1 đáp án đúng.`;
        }
      } else {
        if (correctCount !== 1) {
          return `Câu hỏi ${i + 1} phải có đúng 1 đáp án đúng.`;
        }
      }
    }

    return "";
  };

  const buildPayload = () => {
    return {
      title: form.title.trim(),
      description: form.description.trim(),
      courseId: form.courseId || null,
      questions: form.questions.map((question, index) => ({
        content: question.content.trim(),
        questionType: question.questionType,
        points: Math.max(1, Number(question.points) || 1),
        orderIndex: index,
        answers: (Array.isArray(question.options) ? question.options : [])
          .filter((option) => option.content.trim())
          .map((option) => ({
            content: option.content.trim(),
            isCorrect: !!option.isCorrect,
          })),
      })),
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setErrorText(validationError);
      return;
    }

    try {
      setSaving(true);
      setErrorText("");

      const payload = buildPayload();

      if (isCreateMode) {
        await createQuiz(payload);
      } else {
        await updateQuiz(quizId, payload);
      }

      navigate(-1);
    } catch (error) {
      setErrorText(
        error?.response?.data?.message ||
          error?.message ||
          "Lưu quiz thất bại.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className={styles.stateBox}>Đang tải quiz...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={18} />
          <span>Quay lại</span>
        </button>
      </div>

      <div className={styles.headerCard}>
        <div className={styles.headerIcon}>
          <FileQuestion size={26} />
        </div>

        <div className={styles.headerContent}>
          <h1>{isCreateMode ? "Tạo quiz mới" : "Chỉnh sửa quiz"}</h1>
          <p>
            {form.courseId
              ? "Quiz này đang được gắn với một khóa học."
              : "Quiz độc lập, không thuộc khóa học nào."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={styles.formWrap}>
        <div className={styles.mainCard}>
          <div className={styles.formGroup}>
            <label htmlFor="title">Tiêu đề quiz</label>
            <input
              id="title"
              name="title"
              value={form.title}
              onChange={handleQuizChange}
              placeholder="Ví dụ: Bài kiểm tra giữa kỳ"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">Mô tả</label>
            <textarea
              id="description"
              name="description"
              rows="3"
              value={form.description}
              onChange={handleQuizChange}
              placeholder="Nhập mô tả quiz..."
            />
          </div>
        </div>

        <div className={styles.questionSection}>
          <div className={styles.questionSectionHeader}>
            <div>
              <h2>Câu hỏi</h2>
              <p>{form.questions.length} câu hỏi</p>
            </div>

            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={addQuestion}
            >
              <Plus size={16} />
              <span>Thêm câu hỏi</span>
            </button>
          </div>

          {form.questions.map((question, qIndex) => (
            <div
              key={question.id || `question-${qIndex}`}
              className={styles.questionCard}
            >
              <div className={styles.questionTop}>
                <h3>Câu hỏi {qIndex + 1}</h3>

                <button
                  type="button"
                  className={styles.iconDangerBtn}
                  onClick={() => removeQuestion(qIndex)}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className={styles.formGroup}>
                <label>Nội dung câu hỏi</label>
                <input
                  value={question.content}
                  onChange={(e) => handleQuestionChange(qIndex, e.target.value)}
                  placeholder={`Nhập nội dung câu hỏi ${qIndex + 1}`}
                />
              </div>

              <div className={styles.row2col}>
                <div className={styles.formGroup}>
                  <label>Loại câu hỏi</label>
                  <select
                    value={question.questionType}
                    onChange={(e) =>
                      handleQuestionTypeChange(qIndex, e.target.value)
                    }
                  >
                    <option value={QUESTION_TYPES.SINGLE_CHOICE}>
                      1 đáp án đúng
                    </option>
                    <option value={QUESTION_TYPES.MULTIPLE_CHOICE}>
                      Nhiều đáp án đúng
                    </option>
                    <option value={QUESTION_TYPES.TRUE_FALSE}>
                      Đúng / Sai
                    </option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Điểm</label>
                  <input
                    type="number"
                    min="1"
                    value={question.points}
                    onChange={(e) =>
                      handleQuestionPointsChange(qIndex, e.target.value)
                    }
                  />
                </div>
              </div>

              <div className={styles.answerList}>
                {(Array.isArray(question.options) ? question.options : []).map(
                  (option, oIndex) => (
                    <div
                      key={option.id || `option-${qIndex}-${oIndex}`}
                      className={styles.answerRow}
                    >
                      <button
                        type="button"
                        className={`${styles.correctBtn} ${
                          option.isCorrect ? styles.correctBtnActive : ""
                        }`}
                        onClick={() => handleCorrectOption(qIndex, oIndex)}
                        title="Chọn đáp án đúng"
                      >
                        <CircleCheck size={18} />
                      </button>

                      <input
                        value={option.content}
                        onChange={(e) =>
                          handleOptionChange(qIndex, oIndex, e.target.value)
                        }
                        placeholder={`Lựa chọn ${oIndex + 1}`}
                        disabled={
                          question.questionType === QUESTION_TYPES.TRUE_FALSE
                        }
                      />

                      {question.questionType !== QUESTION_TYPES.TRUE_FALSE ? (
                        <button
                          type="button"
                          className={styles.iconDangerBtn}
                          onClick={() => removeOption(qIndex, oIndex)}
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <div style={{ width: 36 }} />
                      )}
                    </div>
                  ),
                )}
              </div>

              {question.questionType !== QUESTION_TYPES.TRUE_FALSE ? (
                <button
                  type="button"
                  className={styles.textBtn}
                  onClick={() => addOption(qIndex)}
                >
                  <Plus size={15} />
                  <span>Thêm lựa chọn</span>
                </button>
              ) : null}
            </div>
          ))}
        </div>

        {errorText ? <div className={styles.errorBox}>{errorText}</div> : null}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={() => navigate(-1)}
            disabled={saving}
          >
            Hủy
          </button>

          <button type="submit" className={styles.submitBtn} disabled={saving}>
            <Save size={16} />
            <span>
              {saving
                ? "Đang lưu..."
                : isCreateMode
                  ? "Tạo quiz"
                  : "Lưu thay đổi"}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
