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
import api from "../../api/axios";
import styles from "./CourseDetail.module.scss";
import AddSectionModal from "../../components/AddSectionModal";
import EditSectionModal from "../../components/EditSectionModal";
import DeleteSectionModal from "../../components/DeleteSectionModal";
import AddLessonModal from "../../components/AddLessonModal";
import EditLessonModal from "../../components/EditLessonModal";
import DeleteLessonModal from "../../components/DeleteLessonModal";
const BACKEND_BASE_URL = "http://localhost:8080/lms";
const FALLBACK_THUMB =
  "https://images.unsplash.com/photo-1513258496099-48168024aec0?q=80&w=1200&auto=format&fit=crop";

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "00:00";

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatTotalDuration(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return "0 phút";

  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours} giờ ${mins} phút`;
  }

  return `${mins} phút`;
}

function getLessonIcon(type) {
  switch (type) {
    case "VIDEO":
      return <CirclePlay size={16} />;
    case "ARTICLE":
      return <FileText size={16} />;
    case "QUIZ":
      return <HelpCircle size={16} />;
    default:
      return <BookOpen size={16} />;
  }
}

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

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

      const res = await api.get(`/courses/${id}/curriculum`);
      const data = res?.data?.result || null;

      setCurriculum(data);

      const initialOpenState = {};
      (data?.sections || []).forEach((section, index) => {
        initialOpenState[section.id] = index === 0;
      });
      setOpenSections(initialOpenState);
    } catch (error) {
      setErrorText(
        error?.response?.data?.message || "Không tải được chi tiết khóa học.",
      );
    } finally {
      setLoading(false);
    }
  };

  const getImageSrc = (thumbnailUrl) => {
    if (!thumbnailUrl) return FALLBACK_THUMB;
    if (thumbnailUrl.startsWith("http")) return thumbnailUrl;
    if (thumbnailUrl.startsWith("/")) {
      return `${BACKEND_BASE_URL}${thumbnailUrl}`;
    }
    return `${BACKEND_BASE_URL}/${thumbnailUrl}`;
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
      (sum, section) => sum + (section.totalDuration || 0),
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
                            {formatTotalDuration(section.totalDuration || 0)}
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
                        <div key={lesson.id} className={styles.lessonRow}>
                          <div className={styles.lessonLeft}>
                            <div className={styles.lessonOrder}>
                              {lesson.orderIndex ?? lessonIndex + 1}
                            </div>

                            <div className={styles.lessonMain}>
                              <div className={styles.lessonTop}>
                                <span className={styles.lessonIcon}>
                                  {getLessonIcon(lesson.type)}
                                </span>

                                <h4>{lesson.title}</h4>

                                {lesson.isPreview && (
                                  <span className={styles.previewBadge}>
                                    <Eye size={13} />
                                    <span>Preview</span>
                                  </span>
                                )}
                              </div>

                              <div className={styles.lessonBottom}>
                                <span className={styles.lessonType}>
                                  {lesson.type || "LESSON"}
                                </span>

                                {lesson.duration ? (
                                  <span className={styles.lessonDuration}>
                                    <Clock3 size={14} />
                                    <span>
                                      {formatDuration(lesson.duration)}
                                    </span>
                                  </span>
                                ) : null}

                                {lesson.videoUrl ? (
                                  <a
                                    href={lesson.videoUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={styles.videoLink}
                                  >
                                    Xem video
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          <div className={styles.lessonActions}>
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
