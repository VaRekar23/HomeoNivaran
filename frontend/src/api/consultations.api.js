import api from "./axios"

export const consultationsApi = {
  getAll: () => api.get("/consultations/"),
  getById: (id) => api.get(`/consultations/${id}`),
  create: (data) => api.post("/consultations/", data),
  submitAnswers: (id, data) =>
    api.post(`/consultations/${id}/answers`, data),
  getPrescription: (id) =>
    api.get(`/consultations/${id}/prescription`),
  getQuestionsForAnswering: (id) =>
  api.get(`/consultations/${id}/questions`),
}