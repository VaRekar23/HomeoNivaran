import api from "./axios"

export const feedbackApi = {
  submit: (data) => api.post("/feedback/", data),
  getAll: (params) => api.get("/feedback/", { params }),
  updateStatus: (id, data) => api.put(`/feedback/${id}`, data),
}