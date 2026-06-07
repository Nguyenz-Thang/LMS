import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ChartColumn,
  Clock3,
  Download,
  Filter,
  GraduationCap,
  RefreshCw,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { getCourses } from "../../../api/courseApi";
import { useReportApi } from "../../../api/reportApi";
import { searchUsers } from "../../../api/userApi";
import styles from "./Reports.module.scss";

const emptyFilters = {
  fromDate: "",
  toDate: "",
  courseId: "",
  learnerId: "",
  instructorId: "",
  status: "",
};

function formatPercent(value) {
  return `${Number(value || 0).toFixed(0)}%`;
}

function formatHours(value) {
  return `${Number(value || 0).toFixed(1)} giờ`;
}

function formatDateTime(value) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
  return date.toLocaleString("vi-VN");
}

function formatStatus(value) {
  if (value === "ACTIVE") return "Đang học";
  if (value === "COMPLETED") return "Hoàn thành";
  if (value === "CANCELLED") return "Đã hủy";
  return value || "Chưa xác định";
}

function getDisplayName(user) {
  return user?.fullName || user?.username || user?.email || "Chưa đặt tên";
}

function getRoleName(user) {
  return user?.role?.name || user?.roleName || "";
}

function pickPageContent(response) {
  return response?.result?.content || response?.content || response?.result || [];
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function makeCell(value, styleId = "Text", type) {
  return { value, styleId, type };
}

function normalizeCell(cell) {
  if (cell && typeof cell === "object" && !Array.isArray(cell)) {
    return cell;
  }

  return { value: cell, styleId: typeof cell === "number" ? "Number" : "Text" };
}

function getCellType(cell) {
  if (cell.type) return cell.type;
  return typeof cell.value === "number" ? "Number" : "String";
}

function buildCell(cell) {
  const normalized = normalizeCell(cell);
  const style = normalized.styleId ? ` ss:StyleID="${escapeXml(normalized.styleId)}"` : "";
  const merge = normalized.mergeAcross ? ` ss:MergeAcross="${normalized.mergeAcross}"` : "";

  return `<Cell${style}${merge}><Data ss:Type="${getCellType(normalized)}">${escapeXml(
    normalized.value,
  )}</Data></Cell>`;
}

function buildWorksheet(name, rows, columns = []) {
  const columnXml = columns
    .map((width) => `<Column ss:AutoFitWidth="0" ss:Width="${width}"/>`)
    .join("");

  const body = rows
    .map((row) => {
      const rowConfig = Array.isArray(row) ? { cells: row } : row;
      const height = rowConfig.height ? ` ss:Height="${rowConfig.height}"` : "";
      return `<Row${height}>${rowConfig.cells.map(buildCell).join("")}</Row>`;
    })
    .join("");

  return `<Worksheet ss:Name="${escapeXml(name)}"><Table>${columnXml}${body}</Table>
<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
 <FreezePanes/><FrozenNoSplit/><SplitHorizontal>3</SplitHorizontal><TopRowBottomPane>3</TopRowBottomPane>
 <ProtectObjects>False</ProtectObjects><ProtectScenarios>False</ProtectScenarios>
</WorksheetOptions>
</Worksheet>`;
}

function downloadExcelWorkbook(filename, sheets) {
  const workbook = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
<Styles>
 <Style ss:ID="Default" ss:Name="Normal">
  <Alignment ss:Vertical="Center"/>
  <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#0F172A"/>
 </Style>
 <Style ss:ID="Title">
  <Alignment ss:Vertical="Center"/>
  <Font ss:FontName="Calibri" ss:Size="18" ss:Bold="1" ss:Color="#0F172A"/>
 </Style>
 <Style ss:ID="Subtitle">
  <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#64748B"/>
 </Style>
 <Style ss:ID="Section">
  <Interior ss:Color="#E0F2FE" ss:Pattern="Solid"/>
  <Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1" ss:Color="#075985"/>
 </Style>
 <Style ss:ID="Header">
  <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
  <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
  <Borders>
   <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
  </Borders>
 </Style>
 <Style ss:ID="MetaLabel">
  <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#475569"/>
 </Style>
 <Style ss:ID="MetaValue">
  <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#0F172A"/>
 </Style>
 <Style ss:ID="Text">
  <Alignment ss:Vertical="Center" ss:WrapText="1"/>
 </Style>
 <Style ss:ID="Number">
  <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
  <NumberFormat ss:Format="#,##0.00"/>
 </Style>
 <Style ss:ID="Integer">
  <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
  <NumberFormat ss:Format="#,##0"/>
 </Style>
 <Style ss:ID="Percent">
  <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
  <NumberFormat ss:Format="0.00"/>
 </Style>
</Styles>
${sheets.map((sheet) => buildWorksheet(sheet.name, sheet.rows, sheet.columns)).join("")}
</Workbook>`;

  const blob = new Blob([workbook], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const { getDashboard } = useReportApi();
  const [dashboard, setDashboard] = useState(null);
  const [filters, setFilters] = useState(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [courses, setCourses] = useState([]);
  const [learners, setLearners] = useState([]);
  const [instructors, setInstructors] = useState([]);

  const fetchDashboard = async (nextFilters = filters) => {
    try {
      setLoading(true);
      setErrorText("");
      const res = await getDashboard(nextFilters);
      setDashboard(res?.result || null);
    } catch (error) {
      setErrorText(
        error?.body?.message ||
          error?.message ||
          "Không tải được dữ liệu báo cáo.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard(emptyFilters);
  }, []);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        setOptionsLoading(true);
        const [courseRes, learnerRes, instructorRes] = await Promise.all([
          getCourses({ manageOnly: true, page: 0, size: 200 }),
          searchUsers({ role: "STUDENT", page: 0, size: 200 }),
          searchUsers({ role: "INSTRUCTOR", page: 0, size: 200 }),
        ]);

        setCourses(pickPageContent(courseRes));
        setLearners(pickPageContent(learnerRes));
        setInstructors(pickPageContent(instructorRes));
      } catch {
        setCourses([]);
        setLearners([]);
        setInstructors([]);
      } finally {
        setOptionsLoading(false);
      }
    };

    fetchFilterOptions();
  }, []);

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter((value) => String(value || "").trim()).length,
    [filters],
  );

  const summaryCards = useMemo(() => {
    const summary = dashboard?.summary || {};
    return [
      { key: "courses", label: "Khóa học", value: summary.totalCourses || 0, icon: BookOpen },
      { key: "learners", label: "Học viên", value: summary.totalLearners || 0, icon: Users },
      { key: "active", label: "Đang học", value: summary.activeEnrollments || 0, icon: GraduationCap },
      { key: "progress", label: "Tiến độ TB", value: formatPercent(summary.averageProgressPercent), icon: ChartColumn },
      { key: "hours", label: "Giờ học", value: formatHours(summary.totalLearningHours), icon: Clock3 },
      { key: "quizAttempts", label: "Lượt làm quiz", value: summary.totalQuizAttempts || 0, icon: Trophy },
    ];
  }, [dashboard]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleApplyFilters = (event) => {
    event.preventDefault();
    fetchDashboard(filters);
  };

  const handleResetFilters = () => {
    setFilters(emptyFilters);
    fetchDashboard(emptyFilters);
  };

  const handleExportExcel = () => {
    if (!dashboard) return;

    const summary = dashboard.summary || {};
    const generatedAt = new Date().toLocaleString("vi-VN");
    const selectedCourse =
      courses.find((item) => item.id === filters.courseId)?.title || "Tất cả";
    const selectedLearner =
      learners.find((item) => item.id === filters.learnerId)?.username || "Tất cả";
    const selectedInstructor =
      instructors.find((item) => item.id === filters.instructorId)?.username || "Tất cả";
    const selectedStatus = filters.status || "Tất cả";

    const titleRow = (title, mergeAcross = 7) => ({
      height: 28,
      cells: [{ value: title, styleId: "Title", mergeAcross }],
    });
    const subtitleRow = (text, mergeAcross = 7) => ({
      cells: [{ value: text, styleId: "Subtitle", mergeAcross }],
    });
    const sectionRow = (text, mergeAcross = 7) => ({
      height: 22,
      cells: [{ value: text, styleId: "Section", mergeAcross }],
    });
    const headerRow = (items) => ({
      height: 24,
      cells: items.map((item) => makeCell(item, "Header")),
    });
    const metaRow = (label, value) => [
      makeCell(label, "MetaLabel"),
      makeCell(value, "MetaValue"),
    ];
    const metricRow = (label, value, styleId = "Integer") => [
      makeCell(label, "Text"),
      makeCell(value, styleId, "Number"),
    ];

    const sheets = [
      {
        name: "Tong quan",
        columns: [210, 130, 150, 130, 130, 130, 130, 130],
        rows: [
          titleRow("Báo cáo học tập"),
          subtitleRow(`Thời gian xuất: ${generatedAt}`),
          [],
          sectionRow("Phạm vi thống kê"),
          metaRow("Từ ngày", filters.fromDate || "Tất cả"),
          metaRow("Đến ngày", filters.toDate || "Tất cả"),
          metaRow("Khóa học", selectedCourse),
          metaRow("Học viên", selectedLearner),
          metaRow("Giảng viên", selectedInstructor),
          metaRow("Trạng thái", selectedStatus),
          [],
          sectionRow("Chỉ số tổng quan"),
          headerRow(["Chỉ số", "Giá trị"]),
          metricRow("Khóa học", summary.totalCourses || 0),
          metricRow("Học viên", summary.totalLearners || 0),
          metricRow("Đang học", summary.activeEnrollments || 0),
          metricRow("Hoàn thành", summary.completedEnrollments || 0),
          metricRow("Tổng bài học", summary.totalLessons || 0),
          metricRow("Lượt làm quiz", summary.totalQuizAttempts || 0),
          metricRow("Tiến độ trung bình (%)", summary.averageProgressPercent || 0, "Percent"),
          metricRow("Giờ học", summary.totalLearningHours || 0, "Number"),
        ],
      },
      {
        name: "Khoa hoc",
        columns: [260, 190, 90, 90, 95, 120, 120, 100],
        rows: [
          titleRow("Hiệu quả theo khóa học"),
          subtitleRow("Số liệu đã áp dụng theo bộ lọc hiện tại"),
          [],
          headerRow(["Khóa học", "Giảng viên", "Ghi danh", "Đang học", "Hoàn thành", "Tiến độ TB (%)", "Điểm quiz TB (%)", "Giờ học"]),
          ...(dashboard.topCourses || []).map((course) => [
            makeCell(course.courseTitle || "", "Text"),
            makeCell(course.instructorName || "Chưa có", "Text"),
            makeCell(course.enrollmentCount || 0, "Integer", "Number"),
            makeCell(course.activeLearnerCount || 0, "Integer", "Number"),
            makeCell(course.completedLearnerCount || 0, "Integer", "Number"),
            makeCell(course.averageProgressPercent || 0, "Percent", "Number"),
            makeCell(course.averageQuizScorePercent || 0, "Percent", "Number"),
            makeCell(course.totalLearningHours || 0, "Number", "Number"),
          ]),
        ],
      },
      {
        name: "Hoc vien",
        columns: [170, 150, 240, 190, 120, 120, 120, 120, 100, 105, 110, 110, 110],
        rows: [
          titleRow("Chi tiết học viên", 12),
          subtitleRow("Toàn bộ học viên/ghi danh phù hợp với bộ lọc hiện tại", 12),
          [],
          headerRow([
            "Học viên",
            "Tài khoản",
            "Khóa học",
            "Giảng viên",
            "Trạng thái",
            "Ngày ghi danh",
            "Truy cập gần nhất",
            "Tiến độ (%)",
            "Bài hoàn thành",
            "Tổng bài",
            "Lượt quiz",
            "Điểm quiz TB (%)",
            "Giờ học",
          ]),
          ...(dashboard.learners || []).map((learner) => [
            makeCell(learner.learnerName || "", "Text"),
            makeCell(learner.username || "", "Text"),
            makeCell(learner.courseTitle || "", "Text"),
            makeCell(learner.instructorName || "", "Text"),
            makeCell(formatStatus(learner.status), "Text"),
            makeCell(formatDateTime(learner.enrolledAt), "Text"),
            makeCell(formatDateTime(learner.lastAccessedAt), "Text"),
            makeCell(learner.progressPercent || 0, "Percent", "Number"),
            makeCell(learner.completedLessons || 0, "Integer", "Number"),
            makeCell(learner.totalLessons || 0, "Integer", "Number"),
            makeCell(learner.quizAttemptCount || 0, "Integer", "Number"),
            makeCell(learner.averageQuizScorePercent || 0, "Percent", "Number"),
            makeCell(learner.learningHours || 0, "Number", "Number"),
          ]),
        ],
      },
    ];

    if (dashboard.scope === "ADMIN") {
      sheets.push({
        name: "Giang vien",
        columns: [240, 120, 120, 130],
        rows: [
          titleRow("Hiệu quả theo giảng viên", 3),
          subtitleRow("Tổng hợp theo số khóa học, học viên và tiến độ", 3),
          [],
          headerRow(["Giảng viên", "Số khóa học", "Số học viên", "Tiến độ TB (%)"]),
          ...(dashboard.topInstructors || []).map((instructor) => [
            makeCell(instructor.instructorName || "", "Text"),
            makeCell(instructor.courseCount || 0, "Integer", "Number"),
            makeCell(instructor.learnerCount || 0, "Integer", "Number"),
            makeCell(instructor.averageProgressPercent || 0, "Percent", "Number"),
          ]),
        ],
      });
    }

    downloadExcelWorkbook(
      `bao-cao-hoc-tap-${new Date().toISOString().slice(0, 10)}.xls`,
      sheets,
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.headerBar}>
        <div>
          <div className={styles.breadcrumb}>Quản trị \ Báo cáo</div>
          <h1>Báo cáo học tập</h1>
          <p>
            Tùy chỉnh phạm vi thống kê theo thời gian, khóa học, học viên,
            giảng viên và trạng thái ghi danh.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.exportBtn}
            onClick={handleExportExcel}
            disabled={!dashboard || loading}
          >
            <Download size={16} />
            <span>Xuất Excel</span>
          </button>
          <button
            type="button"
            className={styles.refreshBtn}
            onClick={() => fetchDashboard(filters)}
          >
            <RefreshCw size={16} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      <form className={styles.filterPanel} onSubmit={handleApplyFilters}>
        <div className={styles.filterTitle}>
          <Filter size={17} />
          <strong>Bộ lọc thống kê</strong>
          {activeFilterCount > 0 ? <span>{activeFilterCount} điều kiện</span> : null}
        </div>

        <div className={styles.filterGrid}>
          <label>
            <span>Từ ngày</span>
            <input
              type="date"
              name="fromDate"
              value={filters.fromDate}
              onChange={handleFilterChange}
            />
          </label>

          <label>
            <span>Đến ngày</span>
            <input
              type="date"
              name="toDate"
              value={filters.toDate}
              onChange={handleFilterChange}
            />
          </label>

          <label>
            <span>Khóa học</span>
            <select name="courseId" value={filters.courseId} onChange={handleFilterChange}>
              <option value="">Tất cả khóa học</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Học viên</span>
            <select name="learnerId" value={filters.learnerId} onChange={handleFilterChange}>
              <option value="">Tất cả học viên</option>
              {learners.map((learner) => (
                <option key={learner.id} value={learner.id}>
                  {getDisplayName(learner)} ({learner.username})
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Giảng viên</span>
            <select
              name="instructorId"
              value={filters.instructorId}
              onChange={handleFilterChange}
              disabled={dashboard?.scope !== "ADMIN"}
            >
              <option value="">
                {dashboard?.scope === "ADMIN" ? "Tất cả giảng viên" : "Giảng viên hiện tại"}
              </option>
              {instructors
                .filter((user) => getRoleName(user) === "INSTRUCTOR" || !getRoleName(user))
                .map((instructor) => (
                  <option key={instructor.id} value={instructor.id}>
                    {getDisplayName(instructor)} ({instructor.username})
                  </option>
                ))}
            </select>
          </label>

          <label>
            <span>Trạng thái</span>
            <select name="status" value={filters.status} onChange={handleFilterChange}>
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang học</option>
              <option value="COMPLETED">Hoàn thành</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </label>
        </div>

        <div className={styles.filterActions}>
          <button type="submit" className={styles.applyBtn} disabled={loading}>
            Áp dụng
          </button>
          <button
            type="button"
            className={styles.clearBtn}
            onClick={handleResetFilters}
            disabled={loading || activeFilterCount === 0}
          >
            <X size={15} />
            <span>Đặt lại</span>
          </button>
          {optionsLoading ? <span className={styles.optionHint}>Đang tải danh sách lọc...</span> : null}
        </div>
      </form>

      {loading ? (
        <div className={styles.stateBox}>Đang tải báo cáo...</div>
      ) : errorText ? (
        <div className={styles.errorBox}>{errorText}</div>
      ) : !dashboard ? (
        <div className={styles.stateBox}>Chưa có dữ liệu báo cáo.</div>
      ) : (
        <>
          <div className={styles.summaryGrid}>
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.key} className={styles.summaryCard}>
                  <Icon size={17} />
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                </div>
              );
            })}
          </div>

          <div className={styles.tablePanel}>
            <div className={styles.panelHead}>
              <div>
                <h2>Học viên</h2>
                <span>Danh sách ghi danh phù hợp với bộ lọc hiện tại</span>
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Học viên</th>
                    <th>Khóa học</th>
                    <th>Giảng viên</th>
                    <th>Trạng thái</th>
                    <th>Tiến độ</th>
                    <th>Bài học</th>
                    <th>Quiz</th>
                    <th>Điểm quiz TB</th>
                    <th>Giờ học</th>
                    <th>Truy cập gần nhất</th>
                  </tr>
                </thead>
                <tbody>
                  {(dashboard.learners || []).length === 0 ? (
                    <tr>
                      <td colSpan="10" className={styles.emptyCell}>
                        Không có học viên phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    dashboard.learners.map((learner) => (
                      <tr key={`${learner.courseId}-${learner.userId}`}>
                        <td>
                          <strong>{learner.learnerName}</strong>
                          <div className={styles.subText}>{learner.username}</div>
                        </td>
                        <td>{learner.courseTitle}</td>
                        <td>{learner.instructorName || "Chưa có"}</td>
                        <td>{formatStatus(learner.status)}</td>
                        <td>{formatPercent(learner.progressPercent)}</td>
                        <td>
                          {(learner.completedLessons || 0)}/{learner.totalLessons || 0}
                        </td>
                        <td>{learner.quizAttemptCount || 0}</td>
                        <td>{formatPercent(learner.averageQuizScorePercent)}</td>
                        <td>{formatHours(learner.learningHours)}</td>
                        <td>{formatDateTime(learner.lastAccessedAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.tablePanel}>
            <div className={styles.panelHead}>
              <div>
                <h2>Khóa học</h2>
                <span>Số liệu theo bộ lọc hiện tại</span>
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Khóa học</th>
                    <th>Giảng viên</th>
                    <th>Ghi danh</th>
                    <th>Đang học</th>
                    <th>Hoàn thành</th>
                    <th>Tiến độ TB</th>
                    <th>Điểm quiz TB</th>
                    <th>Giờ học</th>
                  </tr>
                </thead>
                <tbody>
                  {(dashboard.topCourses || []).length === 0 ? (
                    <tr>
                      <td colSpan="8" className={styles.emptyCell}>
                        Không có khóa học phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    dashboard.topCourses.map((course) => (
                      <tr key={course.courseId}>
                        <td>{course.courseTitle}</td>
                        <td>{course.instructorName || "Chưa có"}</td>
                        <td>{course.enrollmentCount || 0}</td>
                        <td>{course.activeLearnerCount || 0}</td>
                        <td>{course.completedLearnerCount || 0}</td>
                        <td>{formatPercent(course.averageProgressPercent)}</td>
                        <td>{formatPercent(course.averageQuizScorePercent)}</td>
                        <td>{formatHours(course.totalLearningHours)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {dashboard.scope === "ADMIN" ? (
            <div className={styles.tablePanel}>
              <div className={styles.panelHead}>
                <div>
                  <h2>Giảng viên</h2>
                  <span>Theo quy mô lớp học và tiến độ trung bình</span>
                </div>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Giảng viên</th>
                      <th>Số khóa học</th>
                      <th>Số học viên</th>
                      <th>Tiến độ TB</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboard.topInstructors || []).length === 0 ? (
                      <tr>
                        <td colSpan="4" className={styles.emptyCell}>
                          Không có dữ liệu giảng viên trong phạm vi này.
                        </td>
                      </tr>
                    ) : (
                      dashboard.topInstructors.map((instructor) => (
                        <tr key={instructor.instructorId}>
                          <td>{instructor.instructorName}</td>
                          <td>{instructor.courseCount || 0}</td>
                          <td>{instructor.learnerCount || 0}</td>
                          <td>{formatPercent(instructor.averageProgressPercent)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
