import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Bot,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardCheck,
  Clock3,
  GraduationCap,
  LayoutDashboard,
  Trophy,
  User,
} from "lucide-react";
import styles from "./Sidebar.module.scss";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState({
    learning: true,
  });

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
        label: "Chatbot AI",
        to: "/chatbot",
        icon: Bot,
      },
    ],
    [],
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
      </div>
    </aside>
  );
}
