import api from "./axios";

export async function getLessonComments(lessonId) {
  const res = await api.get(`/discussions/lessons/${lessonId}/comments`);
  return res.data;
}

export async function createLessonComment(lessonId, payload) {
  const res = await api.post(`/discussions/lessons/${lessonId}/comments`, payload);
  return res.data;
}

export async function deleteDiscussionReply(replyId) {
  const res = await api.delete(`/discussions/replies/${replyId}`);
  return res.data;
}
