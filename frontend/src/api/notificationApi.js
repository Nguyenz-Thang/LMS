import api from "./axios";

export const getMyNotifications = async () => {
  const response = await api.get("/notifications/me");
  return response.data?.result || [];
};

export const markNotificationRead = async (notificationId) => {
  const response = await api.put(`/notifications/${notificationId}/read`);
  return response.data?.result;
};

export const markAllNotificationsRead = async () => {
  const response = await api.put("/notifications/read-all");
  return response.data;
};
