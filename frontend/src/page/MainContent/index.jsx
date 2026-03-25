import { Outlet } from "react-router-dom";
import styles from "./MainContent.module.scss";

export default function MainContent() {
  return (
    <div className={styles.mainContent}>
      <Outlet />
    </div>
  );
}
