import api from "./axios"

export const addressesApi = {
  getAll:      ()         => api.get("/addresses"),
  create:      (data)     => api.post("/addresses", data),
  update:      (id, data) => api.put(`/addresses/${id}`, data),
  delete:      (id)       => api.delete(`/addresses/${id}`),
  setDefault:  (id)       => api.put(`/addresses/${id}/set-default`),
}