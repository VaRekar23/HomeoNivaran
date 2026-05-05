import { create } from "zustand"

const useUIStore = create((set) => ({
  // Sidebar
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Global loading (for full-page loads)
  globalLoading: false,
  setGlobalLoading: (loading) => set({ globalLoading: loading }),
}))

export default useUIStore