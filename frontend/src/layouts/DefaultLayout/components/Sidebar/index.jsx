import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Clock3,
  FileText,
  User,
  Trophy,
  ClipboardCheck,
  FolderKanban,
  Users,
  UserCog,
  ShieldCheck,
  KeyRound,
  BookMarked,
  Layers3,
  ChartColumn,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useMemo, useState } from "react";
import styles from "./Sidebar.module.scss";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  const menuGroups = useMemo(
    () => [
      {
        title: "Người dùng",
        items: [
          {
            label: "Tổng quan",
            to: "/home",
            icon: LayoutDashboard,
          },
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
            label: "Bài học",
            to: "/lessons",
            icon: BookMarked,
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
            label: "Bài viết",
            to: "/posts",
            icon: FileText,
          },
          {
            label: "Thông tin cá nhân",
            to: "/profile",
            icon: User,
          },
        ],
      },
      {
        title: "Quản lý",
        items: [
          {
            label: "Quản lý người dùng",
            to: "/admin/users",
            icon: Users,
          },
          {
            label: "Quản lý vai trò",
            to: "/admin/roles",
            icon: UserCog,
          },
          {
            label: "Quản lý quyền",
            to: "/admin/permissions",
            icon: KeyRound,
          },
          {
            label: "Quản lý khóa học",
            to: "/admin/courses",
            icon: FolderKanban,
          },
          {
            label: "Quản lý bài học",
            to: "/admin/lessons",
            icon: Layers3,
          },
          {
            label: "Quản lý đăng ký học",
            to: "/admin/enrollments",
            icon: ShieldCheck,
          },
          {
            label: "Báo cáo - thống kê",
            to: "/admin/reports",
            icon: ChartColumn,
          },
          {
            label: "Cài đặt hệ thống",
            to: "/admin/settings",
            icon: Settings,
          },
        ],
      },
    ],
    [],
  );

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
        {menuGroups.map((group) => (
          <div key={group.title} className={styles.group}>
            <p className={styles.groupTitle}>{group.title}</p>

            <div className={styles.groupItems}>
              {group.items.map((item) => {
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
                      <Icon size={20} strokeWidth={2.1} />
                    </span>
                    <span className={styles.label}>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
