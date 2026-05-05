import api from "./axios";

export async function getDiscussionTopics(params = {}) {
  const res = await api.get("/discussions/topics", { params });
  return res.data;
}

export async function getDiscussionTopic(topicId) {
  const res = await api.get(`/discussions/topics/${topicId}`);
  return res.data;
}

export async function createDiscussionTopic(payload) {
  const res = await api.post("/discussions/topics", payload);
  return res.data;
}

export async function updateDiscussionTopic(topicId, payload) {
  const res = await api.put(`/discussions/topics/${topicId}`, payload);
  return res.data;
}

export async function moderateDiscussionTopic(topicId, payload) {
  const res = await api.patch(`/discussions/topics/${topicId}/moderation`, payload);
  return res.data;
}

export async function deleteDiscussionTopic(topicId) {
  const res = await api.delete(`/discussions/topics/${topicId}`);
  return res.data;
}

export async function createDiscussionReply(topicId, payload) {
  const res = await api.post(`/discussions/topics/${topicId}/replies`, payload);
  return res.data;
}

export async function updateDiscussionReply(replyId, payload) {
  const res = await api.put(`/discussions/replies/${replyId}`, payload);
  return res.data;
}

export async function deleteDiscussionReply(replyId) {
  const res = await api.delete(`/discussions/replies/${replyId}`);
  return res.data;
}

export async function getLessonComments(lessonId) {
  const res = await api.get(`/discussions/lessons/${lessonId}/comments`);
  return res.data;
}

export async function createLessonComment(lessonId, payload) {
  const res = await api.post(`/discussions/lessons/${lessonId}/comments`, payload);
  return res.data;
}
