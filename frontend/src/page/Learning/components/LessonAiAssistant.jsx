import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, X } from "lucide-react";
import styles from "../Learning.module.scss";

function normalizeMessages(messages = []) {
  return messages
    .filter((item) => item.senderType === "USER" || item.senderType === "AI")
    .map((item) => ({
      id: item.id,
      role: item.senderType === "USER" ? "user" : "assistant",
      content: item.messageText || "",
    }));
}

function renderMessageContent(content = "") {
  const lines = normalizeMessageLines(content).split(/\r?\n/);

  return lines.map((line, lineIndex) => (
    <span key={`line-${lineIndex}`} className={styles.aiMessageLine}>
      {renderInlineContent(line)}
    </span>
  ));
}

function normalizeMessageLines(content = "") {
  return content
    .replace(/\s+(?=(?:Tóm tắt|Nội dung chính|Ví dụ|Lưu ý|Gợi ý|Bước|Kết luận):)/g, "\n\n")
    .replace(/([.!?])\s+(?=[A-ZÀ-ỴĐ])/g, "$1\n\n")
    .replace(/\s+(?=\d+\.\s)/g, "\n")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function renderInlineContent(content = "") {
  const tokenPattern = /(https?:\/\/[^\s]+|\*\*[^*]+\*\*)/g;
  return content.split(tokenPattern).map((part, index) => {
    if (part.startsWith("http://") || part.startsWith("https://")) {
      const cleanUrl = part.replace(/[.,)]$/, "");
      const trailingText = part.slice(cleanUrl.length);

      return (
        <span key={`${part}-${index}`}>
          <a href={cleanUrl} target="_blank" rel="noreferrer">
            {cleanUrl}
          </a>
          {trailingText}
        </span>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export default function LessonAiAssistant({ lessonData, learningApi }) {
  const messageListRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    setConversation(null);
    setMessages([]);
    setQuestion("");
    setErrorText("");
  }, [lessonData?.lessonId]);

  useEffect(() => {
    const messageList = messageListRef.current;
    if (!messageList) return;
    messageList.scrollTop = messageList.scrollHeight;
  }, [messages, open]);

  const openAssistant = async () => {
    if (!lessonData?.lessonId) return;
    setOpen(true);

    if (conversation?.lessonId === lessonData.lessonId) {
      return;
    }

    try {
      setLoading(true);
      setErrorText("");
      const res = await learningApi.getLessonChatbotConversation(
        lessonData.lessonId,
      );
      const nextConversation = res?.result || null;
      setConversation(nextConversation);
      setMessages(normalizeMessages(nextConversation?.messages));
    } catch (error) {
      setErrorText(
        error?.body?.message || error?.message || "Không thể mở trợ lý bài học.",
      );
    } finally {
      setLoading(false);
    }
  };

  const askAssistant = async (promptText) => {
    const trimmed = promptText.trim();
    if (!trimmed || !conversation?.id || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setQuestion("");
    setLoading(true);
    setErrorText("");

    try {
      const res = await learningApi.sendChatbotMessage(conversation.id, {
        message: trimmed,
      });
      const result = res?.result || {};
      setMessages((prev) => [
        ...prev,
        {
          id: result.id,
          role: "assistant",
          content: result.messageText || "AI chưa trả về nội dung.",
        },
      ]);
    } catch (error) {
      setErrorText(
        error?.body?.message || error?.message || "Không thể gửi câu hỏi.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!lessonData?.lessonId) return null;

  return (
    <>
      <button
        type="button"
        className={styles.aiFloatingButton}
        onClick={openAssistant}
        title="Trợ lý bài học"
        aria-label="Trợ lý bài học"
      >
        <Bot size={18} />
      </button>

      {open ? (
        <div className={styles.aiOverlay}>
          <button
            type="button"
            className={styles.aiBackdrop}
            aria-label="Đóng trợ lý AI"
            onClick={() => setOpen(false)}
          />

          <section className={styles.aiDrawer}>
            <header className={styles.aiDrawerHead}>
              <div className={styles.aiTitleRow}>
                <span className={styles.aiIcon}>
                  <Bot size={20} />
                </span>
                <div>
                  <h3>Trợ lý bài học</h3>
                  <p>{lessonData.title || "Bài học hiện tại"}</p>
                </div>
              </div>

              <button
                type="button"
                className={styles.aiCloseBtn}
                onClick={() => setOpen(false)}
                aria-label="Đóng trợ lý AI"
              >
                <X size={18} />
              </button>
            </header>

            <div className={styles.aiQuickActions}>
              <button
                type="button"
                onClick={() => askAssistant("Tóm tắt những ý chính của bài học này")}
                disabled={loading || !conversation?.id}
              >
                <Sparkles size={16} />
                <span>Tóm tắt bài học</span>
              </button>
            </div>

            <div className={styles.aiMessageList} ref={messageListRef}>
              {messages.length === 0 ? (
                <div className={styles.aiEmptyState}>
                  Hỏi về nội dung bài học, video, bài đọc hoặc tài liệu đính kèm.
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={`${message.role}-${message.id || index}`}
                    className={
                      message.role === "user"
                        ? styles.aiMessageUser
                        : styles.aiMessageBot
                    }
                  >
                    <strong>{message.role === "user" ? "Bạn" : "AI"}</strong>
                    <div className={styles.aiMessageContent}>
                      {renderMessageContent(message.content)}
                    </div>
                  </div>
                ))
              )}
            </div>

            <form
              className={styles.aiForm}
              onSubmit={(event) => {
                event.preventDefault();
                askAssistant(question);
              }}
            >
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" || event.shiftKey) return;
                  event.preventDefault();
                  askAssistant(question);
                }}
                placeholder="Nhập câu hỏi về bài học..."
              />
              <button type="submit" disabled={loading || !question.trim()}>
                <Send size={18} />
                <span>{loading ? "Đang trả lời" : "Gửi"}</span>
              </button>
            </form>

            {errorText ? <div className={styles.aiError}>{errorText}</div> : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
