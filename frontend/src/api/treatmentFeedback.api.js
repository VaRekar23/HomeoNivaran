import api from "./axios"

export const treatmentFeedbackApi = {
  submit:                (data) =>
    api.post("/treatment-feedback", data),

  getForConsultation:    (consultationId) =>
    api.get(`/treatment-feedback/consultation/${consultationId}`),

  getForDoctor:          (consultationId) =>
    api.get(`/treatment-feedback/doctor/consultation/${consultationId}`),

  getAllAdmin:            () =>
    api.get("/treatment-feedback/admin/all"),

  getStats:              () =>
    api.get("/treatment-feedback/stats"),
}