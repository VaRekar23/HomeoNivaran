import api from "./axios"

export const ordersApi = {
  getAll: () => api.get("/orders/"),
  getById: (id) => api.get(`/orders/${id}`),
}