import api from "./axios"

export const notificationsApi = {
  getAll: (unreadOnly = false) =>
    api.get("/notifications/", { params: { unread_only: unreadOnly } }),
  getUnreadCount: () => api.get("/notifications/unread-count"),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put("/notifications/read-all"),
  delete: (id) => api.delete(`/notifications/${id}`),
}