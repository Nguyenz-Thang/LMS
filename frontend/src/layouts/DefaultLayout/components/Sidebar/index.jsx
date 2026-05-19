import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Clock3,
  User,
  FolderKanban,
  Users,
  UserCog,
  KeyRound,
  ShieldCheck,
  ChartColumn,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Trophy,
  Library,
  MessageSquare,
  Bot,
} from "lucide-react";
import { useMemo, useState, useContext } from "react";
import { AuthContext } from "../../../../context/AuthContext";
import styles from "./Sidebar.module.scss";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState({
    learning: true,
    courseManagement: true,
    userManagement: false,
    system: false,
  });

  const { hasRole } = useContext(AuthContext);

  const toggleMenu = (key) => {
    if (collapsed) return;
    setOpenMenus((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const learningItems = useMemo(
    () => [
      {
        label: "Khóa học",
        to: "/courses",
        icon: BookOpen,
      },
      {
        label: "Khóa học của tôi",
        to: "/my-courses",
        icon: GraduationCap,
      },
      {
        label: "Tiến độ học",
        to: "/progress",
        icon: Clock3,
      },
      {
        label: "Quiz",
        to: "/quizzes",
        icon: ClipboardCheck,
      },
      {
        label: "Kết quả quiz",
        to: "/quiz-results",
        icon: Trophy,
      },
      {
        label: "Thảo luận",
        to: "/discussions",
        icon: MessageSquare,
      },
      {
        label: "Chatbot AI",
        to: "/chatbot",
        icon: Bot,
      },
    ],
    [],
  );

  const courseManagementItems = useMemo(
    () =>
      [
        {
          label: "Quản lý khóa học",
          to: "/admin/courses",
          icon: FolderKanban,
          roles: ["ADMIN", "INSTRUCTOR"],
        },
        {
          label: "Loại / danh mục khóa học",
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
        // {
        //   label: "Quản lý lesson",
        //   to: "/admin/lessons",
        //   icon: Layers3,
        //   roles: ["ADMIN", "INSTRUCTOR"],
        // },
        {
          label: "Quản lý đăng ký học",
          to: "/admin/enrollments",
          icon: ShieldCheck,
          roles: ["ADMIN", "INSTRUCTOR"],
        },
      ].filter((item) => {
        if (!item.roles) return true;
        return item.roles.some((role) => hasRole(role));
      }),
    [hasRole],
  );

  const userManagementItems = useMemo(
    () =>
      [
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
        // {
        //   label: "Quản lý quyền",
        //   to: "/admin/permissions",
        //   icon: KeyRound,
        //   roles: ["ADMIN"],
        // },
      ].filter((item) => {
        if (!item.roles) return true;
        return item.roles.some((role) => hasRole(role));
      }),
    [hasRole],
  );

  const systemItems = useMemo(
    () =>
      [
        {
          label: "Báo cáo - thống kê",
          to: "/admin/reports",
          icon: ChartColumn,
          roles: ["ADMIN", "INSTRUCTOR"],
        },
        {
          label: "Cài đặt hệ thống",
          to: "/admin/settings",
          icon: Settings,
          roles: ["ADMIN"],
        },
      ].filter((item) => {
        if (!item.roles) return true;
        return item.roles.some((role) => hasRole(role));
      }),
    [hasRole],
  );

  const renderNavItem = (item) => {
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
  };

  const renderGroup = (key, title, items) => {
    if (!items.length) return null;

    return (
      <div className={styles.group}>
        <button
          type="button"
          className={styles.groupToggle}
          onClick={() => toggleMenu(key)}
        >
          <div className={styles.groupToggleLeft}>
            <span className={styles.groupTitle}>{title}</span>
          </div>

          {!collapsed && (
            <span className={styles.groupChevron}>
              {openMenus[key] ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </span>
          )}
        </button>

        {(openMenus[key] || collapsed) && (
          <div className={styles.groupItems}>{items.map(renderNavItem)}</div>
        )}
      </div>
    );
  };

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
      <div className={styles.top}>
        <button
          type="button"
          className={styles.toggleBtn}
          onClick={() => setCollapsed((prev) => !prev)}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <div className={styles.menu}>
        <div className={styles.mainQuickLinks}>
          <NavLink
            to="/home"
            className={({ isActive }) =>
              `${styles.item} ${styles.primaryItem} ${isActive ? styles.active : ""}`
            }
          >
            <span className={styles.iconWrap}>
              <LayoutDashboard size={19} strokeWidth={2.1} />
            </span>
            <span className={styles.label}>Tổng quan</span>
          </NavLink>

          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `${styles.item} ${isActive ? styles.active : ""}`
            }
          >
            <span className={styles.iconWrap}>
              <User size={19} strokeWidth={2.1} />
            </span>
            <span className={styles.label}>Thông tin cá nhân</span>
          </NavLink>
        </div>

        {renderGroup("learning", "Học tập", learningItems)}
        {renderGroup(
          "courseManagement",
          "Quản lý khóa học",
          courseManagementItems,
        )}
        {renderGroup(
          "userManagement",
          "Quản lý người dùng",
          userManagementItems,
        )}
        {renderGroup("system", "Hệ thống", systemItems)}
      </div>
    </aside>
  );
}
