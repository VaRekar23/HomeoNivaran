import api from "./axios"

export const familyApi = {
  getAll: () => api.get("/family-members/"),
  getById: (id) => api.get(`/family-members/${id}`),
  create: (data) => api.post("/family-members/", data),
  update: (id, data) => api.put(`/family-members/${id}`, data),
  delete: (id) => api.delete(`/family-members/${id}`),
}