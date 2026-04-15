import api from "./axios";

export async function getAllRoles() {
  const res = await api.get("/roles");
  return res?.data;
}

export async function getRole(roleName) {
  const res = await api.get(`/roles/${roleName}`);
  return res?.data;
}

export async function createRole(payload) {
  const res = await api.post("/roles", payload);
  return res?.data;
}

export async function updateRole(roleName, payload) {
  const res = await api.put(`/roles/${roleName}`, payload);
  return res?.data;
}

export async function deleteRole(roleName) {
  const res = await api.delete(`/roles/${roleName}`);
  return res?.data;
}
