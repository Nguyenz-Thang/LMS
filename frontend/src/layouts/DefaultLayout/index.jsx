import { Outlet } from "react-router-dom";
import Header from "../components/Header";
import Footer from "./components/Footer";
import Sidebar from "./components/Sidebar";
import styles from "./DefaultLayout.module.scss";

export default function DefaultLayout() {
  return (
    <div className={styles.wrapper}>
      <Header />

      <div className={styles.body}>
        <Sidebar />

        <main className={styles.main}>
          <Outlet />
        </main>
      </div>

      <Footer />
    </div>
  );
}
