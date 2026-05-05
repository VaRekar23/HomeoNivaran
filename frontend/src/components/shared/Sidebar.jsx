import { NavLink, useNavigate } from "react-router-dom"
import { clsx } from "clsx"
import {
  Leaf,
  LayoutDashboard,
  Users,
  MessageSquarePlus,
  ClipboardList,
  ShoppingBag,
  User,
  Stethoscope,
  ListOrdered,
  Brain,
  BarChart3,
  FileText,
  MessageSquare,
  LogOut,
  X,
  Activity,
  Bell,
  UserPlus,
  Clock,
  Phone,
  Package,
  TrendingUp,
  HeartPulse,
} from "lucide-react"
import toast from "react-hot-toast"

import useUIStore from "../../store/ui.store"
import useAuthStore from "../../store/auth.store"
import { authApi } from "../../api/auth.api"

// Navigation config per role
const NAV_CONFIG = {
  patient: [
    {
      label: "Dashboard",
      to: "/patient/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Family Members",
      to: "/patient/family",
      icon: Users,
    },
    {
      label: "New Consultation",
      to: "/patient/consultations/new",
      icon: MessageSquarePlus,
      highlight: true,  // shown with accent style
    },
    {
      label: "My Consultations",
      to: "/patient/consultations",
      icon: ClipboardList,
    },
    {
      label: "My Orders",
      to: "/patient/orders",
      icon: ShoppingBag,
    },
    { 
      label: "Notifications",   
      to: "/patient/notifications",     
      icon: Bell 
    },
    { 
      label: "Teleconsult",      
      to: "/patient/teleconsult",       
      icon: Phone 
    },
    {
      label: "Profile",
      to: "/patient/profile",
      icon: User,
    },
  ],
  doctor: [
    {
      label: "Dashboard",
      to: "/doctor/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Patient Queue",
      to: "/doctor/queue",
      icon: ListOrdered,
    },
    { 
      label: "Add Patient",  
      to: "/doctor/add-patient",  
      icon: UserPlus 
    },
    { 
      label: "My Availability", 
      to: "/doctor/availability", 
      icon: Clock 
    },
    {
      label: "Orders",
      to: "/doctor/orders",
      icon: ShoppingBag,
    },
    { 
      label: "Inventory", 
      to: "/doctor/inventory", 
      icon: Package 
    },
    { 
      label: "Ailments",  
      to: "/doctor/ailments",  
      icon: HeartPulse 
    },
  ],
  admin: [
    {
      label: "Dashboard",
      to: "/admin/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Orders",
      to: "/admin/orders",
      icon: ShoppingBag
    },
    {
      label: "Error Logs",
      to: "/admin/logs",
      icon: FileText,
    },
    {
      label: "User Feedback",
      to: "/admin/feedback",
      icon: MessageSquare,
    },
    {
      label: "Users",
      to: "/admin/users",
      icon: Users,
    },
    {
      label: "App Health",
      to: "/admin/health",
      icon: Activity
    },
    { 
      label: "Analytics", 
      to: "/admin/analytics", 
      icon: TrendingUp 
    },
  ],
}

const Sidebar = ({ role = "patient" }) => {
  const navigate = useNavigate()
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen)
  const logout = useAuthStore((s) => s.logout)

  const navItems = NAV_CONFIG[role] || NAV_CONFIG.patient

  // Role accent colors
  const accentColors = {
    patient: "bg-primary-800",
    doctor:  "bg-teal-700",
    admin:   "bg-slate-800",
  }

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch {
      // logout regardless
    } finally {
      logout()
      toast.success("Logged out successfully")
      navigate("/login")
    }
  }

  return (
    <>
      {/* Mobile overlay — closes sidebar when clicking outside */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={clsx(
          "fixed top-0 left-0 h-full w-64 z-30 flex flex-col",
          "bg-white border-r border-slate-100",
          "transition-transform duration-200 ease-in-out",
          // On mobile: slides in/out
          // On desktop: always visible
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div
              className={clsx(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                accentColors[role]
              )}
            >
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-900">
              Homeo<span className="text-primary-700">Nivaran</span>
            </span>
          </div>

          {/* Close button — mobile only */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden btn-ghost p-1.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Role badge */}
        <div className="px-4 py-3 border-b border-slate-50">
          <span
            className={clsx(
              "text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded",
              role === "patient" && "bg-blue-50 text-blue-700",
              role === "doctor"  && "bg-teal-50 text-teal-700",
              role === "admin"   && "bg-slate-100 text-slate-600"
            )}
          >
            {role === "patient" && "Patient Portal"}
            {role === "doctor"  && "Doctor Portal"}
            {role === "admin"   && "Admin Portal"}
          </span>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => {
                  // Close sidebar on mobile after navigation
                  if (window.innerWidth < 1024) {
                    setSidebarOpen(false)
                  }
                }}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                    isActive
                      ? "bg-primary-50 text-primary-800"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                    // Highlight "New Consultation" with accent background
                    item.highlight && !isActive &&
                      "bg-primary-800 text-white hover:bg-primary-700"
                  )
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        {/* Bottom — logout */}
        <div className="p-3 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar