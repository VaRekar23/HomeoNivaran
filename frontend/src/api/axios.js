import axios from "axios"
import toast from "react-hot-toast"

// Create axios instance with base config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 seconds — AI calls can be slow
})

// ── REQUEST INTERCEPTOR ──
// Runs before every request is sent
api.interceptors.request.use(
  (config) => {
    // Attach JWT token from localStorage automatically
    const token = localStorage.getItem("token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── RESPONSE INTERCEPTOR ──
// Runs after every response is received
api.interceptors.response.use(
  // Success — return response data directly
  (response) => response,

  // Error — handle globally
  (error) => {
    const status = error.response?.status
    const message = error.response?.data?.detail

    if (status === 401) {
      // Token expired or invalid — clear everything and redirect
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      window.location.href = "/login"
      toast.error("Session expired. Please login again.")
    } else if (status === 403) {
      toast.error("You don't have permission to do that.")
    } else if (status === 422) {
      // Pydantic validation error — show first error message
      const validationErrors = error.response?.data?.detail
      if (Array.isArray(validationErrors)) {
        const firstError = validationErrors[0]
        toast.error(`Validation error: ${firstError.msg}`)
      }
    } else if (status === 503) {
      toast.error("Service temporarily unavailable. Please try again.")
    } else if (!error.response) {
      // Network error — no response received
      toast.error("Cannot connect to server. Check your connection.")
    }

    // Always reject so React Query and components can handle it too
    return Promise.reject(error)
  }
)

export default api