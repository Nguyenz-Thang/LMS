import { useContext, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  FileCheck2,
  FolderKanban,
  Library,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import { AuthContext } from "../../../../context/AuthContext";
import logo from "../../../../assets/img/logo.png";
import styles from "./AdminSidebar.module.scss";

export default function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { hasRole } = useContext(AuthContext);

  const navItems = useMemo(
    () =>
      [
        {
          label: "Quản lý khóa học",
          to: "/admin/courses",
          icon: FolderKanban,
          roles: ["ADMIN", "INSTRUCTOR"],
        },
        {
          label: "Quản lý danh mục",
          to: "/admin/categories",
          icon: Library,
          roles: ["ADMIN", "INSTRUCTOR"],
        },
        {
          label: "Quản lý quiz",
          to: "/admin/quizzes",
          icon: ClipboardCheck,
          roles: ["ADMIN", "INSTRUCTOR"],
        },
        {
          label: "Quản lý bài nộp",
          to: "/admin/assignments",
          icon: FileCheck2,
          roles: ["ADMIN", "INSTRUCTOR"],
        },
        {
          label: "Quản lý đăng ký học",
          to: "/admin/enrollments",
          icon: ShieldCheck,
          roles: ["ADMIN", "INSTRUCTOR"],
        },
        {
          label: "Quản lý doanh thu",
          to: "/admin/revenue",
          icon: CircleDollarSign,
          roles: ["ADMIN", "INSTRUCTOR"],
        },
        {
          label: "Báo cáo - thống kê",
          to: "/admin/reports",
          icon: BarChart3,
          roles: ["ADMIN", "INSTRUCTOR"],
        },
        {
          label: "Quản lý người dùng",
          to: "/admin/users",
          icon: Users,
          roles: ["ADMIN"],
        },
        {
          label: "Quản lý vai trò",
          to: "/admin/roles",
          icon: UserCog,
          roles: ["ADMIN"],
        },
      ].filter((item) => item.roles.some((role) => hasRole(role))),
    [hasRole],
  );

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
      <div className={styles.head}>
        <div className={styles.sectionTitle}>
          <img src={logo} alt="LMS Logo" className={styles.sectionLogo} />
          <span>LMS Admin</span>
        </div>

        <button
          type="button"
          className={styles.toggleBtn}
          onClick={() => setCollapsed((prev) => !prev)}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className={styles.nav}>
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `${styles.item} ${isActive ? styles.active : ""}`
              }
            >
              <span className={styles.iconWrap}>
                <Icon size={19} strokeWidth={2.1} />
              </span>
              <span className={styles.label}>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
