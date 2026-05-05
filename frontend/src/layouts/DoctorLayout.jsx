import { useEffect } from "react"
import { Outlet } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"

import Navbar from "../components/shared/Navbar"
import Sidebar from "../components/shared/Sidebar"
import useNotificationStore from "../store/notification.store"
import { notificationsApi } from "../api/notifications.api"
import { NOTIFICATION_POLL_INTERVAL } from "../utils/constants"

const DoctorLayout = () => {
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount)

  const { data } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const res = await notificationsApi.getUnreadCount()
      return res.data
    },
    refetchInterval: NOTIFICATION_POLL_INTERVAL,
    refetchIntervalInBackground: false,
  })

  useEffect(() => {
    if (data?.unread_count !== undefined) {
      setUnreadCount(data.unread_count)
    }
  }, [data, setUnreadCount])

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="doctor" />
      <div className="lg:ml-64 flex flex-col min-h-screen">
        <Navbar role="doctor" />
        <main className="flex-1 pt-16">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default DoctorLayout