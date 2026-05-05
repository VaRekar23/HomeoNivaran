import api from "./axios"

export const availabilityApi = {
  // Doctor endpoints
  getMySlots:   ()         => api.get("/doctor/availability"),
  addSlot:      (data)     => api.post("/doctor/availability", data),
  updateSlot:   (id, data) => api.put(`/doctor/availability/${id}`, data),
  deleteSlot:   (id)       => api.delete(`/doctor/availability/${id}`),

  // Public endpoint
  getAvailability: () => api.get("/availability"),
}