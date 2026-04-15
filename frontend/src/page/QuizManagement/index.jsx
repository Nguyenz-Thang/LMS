import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileQuestion,
  Plus,
  Search,
  Pencil,
  Trash2,
  Copy,
  RefreshCw,
  Filter,
} from "lucide-react";
import { getAllQuizzes, deleteQuiz } from "../../api/quizApi";
import styles from "./QuizManagement.module.scss";

export default function QuizManagement() {
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [copiedId, setCopiedId] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await getAllQuizzes();
      setQuizzes(res?.result || []);
    } catch (error) {
      console.error("Fetch quizzes error:", error);
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
      const matchesKeyword =
        !normalizedKeyword ||
        quiz?.title?.toLowerCase().includes(normalizedKeyword) ||
        quiz?.description?.toLowerCase().includes(normalizedKeyword);

      const matchesType =
        typeFilter === "ALL" ||
        (typeFilter === "INDEPENDENT" && !quiz.courseId) ||
        (typeFilter === "COURSE" && !!quiz.courseId);

      return matchesKeyword && matchesType;
    });
  }, [quizzes, keyword, typeFilter]);

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Bạn có chắc muốn xóa quiz này không?");
    if (!confirmed) return;

    try {
      await deleteQuiz(id);
      await fetchData();
    } catch (error) {
      console.error("Delete quiz error:", error);
    }
  };

  const handleCopyLink = async (quiz) => {
    try {
      const link = `${window.location.origin}/quizzes/${quiz.id}/take`;
      await navigator.clipboard.writeText(link);
      setCopiedId(quiz.id);

      setTimeout(() => {
        setCopiedId("");
      }, 1500);
    } catch (error) {
      console.error("Copy link error:", error);
      alert("Không thể copy link.");
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.headerCard}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <FileQuestion size={24} />
          </div>

          <div>
            <h1>Quản lý quiz</h1>
            <p>
              Quản lý danh sách quiz, tìm kiếm, chỉnh sửa và chia sẻ quiz độc
              lập.
            </p>
          </div>
        </div>

        <button
          type="button"
          className={styles.primaryBtn}
          onClick={() => navigate("/admin/quizzes/new")}
        >
          <Plus size={16} />
          <span>Tạo quiz</span>
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Tìm theo tiêu đề hoặc mô tả..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        <div className={styles.filterBox}>
          <div className={styles.filterLabel}>
            <Filter size={16} />
            <span>Loại</span>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="ALL">Tất cả</option>
            <option value="INDEPENDENT">Quiz độc lập</option>
            <option value="COURSE">Thuộc khóa học</option>
          </select>
        </div>

        <button type="button" className={styles.refreshBtn} onClick={fetchData}>
          <RefreshCw size={16} />
          <span>Làm mới</span>
        </button>
      </div>

      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <span>Tổng quiz</span>
          <strong>{quizzes.length}</strong>
        </div>

        <div className={styles.summaryCard}>
          <span>Quiz độc lập</span>
          <strong>{quizzes.filter((q) => !q.courseId).length}</strong>
        </div>

        <div className={styles.summaryCard}>
          <span>Theo khóa học</span>
          <strong>{quizzes.filter((q) => !!q.courseId).length}</strong>
        </div>

        <div className={styles.summaryCard}>
          <span>Kết quả hiển thị</span>
          <strong>{filteredQuizzes.length}</strong>
        </div>
      </div>

      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.stateBox}>Đang tải danh sách quiz...</div>
        ) : filteredQuizzes.length === 0 ? (
          <div className={styles.stateBox}>Không có quiz nào phù hợp.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: "70px" }}>STT</th>
                  <th>Tiêu đề</th>
                  <th>Mô tả</th>
                  <th style={{ width: "170px" }}>Loại</th>
                  <th style={{ width: "150px" }}>Trạng thái</th>
                  <th style={{ width: "270px" }}>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {filteredQuizzes.map((quiz, index) => (
                  <tr key={quiz.id}>
                    <td>{index + 1}</td>

                    <td>
                      <div className={styles.titleCell}>
                        <span className={styles.titleText}>{quiz.title}</span>
                        <span className={styles.idText}>{quiz.id}</span>
                      </div>
                    </td>

                    <td>
                      <span className={styles.descriptionText}>
                        {quiz.description || "Không có mô tả"}
                      </span>
                    </td>

                    <td>
                      {!quiz.courseId ? (
                        <span className={styles.typeIndependent}>
                          Quiz độc lập
                        </span>
                      ) : (
                        <span className={styles.typeCourse}>
                          Thuộc khóa học
                        </span>
                      )}
                    </td>

                    <td>
                      {quiz.isPublished ? (
                        <span className={styles.statusPublished}>
                          Đã publish
                        </span>
                      ) : (
                        <span className={styles.statusDraft}>Bản nháp</span>
                      )}
                    </td>

                    <td>
                      <div className={styles.actionGroup}>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          onClick={() =>
                            navigate(`/admin/quizzes/${quiz.id}/edit`)
                          }
                          title="Chỉnh sửa"
                        >
                          <Pencil size={16} />
                          <span>Sửa</span>
                        </button>

                        {!quiz.courseId && (
                          <button
                            type="button"
                            className={styles.iconBtn}
                            onClick={() => handleCopyLink(quiz)}
                            title="Copy link làm quiz"
                          >
                            <Copy size={16} />
                            <span>
                              {copiedId === quiz.id ? "Đã copy" : "Copy link"}
                            </span>
                          </button>
                        )}

                        <button
                          type="button"
                          className={styles.dangerBtn}
                          onClick={() => handleDelete(quiz.id)}
                          title="Xóa quiz"
                        >
                          <Trash2 size={16} />
                          <span>Xóa</span>
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
