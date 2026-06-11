import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ChartColumn,
  Clock3,
  Download,
  GraduationCap,
  Search,
  RefreshCw,
  Trophy,
  Users,
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

const tablePageSize = 10;

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

function normalizeSearch(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function containsKeyword(item, fields, keyword) {
  const normalizedKeyword = normalizeSearch(keyword);
  if (!normalizedKeyword) return true;

  return fields
    .map((field) => (typeof field === "function" ? field(item) : item?.[field]))
    .some((value) => normalizeSearch(value).includes(normalizedKeyword));
}

function paginateRows(rows, page, pageSize = tablePageSize) {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const startIndex = (safePage - 1) * pageSize;

  return {
    page: safePage,
    totalPages,
    rows: rows.slice(startIndex, startIndex + pageSize),
    startIndex,
  };
}

function TableSearch({ value, onChange, placeholder }) {
  return (
    <label className={styles.tableSearch}>
      <Search size={16} />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function SectionFilters({ children, onApply, onReset }) {
  return (
    <div className={styles.sectionFilters}>
      {children}
      <button type="button" className={styles.miniApplyBtn} onClick={onApply}>
        Áp dụng
      </button>
      <button type="button" className={styles.miniClearBtn} onClick={onReset}>
        Đặt lại
      </button>
    </div>
  );
}

function DateInput({ label, value, onChange }) {
  return (
    <label>
      <span>{label}</span>
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Pagination({ page, totalPages, totalItems, startIndex, visibleCount, onPageChange }) {
  if (totalItems <= tablePageSize) return null;

  const endIndex = Math.min(startIndex + visibleCount, totalItems);

  return (
    <div className={styles.pagination}>
      <span>
        Hiển thị {startIndex + 1}-{endIndex} / {totalItems}
      </span>
      <div>
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Trước
        </button>
        <strong>
          {page}/{totalPages}
        </strong>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Sau
        </button>
      </div>
    </div>
  );
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
  const filters = emptyFilters;
  const [loading, setLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [courses, setCourses] = useState([]);
  const [learners, setLearners] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [reportLearners, setReportLearners] = useState([]);
  const [reportCourses, setReportCourses] = useState([]);
  const [reportInstructors, setReportInstructors] = useState([]);
  const [learnerTableFilters, setLearnerTableFilters] = useState({
    fromDate: "",
    toDate: "",
    status: "",
  });
  const [courseTableFilters, setCourseTableFilters] = useState({
    fromDate: "",
    toDate: "",
    instructorId: "",
  });
  const [instructorTableFilters, setInstructorTableFilters] = useState({
    fromDate: "",
    toDate: "",
  });
  const [learnerSearch, setLearnerSearch] = useState("");
  const [courseSearch, setCourseSearch] = useState("");
  const [instructorSearch, setInstructorSearch] = useState("");
  const [learnerPage, setLearnerPage] = useState(1);
  const [coursePage, setCoursePage] = useState(1);
  const [instructorPage, setInstructorPage] = useState(1);

  const fetchDashboard = async (nextFilters = filters) => {
    try {
      setLoading(true);
      setErrorText("");
      const res = await getDashboard(nextFilters);
      const data = res?.result || null;
      setDashboard(data);
      setReportLearners(data?.learners || []);
      setReportCourses(data?.topCourses || []);
      setReportInstructors(data?.topInstructors || []);
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

  const fetchSectionData = async (section, sectionFilters) => {
    try {
      const res = await getDashboard({ ...emptyFilters, ...sectionFilters });
      const data = res?.result || null;

      if (section === "learners") {
        setReportLearners(data?.learners || []);
      }
      if (section === "courses") {
        setReportCourses(data?.topCourses || []);
      }
      if (section === "instructors") {
        setReportInstructors(data?.topInstructors || []);
      }
    } catch (error) {
      setErrorText(
        error?.body?.message ||
          error?.message ||
          "Không tải được dữ liệu báo cáo.",
      );
    }
  };

  const filteredReportLearners = useMemo(
    () =>
      reportLearners.filter((learner) =>
        containsKeyword(
          learner,
          ["learnerName", "username", "courseTitle", "instructorName", "status"],
          learnerSearch,
        ),
      ),
    [reportLearners, learnerSearch],
  );

  const filteredReportCourses = useMemo(
    () =>
      reportCourses.filter((course) =>
        containsKeyword(course, ["courseTitle", "instructorName"], courseSearch),
      ),
    [reportCourses, courseSearch],
  );

  const filteredReportInstructors = useMemo(
    () =>
      reportInstructors.filter((instructor) =>
        containsKeyword(instructor, ["instructorName"], instructorSearch),
      ),
    [reportInstructors, instructorSearch],
  );

  const learnerPageData = useMemo(
    () => paginateRows(filteredReportLearners, learnerPage),
    [filteredReportLearners, learnerPage],
  );

  const coursePageData = useMemo(
    () => paginateRows(filteredReportCourses, coursePage),
    [filteredReportCourses, coursePage],
  );

  const instructorPageData = useMemo(
    () => paginateRows(filteredReportInstructors, instructorPage),
    [filteredReportInstructors, instructorPage],
  );

  useEffect(() => {
    setLearnerPage(1);
  }, [learnerSearch, dashboard]);

  useEffect(() => {
    setCoursePage(1);
  }, [courseSearch, dashboard]);

  useEffect(() => {
    setInstructorPage(1);
  }, [instructorSearch, dashboard]);

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
              <TableSearch
                value={learnerSearch}
                onChange={setLearnerSearch}
                placeholder="Tìm học viên, khóa học..."
              />
              <SectionFilters
                onApply={() => fetchSectionData("learners", learnerTableFilters)}
                onReset={() => {
                  const nextFilters = { fromDate: "", toDate: "", status: "" };
                  setLearnerTableFilters(nextFilters);
                  fetchSectionData("learners", nextFilters);
                }}
              >
                <DateInput
                  label="Từ ngày"
                  value={learnerTableFilters.fromDate}
                  onChange={(value) =>
                    setLearnerTableFilters((prev) => ({ ...prev, fromDate: value }))
                  }
                />
                <DateInput
                  label="Đến ngày"
                  value={learnerTableFilters.toDate}
                  onChange={(value) =>
                    setLearnerTableFilters((prev) => ({ ...prev, toDate: value }))
                  }
                />
                <label>
                  <span>Trạng thái</span>
                  <select
                    value={learnerTableFilters.status}
                    onChange={(event) =>
                      setLearnerTableFilters((prev) => ({
                        ...prev,
                        status: event.target.value,
                      }))
                    }
                  >
                    <option value="">Tất cả</option>
                    <option value="ACTIVE">Đang học</option>
                    <option value="COMPLETED">Hoàn thành</option>
                    <option value="CANCELLED">Đã hủy</option>
                  </select>
                </label>
              </SectionFilters>
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
                  {filteredReportLearners.length === 0 ? (
                    <tr>
                      <td colSpan="10" className={styles.emptyCell}>
                        Không có học viên phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    learnerPageData.rows.map((learner) => (
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
            <Pagination
              page={learnerPageData.page}
              totalPages={learnerPageData.totalPages}
              totalItems={filteredReportLearners.length}
              startIndex={learnerPageData.startIndex}
              visibleCount={learnerPageData.rows.length}
              onPageChange={setLearnerPage}
            />
          </div>

          <div className={styles.tablePanel}>
            <div className={styles.panelHead}>
              <div>
                <h2>Khóa học</h2>
                <span>Số liệu theo bộ lọc hiện tại</span>
              </div>
              <TableSearch
                value={courseSearch}
                onChange={setCourseSearch}
                placeholder="Tìm khóa học, giảng viên..."
              />
              <SectionFilters
                onApply={() => fetchSectionData("courses", courseTableFilters)}
                onReset={() => {
                  const nextFilters = { fromDate: "", toDate: "", instructorId: "" };
                  setCourseTableFilters(nextFilters);
                  fetchSectionData("courses", nextFilters);
                }}
              >
                <DateInput
                  label="Từ ngày"
                  value={courseTableFilters.fromDate}
                  onChange={(value) =>
                    setCourseTableFilters((prev) => ({ ...prev, fromDate: value }))
                  }
                />
                <DateInput
                  label="Đến ngày"
                  value={courseTableFilters.toDate}
                  onChange={(value) =>
                    setCourseTableFilters((prev) => ({ ...prev, toDate: value }))
                  }
                />
                <label>
                  <span>Giảng viên</span>
                  <select
                    value={courseTableFilters.instructorId}
                    onChange={(event) =>
                      setCourseTableFilters((prev) => ({
                        ...prev,
                        instructorId: event.target.value,
                      }))
                    }
                    disabled={dashboard?.scope !== "ADMIN"}
                  >
                    <option value="">
                      {dashboard?.scope === "ADMIN" ? "Tất cả" : "Hiện tại"}
                    </option>
                    {instructors
                      .filter((user) => getRoleName(user) === "INSTRUCTOR" || !getRoleName(user))
                      .map((instructor) => (
                        <option key={instructor.id} value={instructor.id}>
                          {getDisplayName(instructor)}
                        </option>
                      ))}
                  </select>
                </label>
              </SectionFilters>
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
                  {filteredReportCourses.length === 0 ? (
                    <tr>
                      <td colSpan="8" className={styles.emptyCell}>
                        Không có khóa học phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    coursePageData.rows.map((course) => (
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
            <Pagination
              page={coursePageData.page}
              totalPages={coursePageData.totalPages}
              totalItems={filteredReportCourses.length}
              startIndex={coursePageData.startIndex}
              visibleCount={coursePageData.rows.length}
              onPageChange={setCoursePage}
            />
          </div>

          {dashboard.scope === "ADMIN" ? (
            <div className={styles.tablePanel}>
              <div className={styles.panelHead}>
                <div>
                  <h2>Giảng viên</h2>
                  <span>Theo quy mô lớp học và tiến độ trung bình</span>
                </div>
                <TableSearch
                  value={instructorSearch}
                  onChange={setInstructorSearch}
                  placeholder="Tìm giảng viên..."
                />
                <SectionFilters
                  onApply={() => fetchSectionData("instructors", instructorTableFilters)}
                  onReset={() => {
                    const nextFilters = { fromDate: "", toDate: "" };
                    setInstructorTableFilters(nextFilters);
                    fetchSectionData("instructors", nextFilters);
                  }}
                >
                  <DateInput
                    label="Từ ngày"
                    value={instructorTableFilters.fromDate}
                    onChange={(value) =>
                      setInstructorTableFilters((prev) => ({ ...prev, fromDate: value }))
                    }
                  />
                  <DateInput
                    label="Đến ngày"
                    value={instructorTableFilters.toDate}
                    onChange={(value) =>
                      setInstructorTableFilters((prev) => ({ ...prev, toDate: value }))
                    }
                  />
                </SectionFilters>
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
                    {filteredReportInstructors.length === 0 ? (
                      <tr>
                        <td colSpan="4" className={styles.emptyCell}>
                          Không có dữ liệu giảng viên trong phạm vi này.
                        </td>
                      </tr>
                    ) : (
                      instructorPageData.rows.map((instructor) => (
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
              <Pagination
                page={instructorPageData.page}
                totalPages={instructorPageData.totalPages}
                totalItems={filteredReportInstructors.length}
                startIndex={instructorPageData.startIndex}
                visibleCount={instructorPageData.rows.length}
                onPageChange={setInstructorPage}
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
