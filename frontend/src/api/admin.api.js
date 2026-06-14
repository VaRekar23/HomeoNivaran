import api from "./axios"

export const adminApi = {
  getLogs: (params) => api.get("/admin/logs", { params }),
  cleanupLogs: (days) =>
    api.delete("/admin/logs/cleanup", { params: { days } }),
  getUsers: (role) =>
    api.get("/admin/users", { params: role ? { role } : {} }),
  toggleUser: (id) => api.put(`/admin/users/${id}/toggle`),
  changeUserRole: (id, role) =>
    api.put(`/admin/users/${id}/role`, { role }),
  getOrders: (status) =>
    api.get("/admin/orders", { params: status ? { status } : {} }),
  dispatchOrder: (id, data) =>
    api.put(`/admin/orders/${id}/dispatch`, data),
  markDelivered: (id) =>
    api.put(`/admin/orders/${id}/delivered`),
  getHealth: () => api.get("/admin/health"),
  unlockUser: (id) => api.post(`/admin/users/${id}/unlock`),
}