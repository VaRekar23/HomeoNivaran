import { useState, useRef, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  Leaf,
  Menu,
  Bell,
  LogOut,
  User,
  ChevronDown,
  X,
} from "lucide-react"
import toast from "react-hot-toast"

import useAuthStore from "../../store/auth.store"
import useUIStore from "../../store/ui.store"
import useNotificationStore from "../../store/notification.store"
import { authApi } from "../../api/auth.api"
import { notificationsApi } from "../../api/notifications.api"
import { formatRelativeTime } from "../../utils/formatters"

// ── Notification Dropdown ──
const NotificationDropdown = ({ onClose }) => {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount)

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await notificationsApi.getAll()
        setNotifications(res.data.notifications.slice(0, 8))
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchNotifications()
  }, [])

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch {
      // silently fail
    }
  }

  const handleMarkRead = async (id) => {
    try {
      await notificationsApi.markAsRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
      const unread = notifications.filter(
        (n) => !n.is_read && n.id !== id
      ).length
      setUnreadCount(unread)
    } catch {
      // silently fail
    }
  }

  const typeIcons = {
    prescription_ready: "💊",
    payment_success:    "✅",
    payment_received:   "💰",
    order_dispatched:   "📦",
    new_consultation:   "🩺",
  }

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-modal border border-slate-100 z-50 overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <span className="text-sm font-semibold text-slate-800">
          Notifications
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleMarkAllRead}
            className="text-xs text-primary-600 hover:underline"
          >
            Mark all read
          </button>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
        {loading ? (
          <div className="py-8 text-center text-sm text-slate-400">
            Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            No notifications yet
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleMarkRead(n.id)}
              className={`px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${
                !n.is_read ? "bg-blue-50/50" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-lg flex-shrink-0 mt-0.5">
                  {typeIcons[n.type] || "🔔"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!n.is_read ? "font-medium text-slate-900" : "text-slate-700"}`}>
                    {n.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {n.message}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {formatRelativeTime(n.created_at)}
                  </p>
                </div>
                {!n.is_read && (
                  <div className="w-2 h-2 bg-primary-600 rounded-full flex-shrink-0 mt-1.5" />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-100 text-center">
        <Link
          to="/patient/notifications"
          onClick={onClose}
          className="text-xs text-primary-600 font-medium hover:underline"
        >
          View all notifications
        </Link>
      </div>
    </div>
  )
}

// ── Main Navbar ──
const Navbar = ({ role = "patient" }) => {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const unreadCount = useNotificationStore((s) => s.unreadCount)

  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const notifRef = useRef(null)
  const userRef = useRef(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false)
      }
      if (userRef.current && !userRef.current.contains(e.target)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await authApi.logout()
    } catch {
      // logout even if API call fails
    } finally {
      logout()
      toast.success("Logged out successfully")
      navigate("/login")
    }
  }

  const dashboardLinks = {
    patient: "/patient/dashboard",
    doctor:  "/doctor/dashboard",
    admin:   "/admin/dashboard",
  }

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 z-30 bg-white border-b border-slate-100 h-16">
      <div className="flex items-center justify-between h-full px-4 sm:px-6">

        {/* Left — hamburger + mobile logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="btn-ghost p-2 lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Mobile logo */}
          <Link
            to={dashboardLinks[role]}
            className="lg:hidden flex items-center gap-2"
          >
            <div className="w-7 h-7 bg-primary-800 rounded-lg flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-sm">
              Homeo<span className="text-primary-700">Nivaran</span>
            </span>
          </Link>
        </div>

        {/* Right — notifications + user menu */}
        <div className="flex items-center gap-2">

          {/* Notification bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setShowNotifications(!showNotifications)
                setShowUserMenu(false)
              }}
              className="btn-ghost p-2 relative"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center leading-none">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <NotificationDropdown
                onClose={() => setShowNotifications(false)}
              />
            )}
          </div>

          {/* User avatar + dropdown */}
          <div className="relative" ref={userRef}>
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu)
                setShowNotifications(false)
              }}
              className="flex items-center gap-2 btn-ghost px-3 py-2 rounded-lg"
            >
              <div className="w-7 h-7 bg-primary-100 text-primary-800 rounded-full flex items-center justify-center font-semibold text-xs">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <span className="hidden sm:block text-sm font-medium text-slate-700 max-w-[120px] truncate">
                {user?.name}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {/* User dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-modal border border-slate-100 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-50">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {user?.name}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {user?.email}
                  </p>
                </div>
                <div className="py-1">
                  {role === "patient" && (
                    <Link
                      to="/patient/profile"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <User className="w-4 h-4" />
                      My Profile
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    {loggingOut ? "Logging out..." : "Sign Out"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Navbar