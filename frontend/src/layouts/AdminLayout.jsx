import { Outlet } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useEffect } from "react"

import Navbar from "../components/shared/Navbar"
import Sidebar from "../components/shared/Sidebar"
import useNotificationStore from "../store/notification.store"
import { notificationsApi } from "../api/notifications.api"
import { NOTIFICATION_POLL_INTERVAL } from "../utils/constants"

const AdminLayout = () => {
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount)

  const { data } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const res = await notificationsApi.getUnreadCount()
      return res.data
    },
    refetchInterval: NOTIFICATION_POLL_INTERVAL,
  })

  useEffect(() => {
    if (data?.unread_count !== undefined) {
      setUnreadCount(data.unread_count)
    }
  }, [data, setUnreadCount])

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="admin" />
      <div className="lg:ml-64 flex flex-col min-h-screen">
        <Navbar role="admin" />
        <main className="flex-1 pt-16">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout