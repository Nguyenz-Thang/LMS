import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  CirclePlay,
  FileText,
  HelpCircle,
  Clock3,
  Pencil,
  Trash2,
  Plus,
  User,
  Tag,
  BookOpen,
  Eye,
} from "lucide-react";
import styles from "./CourseDetail.module.scss";
import AddSectionModal from "../../../components/AddSectionModal";
import EditSectionModal from "../../../components/EditSectionModal";
import DeleteSectionModal from "../../../components/DeleteSectionModal";
import AddLessonModal from "../../../components/AddLessonModal";
import EditLessonModal from "../../../components/EditLessonModal";
import DeleteLessonModal from "../../../components/DeleteLessonModal";
import { LMS_BASE_URL, useCourseApi } from "../../../api/courseApi";

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

  useEffect(() => {
    fetchCourseDetail();
  }, [id]);

  const nextSectionOrderIndex = useMemo(() => {
    return (curriculum?.sections?.length || 0) + 1;
  }, [curriculum]);

  const handleOpenEditSectionModal = (section) => {
    setEditingSection(section);
    setIsOpenEditSectionModal(true);
  };

  const handleOpenDeleteSectionModal = (section) => {
    setDeletingSection(section);
    setIsOpenDeleteSectionModal(true);
  };

  const handleOpenAddLessonModal = (section) => {
    setSelectedSection(section);
    setIsOpenAddLessonModal(true);
  };

  const handleOpenEditLessonModal = (lesson, section) => {
    setEditingLesson(lesson);
    setEditingLessonSection(section);
    setIsOpenEditLessonModal(true);
  };

  const handleOpenDeleteLessonModal = (lesson) => {
    setDeletingLesson(lesson);
    setIsOpenDeleteLessonModal(true);
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
        >
          <ArrowLeft size={18} />
          <span>Quay lại</span>
        </button>
      </div>

      <div className={styles.headerCard}>
        <div className={styles.thumbWrap}>
          <img
            src={getImageSrc(curriculum.thumbnailUrl)}
            alt={curriculum.title}
            className={styles.thumbnail}
          />
        </div>

        <div className={styles.headerContent}>
          <div className={styles.categoryBadge}>
            {curriculum.categoryName || "Chưa phân loại"}
          </div>

          <h1>{curriculum.title}</h1>
          <p className={styles.description}>
            {curriculum.description || "Chưa có mô tả cho khóa học này."}
          </p>
          <div className={styles.badgeRow}>
            <span className={styles.statusBadge}>
              {curriculum.status || "DRAFT"}
            </span>

            <span className={styles.visibilityBadge}>
              {curriculum.visibility || "PUBLIC"}
            </span>

            <span className={styles.levelBadge}>
              {curriculum.level || "BEGINNER"}
            </span>
          </div>
          <div className={styles.metaRow}>
            <div className={styles.metaItem}>
              <User size={16} />
              <span>{curriculum.instructorName || "Chưa có giảng viên"}</span>
            </div>

            <div className={styles.metaItem}>
              <Tag size={16} />
              <span>{curriculum.categoryName || "Chưa có danh mục"}</span>
            </div>

            <div className={styles.metaItem}>
              <BookOpen size={16} />
              <span>{totalLessons} bài học</span>
            </div>

            <div className={styles.metaItem}>
              <Clock3 size={16} />
              <span>{formatTotalDuration(totalDuration)}</span>
            </div>
          </div>

          <div className={styles.actionRow}>
            <button type="button" className={styles.primaryBtn}>
              <Pencil size={16} />
              <span>Sửa khóa học</span>
            </button>

            <button type="button" className={styles.dangerBtn}>
              <Trash2 size={16} />
              <span>Xóa</span>
            </button>

            <button
              type="button"
              className={styles.darkBtn}
              onClick={() => setIsOpenAddSectionModal(true)}
            >
              <Plus size={16} />
              <span>Thêm section</span>
            </button>
          </div>
        </div>
      </div>

      <div className={styles.contentGrid}>
        <div className={styles.curriculumCard}>
          <div className={styles.sectionTitleRow}>
            <div>
              <h2>Nội dung khóa học</h2>
              <p>
                {curriculum.sections?.length || 0} chương • {totalLessons} bài
                học
              </p>
            </div>

            <button type="button" className={styles.addLessonBtn}>
              <Plus size={16} />
              <span>Thêm lesson</span>
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
                            {section.totalLessons || 0} bài học •{" "}
                            {formatTotalDuration(
                              section.totalDurationMinutes || 0,
                            )}
                          </p>
                        </div>
                      </div>

                      <span className={styles.chevronIcon}>
                        {isOpen ? (
                          <ChevronUp size={18} />
                        ) : (
                          <ChevronDown size={18} />
                        )}
                      </span>
                    </button>

                    <div className={styles.sectionHeaderRight}>
                      <button
                        type="button"
                        className={styles.iconActionBtn}
                        onClick={() => handleOpenEditSectionModal(section)}
                      >
                        <Pencil size={15} />
                      </button>

                      <button
                        type="button"
                        className={styles.iconActionBtn}
                        onClick={() => handleOpenDeleteSectionModal(section)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className={styles.lessonList}>
                      {(section.lessons || []).map((lesson, lessonIndex) => (
                        <div
                          key={lesson.id}
                          className={styles.lessonRow}
                          style={{
                            opacity: lesson.isPublished ? 1 : 0.6,
                          }}
                        >
                          <div className={styles.lessonLeft}>
                            <div className={styles.lessonOrder}>
                              {lesson.orderIndex ?? lessonIndex + 1}
                            </div>

                            <div className={styles.lessonMain}>
                              <div className={styles.lessonTop}>
                                <div className={styles.lessonTitleRow}>
                                  <span className={styles.lessonIcon}>
                                    {getLessonIcon(lesson)}
                                  </span>

                                  <h4>{lesson.title}</h4>
                                </div>

                                <div className={styles.lessonBadges}>
                                  {lesson.isPreview && (
                                    <span className={styles.previewBadge}>
                                      <Eye size={13} />
                                      Preview
                                    </span>
                                  )}

                                  {lesson.lessonType === "QUIZ" && (
                                    <span className={styles.quizBadge}>
                                      <HelpCircle size={13} />
                                      Quiz
                                    </span>
                                  )}

                                  {lesson.lessonType === "ASSIGNMENT" && (
                                    <span className={styles.assignmentBadge}>
                                      <Pencil size={13} />
                                      Bài tập
                                    </span>
                                  )}

                                  {!lesson.isPublished && (
                                    <span className={styles.draftBadge}>
                                      Draft
                                    </span>
                                  )}
                                </div>
                              </div>

                              {lesson.description && (
                                <p className={styles.lessonDesc}>
                                  {lesson.description}
                                </p>
                              )}

                              <div className={styles.lessonBottom}>
                                <span className={styles.lessonType}>
                                  {lesson.lessonType}
                                </span>

                                {lesson.durationMinutes ? (
                                  <span className={styles.lessonDuration}>
                                    <Clock3 size={14} />
                                    <span>
                                      {formatDuration(lesson.durationMinutes)}
                                    </span>
                                  </span>
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
                          </div>

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
                              >
                                Quiz
                              </button>
                            )}
                            <button
                              type="button"
                              className={styles.smallBtn}
                              onClick={() =>
                                handleOpenEditLessonModal(lesson, section)
                              }
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              className={`${styles.smallBtn} ${styles.smallDangerBtn}`}
                              onClick={() =>
                                handleOpenDeleteLessonModal(lesson)
                              }
                            >
                              Xóa
                            </button>
                          </div>
                        </div>
                      ))}

                      <div className={styles.addLessonInline}>
                        <button
                          className={styles.inlineAddBtn}
                          onClick={() => handleOpenAddLessonModal(section)}
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

        <div className={styles.sideCard}>
          <h3>Tổng quan</h3>

          <div className={styles.sideStats}>
            <div className={styles.statItem}>
              <span>Chương học</span>
              <strong>{curriculum.sections?.length || 0}</strong>
            </div>

            <div className={styles.statItem}>
              <span>Bài học</span>
              <strong>{totalLessons}</strong>
            </div>

            <div className={styles.statItem}>
              <span>Tổng thời lượng</span>
              <strong>{formatTotalDuration(totalDuration)}</strong>
            </div>
          </div>

          <div className={styles.sideNote}>LMS</div>
        </div>
      </div>

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
