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
