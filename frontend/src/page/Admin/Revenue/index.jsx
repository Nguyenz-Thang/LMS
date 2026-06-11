import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  XCircle,
} from "lucide-react";
import {
  getPaymentTransactions,
  getRevenueDashboard,
} from "../../../api/paymentApi";
import styles from "./Revenue.module.scss";
import LoadingSpinner from "../../../components/LoadingSpinner";

const STATUS_OPTIONS = [
  { value: "ALL", label: "Tất cả trạng thái" },
  { value: "PENDING", label: "Đang chờ" },
  { value: "PAID", label: "Đã thanh toán" },
  { value: "FAILED", label: "Thất bại" },
  { value: "CANCELLED", label: "Đã hủy" },
];

function formatMoney(value, currency = "VND") {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: currency || "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateTime(value) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getStatusMeta(status) {
  if (status === "PAID") {
    return { label: "Đã thanh toán", className: "statusPaid", icon: CheckCircle2 };
  }

  if (status === "FAILED") {
    return { label: "Thất bại", className: "statusFailed", icon: XCircle };
  }

  if (status === "CANCELLED") {
    return { label: "Đã hủy", className: "statusCancelled", icon: XCircle };
  }

  return { label: "Đang chờ", className: "statusPending", icon: Clock3 };
}

function normalizeTransaction(raw) {
  return {
    id: raw?.id || "",
    paymentCode: raw?.paymentCode || "",
    username: raw?.username || "Không xác định",
    fullName: raw?.fullName || "",
    email: raw?.email || "",
    courseTitle: raw?.courseTitle || "Khóa học không xác định",
    instructorName: raw?.instructorName || "Chưa có",
    amount: raw?.amount || 0,
    currency: raw?.currency || "VND",
    provider: raw?.provider || "N/A",
    status: raw?.status || "PENDING",
    bankName: raw?.bankName || "",
    referenceCode: raw?.referenceCode || "",
    sepayTransactionId: raw?.sepayTransactionId || "",
    createdAt: raw?.createdAt || null,
    paidAt: raw?.paidAt || null,
  };
}

export default function RevenueManagement() {
  const [dashboard, setDashboard] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [pageInfo, setPageInfo] = useState({
    page: 0,
    size: 10,
    totalElements: 0,
    totalPages: 0,
  });
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  const fetchDashboard = async () => {
    const res = await getRevenueDashboard();
    setDashboard(res?.result || null);
  };

  const fetchTransactions = async (nextPage = pageInfo.page) => {
    const res = await getPaymentTransactions({
      status: statusFilter,
      keyword,
      page: nextPage,
      size: pageInfo.size,
    });
    const result = res?.result || {};
    setTransactions((result.content || []).map(normalizeTransaction));
    setPageInfo({
      page: result.page || 0,
      size: result.size || pageInfo.size,
      totalElements: result.totalElements || 0,
      totalPages: result.totalPages || 0,
    });
  };

  const refreshData = async (nextPage = pageInfo.page) => {
    try {
      setLoading(true);
      setErrorText("");
      await Promise.all([fetchDashboard(), fetchTransactions(nextPage)]);
    } catch (error) {
      setTransactions([]);
      setErrorText(
        error?.response?.data?.message ||
          error?.message ||
          "Không tải được dữ liệu doanh thu và giao dịch.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refreshData(0);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [statusFilter, keyword]);

  const summaryCards = useMemo(() => {
    const data = dashboard || {};
    return [
      {
        key: "total",
        label: "Tổng doanh thu",
        value: formatMoney(data.totalRevenue),
        icon: CircleDollarSign,
      },
      {
        key: "today",
        label: "Doanh thu hôm nay",
        value: formatMoney(data.revenueToday),
        icon: CalendarDays,
      },
      {
        key: "month",
        label: "Doanh thu tháng này",
        value: formatMoney(data.revenueThisMonth),
        icon: CalendarDays,
      },
      {
        key: "paid",
        label: "Đơn đã thanh toán",
        value: data.paidTransactions || 0,
        icon: CheckCircle2,
      },
      {
        key: "pending",
        label: "Đơn đang chờ",
        value: data.pendingTransactions || 0,
        icon: Clock3,
      },
      {
        key: "conversion",
        label: "Tỷ lệ thanh toán",
        value: `${Number(data.conversionRatePercent || 0).toFixed(1)}%`,
        icon: CreditCard,
      },
    ];
  }, [dashboard]);

  const resetFilters = () => {
    setKeyword("");
    setStatusFilter("ALL");
  };

  const goToPage = (nextPage) => {
    if (nextPage < 0 || nextPage >= pageInfo.totalPages) return;
    refreshData(nextPage);
  };

  return (
    <div className={styles.page}>
      <div className={styles.headerBar}>
        <div>
          <div className={styles.breadcrumb}>Quản trị \ Doanh thu</div>
          <h1>Quản lý doanh thu và thanh toán</h1>
          <p>
            Theo dõi doanh thu bán khóa học, trạng thái giao dịch và hiệu quả
            thanh toán.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button type="button" className={styles.refreshBtn} onClick={() => refreshData()}>
            <RefreshCw size={16} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {errorText ? <div className={styles.errorBox}>{errorText}</div> : null}

      <div className={styles.summaryGrid}>
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.key} className={styles.summaryCard}>
              <Icon size={18} />
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </div>
          );
        })}
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Tìm mã thanh toán, học viên, email, khóa học..."
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>

        <div className={styles.filterBox}>
          <SlidersHorizontal size={16} />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Lọc trạng thái thanh toán"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
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

      <div className={styles.tablePanel}>
        <div className={styles.panelHead}>
          <h2>Danh sách giao dịch</h2>
          <span>{pageInfo.totalElements} giao dịch phù hợp</span>
        </div>

        {loading ? (
          <LoadingSpinner text="Đang tải dữ liệu thanh toán..." />
        ) : transactions.length === 0 ? (
          <div className={styles.stateBox}>
            Không có giao dịch phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Giao dịch</th>
                  <th>Học viên</th>
                  <th>Khóa học</th>
                  <th>Số tiền</th>
                  <th>Trạng thái</th>
                  <th>Ngân hàng</th>
                  <th>Tạo lúc</th>
                  <th>Thanh toán lúc</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => {
                  const statusMeta = getStatusMeta(transaction.status);
                  const StatusIcon = statusMeta.icon;

                  return (
                    <tr key={transaction.id}>
                      <td>
                        <div className={styles.codeCell}>
                          <Banknote size={16} />
                          <div>
                            <strong>{transaction.paymentCode}</strong>
                            <span>
                              {transaction.sepayTransactionId ||
                                transaction.referenceCode ||
                                transaction.provider}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className={styles.textCell}>
                          <strong>{transaction.fullName || transaction.username}</strong>
                          <span>{transaction.email || transaction.username}</span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.textCell}>
                          <strong>{transaction.courseTitle}</strong>
                          <span>{transaction.instructorName}</span>
                        </div>
                      </td>
                      <td className={styles.moneyCell}>
                        {formatMoney(transaction.amount, transaction.currency)}
                      </td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            styles[statusMeta.className]
                          }`}
                        >
                          <StatusIcon size={15} />
                          {statusMeta.label}
                        </span>
                      </td>
                      <td>{transaction.bankName || "N/A"}</td>
                      <td>{formatDateTime(transaction.createdAt)}</td>
                      <td>{formatDateTime(transaction.paidAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className={styles.pagination}>
          <button
            type="button"
            onClick={() => goToPage(pageInfo.page - 1)}
            disabled={pageInfo.page <= 0 || loading}
          >
            Trước
          </button>
          <span>
            Trang {pageInfo.totalPages === 0 ? 0 : pageInfo.page + 1} /{" "}
            {pageInfo.totalPages}
          </span>
          <button
            type="button"
            onClick={() => goToPage(pageInfo.page + 1)}
            disabled={pageInfo.page + 1 >= pageInfo.totalPages || loading}
          >
            Sau
          </button>
        </div>
      </div>
    </div>
  );
}
