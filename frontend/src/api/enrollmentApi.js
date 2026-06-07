import api from "./axios";

export async function getAllEnrollments() {
  const res = await api.get("/enrollments");
  return res?.data;
}

export async function getMyEnrollments() {
  const res = await api.get("/enrollments/me");
  return res?.data;
}

export async function getMyProgressDashboard(params = {}) {
  const res = await api.get("/enrollments/me/dashboard", { params });
  return res?.data;
}

export async function enrollCourse(payload) {
  const res = await api.post("/enrollments", payload);
  return res?.data;
}

export async function markEnrollmentAccess(courseId) {
  const res = await api.put(`/enrollments/access/${courseId}`);
  return res?.data;
}
