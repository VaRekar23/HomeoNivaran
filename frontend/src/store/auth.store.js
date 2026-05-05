import { create } from "zustand"
import { persist } from "zustand/middleware"

// persist middleware saves to localStorage automatically
// So user stays logged in even after page refresh
const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      isAuthenticated: false,

      // Actions
      login: (user, token) => {
        localStorage.setItem("token", token)
        set({
          user,
          token,
          isAuthenticated: true,
        })
      },

      logout: () => {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        })
      },

      updateUser: (updatedUser) => {
        set({ user: { ...get().user, ...updatedUser } })
      },

      // Getters
      isPatient: () => get().user?.role === "patient",
      isDoctor: () => get().user?.role === "doctor",
      isAdmin: () => get().user?.role === "admin",
    }),
    {
      name: "homeo-auth",        // localStorage key
      partialize: (state) => ({  // only persist these fields
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

export default useAuthStore