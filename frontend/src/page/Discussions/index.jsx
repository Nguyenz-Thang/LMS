import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Lock,
  MessageSquare,
  Pin,
  Plus,
  Search,
  Send,
  Trash2,
  Unlock,
  X,
} from "lucide-react";
import {
  createDiscussionReply,
  createDiscussionTopic,
  deleteDiscussionReply,
  deleteDiscussionTopic,
  getDiscussionTopic,
  getDiscussionTopics,
  moderateDiscussionTopic,
} from "../../api/discussionApi";
import { useCourseApi } from "../../api/courseApi";
import styles from "./Discussions.module.scss";

const PAGE_SIZE = 8;

function getAuthorName(author) {
  return author?.fullName?.trim() || author?.username || "Người dùng";
}

function formatDate(value) {
  if (!value) return "Gần đây";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Gần đây";
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getInitial(author) {
  return getAuthorName(author).charAt(0).toUpperCase() || "U";
}

export default function Discussions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { listCourses } = useCourseApi();

  const activeTopicId = searchParams.get("topicId") || "";
  const initialCourseId = searchParams.get("courseId") || "";

  const [topics, setTopics] = useState([]);
  const [activeTopic, setActiveTopic] = useState(null);
  const [courses, setCourses] = useState([]);
  const [pageInfo, setPageInfo] = useState({
    page: 0,
    totalPages: 0,
    totalElements: 0,
  });
  const [page, setPage] = useState(0);
  const [courseId, setCourseId] = useState(initialCourseId);
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [loadingTopic, setLoadingTopic] = useState(false);
  const [savingTopic, setSavingTopic] = useState(false);
  const [savingReply, setSavingReply] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [topicForm, setTopicForm] = useState({
    title: "",
    content: "",
  });
  const [replyContent, setReplyContent] = useState("");

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    fetchTopics();
  }, [page, courseId, appliedKeyword]);

  useEffect(() => {
    if (activeTopicId) {
      fetchTopic(activeTopicId);
    } else {
      setActiveTopic(null);
    }
  }, [activeTopicId]);

  const fetchCourses = async () => {
    try {
      const res = await listCourses({ page: 0, size: 100 });
      setCourses(res?.result?.content || []);
    } catch {
      setCourses([]);
    }
  };

  const fetchTopics = async () => {
    try {
      setLoadingTopics(true);
      setErrorText("");
      const res = await getDiscussionTopics({
        page,
        size: PAGE_SIZE,
        courseId: courseId || undefined,
        keyword: appliedKeyword.trim() || undefined,
      });
      const payload = res?.result || {};
      setTopics(payload?.content || []);
      setPageInfo({
        page: payload?.number ?? page,
        totalPages: payload?.totalPages ?? 0,
        totalElements: payload?.totalElements ?? 0,
      });
    } catch (error) {
      setTopics([]);
      setErrorText(
        error?.response?.data?.message || "Không tải được danh sách thảo luận.",
      );
    } finally {
      setLoadingTopics(false);
    }
  };

  const fetchTopic = async (topicId) => {
    try {
      setLoadingTopic(true);
      setErrorText("");
      const res = await getDiscussionTopic(topicId);
      const topic = res?.result || null;
      setActiveTopic(topic?.lessonId ? null : topic);
    } catch (error) {
      setActiveTopic(null);
      setErrorText(
        error?.response?.data?.message || "Không tải được chủ đề thảo luận.",
      );
    } finally {
      setLoadingTopic(false);
    }
  };

  const selectedCourseTitle = useMemo(() => {
    return courses.find((course) => course.id === courseId)?.title || "";
  }, [courses, courseId]);

  const openTopic = (topicId) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("topicId", topicId);
    if (courseId) {
      nextParams.set("courseId", courseId);
    }
    setSearchParams(nextParams);
  };

  const closeTopic = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("topicId");
    setSearchParams(nextParams);
  };

  const submitTopic = async (event) => {
    event.preventDefault();
    if (!topicForm.title.trim() || !topicForm.content.trim()) {
      setErrorText("Cần nhập tiêu đề và nội dung thảo luận.");
      return;
    }

    try {
      setSavingTopic(true);
      setErrorText("");
      const res = await createDiscussionTopic({
        courseId: courseId || null,
        lessonId: null,
        title: topicForm.title.trim(),
        content: topicForm.content.trim(),
      });
      setTopicForm({ title: "", content: "" });
      setShowCreateForm(false);
      await fetchTopics();
      if (res?.result?.id) {
        openTopic(res.result.id);
      }
    } catch (error) {
      setErrorText(
        error?.response?.data?.message || "Không tạo được chủ đề thảo luận.",
      );
    } finally {
      setSavingTopic(false);
    }
  };

  const submitReply = async (event) => {
    event.preventDefault();
    if (!activeTopic?.id || !replyContent.trim()) return;

    try {
      setSavingReply(true);
      setErrorText("");
      await createDiscussionReply(activeTopic.id, {
        content: replyContent.trim(),
      });
      setReplyContent("");
      await fetchTopic(activeTopic.id);
      await fetchTopics();
    } catch (error) {
      setErrorText(error?.response?.data?.message || "Không gửi được phản hồi.");
    } finally {
      setSavingReply(false);
    }
  };

  const toggleModeration = async (field) => {
    if (!activeTopic?.id) return;
    try {
      const res = await moderateDiscussionTopic(activeTopic.id, {
        [field]: !activeTopic[field],
      });
      setActiveTopic((prev) => ({ ...prev, ...(res?.result || {}) }));
      await fetchTopics();
    } catch (error) {
      setErrorText(
        error?.response?.data?.message || "Không cập nhật được chủ đề.",
      );
    }
  };

  const removeTopic = async () => {
    if (!activeTopic?.id) return;
    const confirmed = window.confirm("Xóa chủ đề thảo luận này?");
    if (!confirmed) return;

    try {
      await deleteDiscussionTopic(activeTopic.id);
      closeTopic();
      await fetchTopics();
    } catch (error) {
      setErrorText(error?.response?.data?.message || "Không xóa được chủ đề.");
    }
  };

  const removeReply = async (replyId) => {
    const confirmed = window.confirm("Xóa phản hồi này?");
    if (!confirmed) return;

    try {
      await deleteDiscussionReply(replyId);
      await fetchTopic(activeTopic.id);
      await fetchTopics();
    } catch (error) {
      setErrorText(error?.response?.data?.message || "Không xóa được phản hồi.");
    }
  };

  const applySearch = (event) => {
    event.preventDefault();
    setPage(0);
    setAppliedKeyword(keyword.trim());
  };

  const handleCourseChange = (nextCourseId) => {
    setCourseId(nextCourseId);
    setPage(0);
    const nextParams = new URLSearchParams(searchParams);
    if (nextCourseId) {
      nextParams.set("courseId", nextCourseId);
    } else {
      nextParams.delete("courseId");
    }
    nextParams.delete("topicId");
    setSearchParams(nextParams);
  };

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Cộng đồng học tập</span>
          <h1>Thảo luận khóa học</h1>
          <p>
            Đặt câu hỏi, trao đổi với giảng viên và theo dõi các chủ đề chung
            của khóa học. Bình luận gắn trong từng bài học không hiển thị ở đây.
          </p>
        </div>

        <button
          type="button"
          className={styles.primaryBtn}
          onClick={() => setShowCreateForm((prev) => !prev)}
        >
          {showCreateForm ? <X size={18} /> : <Plus size={18} />}
          {showCreateForm ? "Đóng form" : "Tạo chủ đề"}
        </button>
      </section>

      {errorText ? <div className={styles.errorBox}>{errorText}</div> : null}

      <section className={styles.toolbar}>
        <form className={styles.searchBox} onSubmit={applySearch}>
          <Search size={18} />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm theo tiêu đề hoặc nội dung..."
          />
          <button type="submit">Tìm</button>
        </form>

        <div className={styles.filterBox}>
          <Filter size={16} />
          <select
            value={courseId}
            onChange={(event) => handleCourseChange(event.target.value)}
          >
            <option value="">Tất cả khóa học</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>
      </section>

      {showCreateForm ? (
        <form className={styles.createBox} onSubmit={submitTopic}>
          <div className={styles.formHead}>
            <h2>Tạo chủ đề mới</h2>
            <span>{selectedCourseTitle || "Thảo luận chung"}</span>
          </div>

          <input
            value={topicForm.title}
            onChange={(event) =>
              setTopicForm((prev) => ({ ...prev, title: event.target.value }))
            }
            placeholder="Tiêu đề câu hỏi hoặc vấn đề cần trao đổi"
          />
          <textarea
            value={topicForm.content}
            onChange={(event) =>
              setTopicForm((prev) => ({ ...prev, content: event.target.value }))
            }
            rows={5}
            placeholder="Mô tả rõ nội dung bạn muốn thảo luận..."
          />
          <div className={styles.formActions}>
            <button type="button" onClick={() => setShowCreateForm(false)}>
              Hủy
            </button>
            <button type="submit" disabled={savingTopic}>
              {savingTopic ? "Đang tạo..." : "Đăng chủ đề"}
            </button>
          </div>
        </form>
      ) : null}

      <div className={styles.contentGrid}>
        <section className={styles.topicList}>
          <div className={styles.listHead}>
            <h2>Chủ đề mới</h2>
            <span>{pageInfo.totalElements} chủ đề</span>
          </div>

          {loadingTopics ? (
            <div className={styles.stateBox}>Đang tải danh sách thảo luận...</div>
          ) : topics.length === 0 ? (
            <div className={styles.stateBox}>
              Chưa có chủ đề nào phù hợp với bộ lọc hiện tại.
            </div>
          ) : (
            topics.map((topic) => (
              <button
                type="button"
                key={topic.id}
                className={`${styles.topicItem} ${
                  activeTopic?.id === topic.id ? styles.topicItemActive : ""
                }`}
                onClick={() => openTopic(topic.id)}
              >
                <div className={styles.topicTopline}>
                  <span>{topic.courseTitle || "Thảo luận chung"}</span>
                  <div className={styles.topicFlags}>
                    {topic.pinned ? <Pin size={15} /> : null}
                    {topic.locked ? <Lock size={15} /> : null}
                  </div>
                </div>
                <strong>{topic.title}</strong>
                <p>{topic.content}</p>
                <div className={styles.topicMeta}>
                  <span>{getAuthorName(topic.author)}</span>
                  <span>{topic.replyCount || 0} phản hồi</span>
                  <span>{formatDate(topic.updatedAt || topic.createdAt)}</span>
                </div>
              </button>
            ))
          )}

          <div className={styles.pagination}>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
              disabled={page === 0}
            >
              <ChevronLeft size={17} />
              Trước
            </button>
            <span>
              Trang {pageInfo.page + 1} / {Math.max(pageInfo.totalPages, 1)}
            </span>
            <button
              type="button"
              onClick={() =>
                setPage((prev) =>
                  prev + 1 < pageInfo.totalPages ? prev + 1 : prev,
                )
              }
              disabled={pageInfo.totalPages === 0 || page + 1 >= pageInfo.totalPages}
            >
              Sau
              <ChevronRight size={17} />
            </button>
          </div>
        </section>

        <aside className={styles.detailPanel}>
          {!activeTopicId ? (
            <div className={styles.emptyDetail}>
              <MessageSquare size={38} />
              <h2>Chọn một chủ đề</h2>
              <p>Xem nội dung thảo luận và phản hồi trong khung này.</p>
            </div>
          ) : loadingTopic ? (
            <div className={styles.stateBox}>Đang tải chủ đề...</div>
          ) : activeTopic ? (
            <article className={styles.topicDetail}>
              <div className={styles.detailHead}>
                <button type="button" className={styles.backBtn} onClick={closeTopic}>
                  <ChevronLeft size={17} />
                  Danh sách
                </button>
                <div className={styles.detailActions}>
                  {activeTopic.canModerate ? (
                    <>
                      <button type="button" onClick={() => toggleModeration("pinned")}>
                        <Pin size={16} />
                        {activeTopic.pinned ? "Bỏ ghim" : "Ghim"}
                      </button>
                      <button type="button" onClick={() => toggleModeration("locked")}>
                        {activeTopic.locked ? <Unlock size={16} /> : <Lock size={16} />}
                        {activeTopic.locked ? "Mở khóa" : "Khóa"}
                      </button>
                    </>
                  ) : null}
                  {activeTopic.canDelete ? (
                    <button type="button" className={styles.dangerBtn} onClick={removeTopic}>
                      <Trash2 size={16} />
                      Xóa
                    </button>
                  ) : null}
                </div>
              </div>

              <div className={styles.topicBody}>
                <div className={styles.authorRow}>
                  <span className={styles.avatar}>{getInitial(activeTopic.author)}</span>
                  <div>
                    <strong>{getAuthorName(activeTopic.author)}</strong>
                    <span>{formatDate(activeTopic.createdAt)}</span>
                  </div>
                </div>
                <div className={styles.topicLabels}>
                  <span>{activeTopic.courseTitle || "Thảo luận chung"}</span>
                  {activeTopic.pinned ? <span>Đang ghim</span> : null}
                  {activeTopic.locked ? <span>Đã khóa</span> : null}
                </div>
                <h2>{activeTopic.title}</h2>
                <p>{activeTopic.content}</p>
              </div>

              <div className={styles.replySection}>
                <div className={styles.replyHead}>
                  <h3>Phản hồi</h3>
                  <span>{activeTopic.replies?.length || 0}</span>
                </div>

                {(activeTopic.replies || []).length === 0 ? (
                  <div className={styles.stateBox}>Chưa có phản hồi nào.</div>
                ) : (
                  activeTopic.replies.map((reply) => (
                    <div key={reply.id} className={styles.replyItem}>
                      <div className={styles.authorRow}>
                        <span className={styles.avatar}>{getInitial(reply.author)}</span>
                        <div>
                          <strong>{getAuthorName(reply.author)}</strong>
                          <span>{formatDate(reply.createdAt)}</span>
                        </div>
                      </div>
                      <p>{reply.content}</p>
                      {reply.canDelete ? (
                        <button
                          type="button"
                          className={styles.replyDelete}
                          onClick={() => removeReply(reply.id)}
                        >
                          Xóa phản hồi
                        </button>
                      ) : null}
                    </div>
                  ))
                )}

                {activeTopic.locked && !activeTopic.canModerate ? (
                  <div className={styles.lockedBox}>
                    Chủ đề đã khóa, chỉ giảng viên hoặc quản trị viên có thể phản hồi.
                  </div>
                ) : (
                  <form className={styles.replyForm} onSubmit={submitReply}>
                    <textarea
                      value={replyContent}
                      onChange={(event) => setReplyContent(event.target.value)}
                      rows={4}
                      placeholder="Viết phản hồi của bạn..."
                    />
                    <button type="submit" disabled={savingReply || !replyContent.trim()}>
                      <Send size={17} />
                      {savingReply ? "Đang gửi..." : "Gửi phản hồi"}
                    </button>
                  </form>
                )}
              </div>
            </article>
          ) : (
            <div className={styles.emptyDetail}>
              <h2>Không tìm thấy chủ đề</h2>
              <p>Chủ đề này có thể thuộc phần thảo luận của bài học.</p>
              <Link to="/discussions">Quay lại danh sách</Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
