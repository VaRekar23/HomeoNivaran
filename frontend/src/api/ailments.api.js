import api from "./axios"

export const ailmentsApi = {
  getAll: (category) =>
    api.get("/ailments", { params: category ? { category } : {} }),
  getById: (id) => api.get(`/ailments/${id}`),
  getCategories: () => api.get("/ailments/categories"),
  create: (data) => api.post("/ailments", data),
  update: (id, data) => api.put(`/ailments/${id}`, data),
  deactivate: (id) => api.delete(`/ailments/${id}`),
  getPublicAilments: () => api.get("/ailments/public"),
  getAilmentCategories: () => api.get("/ailments/public/categories"),
}