import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  CircleDashed,
  CirclePlay,
  Clock3,
  FileCheck2,
  FileText,
  Globe2,
  HelpCircle,
  Lock,
  Pencil,
  Plus,
  Trash2,
  Wand2,
} from "lucide-react";
import styles from "./CourseDetail.module.scss";
import AddSectionModal from "../../../components/AddSectionModal";
import EditSectionModal from "../../../components/EditSectionModal";
import DeleteSectionModal from "../../../components/DeleteSectionModal";
import AddLessonModal from "../../../components/AddLessonModal";
import EditLessonModal from "../../../components/EditLessonModal";
import DeleteLessonModal from "../../../components/DeleteLessonModal";
import EditCourseModal from "../../../components/EditCourseModal";
import DeleteCourseModal from "../../../components/DeleteCourseModal";
import { LMS_BASE_URL, useCourseApi } from "../../../api/courseApi";
import { getCategories } from "../../../api/categoryApi";

const FALLBACK_THUMB =
  "https://images.unsplash.com/photo-1513258496099-48168024aec0?q=80&w=1200&auto=format&fit=crop";

function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return "0 phút";

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    return `${hours} giờ ${mins} phút`;
  }

  return `${mins} phút`;
}

function formatTotalDuration(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return "0 phút";

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hours > 0) {
    return `${hours} giờ ${mins} phút`;
  }

  return `${mins} phút`;
}

function getStatusMeta(status) {
  switch (status) {
    case "PUBLISHED":
      return { label: "Đã duyệt", className: "statusPublished", icon: Check };
    case "PENDING_APPROVAL":
      return {
        label: "Chờ duyệt",
        className: "statusPending",
        icon: CircleAlert,
      };
    case "REJECTED":
      return { label: "Bị từ chối", className: "statusRejected", icon: Trash2 };
    case "ARCHIVED":
      return { label: "Lưu trữ", className: "statusArchived", icon: Archive };
    case "DRAFT":
    default:
      return { label: "Nháp", className: "statusDraft", icon: CircleDashed };
  }
}

function getVisibilityMeta(visibility) {
  switch (visibility) {
    case "PRIVATE":
      return { label: "Riêng tư", className: "visibilityPrivate", icon: Lock };
    case "UNLISTED":
      return {
        label: "Không liệt kê",
        className: "visibilityUnlisted",
        icon: CircleDashed,
      };
    case "PUBLIC":
    default:
      return { label: "Công khai", className: "visibilityPublic", icon: Globe2 };
  }
}

function getLevelMeta(level) {
  switch (level) {
    case "INTERMEDIATE":
      return { label: "Trung cấp", className: "levelIntermediate", icon: BookOpen };
    case "ADVANCED":
      return { label: "Nâng cao", className: "levelAdvanced", icon: CircleAlert };
    case "BEGINNER":
    default:
      return { label: "Cơ bản", className: "levelBeginner", icon: BookOpen };
  }
}

function getLessonTypeLabel(type) {
  switch (type) {
    case "VIDEO":
      return "Video";
    case "READING":
      return "Bài đọc";
    case "QUIZ":
      return "Bài kiểm tra";
    case "ASSIGNMENT":
      return "Bài tập";
    default:
      return "Bài học";
  }
}

function getLessonIcon(lesson) {
  switch (lesson?.lessonType) {
    case "VIDEO":
      return <CirclePlay size={16} />;
    case "READING":
      return <FileText size={16} />;
    case "QUIZ":
      return <HelpCircle size={16} />;
    case "ASSIGNMENT":
      return <Pencil size={16} />;
    default:
      return <BookOpen size={16} />;
  }
}

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getCourseCurriculum } = useCourseApi();

  const [openSections, setOpenSections] = useState({});
  const [curriculum, setCurriculum] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  const [isOpenAddSectionModal, setIsOpenAddSectionModal] = useState(false);
  const [isOpenEditSectionModal, setIsOpenEditSectionModal] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [isOpenDeleteSectionModal, setIsOpenDeleteSectionModal] =
    useState(false);
  const [deletingSection, setDeletingSection] = useState(null);

  const [isOpenAddLessonModal, setIsOpenAddLessonModal] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);

  const [isOpenEditLessonModal, setIsOpenEditLessonModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [editingLessonSection, setEditingLessonSection] = useState(null);

  const [isOpenDeleteLessonModal, setIsOpenDeleteLessonModal] = useState(false);
  const [deletingLesson, setDeletingLesson] = useState(null);

  const [isOpenEditCourseModal, setIsOpenEditCourseModal] = useState(false);
  const [isOpenDeleteCourseModal, setIsOpenDeleteCourseModal] = useState(false);

  useEffect(() => {
    fetchCourseDetail();
    fetchCategories();
  }, [id]);

  const nextSectionOrderIndex = useMemo(() => {
    return (curriculum?.sections?.length || 0) + 1;
  }, [curriculum]);

  const totalLessons = useMemo(() => {
    return (curriculum?.sections || []).reduce(
      (sum, section) => sum + (section.totalLessons || 0),
      0,
    );
  }, [curriculum]);

  const totalDuration = useMemo(() => {
    return (curriculum?.sections || []).reduce(
      (sum, section) => sum + (section.totalDurationMinutes || 0),
      0,
    );
  }, [curriculum]);

  const statusMeta = getStatusMeta(curriculum?.status);
  const visibilityMeta = getVisibilityMeta(curriculum?.visibility);
  const levelMeta = getLevelMeta(curriculum?.level);
  const StatusIcon = statusMeta.icon;
  const VisibilityIcon = visibilityMeta.icon;
  const LevelIcon = levelMeta.icon;

  const fetchCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Load categories failed:", error);
    }
  };

  const fetchCourseDetail = async () => {
    try {
      setLoading(true);
      setErrorText("");

      const res = await getCourseCurriculum(id);
      const data = res?.result || null;

      setCurriculum(data);

      const initialOpenState = {};
      (data?.sections || []).forEach((section, index) => {
        initialOpenState[section.id] = index === 0;
      });
      setOpenSections(initialOpenState);
    } catch (error) {
      setErrorText(
        error?.body?.message ||
          error?.message ||
          "Không tải được chi tiết khóa học.",
      );
    } finally {
      setLoading(false);
    }
  };

  const getImageSrc = (thumbnailUrl) => {
    if (!thumbnailUrl) return FALLBACK_THUMB;
    if (thumbnailUrl.startsWith("http")) return thumbnailUrl;
    if (thumbnailUrl.startsWith("/")) {
      return `${LMS_BASE_URL}${thumbnailUrl}`;
    }
    return `${LMS_BASE_URL}/${thumbnailUrl}`;
  };

  const toggleSection = (sectionId) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const handleOpenAddLessonFromHeader = () => {
    const firstSection = curriculum?.sections?.[0];

    if (!firstSection) {
      setErrorText("Cần tạo ít nhất một chương trước khi thêm bài học.");
      return;
    }

    setSelectedSection(firstSection);
    setIsOpenAddLessonModal(true);
  };

  if (loading) {
    return <div className={styles.stateBox}>Đang tải chi tiết khóa học...</div>;
  }

  if (errorText) {
    return <div className={styles.errorBox}>{errorText}</div>;
  }

  if (!curriculum) {
    return <div className={styles.stateBox}>Không tìm thấy khóa học.</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate("/admin/courses")}
          title="Quay lại"
          aria-label="Quay lại"
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      <div className={styles.courseTableCard}>
        <div className={styles.tableHead}>
          <div>
            <h1>Chi tiết khóa học</h1>
            <p>Quản lý thông tin khóa học, chương học và bài học.</p>
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => setIsOpenEditCourseModal(true)}
              title="Sửa khóa học"
              aria-label="Sửa khóa học"
            >
              <Pencil size={16} />
            </button>

            <button
              type="button"
              className={styles.dangerBtn}
              onClick={() => setIsOpenDeleteCourseModal(true)}
              title="Xóa khóa học"
              aria-label="Xóa khóa học"
            >
              <Trash2 size={16} />
            </button>

            <button
              type="button"
              className={styles.darkBtn}
              onClick={() => setIsOpenAddSectionModal(true)}
              title="Thêm chương"
              aria-label="Thêm chương"
            >
              <Plus size={16} />
              <span>Thêm chương</span>
            </button>
          </div>
        </div>

        <div className={styles.courseOverviewWrap}>
          <table className={styles.courseOverviewTable}>
            <thead>
              <tr>
                <th>Khóa học</th>
                <th>Giảng viên</th>
                <th>Danh mục</th>
                <th>Chương</th>
                <th>Bài học</th>
                <th>Thời lượng</th>
                <th>Trạng thái</th>
                <th>Hiển thị</th>
                <th>Cấp độ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div className={styles.courseInfoCell}>
                    <img
                      src={getImageSrc(curriculum.thumbnailUrl)}
                      alt={curriculum.title}
                      className={styles.courseThumb}
                    />
                    <div>
                      <strong>{curriculum.title}</strong>
                      <span>
                        {curriculum.description ||
                          "Chưa có mô tả cho khóa học này."}
                      </span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={styles.textCell}>
                    {curriculum.instructorName || "Chưa có giảng viên"}
                  </span>
                </td>
                <td>
                  <span className={styles.textCell}>
                    {curriculum.categoryName || "Chưa phân loại"}
                  </span>
                </td>
                <td>
                  <span className={styles.numberCell}>
                    {curriculum.sections?.length || 0}
                  </span>
                </td>
                <td>
                  <span className={styles.numberCell}>{totalLessons}</span>
                </td>
                <td>
                  <span className={styles.textCell}>
                    {formatTotalDuration(totalDuration)}
                  </span>
                </td>
                <td>
                  <span
                    className={`${styles.iconBadge} ${styles[statusMeta.className]}`}
                    title={statusMeta.label}
                    aria-label={statusMeta.label}
                  >
                    <StatusIcon size={16} />
                  </span>
                </td>
                <td>
                  <span
                    className={`${styles.iconBadge} ${styles[visibilityMeta.className]}`}
                    title={visibilityMeta.label}
                    aria-label={visibilityMeta.label}
                  >
                    <VisibilityIcon size={16} />
                  </span>
                </td>
                <td>
                  <span
                    className={`${styles.iconBadge} ${styles[levelMeta.className]}`}
                    title={levelMeta.label}
                    aria-label={levelMeta.label}
                  >
                    <LevelIcon size={16} />
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.curriculumCard}>
        <div className={styles.sectionTitleRow}>
          <div>
            <h2>Nội dung khóa học</h2>
            <p>
              {curriculum.sections?.length || 0} chương - {totalLessons} bài
              học
            </p>
          </div>

          <button
            type="button"
            className={styles.addLessonBtn}
            onClick={handleOpenAddLessonFromHeader}
            disabled={!curriculum?.sections?.length}
            title="Thêm bài học"
            aria-label="Thêm bài học"
          >
            <Plus size={16} />
            <span>Thêm bài học</span>
          </button>
        </div>

        <div className={styles.sectionList}>
          {(curriculum.sections || []).map((section, sectionIndex) => {
            const isOpen = !!openSections[section.id];

            return (
              <div key={section.id} className={styles.sectionBlock}>
                <div className={styles.sectionHeader}>
                  <button
                    type="button"
                    className={styles.sectionToggle}
                    onClick={() => toggleSection(section.id)}
                  >
                    <div className={styles.sectionHeaderLeft}>
                      <div className={styles.sectionOrder}>
                        {sectionIndex + 1}
                      </div>

                      <div>
                        <h3>{section.title}</h3>
                        <p>
                          {section.totalLessons || 0} bài học -{" "}
                          {formatTotalDuration(
                            section.totalDurationMinutes || 0,
                          )}
                        </p>
                      </div>
                    </div>

                    <span className={styles.chevronIcon}>
                      {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </span>
                  </button>

                  <div className={styles.sectionHeaderRight}>
                    <button
                      type="button"
                      className={styles.iconActionBtn}
                      onClick={() => {
                        setEditingSection(section);
                        setIsOpenEditSectionModal(true);
                      }}
                      title="Sửa chương"
                      aria-label="Sửa chương"
                    >
                      <Pencil size={15} />
                    </button>

                    <button
                      type="button"
                      className={styles.iconActionBtn}
                      onClick={() => {
                        setDeletingSection(section);
                        setIsOpenDeleteSectionModal(true);
                      }}
                      title="Xóa chương"
                      aria-label="Xóa chương"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className={styles.lessonTableWrap}>
                    <table className={styles.lessonTable}>
                      <thead>
                        <tr>
                          <th>Thứ tự</th>
                          <th>Bài học</th>
                          <th>Loại</th>
                          <th>Thời lượng</th>
                          <th>Trạng thái</th>
                          <th>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(section.lessons || []).map((lesson, lessonIndex) => (
                          <tr
                            key={lesson.id}
                            className={
                              !lesson.isPublished ? styles.lessonDraftRow : ""
                            }
                          >
                            <td>
                              <span className={styles.lessonOrder}>
                                {lesson.orderIndex ?? lessonIndex + 1}
                              </span>
                            </td>

                            <td>
                              <div className={styles.lessonNameCell}>
                                <span className={styles.lessonIcon}>
                                  {getLessonIcon(lesson)}
                                </span>
                                <div>
                                  <strong>{lesson.title}</strong>
                                  {lesson.description ? (
                                    <span>{lesson.description}</span>
                                  ) : null}
                                  {lesson.lessonType === "VIDEO" &&
                                    lesson.videoUrl && (
                                      <a
                                        href={lesson.videoUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={styles.videoLink}
                                      >
                                        Xem video
                                      </a>
                                    )}
                                </div>
                              </div>
                            </td>

                            <td>
                              <span className={styles.lessonTypeBadge}>
                                {getLessonTypeLabel(lesson.lessonType)}
                              </span>
                            </td>

                            <td>
                              <span className={styles.lessonDuration}>
                                <Clock3 size={14} />
                                {formatDuration(lesson.durationMinutes)}
                              </span>
                            </td>

                            <td>
                              <div className={styles.lessonStatusGroup}>
                                {lesson.isPreview ? (
                                  <span className={styles.previewBadge}>
                                    Xem trước
                                  </span>
                                ) : null}
                                {!lesson.isPublished ? (
                                  <span className={styles.draftBadge}>Nháp</span>
                                ) : (
                                  <span className={styles.publishedBadge}>
                                    Đã xuất bản
                                  </span>
                                )}
                              </div>
                            </td>

                            <td>
                              <div className={styles.lessonActions}>
                                {lesson.lessonType === "QUIZ" && lesson.quizId && (
                                  <button
                                    type="button"
                                    className={styles.smallBtn}
                                    onClick={() =>
                                      navigate(
                                        `/admin/quizzes/${lesson.quizId}/edit`,
                                      )
                                    }
                                    title="Sửa bài kiểm tra"
                                    aria-label="Sửa bài kiểm tra"
                                  >
                                    <HelpCircle size={15} />
                                  </button>
                                )}

                                {lesson.lessonType === "ASSIGNMENT" &&
                                  lesson.assignmentId && (
                                    <button
                                      type="button"
                                      className={styles.smallBtn}
                                      onClick={() =>
                                        navigate(
                                          `/admin/assignments/${lesson.assignmentId}/submissions`,
                                        )
                                      }
                                      title="Bài nộp"
                                      aria-label="Bài nộp"
                                    >
                                      <FileCheck2 size={15} />
                                    </button>
                                  )}

                                {lesson.lessonType !== "QUIZ" ? (
                                  <button
                                    type="button"
                                    className={styles.smallBtn}
                                    onClick={() =>
                                      navigate(
                                        `/admin/quizzes/new?courseId=${id}&lessonId=${lesson.id}`,
                                      )
                                    }
                                    title="Tạo bài kiểm tra bằng AI"
                                    aria-label="Tạo bài kiểm tra bằng AI"
                                  >
                                    <Wand2 size={15} />
                                  </button>
                                ) : null}

                                <button
                                  type="button"
                                  className={styles.smallBtn}
                                  onClick={() => {
                                    setEditingLesson(lesson);
                                    setEditingLessonSection(section);
                                    setIsOpenEditLessonModal(true);
                                  }}
                                  title="Sửa bài học"
                                  aria-label="Sửa bài học"
                                >
                                  <Pencil size={15} />
                                </button>

                                <button
                                  type="button"
                                  className={`${styles.smallBtn} ${styles.smallDangerBtn}`}
                                  onClick={() => {
                                    setDeletingLesson(lesson);
                                    setIsOpenDeleteLessonModal(true);
                                  }}
                                  title="Xóa bài học"
                                  aria-label="Xóa bài học"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className={styles.addLessonInline}>
                      <button
                        className={styles.inlineAddBtn}
                        onClick={() => {
                          setSelectedSection(section);
                          setIsOpenAddLessonModal(true);
                        }}
                        title="Thêm bài học vào chương này"
                      >
                        <Plus size={15} />
                        <span>Thêm bài học vào chương này</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <EditCourseModal
        isOpen={isOpenEditCourseModal}
        onClose={() => setIsOpenEditCourseModal(false)}
        onUpdated={fetchCourseDetail}
        course={curriculum}
        categories={categories}
      />

      <DeleteCourseModal
        isOpen={isOpenDeleteCourseModal}
        onClose={() => setIsOpenDeleteCourseModal(false)}
        course={curriculum}
        onDeleted={() => navigate("/admin/courses")}
      />

      <AddSectionModal
        isOpen={isOpenAddSectionModal}
        onClose={() => setIsOpenAddSectionModal(false)}
        onCreated={fetchCourseDetail}
        courseId={curriculum?.id}
        nextOrderIndex={nextSectionOrderIndex}
      />

      <EditSectionModal
        isOpen={isOpenEditSectionModal}
        onClose={() => {
          setIsOpenEditSectionModal(false);
          setEditingSection(null);
        }}
        onUpdated={fetchCourseDetail}
        section={editingSection}
        courseId={curriculum?.id}
      />

      <DeleteSectionModal
        isOpen={isOpenDeleteSectionModal}
        onClose={() => {
          setIsOpenDeleteSectionModal(false);
          setDeletingSection(null);
        }}
        onDeleted={fetchCourseDetail}
        section={deletingSection}
      />

      <AddLessonModal
        isOpen={isOpenAddLessonModal}
        onClose={() => {
          setIsOpenAddLessonModal(false);
          setSelectedSection(null);
        }}
        onCreated={fetchCourseDetail}
        section={selectedSection}
        nextOrderIndex={(selectedSection?.lessons?.length || 0) + 1}
      />

      <EditLessonModal
        isOpen={isOpenEditLessonModal}
        onClose={() => {
          setIsOpenEditLessonModal(false);
          setEditingLesson(null);
          setEditingLessonSection(null);
        }}
        onUpdated={fetchCourseDetail}
        lesson={editingLesson}
        section={editingLessonSection}
      />

      <DeleteLessonModal
        isOpen={isOpenDeleteLessonModal}
        onClose={() => {
          setIsOpenDeleteLessonModal(false);
          setDeletingLesson(null);
        }}
        onDeleted={fetchCourseDetail}
        lesson={deletingLesson}
      />
    </div>
  );
}
