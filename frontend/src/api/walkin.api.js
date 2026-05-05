import api from "./axios"

export const walkinApi = {
  searchPatients:       (q)    => api.get("/doctor/patients/search", { params: { q } }),
  createWalkIn:         (data) => api.post("/doctor/patients/walkin", data),
  createOfflineConsult: (data) => api.post("/doctor/consultations/offline", data),
}