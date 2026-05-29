import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import styles from "./Home.module.scss";
import heroImage from "../../assets/hero.png";

const experiences = [
  "Khóa học được tổ chức theo chương, bài học, tài liệu và hoạt động kiểm tra.",
  "Học viên có thể học tiếp từ bài gần nhất, làm quiz, nộp bài tập và xem kết quả.",
  "Giảng viên quản lý nội dung học tập, theo dõi bài nộp và hỗ trợ thảo luận.",
  "Chatbot AI hỗ trợ giải đáp nhanh các câu hỏi trong quá trình học.",
];

const imageSlots = [
  "Ảnh lớp học trực tuyến",
  "Ảnh khóa học nổi bật",
  "Ảnh học viên học tập",
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <main className={styles.page}>
      <section className={styles.introSection}>
        <div className={styles.introImage}>
          <img src={heroImage} alt="Hệ thống học tập trực tuyến LMS" />
        </div>

        <div className={styles.introContent}>
          <span className={styles.kicker}>Giới thiệu LMS</span>
          <h1>Học tập trực tuyến rõ ràng, thuận tiện và dễ theo dõi</h1>
          <p>
            LMS là hệ thống quản lý học tập trực tuyến giúp học viên truy cập khóa học,
            học bài, làm quiz, nộp bài tập và theo dõi tiến độ trên cùng một nền tảng.
          </p>
          <p>
            Thay vì quản lý rời rạc qua nhiều công cụ, LMS gom các hoạt động học tập
            vào một không gian thống nhất để học viên, giảng viên và quản trị viên dễ
            dàng phối hợp.
          </p>

          <button
            type="button"
            className={styles.textLink}
            onClick={() => navigate("/courses")}
          >
            Khám phá khóa học
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      <section className={styles.statementSection}>
        <div>
          <span className={styles.kicker}>Mục tiêu hệ thống</span>
          <h2>Tạo một môi trường học tập có cấu trúc và dễ sử dụng</h2>
        </div>

        <div className={styles.statementText}>
          <p>
            Hệ thống tập trung vào các thao tác chính của học tập trực tuyến: tìm khóa
            học, đăng ký, học theo từng bài, kiểm tra kiến thức, nộp bài tập và xem lại
            tiến độ.
          </p>
          <p>
            Với giảng viên và quản trị viên, LMS cung cấp khu vực quản lý riêng để tổ
            chức khóa học, danh mục, học viên, đăng ký học, doanh thu và báo cáo thống kê.
          </p>
        </div>
      </section>

      <section className={styles.imageStrip} aria-label="Khu vực ảnh minh họa">
        {imageSlots.map((slot) => (
          <div key={slot} className={styles.imageSlot}>
            <span>{slot}</span>
          </div>
        ))}
      </section>

      <section className={styles.experienceSection}>
        <div className={styles.experienceText}>
          <span className={styles.kicker}>Trải nghiệm học tập</span>
          <h2>Mọi hoạt động học tập được kết nối trong một luồng liền mạch</h2>
          <p>
            Mỗi khóa học có thể bao gồm bài đọc, video, tài liệu, quiz, bài tập và thảo
            luận. Học viên đi theo đúng thứ tự bài học, hoàn thành từng phần và mở khóa
            nội dung tiếp theo khi đủ điều kiện.
          </p>

          <button
            type="button"
            className={styles.textLink}
            onClick={() => navigate("/my-courses")}
          >
            Vào khóa học của tôi
            <ArrowRight size={16} />
          </button>
        </div>

        <div className={styles.experienceList}>
          {experiences.map((item, index) => (
            <div key={item} className={styles.experienceItem}>
              <strong>{String(index + 1).padStart(2, "0")}</strong>
              <p>{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.finalSection}>
        <span className={styles.kicker}>Bắt đầu</span>
        <h2>Sẵn sàng bắt đầu học trên LMS?</h2>
        <p>
          Khám phá danh sách khóa học hoặc tiếp tục các khóa bạn đã đăng ký để hoàn
          thành lộ trình học tập của mình.
        </p>
        <div className={styles.actions}>
          <button type="button" onClick={() => navigate("/courses")}>
            Xem khóa học
          </button>
          <button type="button" onClick={() => navigate("/progress")}>
            Xem tiến độ học
          </button>
        </div>
      </section>
    </main>
  );
}
