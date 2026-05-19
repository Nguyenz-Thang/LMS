import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  Bold,
  Code,
  Image,
  Italic,
  Lightbulb,
  Link,
  List,
  ListOrdered,
  MessageCircle,
  Quote,
  Send,
  ThumbsUp,
  Trash2,
  Unlink,
  X,
} from "lucide-react";
import {
  createLessonComment,
  deleteDiscussionReply,
  getLessonComments,
} from "../../../api/discussionApi";
import styles from "../Learning.module.scss";

function getAuthorName(author) {
  return author?.fullName?.trim() || author?.username || "Người học";
}

function getInitial(author) {
  return getAuthorName(author).charAt(0).toUpperCase() || "U";
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function insertTextAtCursor(textarea, value, onChange, before, after = "") {
  const start = textarea?.selectionStart ?? value.length;
  const end = textarea?.selectionEnd ?? value.length;
  const selected = value.slice(start, end);
  const nextValue = `${value.slice(0, start)}${before}${selected || ""}${after}${value.slice(end)}`;
  onChange(nextValue);

  requestAnimationFrame(() => {
    textarea?.focus();
    const cursor = start + before.length + (selected ? selected.length : 0);
    textarea?.setSelectionRange(cursor, cursor);
  });
}

function renderRichComment(content) {
  const text = content || "";
  const blocks = [];
  const parts = text.split(/(```[\s\S]*?```)/g);

  parts.forEach((part, partIndex) => {
    if (!part) return;

    if (part.startsWith("```") && part.endsWith("```")) {
      blocks.push(
        <pre key={`code-${partIndex}`} className={styles.commentCodeBlock}>
          <code>{part.slice(3, -3).trim()}</code>
        </pre>,
      );
      return;
    }

    part.split("\n").forEach((line, lineIndex) => {
      if (!line.trim()) {
        blocks.push(<br key={`br-${partIndex}-${lineIndex}`} />);
        return;
      }

      const imageMatch = line.match(/^!\[(.*?)]\((.*?)\)$/);
      if (imageMatch) {
        blocks.push(
          <img
            key={`img-${partIndex}-${lineIndex}`}
            className={styles.commentImage}
            src={imageMatch[2]}
            alt={imageMatch[1] || "comment attachment"}
          />,
        );
        return;
      }

      const children = [];
      const tokenRegex = /(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?]\(.*?\)|https?:\/\/[^\s]+)/g;
      let lastIndex = 0;
      let match;

      while ((match = tokenRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          children.push(line.slice(lastIndex, match.index));
        }

        const token = match[0];
        if (token.startsWith("**") && token.endsWith("**")) {
          children.push(<strong key={`${match.index}-b`}>{token.slice(2, -2)}</strong>);
        } else if (token.startsWith("*") && token.endsWith("*")) {
          children.push(<em key={`${match.index}-i`}>{token.slice(1, -1)}</em>);
        } else if (token.startsWith("`") && token.endsWith("`")) {
          children.push(<code key={`${match.index}-c`}>{token.slice(1, -1)}</code>);
        } else if (token.startsWith("[") && token.includes("](")) {
          const linkMatch = token.match(/^\[(.*?)]\((.*?)\)$/);
          children.push(
            <a key={`${match.index}-a`} href={linkMatch?.[2]} target="_blank" rel="noreferrer">
              {linkMatch?.[1] || linkMatch?.[2]}
            </a>,
          );
        } else {
          children.push(
            <a key={`${match.index}-url`} href={token} target="_blank" rel="noreferrer">
              {token}
            </a>,
          );
        }

        lastIndex = match.index + token.length;
      }

      if (lastIndex < line.length) {
        children.push(line.slice(lastIndex));
      }

      const isQuote = line.trim().startsWith(">");
      blocks.push(
        isQuote ? (
          <blockquote key={`line-${partIndex}-${lineIndex}`}>
            {line.replace(/^>\s?/, "")}
          </blockquote>
        ) : (
          <p key={`line-${partIndex}-${lineIndex}`}>{children}</p>
        ),
      );
    });
  });

  return blocks;
}

function CommentEditor({
  value,
  onChange,
  onSubmit,
  disabled,
  saving,
  placeholder,
  compact = false,
}) {
  const textareaRef = useState(null);
  const [textareaEl, setTextareaEl] = textareaRef;

  const applyFormat = (format) => {
    if (!textareaEl) return;
    if (format === "bold") insertTextAtCursor(textareaEl, value, onChange, "**", "**");
    if (format === "italic") insertTextAtCursor(textareaEl, value, onChange, "*", "*");
    if (format === "quote") insertTextAtCursor(textareaEl, value, onChange, "> ");
    if (format === "ul") insertTextAtCursor(textareaEl, value, onChange, "- ");
    if (format === "ol") insertTextAtCursor(textareaEl, value, onChange, "1. ");
    if (format === "inlineCode") insertTextAtCursor(textareaEl, value, onChange, "`", "`");
    if (format === "codeBlock") insertTextAtCursor(textareaEl, value, onChange, "```\n", "\n```");
    if (format === "link") {
      const url = window.prompt("Nhập URL liên kết");
      if (url) insertTextAtCursor(textareaEl, value, onChange, "[nội dung liên kết](", `${url})`);
    }
    if (format === "image") {
      const url = window.prompt("Nhập URL ảnh");
      if (url) insertTextAtCursor(textareaEl, value, onChange, "![mô tả ảnh](", `${url})`);
    }
    if (format === "unlink") {
      onChange(value.replace(/\[(.*?)]\(.*?\)/g, "$1"));
    }
  };

  const tools = [
    ["bold", Bold, "Đậm"],
    ["italic", Italic, "Nghiêng"],
    ["quote", Quote, "Trích dẫn"],
    ["ul", List, "Danh sách"],
    ["ol", ListOrdered, "Danh sách số"],
    ["inlineCode", Code, "Code inline"],
    ["codeBlock", Code, "Code block"],
    ["image", Image, "Ảnh URL"],
    ["link", Link, "Liên kết"],
    ["unlink", Unlink, "Bỏ liên kết"],
  ];

  return (
    <form
      className={`${styles.commentEditor} ${compact ? styles.commentEditorCompact : ""}`}
      onSubmit={onSubmit}
    >
      <div className={styles.commentToolbar}>
        {tools.map(([key, ToolIcon, label]) => {
          return (
            <button
              key={key}
              type="button"
              title={label}
              onClick={() => applyFormat(key)}
              disabled={disabled}
            >
              <ToolIcon size={compact ? 14 : 16} />
            </button>
          );
        })}
      </div>
      <textarea
        ref={setTextareaEl}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={compact ? 2 : 4}
      />
      <button type="submit" disabled={saving || !value.trim() || disabled}>
        <Send size={16} />
        {compact ? "Gửi" : saving ? "Đang gửi..." : "Gửi bình luận"}
      </button>
    </form>
  );
}

export default function LessonDiscussion({ lessonId }) {
  const [comments, setComments] = useState([]);
  const [topic, setTopic] = useState(null);
  const [content, setContent] = useState("");
  const [open, setOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState("");
  const [replyContent, setReplyContent] = useState("");
  const [expandedReplies, setExpandedReplies] = useState({});
  const [likedMap, setLikedMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    if (!lessonId) return;
    setContent("");
    fetchComments();
  }, [lessonId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      setErrorText("");
      const res = await getLessonComments(lessonId);
      const data = res?.result || null;
      setTopic(data);
      setComments(Array.isArray(data?.replies) ? data.replies : []);
    } catch (error) {
      setComments([]);
      setErrorText(
        error?.response?.data?.message || "Không tải được bình luận bài học.",
      );
    } finally {
      setLoading(false);
    }
  };

  const { rootComments, repliesByParent } = useMemo(() => {
    const replyMap = {};
    const roots = [];

    comments.forEach((comment) => {
      if (comment.parentReplyId) {
        replyMap[comment.parentReplyId] = [
          ...(replyMap[comment.parentReplyId] || []),
          comment,
        ];
      } else {
        roots.push(comment);
      }
    });

    return { rootComments: roots, repliesByParent: replyMap };
  }, [comments]);

  const submitComment = async (event) => {
    event.preventDefault();
    const trimmedContent = content.trim();
    if (!trimmedContent) return;

    try {
      setSaving(true);
      setErrorText("");
      await createLessonComment(lessonId, {
        content: trimmedContent,
      });
      setContent("");
      await fetchComments();
    } catch (error) {
      setErrorText(
        error?.response?.data?.message || "Không gửi được bình luận.",
      );
    } finally {
      setSaving(false);
    }
  };

  const submitReply = async (event, parentId) => {
    event.preventDefault();
    const trimmedContent = replyContent.trim();
    if (!trimmedContent || !parentId) return;

    try {
      setSaving(true);
      setErrorText("");
      await createLessonComment(lessonId, {
        parentReplyId: parentId,
        content: trimmedContent,
      });
      setReplyContent("");
      setReplyingTo("");
      setExpandedReplies((prev) => ({ ...prev, [parentId]: true }));
      await fetchComments();
    } catch (error) {
      setErrorText(
        error?.response?.data?.message || "Không gửi được câu trả lời.",
      );
    } finally {
      setSaving(false);
    }
  };

  const removeComment = async (commentId) => {
    const confirmed = window.confirm("Xóa bình luận này?");
    if (!confirmed) return;

    try {
      setErrorText("");
      await deleteDiscussionReply(commentId);
      await fetchComments();
    } catch (error) {
      setErrorText(
        error?.response?.data?.message || "Không xóa được bình luận.",
      );
    }
  };

  const toggleLike = (commentId) => {
    setLikedMap((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  const renderComment = (comment, nested = false) => {
    const childReplies = repliesByParent[comment.id] || [];
    const expanded = Boolean(expandedReplies[comment.id]);

    return (
      <article
        key={comment.id}
        className={`${styles.lessonCommentItem} ${
          nested ? styles.lessonCommentItemNested : ""
        }`}
      >
        <div className={styles.lessonCommentAvatar}>
          {getInitial(comment.author)}
        </div>

        <div className={styles.lessonCommentBody}>
          <div className={styles.lessonCommentHead}>
            <div>
              <strong>{getAuthorName(comment.author)}</strong>
              <span>{formatDate(comment.createdAt)}</span>
            </div>

            <div className={styles.lessonCommentMenu}>
              {comment.canDelete ? (
                <button
                  type="button"
                  onClick={() => removeComment(comment.id)}
                  aria-label="Xóa bình luận"
                  title="Xóa bình luận"
                >
                  <Trash2 size={16} />
                </button>
              ) : null}
            </div>
          </div>

          <div className={styles.commentRichText}>{renderRichComment(comment.content)}</div>

          <div className={styles.lessonCommentActions}>
            <button
              type="button"
              className={likedMap[comment.id] ? styles.commentActionActive : ""}
              onClick={() => toggleLike(comment.id)}
            >
              <ThumbsUp size={14} />
              Thích
            </button>
            {!nested ? (
              <button
                type="button"
                onClick={() => {
                  setReplyingTo((prev) => (prev === comment.id ? "" : comment.id));
                  setReplyContent("");
                }}
              >
                Phản hồi
              </button>
            ) : null}
          </div>

          {!nested && replyingTo === comment.id ? (
            <CommentEditor
              compact
              value={replyContent}
              onChange={setReplyContent}
              placeholder={`Trả lời ${getAuthorName(comment.author)}...`}
              disabled={Boolean(topic?.locked)}
              saving={saving}
              onSubmit={(event) => submitReply(event, comment.id)}
            />
          ) : null}

          {!nested && childReplies.length > 0 ? (
            <div className={styles.lessonReplyGroup}>
              <button
                type="button"
                className={styles.lessonReplyToggle}
                onClick={() =>
                  setExpandedReplies((prev) => ({
                    ...prev,
                    [comment.id]: !prev[comment.id],
                  }))
                }
              >
                {expanded
                  ? "Ẩn câu trả lời"
                  : `Xem ${childReplies.length} câu trả lời`}
              </button>

              {expanded ? childReplies.map((reply) => renderComment(reply, true)) : null}
            </div>
          ) : null}
        </div>
      </article>
    );
  };

  return (
    <>
      <button
        type="button"
        className={styles.qaFloatingButton}
        onClick={() => setOpen(true)}
      >
        <MessageCircle size={18} />
        Hỏi đáp
      </button>

      {open ? (
        <div className={styles.qaOverlay}>
          <button
            type="button"
            className={styles.qaBackdrop}
            aria-label="Đóng hỏi đáp"
            onClick={() => setOpen(false)}
          />

          <aside className={styles.qaDrawer}>
            <header className={styles.qaDrawerHead}>
              <div>
                <h3>Hỏi đáp bài học</h3>
                <span>{comments.length} bình luận</span>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Đóng">
                <X size={22} />
              </button>
            </header>

            <div className={styles.qaEditorWrap}>
              <Lightbulb size={18} />
              <CommentEditor
                value={content}
                onChange={setContent}
                onSubmit={submitComment}
                disabled={Boolean(topic?.locked)}
                saving={saving}
                placeholder="Nhập bình luận, câu hỏi code, lỗi gặp phải..."
              />
            </div>

            {errorText ? (
              <div className={styles.lessonDiscussionError}>{errorText}</div>
            ) : null}

            <div className={styles.qaNotice}>
              <strong>{comments.length} bình luận</strong>
              <span>Nếu thấy bình luận spam, hãy bấm báo cáo giúp admin.</span>
            </div>

            {loading ? (
              <div className={styles.lessonDiscussionState}>Đang tải bình luận...</div>
            ) : rootComments.length === 0 ? (
              <div className={styles.lessonDiscussionState}>
                Chưa có bình luận nào cho bài học này.
              </div>
            ) : (
              <div className={styles.lessonCommentList}>
                {rootComments.map((comment) => renderComment(comment))}
              </div>
            )}

            {topic?.locked ? (
              <div className={styles.lessonDiscussionLocked}>
                <MessageCircle size={16} />
                Chủ đề bình luận của bài học đang bị khóa.
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}
    </>
  );
}

LessonDiscussion.propTypes = {
  lessonId: PropTypes.string,
};
