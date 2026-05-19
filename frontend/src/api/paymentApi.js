import api from "./axios";

export async function createCoursePayment(courseId) {
  const res = await api.post(`/payments/courses/${courseId}`);
  return res?.data;
}

export async function getPayment(paymentId) {
  const res = await api.get(`/payments/${paymentId}`);
  return res?.data;
}
