import { useState } from "react"
import {
  Bell,
  CheckCheck,
  Trash2,
  Package,
  Pill,
  CreditCard,
  HeartPulse,
  Star,
  BellOff,
} from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"

import Card from "../../components/ui/Card"
import Button from "../../components/ui/Button"
import EmptyState from "../../components/ui/EmptyState"
import { PageSpinner } from "../../components/ui/Spinner"
import { notificationsApi } from "../../api/notifications.api"
import useNotificationStore from "../../store/notification.store"
import { formatRelativeTime, formatDateTime } from "../../utils/formatters"

const TYPE_CONFIG = {
  prescription_ready: {
    icon: Pill,
    color: "bg-green-50 text-green-600",
    label: "Prescription Ready",
  },
  payment_success: {
    icon: CreditCard,
    color: "bg-blue-50 text-blue-600",
    label: "Payment",
  },
  payment_received: {
    icon: CreditCard,
    color: "bg-blue-50 text-blue-600",
    label: "Payment",
  },
  order_dispatched: {
    icon: Package,
    color: "bg-purple-50 text-purple-600",
    label: "Order Dispatched",
  },
  order_delivered: {
    icon: Package,
    color: "bg-green-50 text-green-600",
    label: "Order Delivered",
  },
  new_consultation: {
    icon: HeartPulse,
    color: "bg-primary-50 text-primary-600",
    label: "Consultation",
  },
  feedback_requested: {
    icon: Star,
    color: "bg-amber-50 text-amber-600",
    label: "Feedback",
  },
}

const NotificationItem = ({
  notification,
  onMarkRead,
  onDelete,
}) => {
  const config =
    TYPE_CONFIG[notification.type] || {
      icon: Bell,
      color: "bg-slate-50 text-slate-500",
      label: "Notification",
    }
  const Icon = config.icon

  return (
    <div
      className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${
        !notification.is_read
          ? "bg-blue-50/50 border border-blue-100"
          : "hover:bg-slate-50"
      }`}
    >
      {/* Icon */}
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${config.color}`}
      >
        <Icon className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p
              className={`text-sm ${
                !notification.is_read
                  ? "font-semibold text-slate-900"
                  : "font-medium text-slate-700"
              }`}
            >
              {notification.title}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {notification.message}
            </p>
          </div>
          {!notification.is_read && (
            <div className="w-2 h-2 bg-primary-600 rounded-full flex-shrink-0 mt-1.5" />
          )}
        </div>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs text-slate-400">
            {formatRelativeTime(notification.created_at)}
          </span>
          <span className="text-xs text-slate-300">·</span>
          <span className="text-xs text-slate-400">
            {formatDateTime(notification.created_at)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-1 flex-shrink-0">
        {!notification.is_read && (
          <button
            onClick={() => onMarkRead(notification.id)}
            className="btn-ghost p-1.5 text-slate-400 hover:text-primary-600"
            title="Mark as read"
          >
            <CheckCheck className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => onDelete(notification.id)}
          className="btn-ghost p-1.5 text-slate-400 hover:text-red-500"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

const NotificationsPage = () => {
  const [activeTab, setActiveTab] = useState("all")
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount)
  const queryClient = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["notifications-all"],
    queryFn: async () => {
      const res = await notificationsApi.getAll()
      return res.data
    },
  })

  const notifications = Array.isArray(data?.notifications)
    ? data.notifications
    : []

  const unread = notifications.filter((n) => !n.is_read)
  const filtered =
    activeTab === "unread"
      ? unread
      : notifications

  const markReadMutation = useMutation({
    mutationFn: (id) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      refetch()
      const newCount = Math.max(0, unread.length - 1)
      setUnreadCount(newCount)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => notificationsApi.delete(id),
    onSuccess: () => {
      refetch()
      queryClient.invalidateQueries({
        queryKey: ["notifications", "unread-count"],
      })
    },
  })

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      refetch()
      setUnreadCount(0)
      toast.success("All notifications marked as read")
    },
  })

  if (isLoading) return <PageSpinner />

  return (
    <div className="page-container max-w-3xl mx-auto">

      {/* Header */}
      <div className="section-header mb-6">
        <div>
          <h1 className="text-slate-900 mb-1">Notifications</h1>
          <p className="text-slate-500 text-sm">
            {notifications.length} total ·{" "}
            {unread.length} unread
          </p>
        </div>
        {unread.length > 0 && (
          <Button
            variant="secondary"
            onClick={() => markAllMutation.mutate()}
            loading={markAllMutation.isPending}
            className="text-sm"
          >
            <CheckCheck className="w-4 h-4" />
            Mark All Read
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {[
          { label: "All", value: "all", count: notifications.length },
          { label: "Unread", value: "unread", count: unread.length },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.value
                ? "bg-primary-800 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:border-primary-300"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  activeTab === tab.value
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title={
            activeTab === "unread"
              ? "No unread notifications"
              : "No notifications yet"
          }
          description={
            activeTab === "unread"
              ? "You're all caught up!"
              : "Notifications about your consultations and orders appear here."
          }
        />
      ) : (
        <Card padding={false}>
          <div className="divide-y divide-slate-50 p-2 space-y-1">
            {filtered.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onMarkRead={(id) => markReadMutation.mutate(id)}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

export default NotificationsPage