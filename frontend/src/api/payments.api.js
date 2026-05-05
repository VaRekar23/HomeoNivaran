import api from "./axios"

export const paymentsApi = {
  initiate: (orderId) =>
    api.post("/payments/initiate", { order_id: orderId }),
  verify: (data) => api.post("/payments/verify", data),
  getByOrder: (orderId) => api.get(`/payments/${orderId}`),
}