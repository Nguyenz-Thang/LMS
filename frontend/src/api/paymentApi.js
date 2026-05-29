import api from "./axios";

export async function createCoursePayment(courseId) {
  const res = await api.post(`/payments/courses/${courseId}`);
  return res?.data;
}

export async function getPayment(paymentId) {
  const res = await api.get(`/payments/${paymentId}`);
  return res?.data;
}

export async function getRevenueDashboard() {
  const res = await api.get("/payments/admin/revenue");
  return res?.data;
}

export async function getPaymentTransactions(params = {}) {
  const res = await api.get("/payments/admin/transactions", { params });
  return res?.data;
}
