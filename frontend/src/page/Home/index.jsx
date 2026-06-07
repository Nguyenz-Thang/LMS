import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Layers3,
  PlayCircle,
  Trophy,
} from "lucide-react";
import styles from "./Home.module.scss";
import heroImage from "../../assets/img/nen.png";

const experiences = [
  {
    title: "Học theo lộ trình",
    description:
      "Khóa học được tổ chức theo chương, bài học, tài liệu và hoạt động kiểm tra.",
    icon: BookOpen,
  },
  {
    title: "Tiếp tục nhanh",
    description:
      "Học viên có thể học tiếp từ bài gần nhất, làm quiz, nộp bài tập và xem kết quả.",
    icon: PlayCircle,
  },
  {
    title: "Quản lý dễ dàng",
    description:
      "Giảng viên quản lý nội dung học tập, theo dõi bài nộp và hỗ trợ bình luận trong bài học.",
    icon: GraduationCap,
  },
  {
    title: "Hỗ trợ tức thì",
    description:
      "Chatbot AI hỗ trợ giải đáp nhanh các câu hỏi trong quá trình học.",
    icon: Bot,
  },
];

const imageSlots = [
  {
    title: "Lớp học trực tuyến",
    description: "Không gian học tập tập trung, dễ theo dõi.",
    icon: Layers3,
  },
  {
    title: "Khóa học nổi bật",
    description: "Nội dung được phân loại rõ ràng theo nhu cầu.",
    icon: Trophy,
  },
  {
    title: "Tiến độ học tập",
    description: "Theo dõi hoàn thành bài học, quiz và bài tập.",
    icon: CheckCircle2,
  },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <main className={styles.page}>
      <section className={styles.introSection}>
        <div className={styles.introImage}>
          <img src={heroImage} alt="Hệ thống học tập trực tuyến LMS" />
          <div className={styles.imageBadge}>
            <ClipboardCheck size={18} />
            <span>Theo dõi học tập rõ ràng</span>
          </div>
        </div>

        <div className={styles.introContent}>
          <span className={styles.kicker}>Giới thiệu LMS</span>
          <h1>Học tập trực tuyến rõ ràng, thuận tiện và dễ theo dõi</h1>
          <p>
            LMS là hệ thống quản lý học tập trực tuyến giúp học viên truy cập
            khóa học, học bài, làm quiz, nộp bài tập và theo dõi tiến độ trên
            cùng một nền tảng.
          </p>
          <p>
            Thay vì quản lý rời rạc qua nhiều công cụ, LMS gom các hoạt động học
            tập vào một không gian thống nhất để học viên, giảng viên và quản
            trị viên dễ dàng phối hợp.
          </p>

          <div className={styles.introActions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => navigate("/courses")}
            >
              Khám phá khóa học
              <ArrowRight size={17} />
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => navigate("/my-courses")}
            >
              Vào khóa học của tôi
            </button>
          </div>
        </div>
      </section>

      <section className={styles.statementSection}>
        <div>
          <span className={styles.kicker}>Mục tiêu hệ thống</span>
          <h2>Tạo một môi trường học tập có cấu trúc và dễ sử dụng</h2>
        </div>

        <div className={styles.statementText}>
          <p>
            Hệ thống tập trung vào các thao tác chính của học tập trực tuyến:
            tìm khóa học, đăng ký, học theo từng bài, kiểm tra kiến thức, nộp
            bài tập và xem lại tiến độ.
          </p>
          <p>
            Với giảng viên và quản trị viên, LMS cung cấp khu vực quản lý riêng
            để tổ chức khóa học, danh mục, học viên, đăng ký học, doanh thu và
            báo cáo thống kê.
          </p>
        </div>
      </section>

      <section className={styles.imageStrip} aria-label="Khu vực minh họa">
        {imageSlots.map((slot) => {
          const Icon = slot.icon;

          return (
            <article key={slot.title} className={styles.imageSlot}>
              <span className={styles.slotIcon}>
                <Icon size={24} />
              </span>
              <h3>{slot.title}</h3>
              <p>{slot.description}</p>
            </article>
          );
        })}
      </section>

      <section className={styles.experienceSection}>
        <div className={styles.experienceText}>
          <span className={styles.kicker}>Trải nghiệm học tập</span>
          <h2>Mọi hoạt động học tập được kết nối trong một luồng liền mạch</h2>
          <p>
            Mỗi khóa học có thể bao gồm bài đọc, video, tài liệu, quiz, bài tập
            và bình luận trong bài học. Học viên đi theo đúng thứ tự bài học, hoàn thành từng
            phần và mở khóa nội dung tiếp theo khi đủ điều kiện.
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
          {experiences.map((item, index) => {
            const Icon = item.icon;

            return (
              <div key={item.title} className={styles.experienceItem}>
                <span className={styles.experienceIcon}>
                  <Icon size={20} />
                </span>
                <div>
                  <strong>{String(index + 1).padStart(2, "0")}</strong>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className={styles.finalSection}>
        <span className={styles.kicker}>Bắt đầu</span>
        <h2>Sẵn sàng bắt đầu học trên LMS?</h2>
        <p>
          Khám phá danh sách khóa học hoặc tiếp tục các khóa bạn đã đăng ký để
          hoàn thành lộ trình học tập của mình.
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
