import api from "./axios"

export const doctorApi = {
  getQueue: (status) =>
    api.get("/doctor/consultations", { params: status ? { status } : {} }),
  getCase: (id) => api.get(`/doctor/consultations/${id}`),
  updateStatus: (id, status) =>
    api.put(`/doctor/consultations/${id}/status`, { status }),
  getAISummary: (id) =>
    api.post(`/doctor/consultations/${id}/ai-summary`),
  getAIMedicines: (id) =>
    api.post(`/doctor/consultations/${id}/ai-medicines`),
  createPrescription: (data) => api.post("/prescriptions", data),
  getOrders: (status) =>
    api.get("/doctor/orders", { params: status ? { status } : {} }),
  dispatchOrder: (id, data) =>
    api.put(`/doctor/orders/${id}/dispatch`, data),
  getPrescriptionByConsultation: (consultationId) =>
  api.get(`/doctor/consultations/${consultationId}/prescription`),
  requestFeedback: (consultationId) =>
  api.post(`/doctor/consultations/${consultationId}/request-feedback`),
  getPrescription: (id) => api.get(`/doctor/prescriptions/${id}`),
  updatePrescription: (id, data) => api.put(`/doctor/prescriptions/${id}`, data),
  markOrderPaid: (id) => api.put(`/doctor/orders/${id}/mark-paid`),
  getPatientHistory: (patientId, excludeId) =>
  api.get(`/doctor/patients/${patientId}/history`, {
    params: excludeId ? { exclude: excludeId } : {}
  }),
}