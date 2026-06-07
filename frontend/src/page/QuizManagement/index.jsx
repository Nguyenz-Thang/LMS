import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  EyeOff,
  FileQuestion,
  Filter,
  Link2,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import {
  deleteQuiz,
  getAllQuizzes,
  publishQuiz,
  unpublishQuiz,
} from "../../api/quizApi";
import styles from "./QuizManagement.module.scss";

const TYPE_OPTIONS = {
  ALL: "Tất cả loại bài kiểm tra",
  INDEPENDENT: "Bài kiểm tra độc lập",
  COURSE: "Thuộc khóa học",
};

function formatNumber(value) {
  return Number(value || 0).toLocaleString("vi-VN");
}

function formatTimeLimit(minutes) {
  const safeMinutes = Number(minutes) || 0;
  return safeMinutes > 0 ? `${safeMinutes} phút` : "Không giới hạn";
}

export default function QuizManagement() {
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [copiedId, setCopiedId] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [errorText, setErrorText] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorText("");
      const res = await getAllQuizzes();
      setQuizzes(Array.isArray(res?.result) ? res.result : []);
    } catch (error) {
      console.error("Fetch quizzes error:", error);
      setQuizzes([]);
      setErrorText("Không tải được danh sách bài kiểm tra.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredQuizzes = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return quizzes.filter((quiz) => {
      const title = quiz?.title?.toLowerCase() || "";
      const description = quiz?.description?.toLowerCase() || "";
      const matchesKeyword =
        !normalizedKeyword ||
        title.includes(normalizedKeyword) ||
        description.includes(normalizedKeyword);

      const matchesType =
        typeFilter === "ALL" ||
        (typeFilter === "INDEPENDENT" && !quiz.courseId) ||
        (typeFilter === "COURSE" && !!quiz.courseId);

      return matchesKeyword && matchesType;
    });
  }, [quizzes, keyword, typeFilter]);

  const resetFilters = () => {
    setKeyword("");
    setTypeFilter("ALL");
  };

  const totalAttempts = useMemo(
    () =>
      quizzes.reduce(
        (total, quiz) => total + Number(quiz.attemptCount || 0),
        0,
      ),
    [quizzes],
  );

  const handleDelete = async (quiz) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa bài kiểm tra "${quiz.title}"?`,
    );
    if (!confirmed) return;

    try {
      setUpdatingId(quiz.id);
      setErrorText("");
      await deleteQuiz(quiz.id);
      await fetchData();
    } catch (error) {
      console.error("Delete quiz error:", error);
      setErrorText(
        error?.response?.data?.message ||
          error?.message ||
          "Xóa bài kiểm tra thất bại.",
      );
    } finally {
      setUpdatingId("");
    }
  };

  const handleCopyLink = async (quiz) => {
    try {
      const link = `${window.location.origin}/quizzes/${quiz.id}/take`;
      await navigator.clipboard.writeText(link);
      setCopiedId(quiz.id);

      window.setTimeout(() => {
        setCopiedId("");
      }, 1500);
    } catch (error) {
      console.error("Copy link error:", error);
      setErrorText("Không thể sao chép liên kết làm bài.");
    }
  };

  const handleTogglePublish = async (quiz) => {
    try {
      setUpdatingId(quiz.id);
      setErrorText("");

      if (quiz.isPublished) {
        await unpublishQuiz(quiz.id);
      } else {
        await publishQuiz(quiz.id);
      }

      await fetchData();
    } catch (error) {
      console.error("Toggle publish quiz error:", error);
      setErrorText("Không cập nhật được trạng thái bài kiểm tra.");
    } finally {
      setUpdatingId("");
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.headerBar}>
        <div>
          <div className={styles.breadcrumb}>Quản trị \ Quiz</div>
          <h1>Quản lí bài kiểm tra</h1>
          <p>Theo dõi, chỉnh sửa và chia sẻ bài kiểm tra trong hệ thống.</p>
        </div>

        <button
          type="button"
          className={styles.addBtn}
          onClick={() => navigate("/admin/quizzes/new")}
        >
          <Plus size={18} />
          <span>Thêm bài kiểm tra</span>
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Tìm tiêu đề hoặc mô tả bài kiểm tra..."
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>

        <div className={styles.filterBox}>
          <Filter size={16} />
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            aria-label="Lọc loại bài kiểm tra"
          >
            {Object.entries(TYPE_OPTIONS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className={styles.resetBtn}
          onClick={resetFilters}
          title="Đặt lại bộ lọc"
          aria-label="Đặt lại bộ lọc"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {errorText ? <div className={styles.errorBox}>{errorText}</div> : null}

      <div className={styles.listHeader}>
        <div>
          <h2>Danh sách bài kiểm tra</h2>
          <p>
            Hiển thị {filteredQuizzes.length} / {quizzes.length} bài, tổng{" "}
            {formatNumber(totalAttempts)} lượt làm.
          </p>
        </div>
      </div>

      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.stateBox}>
            Đang tải danh sách bài kiểm tra...
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <div className={styles.stateBox}>
            Không có bài kiểm tra phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.quizTable}>
              <thead>
                <tr>
                  <th>Bài kiểm tra</th>
                  <th>Mô tả</th>
                  <th>Loại</th>
                  <th>Thời gian</th>
                  <th>Lượt làm</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {filteredQuizzes.map((quiz) => (
                  <tr key={quiz.id}>
                    <td>
                      <div className={styles.quizCell}>
                        <span className={styles.quizIcon}>
                          <FileQuestion size={17} />
                        </span>
                        <div className={styles.quizInfo}>
                          <strong>{quiz.title || "Chưa đặt tiêu đề"}</strong>
                          <span>{quiz.id}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className={styles.descriptionText}>
                        {quiz.description || "Chưa có mô tả"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={
                          quiz.courseId ? styles.typeCourse : styles.typeIndependent
                        }
                      >
                        {quiz.courseId ? "Thuộc khóa học" : "Bài độc lập"}
                      </span>
                    </td>

                    <td>{formatTimeLimit(quiz.timeLimitMinutes)}</td>

                    <td>
                      <button
                        type="button"
                        className={styles.attemptCell}
                        onClick={() => navigate(`/admin/quizzes/${quiz.id}/attempts`)}
                        title="Xem người đã làm bài"
                        aria-label="Xem người đã làm bài"
                      >
                        {formatNumber(quiz.attemptCount)}
                      </button>
                    </td>

                    <td>
                      <span
                        className={
                          quiz.isPublished
                            ? styles.statusPublished
                            : styles.statusDraft
                        }
                        title={quiz.isPublished ? "Đã công khai" : "Bản nháp"}
                      >
                        {quiz.isPublished ? <Check size={15} /> : <EyeOff size={15} />}
                        {quiz.isPublished ? "Đã công khai" : "Bản nháp"}
                      </span>
                    </td>

                    <td>
                      <div className={styles.actionGroup}>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          onClick={() => navigate(`/admin/quizzes/${quiz.id}/edit`)}
                          title="Sửa bài kiểm tra"
                          aria-label="Sửa bài kiểm tra"
                        >
                          <Pencil size={16} />
                        </button>

                        {!quiz.courseId ? (
                          <button
                            type="button"
                            className={styles.iconBtn}
                            onClick={() => handleTogglePublish(quiz)}
                            disabled={updatingId === quiz.id}
                            title={
                              quiz.isPublished
                                ? "Ẩn bài kiểm tra"
                                : "Công khai bài kiểm tra"
                            }
                            aria-label={
                              quiz.isPublished
                                ? "Ẩn bài kiểm tra"
                                : "Công khai bài kiểm tra"
                            }
                          >
                            {quiz.isPublished ? (
                              <EyeOff size={16} />
                            ) : (
                              <Send size={16} />
                            )}
                          </button>
                        ) : null}

                        {!quiz.courseId ? (
                          <button
                            type="button"
                            className={`${styles.iconBtn} ${
                              copiedId === quiz.id ? styles.successAction : ""
                            }`}
                            onClick={() => handleCopyLink(quiz)}
                            title={
                              copiedId === quiz.id
                                ? "Đã sao chép liên kết"
                                : "Sao chép liên kết làm bài"
                            }
                            aria-label={
                              copiedId === quiz.id
                                ? "Đã sao chép liên kết"
                                : "Sao chép liên kết làm bài"
                            }
                          >
                            {copiedId === quiz.id ? (
                              <Check size={16} />
                            ) : (
                              <Link2 size={16} />
                            )}
                          </button>
                        ) : null}

                        <button
                          type="button"
                          className={`${styles.iconBtn} ${styles.deleteAction}`}
                          onClick={() => handleDelete(quiz)}
                          disabled={updatingId === quiz.id}
                          title="Xóa bài kiểm tra"
                          aria-label="Xóa bài kiểm tra"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
