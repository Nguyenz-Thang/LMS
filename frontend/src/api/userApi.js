import api from "./axios";

export async function getUsers() {
  const res = await api.get("/users");
  return res?.data;
}

export async function searchUsers(params = {}) {
  const res = await api.get("/users/search", { params });
  return res?.data;
}

export async function createUser(payload) {
  const res = await api.post("/users", payload);
  return res?.data;
}

export async function updateUser(userId, payload) {
  const res = await api.put(`/users/${userId}`, payload);
  return res?.data;
}

export async function deleteUser(userId) {
  const res = await api.delete(`/users/${userId}`);
  return res?.data;
}
