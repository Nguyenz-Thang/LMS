import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  ClipboardList,
  Clock3,
  Eye,
  Filter,
  RefreshCw,
  RotateCcw,
  Search,
} from "lucide-react";
import { useAssignmentApi } from "../../../api/assignmentApi";
import styles from "./AssignmentManagement.module.scss";

const STATUS_OPTIONS = {
  ALL: "Tất cả trạng thái",
  PENDING: "Còn bài chưa chấm",
  GRADED: "Đã chấm hết",
  EMPTY: "Chưa có bài nộp",
};

function formatNumber(value) {
  return Number(value || 0).toLocaleString("vi-VN");
}

function formatDateTime(value) {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có";
  return date.toLocaleString("vi-VN");
}

function getCompletionPercent(item) {
  const total = Number(item.totalSubmitted || 0);
  if (total <= 0) return 0;
  return Math.round((Number(item.gradedCount || 0) / total) * 100);
}

export default function AssignmentManagement() {
  const navigate = useNavigate();
  const { listAssignmentSummaries } = useAssignmentApi();

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [errorText, setErrorText] = useState("");

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      setErrorText("");
      const res = await listAssignmentSummaries();
      setAssignments(Array.isArray(res?.result) ? res.result : []);
    } catch (error) {
      setAssignments([]);
      setErrorText(
        error?.body?.message ||
          error?.message ||
          "Không tải được danh sách bài nộp.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const filteredAssignments = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return assignments.filter((item) => {
      const matchesKeyword =
        !normalizedKeyword ||
        item.assignmentTitle?.toLowerCase().includes(normalizedKeyword) ||
        item.courseTitle?.toLowerCase().includes(normalizedKeyword) ||
        item.lessonTitle?.toLowerCase().includes(normalizedKeyword) ||
        item.instructorName?.toLowerCase().includes(normalizedKeyword);

      const pendingCount = Number(item.pendingCount || 0);
      const totalSubmitted = Number(item.totalSubmitted || 0);
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "PENDING" && pendingCount > 0) ||
        (statusFilter === "GRADED" && totalSubmitted > 0 && pendingCount === 0) ||
        (statusFilter === "EMPTY" && totalSubmitted === 0);

      return matchesKeyword && matchesStatus;
    });
  }, [assignments, keyword, statusFilter]);

  const totals = useMemo(
    () =>
      assignments.reduce(
        (acc, item) => ({
          assignmentCount: acc.assignmentCount + 1,
          totalSubmitted: acc.totalSubmitted + Number(item.totalSubmitted || 0),
          gradedCount: acc.gradedCount + Number(item.gradedCount || 0),
          pendingCount: acc.pendingCount + Number(item.pendingCount || 0),
        }),
        {
          assignmentCount: 0,
          totalSubmitted: 0,
          gradedCount: 0,
          pendingCount: 0,
        },
      ),
    [assignments],
  );

  const resetFilters = () => {
    setKeyword("");
    setStatusFilter("ALL");
  };

  return (
    <div className={styles.page}>
      <div className={styles.headerBar}>
        <div>
          <div className={styles.breadcrumb}>Quản trị \ Bài nộp</div>
          <h1>Quản lí bài nộp</h1>
          <p>
            Theo dõi bài tập theo khóa học, số bài đã chấm, số bài đang chờ và
            mở nhanh màn hình chấm điểm.
          </p>
        </div>

        <button type="button" className={styles.refreshBtn} onClick={fetchAssignments}>
          <RefreshCw size={16} />
          <span>Làm mới</span>
        </button>
      </div>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <ClipboardList size={17} />
          <span>Bài tập</span>
          <strong>{formatNumber(totals.assignmentCount)}</strong>
        </div>
        <div className={styles.summaryCard}>
          <ClipboardList size={17} />
          <span>Bài đã nộp</span>
          <strong>{formatNumber(totals.totalSubmitted)}</strong>
        </div>
        <div className={styles.summaryCard}>
          <CheckCircle2 size={17} />
          <span>Đã chấm</span>
          <strong>{formatNumber(totals.gradedCount)}</strong>
        </div>
        <div className={styles.summaryCard}>
          <Clock3 size={17} />
          <span>Chưa chấm</span>
          <strong>{formatNumber(totals.pendingCount)}</strong>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Tìm khóa học, bài tập, bài học, giảng viên..."
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>

        <div className={styles.filterBox}>
          <Filter size={16} />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Lọc trạng thái chấm bài"
          >
            {Object.entries(STATUS_OPTIONS).map(([value, label]) => (
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

      <div className={styles.tablePanel}>
        <div className={styles.panelHead}>
          <div>
            <h2>Danh sách bài tập</h2>
            <span>
              Hiển thị {filteredAssignments.length} / {assignments.length} bài tập.
            </span>
          </div>
        </div>

        {loading ? (
          <div className={styles.stateBox}>Đang tải danh sách bài nộp...</div>
        ) : filteredAssignments.length === 0 ? (
          <div className={styles.stateBox}>Không có bài tập phù hợp.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Khóa học</th>
                  <th>Bài tập</th>
                  <th>Giảng viên</th>
                  <th>Bài nộp</th>
                  <th>Đã chấm</th>
                  <th>Chưa chấm</th>
                  <th>Tiến độ</th>
                  <th>Nộp gần nhất</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.map((item) => (
                  <tr key={item.assignmentId}>
                    <td>
                      <div className={styles.primaryCell}>
                        <strong>{item.courseTitle || "Chưa có khóa học"}</strong>
                        <span>{item.courseId}</span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.primaryCell}>
                        <strong>{item.assignmentTitle || "Bài tập"}</strong>
                        <span>{item.lessonTitle || item.assignmentType || "Bài học"}</span>
                      </div>
                    </td>
                    <td>{item.instructorName || "Chưa có"}</td>
                    <td>{formatNumber(item.totalSubmitted)}</td>
                    <td>
                      <span className={styles.gradedText}>
                        {formatNumber(item.gradedCount)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={
                          Number(item.pendingCount || 0) > 0
                            ? styles.pendingText
                            : styles.mutedText
                        }
                      >
                        {formatNumber(item.pendingCount)}
                      </span>
                    </td>
                    <td>
                      <div className={styles.progressCell}>
                        <span>{getCompletionPercent(item)}%</span>
                        <div className={styles.progressTrack}>
                          <div
                            className={styles.progressFill}
                            style={{ width: `${getCompletionPercent(item)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>{formatDateTime(item.lastSubmittedAt)}</td>
                    <td>
                      <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() =>
                          navigate(`/admin/assignments/${item.assignmentId}/submissions`)
                        }
                        title="Xem và chấm bài nộp"
                        aria-label="Xem và chấm bài nộp"
                      >
                        <Eye size={16} />
                      </button>
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
