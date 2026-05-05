import { useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import styles from "../Learning.module.scss";
import { LMS_BASE_URL } from "../../../api/learningApi";
import {
  getBlockTitle,
  isYoutubeUrl,
  toYoutubeEmbedUrl,
} from "../utils/learningHelpers";
import QuizBlock from "./QuizBlock";
import AssignmentBlock from "./AssignmentBlock";
import LessonDiscussion from "./LessonDiscussion";

const NOTE_EDITOR_FORMATS = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "list",
  "bullet",
  "blockquote",
  "code-block",
  "link",
  "clean",
];

function stripHtml(html = "") {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

export default function LearningContent({
  loadingLesson,
  lessonData,
  videoRef,
  contentAreaRef,
  saveLessonProgress,
  learningApi,
  onLearningStateChange,
  onLessonCompleted,
  onBookmarkChanged,
}) {
  const readingCompletionRef = useRef(null);
  const noteQuillRef = useRef(null);
  const videoCompletionTriggeredRef = useRef(false);
  const [notes, setNotes] = useState([]);
  const [bookmarked, setBookmarked] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [timeMarkerSec, setTimeMarkerSec] = useState("");
  const [editingNoteId, setEditingNoteId] = useState("");
  const [noteError, setNoteError] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);
  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  useEffect(() => {
    setNotes(Array.isArray(lessonData?.notes) ? lessonData.notes : []);
    setBookmarked(Boolean(lessonData?.bookmarked));
    videoCompletionTriggeredRef.current = false;
    setNoteContent("");
    setTimeMarkerSec("");
    setEditingNoteId("");
    setNoteError("");
    setNotesOpen(false);
  }, [lessonData]);

  useEffect(() => {
    if (
      !lessonData?.lessonId ||
      lessonData?.completed ||
      lessonData?.videoUrl ||
      !lessonData?.content ||
      !contentAreaRef?.current ||
      !readingCompletionRef?.current
    ) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          onLessonCompleted?.({ autoNavigate: true });
        }
      },
      {
        root: contentAreaRef.current,
        threshold: 0.95,
      },
    );

    observer.observe(readingCompletionRef.current);

    return () => observer.disconnect();
  }, [
    contentAreaRef,
    lessonData?.completed,
    lessonData?.content,
    lessonData?.lessonId,
    lessonData?.videoUrl,
    onLessonCompleted,
  ]);

  const lessonResources = useMemo(
    () => (Array.isArray(lessonData?.resources) ? lessonData.resources : []),
    [lessonData],
  );

  const noteEditorModules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["blockquote", "code-block"],
        ["link"],
        ["clean"],
      ],
    }),
    [],
  );

  const toAssetUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${LMS_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const getYoutubeLessonEmbedUrl = () => {
    if (!lessonData?.videoUrl || !isYoutubeUrl(lessonData.videoUrl)) {
      return "";
    }

    const baseUrl = toYoutubeEmbedUrl(lessonData.videoUrl);
    if (!baseUrl) {
      return "";
    }

    const lastPosition = Number(lessonData?.lastPositionSec || 0);
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}rel=0${lastPosition > 0 ? `&start=${lastPosition}` : ""}`;
  };

  const resetNoteForm = () => {
    setNoteContent("");
    setTimeMarkerSec("");
    setEditingNoteId("");
    setNoteError("");
  };

  const openNotePanel = () => {
    setTimeMarkerSec("");
    setNotesOpen(true);
  };

  const handleSubmitNote = async () => {
    if (!lessonData?.lessonId) return;

    const trimmedContent = noteContent.trim();
    if (!stripHtml(trimmedContent)) {
      setNoteError("Vui lòng nhập nội dung ghi chú.");
      return;
    }

    try {
      setNoteBusy(true);
      setNoteError("");

      const payload = {
        noteContent: trimmedContent,
        timeMarkerSec: null,
      };

      const res = editingNoteId
        ? await learningApi.updateLessonNote(
            lessonData.lessonId,
            editingNoteId,
            payload,
          )
        : await learningApi.createLessonNote(lessonData.lessonId, payload);

      const savedNote = res?.result;
      if (!savedNote) return;

      setNotes((prev) => {
        if (editingNoteId) {
          return prev.map((note) => (note.id === savedNote.id ? savedNote : note));
        }
        return [savedNote, ...prev];
      });

      resetNoteForm();
    } catch (error) {
      setNoteError(
        error?.body?.message || error?.message || "Không lưu được ghi chú.",
      );
    } finally {
      setNoteBusy(false);
    }
  };

  const handleEditNote = (note) => {
    setEditingNoteId(note.id);
    setNoteContent(note.noteContent || "");
    setTimeMarkerSec("");
    setNoteError("");
    setNotesOpen(true);
  };

  const handleDeleteNote = async (noteId) => {
    if (!lessonData?.lessonId) return;

    try {
      setNoteBusy(true);
      await learningApi.deleteLessonNote(lessonData.lessonId, noteId);
      setNotes((prev) => prev.filter((note) => note.id !== noteId));
      if (editingNoteId === noteId) {
        resetNoteForm();
      }
    } catch (error) {
      setNoteError(
        error?.body?.message || error?.message || "Không xóa được ghi chú.",
      );
    } finally {
      setNoteBusy(false);
    }
  };

  const handleToggleBookmark = async () => {
    if (!lessonData?.lessonId) return;

    try {
      setBookmarkBusy(true);
      const res = bookmarked
        ? await learningApi.removeLessonBookmark(lessonData.lessonId)
        : await learningApi.addLessonBookmark(lessonData.lessonId);

      if (res?.result?.bookmarked !== undefined) {
        const nextBookmarked = Boolean(res.result.bookmarked);
        setBookmarked(nextBookmarked);
        onBookmarkChanged?.(nextBookmarked);
      } else {
        setBookmarked((prev) => {
          const nextBookmarked = !prev;
          onBookmarkChanged?.(nextBookmarked);
          return nextBookmarked;
        });
      }
    } catch (error) {
      setNoteError(
        error?.body?.message || error?.message || "Không cập nhật bookmark.",
      );
    } finally {
      setBookmarkBusy(false);
    }
  };

  if (loadingLesson) {
    return <div className={styles.lessonState}>Đang tải bài học...</div>;
  }

  if (!lessonData) {
    return <div className={styles.lessonState}>Chưa có bài học để hiển thị.</div>;
  }

  return (
    <>
      <div className={styles.mediaBox}>
        {lessonData.videoUrl ? (
          isYoutubeUrl(lessonData.videoUrl) ? (
            <iframe
              className={styles.youtubeFrame}
              src={getYoutubeLessonEmbedUrl()}
              title={lessonData.title || "YouTube video player"}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          ) : (
            <video
              ref={videoRef}
              className={styles.videoPlayer}
              controls
              src={toAssetUrl(lessonData.videoUrl)}
              poster={
                lessonData.thumbnailUrl
                  ? toAssetUrl(lessonData.thumbnailUrl)
                  : undefined
              }
              onPause={async (e) => {
                const currentSec = Math.floor(e.currentTarget.currentTime || 0);
                try {
                  await saveLessonProgress(lessonData.lessonId, {
                    watchedSeconds: currentSec,
                    lastPositionSec: currentSec,
                    completed: false,
                  });
                } catch {
                  // Ignore transient auto-save failures while the learner is watching.
                }
              }}
              onTimeUpdate={async (e) => {
                if (videoCompletionTriggeredRef.current || lessonData.completed) {
                  return;
                }

                const duration = Number(e.currentTarget.duration || 0);
                const currentTime = Number(e.currentTarget.currentTime || 0);

                if (!duration || currentTime / duration < 0.9) {
                  return;
                }

                videoCompletionTriggeredRef.current = true;

                try {
                  const watchedSec = Math.floor(currentTime);
                  await saveLessonProgress(lessonData.lessonId, {
                    watchedSeconds: watchedSec,
                    lastPositionSec: watchedSec,
                    completed: false,
                  });
                } catch {
                  // Ignore transient save errors before completion handoff.
                }

                await onLessonCompleted?.({ autoNavigate: false });
              }}
              onEnded={async (e) => {
                if (videoCompletionTriggeredRef.current) {
                  return;
                }

                videoCompletionTriggeredRef.current = true;
                const totalSec = Math.floor(e.currentTarget.duration || 0);
                try {
                  await saveLessonProgress(lessonData.lessonId, {
                    watchedSeconds: totalSec,
                    lastPositionSec: totalSec,
                    completed: false,
                  });
                } catch {
                  // Ignore transient save errors before completion handoff.
                }

                await onLessonCompleted?.({ autoNavigate: false });
              }}
            />
          )
        ) : lessonData.thumbnailUrl ? (
          <img
            src={toAssetUrl(lessonData.thumbnailUrl)}
            alt={lessonData.title}
            className={styles.lessonImage}
          />
        ) : (
          <div className={styles.emptyMedia}>Không có video cho bài học này.</div>
        )}
      </div>

      <div className={styles.lessonHeader}>
        <div className={styles.lessonHeaderTop}>
          <div className={styles.lessonTitleBlock}>
            <h2>{lessonData.title}</h2>
            <p>{lessonData.description || "Chưa có mô tả bài học."}</p>
          </div>
          <div className={styles.lessonQuickActions}>
            <button
              type="button"
              className={styles.addNoteBtn}
              onClick={openNotePanel}
            >
              + Thêm ghi chú
            </button>
            <button
              type="button"
              className={bookmarked ? styles.bookmarkBtnActive : styles.bookmarkBtn}
              onClick={handleToggleBookmark}
              disabled={bookmarkBusy}
            >
              {bookmarkBusy
                ? "Đang lưu..."
                : bookmarked
                  ? "Đã đánh dấu"
                  : "Đánh dấu"}
            </button>
          </div>
        </div>
        {bookmarked ? (
          <div className={styles.lessonStatusNote}>Đã đánh dấu để xem lại sau</div>
        ) : null}
      </div>

      {lessonResources.length > 0 ? (
        <div className={styles.resourceBox}>
          <div className={styles.panelHead}>
            <h3>Tài liệu đính kèm</h3>
            <span>{lessonResources.length} tệp</span>
          </div>

          <div className={styles.resourceList}>
            {lessonResources.map((resource) => (
              <a
                key={resource.id}
                href={toAssetUrl(resource.fileUrl)}
                target="_blank"
                rel="noreferrer"
                className={styles.resourceItem}
              >
                <strong>{resource.fileName || "Tài liệu"}</strong>
                <span>
                  {resource.fileType || "File"}
                  {resource.fileSize ? ` • ${resource.fileSize} bytes` : ""}
                </span>
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {lessonData.content ? (
        <div className={styles.textBlock}>
          <h3>Nội dung bài học</h3>
          <div
            className={styles.lessonHtml}
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(lessonData.content || ""),
            }}
          />
        </div>
      ) : null}

      {(lessonData.blocks || []).length > 0 ? (
        <div className={styles.blocks}>
          {(lessonData.blocks || []).map((block) => (
            <div key={block.id} className={styles.blockItem}>
              <div className={styles.blockHead}>
                <span className={styles.blockType}>
                  {getBlockTitle(block.blockType)}
                </span>
                {block.title ? <strong>{block.title}</strong> : null}
              </div>

              {block.blockType === "TEXT" && block.content ? (
                <div className={styles.blockContent}>{block.content}</div>
              ) : null}

              {block.blockType === "IMAGE" && block.mediaUrl ? (
                <img
                  src={toAssetUrl(block.mediaUrl)}
                  alt={block.title || "block-image"}
                  className={styles.blockImage}
                />
              ) : null}

              {block.blockType === "VIDEO" && block.mediaUrl ? (
                isYoutubeUrl(block.mediaUrl) ? (
                  <iframe
                    className={styles.youtubeFrame}
                    src={toYoutubeEmbedUrl(block.mediaUrl)}
                    title={block.title || "YouTube video player"}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                ) : (
                  <video
                    className={styles.blockVideo}
                    controls
                    src={toAssetUrl(block.mediaUrl)}
                  />
                )
              ) : null}

              {block.blockType === "FILE" && block.mediaUrl ? (
                <a
                  href={toAssetUrl(block.mediaUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.fileLink}
                >
                  Mở tài liệu
                </a>
              ) : null}

              {block.blockType === "QUIZ" && block.quizId ? (
                <QuizBlock
                  quizId={block.quizId}
                  getLearningQuiz={learningApi.getLearningQuiz}
                  startLearningQuiz={learningApi.startLearningQuiz}
                  saveQuizAnswer={learningApi.saveQuizAnswer}
                  submitLearningQuiz={learningApi.submitLearningQuiz}
                  onQuizSubmitted={onLearningStateChange}
                />
              ) : null}

              {block.blockType === "ASSIGNMENT" && block.assignmentId ? (
                <AssignmentBlock
                  assignmentId={block.assignmentId}
                  getLearningAssignment={learningApi.getLearningAssignment}
                  saveAssignmentSubmission={
                    learningApi.saveAssignmentSubmission
                  }
                  uploadAssignmentSubmissionFiles={
                    learningApi.uploadAssignmentSubmissionFiles
                  }
                  deleteAssignmentSubmissionFile={
                    learningApi.deleteAssignmentSubmissionFile
                  }
                  onAssignmentSubmitted={onLearningStateChange}
                />
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {!lessonData.videoUrl && lessonData.content ? (
        <div ref={readingCompletionRef} className={styles.readingCompletionTrigger} />
      ) : null}

      <LessonDiscussion lessonId={lessonData.lessonId} />

      {notesOpen ? (
        <div className={styles.noteOverlay}>
          <button
            type="button"
            className={styles.noteBackdrop}
            aria-label="Đóng ghi chú"
            onClick={() => setNotesOpen(false)}
          />
          <section className={`${styles.notesBox} ${styles.noteDrawer}`}>
            <div className={styles.noteInlineHead}>
              <h3>{editingNoteId ? "Cập nhật ghi chú" : "Thêm ghi chú"}</h3>
              <button type="button" onClick={() => setNotesOpen(false)}>
                Đóng
              </button>
            </div>

            <div className={styles.noteForm}>
              <div className={styles.noteEditorWrap}>
                <ReactQuill
                  ref={noteQuillRef}
                  theme="snow"
                  value={noteContent}
                  onChange={setNoteContent}
                  modules={noteEditorModules}
                  formats={NOTE_EDITOR_FORMATS}
                  placeholder="Ghi lại ý chính, thắc mắc hoặc việc cần xem lại..."
                  className={styles.noteRichEditor}
                />
              </div>

              <div className={styles.noteFormRow}>
                <div className={styles.noteActions}>
                  <button
                    type="button"
                    className={styles.noteGhostBtn}
                    onClick={() => {
                      resetNoteForm();
                      setNotesOpen(false);
                    }}
                    disabled={noteBusy}
                  >
                    Hủy bỏ
                  </button>

                  <button
                    type="button"
                    className={styles.notePrimaryBtn}
                    onClick={handleSubmitNote}
                    disabled={noteBusy}
                  >
                    {noteBusy
                      ? "Đang lưu..."
                      : editingNoteId
                        ? "Cập nhật"
                        : "Tạo ghi chú"}
                  </button>
                </div>
              </div>

              {noteError ? (
                <div className={styles.noteError}>{noteError}</div>
              ) : null}
            </div>

            <div className={styles.noteList}>
              {notes.length === 0 ? (
                <div className={styles.noteEmpty}>
                  Chưa có ghi chú nào cho bài học này.
                </div>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className={styles.noteItem}>
                    <div className={styles.noteItemHead}>
                      <strong>Ghi chú</strong>
                      <span>
                        {note.updatedAt
                          ? new Date(note.updatedAt).toLocaleString("vi-VN")
                          : ""}
                      </span>
                    </div>

                    <div
                      className={styles.noteRichContent}
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(note.noteContent || ""),
                      }}
                    />

                    <div className={styles.noteItemActions}>
                      <button
                        type="button"
                        className={styles.noteTextBtn}
                        onClick={() => handleEditNote(note)}
                        disabled={noteBusy}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        className={styles.noteDeleteBtn}
                        onClick={() => handleDeleteNote(note.id)}
                        disabled={noteBusy}
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
