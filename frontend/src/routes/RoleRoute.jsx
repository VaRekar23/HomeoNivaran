import { Navigate } from "react-router-dom"
import useAuthStore from "../store/auth.store"
import toast from "react-hot-toast"

const RoleRoute = ({ children, allowedRoles = [] }) => {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!allowedRoles.includes(user?.role)) {
    toast.error("You don't have access to that page.")

    // Redirect to correct dashboard based on role
    const redirects = {
      patient: "/patient/dashboard",
      doctor: "/doctor/dashboard",
      admin: "/admin/dashboard",
    }
    return <Navigate to={redirects[user?.role] || "/login"} replace />
  }

  return children
}

export default RoleRoute