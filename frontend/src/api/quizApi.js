import api from "./axios";

export async function getQuiz(quizId) {
  const res = await api.get(`/quizzes/${quizId}`);
  return res?.data;
}

export async function createQuiz(payload) {
  const res = await api.post("/quizzes", payload);
  return res?.data;
}

export async function updateQuiz(quizId, payload) {
  const res = await api.put(`/quizzes/${quizId}`, payload);
  return res?.data;
}

export async function deleteQuiz(quizId) {
  const res = await api.delete(`/quizzes/${quizId}`);
  return res?.data;
}
export async function getAllQuizzes() {
  const res = await api.get("/quizzes");
  return res?.data;
}

export async function getQuizAttempts(quizId) {
  const res = await api.get(`/quizzes/${quizId}/attempts`);
  return res?.data;
}

export async function publishQuiz(quizId) {
  const res = await api.post(`/quizzes/${quizId}/publish`);
  return res?.data;
}

export async function unpublishQuiz(quizId) {
  const res = await api.post(`/quizzes/${quizId}/unpublish`);
  return res?.data;
}

export async function generateQuizFromLesson(lessonId, payload = {}) {
  const res = await api.post(`/quizzes/ai/lessons/${lessonId}/generate`, payload);
  return res?.data;
}
