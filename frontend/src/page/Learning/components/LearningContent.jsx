import { useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { Download } from "lucide-react";
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
import LessonAiAssistant from "./LessonAiAssistant";

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

function getCleanLessonTitle(title = "") {
  return title.replace(/^\s*(Bài\s*đọc|Video|Quiz|Bài\s*tập)\s*:\s*/i, "").trim();
}

function formatUpdatedAt(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `Cập nhật ${date.toLocaleDateString("vi-VN", {
    month: "long",
    year: "numeric",
  })}`;
}

function formatFileSize(bytes) {
  const size = Number(bytes || 0);
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
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
}) {
  const readingCompletionRef = useRef(null);
  const noteQuillRef = useRef(null);
  const youtubeFrameRef = useRef(null);
  const youtubePlayerRef = useRef(null);
  const videoCompletionTriggeredRef = useRef(false);
  const [notes, setNotes] = useState([]);
  const [noteContent, setNoteContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState("");
  const [noteError, setNoteError] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [mediaError, setMediaError] = useState(false);

  useEffect(() => {
    setNotes(Array.isArray(lessonData?.notes) ? lessonData.notes : []);
    videoCompletionTriggeredRef.current = false;
    setNoteContent("");
    setEditingNoteId("");
    setNoteError("");
    setNotesOpen(false);
    setMediaError(false);
  }, [lessonData]);

  const hasRequiredInteractiveBlock = useMemo(
    () =>
      (lessonData?.blocks || []).some(
        (block) =>
          block.blockType === "QUIZ" || block.blockType === "ASSIGNMENT",
      ),
    [lessonData?.blocks],
  );

  const hasQuizBlock = useMemo(
    () => (lessonData?.blocks || []).some((block) => block.blockType === "QUIZ"),
    [lessonData?.blocks],
  );
  const isReadingLesson = Boolean(lessonData?.content) && !lessonData?.videoUrl;

  useEffect(() => {
    if (
      !lessonData?.lessonId ||
      lessonData?.completed ||
      lessonData?.videoUrl ||
      hasRequiredInteractiveBlock ||
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
          onLessonCompleted?.({ autoNavigate: false });
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
    hasRequiredInteractiveBlock,
    onLessonCompleted,
  ]);

  const visibleBlocks = useMemo(
    () =>
      (lessonData?.blocks || []).filter((block) => {
        if (block.blockType === "TEXT" || block.blockType === "FILE") {
          return false;
        }

        if (block.blockType === "VIDEO" && lessonData?.videoUrl) {
          return false;
        }

        return true;
      }),
    [lessonData?.blocks, lessonData?.videoUrl],
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
    return `${baseUrl}${separator}rel=0&enablejsapi=1${lastPosition > 0 ? `&start=${lastPosition}` : ""}`;
  };

  const completeVideoLesson = async (watchedSeconds = 0) => {
    if (videoCompletionTriggeredRef.current || lessonData?.completed) {
      return;
    }

    videoCompletionTriggeredRef.current = true;

    try {
      await saveLessonProgress(lessonData.lessonId, {
        watchedSeconds,
        lastPositionSec: watchedSeconds,
        completed: false,
      });
    } catch {
      // Ignore transient save errors before completion handoff.
    }

    await onLessonCompleted?.({ autoNavigate: false });
  };

  useEffect(() => {
    if (
      !lessonData?.lessonId ||
      !lessonData?.videoUrl ||
      !isYoutubeUrl(lessonData.videoUrl) ||
      lessonData.completed ||
      !youtubeFrameRef.current
    ) {
      return undefined;
    }

    let cancelled = false;
    let pollId = null;

    const setupPlayer = () => {
      if (cancelled || !window.YT?.Player || !youtubeFrameRef.current) {
        return;
      }

      youtubePlayerRef.current = new window.YT.Player(youtubeFrameRef.current, {
        events: {
          onStateChange: async (event) => {
            const ended = event.data === window.YT.PlayerState.ENDED;
            if (!ended) return;

            const duration = Math.floor(
              event.target?.getDuration?.() || lessonData.durationMinutes * 60 || 0,
            );
            await completeVideoLesson(duration);
          },
        },
      });

      pollId = window.setInterval(async () => {
        const player = youtubePlayerRef.current;
        if (!player?.getDuration || !player?.getCurrentTime) return;

        const duration = Number(player.getDuration() || 0);
        const currentTime = Number(player.getCurrentTime() || 0);
        if (duration > 0 && currentTime / duration >= 0.9) {
          await completeVideoLesson(Math.floor(currentTime));
        }
      }, 3000);
    };

    if (window.YT?.Player) {
      setupPlayer();
    } else {
      const previousReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previousReady?.();
        setupPlayer();
      };

      if (!document.querySelector("script[src='https://www.youtube.com/iframe_api']")) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      if (pollId) window.clearInterval(pollId);
      youtubePlayerRef.current = null;
    };
  }, [
    lessonData?.completed,
    lessonData?.durationMinutes,
    lessonData?.lessonId,
    lessonData?.videoUrl,
    saveLessonProgress,
    onLessonCompleted,
  ]);

  const renderMainMedia = () => {
    if (lessonData.videoUrl && isYoutubeUrl(lessonData.videoUrl)) {
      return (
        <iframe
          ref={youtubeFrameRef}
          className={styles.youtubeFrame}
          src={getYoutubeLessonEmbedUrl()}
          title={lessonData.title || "YouTube video player"}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      );
    }

    if (lessonData.videoUrl) {
      return (
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

            await completeVideoLesson(Math.floor(currentTime));
          }}
          onEnded={async (e) => {
            const totalSec = Math.floor(e.currentTarget.duration || 0);
            await completeVideoLesson(totalSec);
          }}
        />
      );
    }

    if (lessonData.thumbnailUrl) {
      if (mediaError) {
        return null;
      }

      return (
        <img
          src={toAssetUrl(lessonData.thumbnailUrl)}
          alt={lessonData.title}
          className={styles.lessonImage}
          onError={() => setMediaError(true)}
        />
      );
    }

    return null;
  };

  const resetNoteForm = () => {
    setNoteContent("");
    setEditingNoteId("");
    setNoteError("");
  };

  const openNotePanel = () => {
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

  const handleDownloadResource = async (resource) => {
    const fileUrl = toAssetUrl(resource.fileUrl);
    const fileName = resource.fileName || "tai-lieu";

    try {
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(fileUrl, "_blank", "noopener,noreferrer");
    }
  };


  if (loadingLesson) {
    return <div className={styles.lessonState}>Đang tải bài học...</div>;
  }

  if (!lessonData) {
    return <div className={styles.lessonState}>Chưa có bài học để hiển thị.</div>;
  }

  const displayTitle = getCleanLessonTitle(lessonData.title || "");
  const updatedText = formatUpdatedAt(lessonData.updatedAt);
  const resourceItems =
    Array.isArray(lessonData.resources) && lessonData.resources.length > 0
      ? lessonData.resources
      : (lessonData.blocks || [])
          .filter((block) => block.blockType === "FILE" && block.mediaUrl)
          .map((block) => ({
            id: block.id,
            fileName: block.title,
            fileUrl: block.mediaUrl,
            fileType: block.content,
          }));

  return (
    <>
      {lessonData.videoUrl ? (
        <div className={styles.mediaBox}>{renderMainMedia()}</div>
      ) : null}

      <div
        className={`${styles.lessonHeader} ${
          hasQuizBlock ? styles.quizLessonHeader : ""
        } ${isReadingLesson ? styles.readingLessonHeader : ""}`}
      >
        <div className={styles.lessonHeaderTop}>
          <div className={styles.lessonTitleBlock}>
            <h2>{displayTitle}</h2>
            {updatedText ? (
              <p className={styles.lessonUpdatedAt}>{updatedText}</p>
            ) : null}
            {stripHtml(lessonData.description || "") ? (
              <div
                className={styles.lessonDescription}
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(lessonData.description || ""),
                }}
              />
            ) : null}
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
          </div>
        </div>
      </div>

      {lessonData.content && !hasQuizBlock ? (
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

      {resourceItems.length > 0 ? (
        <section className={styles.resourceBox}>
          <div className={styles.panelHead}>
            <h3>Tài liệu đính kèm</h3>
            <span>{resourceItems.length} file</span>
          </div>
          <div className={styles.resourceList}>
            {resourceItems.map((resource) => (
              <div
                key={resource.id || resource.fileUrl}
                className={styles.resourceItem}
              >
                <div>
                  <strong>{resource.fileName || "Tài liệu"}</strong>
                  <span>
                    {[resource.fileType, formatFileSize(resource.fileSize)]
                      .filter(Boolean)
                      .join(" · ") || "File đính kèm"}
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.downloadResourceBtn}
                  aria-label={`Tải về ${resource.fileName || "tài liệu"}`}
                  title="Tải về"
                  onClick={() => handleDownloadResource(resource)}
                >
                  <Download size={18} />
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {visibleBlocks.length > 0 ? (
        <div className={styles.blocks}>
          {visibleBlocks.map((block) => (
            <div
              key={block.id}
              className={`${styles.blockItem} ${
                block.blockType === "QUIZ" || block.blockType === "ASSIGNMENT"
                  ? styles.interactiveBlock
                  : ""
              } ${block.blockType === "QUIZ" ? styles.quizBlockItem : ""}`}
            >
              {block.blockType !== "QUIZ" && block.blockType !== "ASSIGNMENT" ? (
                <div className={styles.blockHead}>
                <span className={styles.blockType}>
                  {getBlockTitle(block.blockType)}
                </span>
                {block.title ? <strong>{block.title}</strong> : null}
                </div>
              ) : null}

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
                  onQuizSubmitted={onLessonCompleted}
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

      {!lessonData.videoUrl && lessonData.content && !hasRequiredInteractiveBlock ? (
        <div ref={readingCompletionRef} className={styles.readingCompletionTrigger} />
      ) : null}

      <LessonDiscussion lessonId={lessonData.lessonId} />

      <LessonAiAssistant lessonData={lessonData} learningApi={learningApi} />

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
