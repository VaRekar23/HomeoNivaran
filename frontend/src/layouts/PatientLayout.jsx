import { useEffect, useState } from "react"
import { Outlet } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"

import Navbar from "../components/shared/Navbar"
import Sidebar from "../components/shared/Sidebar"
import useNotificationStore from "../store/notification.store"
import useUIStore from "../store/ui.store"
import { notificationsApi } from "../api/notifications.api"
import { NOTIFICATION_POLL_INTERVAL } from "../utils/constants"

import { MessageSquare, X, Star, Send } from "lucide-react"
import { useSubmitFeedback } from "../hooks/useAdmin"
import { useForm } from "react-hook-form"

import Button from "../components/ui/Button"

// ── Floating Feedback Widget ──
const FeedbackWidget = () => {
  const [open, setOpen] = useState(false)
  const submitMutation = useSubmitFeedback()

  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      type: "general",
      description: "",
      rating: 0,
      page: window.location.pathname,
    },
  })

  const rating = watch("rating")

  const onSubmit = async (data) => {
    await submitMutation.mutateAsync({
      ...data,
      rating: data.rating || null,
    })
    reset()
    setOpen(false)
  }

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {open && (
        <div className="mb-3 w-80 bg-white rounded-2xl shadow-modal border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-primary-800 text-white">
            <span className="text-sm font-semibold">
              Share Feedback
            </span>
            <button onClick={() => setOpen(false)}>
              <X className="w-4 h-4" />
            </button>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="p-4 space-y-3"
          >
            <select
              className="input text-sm"
              {...register("type")}
            >
              <option value="general">General Feedback</option>
              <option value="bug_report">Report a Bug</option>
              <option value="feature_request">Feature Request</option>
            </select>

            {/* Star rating */}
            <div>
              <p className="text-xs text-slate-500 mb-1">
                Rating (optional)
              </p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setValue("rating", s)}
                  >
                    <Star className={`w-5 h-5 ${
                      s <= rating
                        ? "text-amber-400 fill-amber-400"
                        : "text-slate-200"
                    }`} />
                  </button>
                ))}
              </div>
            </div>

            <textarea
              rows={3}
              placeholder="Tell us about your experience..."
              className="input resize-none text-sm"
              {...register("description", { required: true })}
            />

            <Button
              type="submit"
              variant="primary"
              loading={submitMutation.isPending}
              className="w-full text-sm"
            >
              <Send className="w-3.5 h-3.5" />
              Submit Feedback
            </Button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="w-12 h-12 bg-primary-800 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-700 transition-colors"
        title="Share feedback"
      >
        {open
          ? <X className="w-5 h-5" />
          : <MessageSquare className="w-5 h-5" />
        }
      </button>
    </div>
  )
}

const PatientLayout = () => {
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount)
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)

  // Poll unread notification count every 30 seconds
  const { data } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const res = await notificationsApi.getUnreadCount()
      return res.data
    },
    refetchInterval: NOTIFICATION_POLL_INTERVAL,
    refetchIntervalInBackground: false,
    // Don't poll when browser tab is in background
  })

  // Sync unread count to Zustand store whenever it changes
  useEffect(() => {
    if (data?.unread_count !== undefined) {
      setUnreadCount(data.unread_count)
    }
  }, [data, setUnreadCount])

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Sidebar — fixed left */}
      <Sidebar role="patient" />

      {/* Main content area — offset by sidebar width on desktop */}
      <div className="lg:ml-64 flex flex-col min-h-screen">

        {/* Top navbar — fixed */}
        <Navbar role="patient" />

        {/* Page content — below fixed navbar */}
        <main className="flex-1 pt-16">
          <Outlet />
          {/* Outlet renders the current child route */}
        </main>
      </div>
      <FeedbackWidget />
    </div>
  )
}

export default PatientLayout