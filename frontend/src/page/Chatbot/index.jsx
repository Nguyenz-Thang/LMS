import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, MessageCircle, Plus, Send, Trash2 } from "lucide-react";
import { useLearningApi } from "../../api/learningApi";
import styles from "./Chatbot.module.scss";

const CONTEXT_LABELS = {
  GENERAL: "Tổng quát",
  COURSE: "Khóa học",
  LESSON: "Bài học",
};

const TITLE_REPLACEMENTS = {
  "Hoi thoai moi": "Hội thoại mới",
  "Toi nen hoc tiep bai nao?": "Tôi nên xem tiến độ ở đâu?",
  "Tom tat tien do hoc tap cua toi": "Tóm tắt tiến độ học tập của tôi",
  "Goi y ke hoach on tap hom nay": "Gợi ý kế hoạch ôn tập hôm nay",
};

function getConversationTitle(conversation) {
  const title = conversation?.title?.trim();
  if (!title) return "Hội thoại mới";
  if (TITLE_REPLACEMENTS[title]) return TITLE_REPLACEMENTS[title];
  if (title.startsWith("Tro ly bai hoc:")) {
    return title.replace("Tro ly bai hoc:", "Trợ lý bài học:");
  }
  if (title.startsWith("Tro ly khoa hoc:")) {
    return title.replace("Tro ly khoa hoc:", "Trợ lý khóa học:");
  }
  return title;
}

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

  return lines.map((line, lineIndex) => {
    const normalizedLine = line.replace(/^\s*\*\s+/, "• ").trimEnd();

    return (
      <span key={`line-${lineIndex}`} className={styles.messageLine}>
        {renderInlineContent(normalizedLine)}
      </span>
    );
  });
}

function normalizeMessageLines(content = "") {
  const preparedContent = content
    .replace(/\s+(?=(?:Link|Link học|Bạn sẽ học được gì|Lý do phù hợp):)/g, "\n")
    .replace(/([.!?])\s+(?=\d+\.\s)/g, "$1\n\n");
  const rawLines = preparedContent.split(/\r?\n/).map((line) => line.trim());
  const lines = [];

  for (let index = 0; index < rawLines.length; index++) {
    const line = rawLines[index];
    if (!line) continue;

    if (
      /^(\*|•|\d+\.)$/.test(line) &&
      /^(Link|Link học|Bạn sẽ học được gì|Lý do phù hợp):$/i.test(
        rawLines[index + 1],
      ) &&
      rawLines[index + 2]
    ) {
      lines.push(
        `${line === "*" ? "•" : line} ${rawLines[index + 1].trim()} ${rawLines[
          index + 2
        ].trim()}`,
      );
      index += 2;
      continue;
    }

    if (/^(\*|•|\d+\.)$/.test(line) && rawLines[index + 1]) {
      lines.push(`${line === "*" ? "•" : line} ${rawLines[index + 1].trim()}`);
      index += 1;
      continue;
    }

    if (
      /^(Link|Link học|Bạn sẽ học được gì|Lý do phù hợp):$/i.test(line) &&
      rawLines[index + 1]
    ) {
      lines.push(`${line} ${rawLines[index + 1].trim()}`);
      index += 1;
      continue;
    }

    lines.push(line);
  }

  return lines.join("\n");
}

function renderInlineContent(content = "") {
  const tokenPattern = /(https?:\/\/[^\s]+|\*\*[^*]+\*\*)/g;
  const parts = content.split(tokenPattern);

  return parts.map((part, index) => {
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

export default function Chatbot() {
  const api = useLearningApi();
  const messageListRef = useRef(null);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  const activeTitle = useMemo(
    () =>
      activeConversation
        ? getConversationTitle(activeConversation)
        : "Chatbot AI học tập",
    [activeConversation],
  );

  const loadConversations = async () => {
    const res = await api.listChatbotConversations();
    const list = Array.isArray(res?.result)
      ? res.result.filter((item) => item.contextType === "GENERAL")
      : [];
    setConversations(list);
    return list;
  };

  const openConversation = async (conversationId) => {
    setLoading(true);
    setErrorText("");
    try {
      const res = await api.getChatbotConversation(conversationId);
      const conversation = res?.result || {};
      setActiveConversation(conversation);
      setMessages(normalizeMessages(conversation.messages));
    } catch (error) {
      setErrorText(
        error?.body?.message || error?.message || "Không thể mở hội thoại.",
      );
    } finally {
      setLoading(false);
    }
  };

  const createConversation = async () => {
    setLoading(true);
    setErrorText("");
    try {
      const res = await api.createChatbotConversation({
        contextType: "GENERAL",
        title: "Hội thoại mới",
      });
      const conversation = res?.result || {};
      setActiveConversation(conversation);
      setMessages([]);
      await loadConversations();
    } catch (error) {
      setErrorText(
        error?.body?.message || error?.message || "Không thể tạo hội thoại.",
      );
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (event, conversationId) => {
    event.stopPropagation();
    if (!conversationId || loading) return;

    const confirmed = window.confirm("Xóa hội thoại này?");
    if (!confirmed) return;

    setLoading(true);
    setErrorText("");
    try {
      await api.deleteChatbotConversation(conversationId);
      const nextList = await loadConversations();
      if (activeConversation?.id === conversationId) {
        const nextConversation = nextList.find((item) => item.id !== conversationId);
        if (nextConversation) {
          await openConversation(nextConversation.id);
        } else {
          await createConversation();
        }
      }
    } catch (error) {
      setErrorText(
        error?.body?.message || error?.message || "Không thể xóa hội thoại.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    const init = async () => {
      setLoading(true);
      setErrorText("");
      try {
        const list = await loadConversations();
        if (ignore) return;
        if (list.length > 0) {
          await openConversation(list[0].id);
        } else {
          await createConversation();
        }
      } catch (error) {
        if (!ignore) {
          setErrorText(
            error?.body?.message ||
              error?.message ||
              "Không thể tải chatbot AI.",
          );
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    init();
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const messageList = messageListRef.current;
    if (!messageList) return;
    messageList.scrollTop = messageList.scrollHeight;
  }, [messages]);

  const askChatbot = async (promptText) => {
    const trimmed = promptText.trim();
    if (!trimmed || !activeConversation?.id) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setQuestion("");
    setLoading(true);
    setErrorText("");

    try {
      const res = await api.sendChatbotMessage(activeConversation.id, {
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
      await loadConversations();
    } catch (error) {
      setErrorText(
        error?.body?.message || error?.message || "Không thể gửi tin nhắn.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHead}>
          <div>
            <span>AI Learning</span>
            <h2>Lịch sử hội thoại</h2>
          </div>
          <button
            type="button"
            onClick={createConversation}
            disabled={loading}
            title="Tạo hội thoại mới"
            aria-label="Tạo hội thoại mới"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className={styles.conversationList}>
          {conversations.map((item) => (
            <div
              key={item.id}
              className={`${styles.conversationItem} ${
                activeConversation?.id === item.id ? styles.active : ""
              }`}
            >
              <button
                type="button"
                className={styles.conversationOpenBtn}
                onClick={() => openConversation(item.id)}
              >
                <MessageCircle size={18} />
                <span>{getConversationTitle(item)}</span>
                <small>{CONTEXT_LABELS[item.contextType] || "Tổng quát"}</small>
              </button>
              <button
                type="button"
                className={styles.deleteConversationBtn}
                onClick={(event) => deleteConversation(event, item.id)}
                disabled={loading}
                title="Xóa hội thoại"
                aria-label="Xóa hội thoại"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {!conversations.length && !loading ? (
            <div className={styles.emptySidebar}>Chưa có hội thoại nào.</div>
          ) : null}
        </div>
      </aside>

      <section className={styles.chatPanel}>
        <header className={styles.chatHead}>
          <div className={styles.botIcon}>
            <Bot size={24} />
          </div>
          <div>
            <span>Trợ lý cá nhân</span>
            <h1>{activeTitle}</h1>
            <p>
              Hỏi AI về khóa học, bài học, tiến độ học tập và nội dung cần ôn
              tập của bạn.
            </p>
          </div>
        </header>

        <div className={styles.messageList} ref={messageListRef}>
          {messages.length === 0 ? (
            <div className={styles.emptyState}>
              Đặt câu hỏi về khóa học, bài học, tiến độ học tập hoặc nội dung
              cần ôn tập của bạn.
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={`${message.role}-${message.id || index}`}
                className={
                  message.role === "user"
                    ? styles.messageUser
                    : styles.messageAi
                }
              >
                <strong>{message.role === "user" ? "Bạn" : "AI"}</strong>
                <div className={styles.messageContent}>
                  {renderMessageContent(message.content)}
                </div>
              </div>
            ))
          )}
        </div>

        <form
          className={styles.chatForm}
          onSubmit={(event) => {
            event.preventDefault();
            askChatbot(question);
          }}
        >
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.shiftKey) return;
              event.preventDefault();
              if (!loading && question.trim()) {
                askChatbot(question);
              }
            }}
            placeholder="Hỏi AI về khóa học hoặc bài học..."
          />
          <button type="submit" disabled={loading || !question.trim()}>
            <Send size={18} />
            {loading ? "Đang trả lời" : "Gửi"}
          </button>
        </form>

        {errorText ? <div className={styles.errorBox}>{errorText}</div> : null}
      </section>
    </div>
  );
}
