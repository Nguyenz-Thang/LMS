import { useCallback, useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export const LMS_BASE_URL = "http://localhost:8080/lms";
const LEARNING_BASE = `${LMS_BASE_URL}/learning`;

async function toJson(res) {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return data;
}

export function useLearningApi() {
  const { token, logout } = useContext(AuthContext);

  const authedFetch = useCallback(
    async (url, options = {}) => {
      const headers = {
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await fetch(url, {
        ...options,
        headers,
      });

      if (res.status === 401) {
        logout?.();
        throw new Error(
          "PhiÃªn Ä‘Äƒng nháº­p Ä‘Ã£ háº¿t háº¡n hoáº·c báº¡n khÃ´ng cÃ³ quyá»n.",
        );
      }

      return res;
    },
    [token, logout],
  );

  const startLearning = useCallback(
    async (courseId, payload = null) =>
      toJson(
        await authedFetch(`${LEARNING_BASE}/courses/${courseId}/start`, {
          method: "POST",
          ...(payload
            ? {
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
              }
            : {}),
        }),
      ),
    [authedFetch],
  );

  const getLearningCourse = useCallback(
    async (courseId) =>
      toJson(await authedFetch(`${LEARNING_BASE}/courses/${courseId}`)),
    [authedFetch],
  );

  const getLearningLesson = useCallback(
    async (courseId, lessonId) =>
      toJson(
        await authedFetch(
          `${LEARNING_BASE}/courses/${courseId}/lessons/${lessonId}`,
        ),
      ),
    [authedFetch],
  );

  const saveLessonProgress = useCallback(
    async (lessonId, payload) =>
      toJson(
        await authedFetch(`${LEARNING_BASE}/lessons/${lessonId}/progress`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }),
      ),
    [authedFetch],
  );

  const getLessonNotes = useCallback(
    async (lessonId) =>
      toJson(await authedFetch(`${LEARNING_BASE}/lessons/${lessonId}/notes`)),
    [authedFetch],
  );

  const createLessonNote = useCallback(
    async (lessonId, payload) =>
      toJson(
        await authedFetch(`${LEARNING_BASE}/lessons/${lessonId}/notes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }),
      ),
    [authedFetch],
  );

  const updateLessonNote = useCallback(
    async (lessonId, noteId, payload) =>
      toJson(
        await authedFetch(
          `${LEARNING_BASE}/lessons/${lessonId}/notes/${noteId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          },
        ),
      ),
    [authedFetch],
  );

  const deleteLessonNote = useCallback(
    async (lessonId, noteId) =>
      toJson(
        await authedFetch(
          `${LEARNING_BASE}/lessons/${lessonId}/notes/${noteId}`,
          {
            method: "DELETE",
          },
        ),
      ),
    [authedFetch],
  );

  const getLearningQuiz = useCallback(
    async (quizId) =>
      toJson(await authedFetch(`${LEARNING_BASE}/quizzes/${quizId}`)),
    [authedFetch],
  );

  const getIndependentQuizzes = useCallback(
    async () =>
      toJson(await authedFetch(`${LEARNING_BASE}/quizzes/independent`)),
    [authedFetch],
  );

  const startLearningQuiz = useCallback(
    async (quizId) =>
      toJson(
        await authedFetch(`${LEARNING_BASE}/quizzes/${quizId}/start`, {
          method: "POST",
        }),
      ),
    [authedFetch],
  );

  const saveQuizAnswer = useCallback(
    async (attemptId, payload) =>
      toJson(
        await authedFetch(`${LEARNING_BASE}/attempts/${attemptId}/answer`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }),
      ),
    [authedFetch],
  );

  const submitLearningQuiz = useCallback(
    async (attemptId) =>
      toJson(
        await authedFetch(`${LEARNING_BASE}/attempts/${attemptId}/submit`, {
          method: "POST",
        }),
      ),
    [authedFetch],
  );

  const getQuizAttemptHistory = useCallback(
    async () => toJson(await authedFetch(`${LEARNING_BASE}/attempts/history`)),
    [authedFetch],
  );

  const getQuizAttemptReview = useCallback(
    async (attemptId) =>
      toJson(await authedFetch(`${LEARNING_BASE}/attempts/${attemptId}`)),
    [authedFetch],
  );

  const getLearningAssignment = useCallback(
    async (assignmentId) =>
      toJson(await authedFetch(`${LEARNING_BASE}/assignments/${assignmentId}`)),
    [authedFetch],
  );

  const saveAssignmentSubmission = useCallback(
    async (assignmentId, payload) =>
      toJson(
        await authedFetch(
          `${LEARNING_BASE}/assignments/${assignmentId}/submission`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          },
        ),
      ),
    [authedFetch],
  );

  const uploadAssignmentSubmissionFiles = useCallback(
    async (assignmentId, files) => {
      const formData = new FormData();

      Array.from(files || []).forEach((file) => {
        formData.append("files", file);
      });

      return toJson(
        await authedFetch(
          `${LEARNING_BASE}/assignments/${assignmentId}/files`,
          {
            method: "POST",
            body: formData,
          },
        ),
      );
    },
    [authedFetch],
  );

  const deleteAssignmentSubmissionFile = useCallback(
    async (assignmentId, fileId) =>
      toJson(
        await authedFetch(
          `${LEARNING_BASE}/assignments/${assignmentId}/files/${fileId}`,
          {
            method: "DELETE",
          },
        ),
      ),
    [authedFetch],
  );

  const listChatbotConversations = useCallback(
    async () =>
      toJson(await authedFetch(`${LMS_BASE_URL}/chatbot/conversations`)),
    [authedFetch],
  );

  const createChatbotConversation = useCallback(
    async (payload) =>
      toJson(
        await authedFetch(`${LMS_BASE_URL}/chatbot/conversations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }),
      ),
    [authedFetch],
  );

  const getChatbotConversation = useCallback(
    async (conversationId) =>
      toJson(
        await authedFetch(
          `${LMS_BASE_URL}/chatbot/conversations/${conversationId}`,
        ),
      ),
    [authedFetch],
  );

  const getLessonChatbotConversation = useCallback(
    async (lessonId) =>
      toJson(
        await authedFetch(
          `${LMS_BASE_URL}/chatbot/lessons/${lessonId}/conversation`,
        ),
      ),
    [authedFetch],
  );

  const deleteChatbotConversation = useCallback(
    async (conversationId) =>
      toJson(
        await authedFetch(
          `${LMS_BASE_URL}/chatbot/conversations/${conversationId}`,
          {
            method: "DELETE",
          },
        ),
      ),
    [authedFetch],
  );

  const sendChatbotMessage = useCallback(
    async (conversationId, payload) =>
      toJson(
        await authedFetch(
          `${LMS_BASE_URL}/chatbot/conversations/${conversationId}/messages`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          },
        ),
      ),
    [authedFetch],
  );

  return {
    startLearning,
    getLearningCourse,
    getLearningLesson,
    saveLessonProgress,
    getLessonNotes,
    createLessonNote,
    updateLessonNote,
    deleteLessonNote,
    getIndependentQuizzes,
    getLearningQuiz,
    startLearningQuiz,
    saveQuizAnswer,
    submitLearningQuiz,
    getQuizAttemptHistory,
    getQuizAttemptReview,
    getLearningAssignment,
    saveAssignmentSubmission,
    uploadAssignmentSubmissionFiles,
    deleteAssignmentSubmissionFile,
    listChatbotConversations,
    createChatbotConversation,
    getChatbotConversation,
    getLessonChatbotConversation,
    deleteChatbotConversation,
    sendChatbotMessage,
  };
}
