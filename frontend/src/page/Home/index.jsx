import { useEffect, useState } from "react";
import styles from "./Home.module.scss";

const Home = () => {
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8080/courses")
      .then((res) => res.json())
      .then((data) => setCourses(data.result || []))
      .catch((err) => console.log(err));
  }, []);

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Khóa học</h2>

      <div className={styles.grid}>
        {courses.map((course) => (
          <div key={course.id} className={styles.card}>
            <div className={styles.image}></div>

            <div className={styles.body}>
              <h4 className={styles.title}>{course.title}</h4>
              <p className={styles.desc}>{course.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;
