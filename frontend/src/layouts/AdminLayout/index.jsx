import { Outlet } from "react-router-dom";
import AdminHeader from "./components/AdminHeader";
import AdminSidebar from "./components/AdminSidebar";
import styles from "./AdminLayout.module.scss";

export default function AdminLayout() {
  return (
    <div className={styles.wrapper}>
      <AdminHeader />

      <div className={styles.body}>
        <AdminSidebar />

        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
