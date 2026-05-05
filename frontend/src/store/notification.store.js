import { create } from "zustand"

const useNotificationStore = create((set) => ({
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
  incrementUnread: () => set((state) => ({
    unreadCount: state.unreadCount + 1
  })),
  clearUnread: () => set({ unreadCount: 0 }),
}))

export default useNotificationStore