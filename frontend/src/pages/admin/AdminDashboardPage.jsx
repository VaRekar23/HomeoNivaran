import { Link } from "react-router-dom"
import {
  FileText,
  MessageSquare,
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Activity,
} from "lucide-react"

import Card from "../../components/ui/Card"
import { PageSpinner } from "../../components/ui/Spinner"
import EmptyState from "../../components/ui/EmptyState"
import useAuthStore from "../../store/auth.store"
import { useAdminLogs } from "../../hooks/useAdmin"
import { useAdminUsers } from "../../hooks/useAdmin"
import { useAdminFeedback } from "../../hooks/useAdmin"
import { formatRelativeTime, formatDateTime } from "../../utils/formatters"

const StatCard = ({ icon: Icon, label, value, color, to, subtext }) => {
  const content = (
    <div className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          {label}
        </span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-3xl font-bold text-slate-900 mb-1">{value}</p>
      {subtext && (
        <p className="text-xs text-slate-400">{subtext}</p>
      )}
    </div>
  )
  return to ? <Link to={to}>{content}</Link> : content
}

const AdminDashboardPage = () => {
  const user = useAuthStore((s) => s.user)

  const { data: logsData, isLoading: loadingLogs } = useAdminLogs({ limit: 5 })
  const { data: users = [], isLoading: loadingUsers } = useAdminUsers()
  const { data: feedback = [], isLoading: loadingFeedback } =
    useAdminFeedback()

  const logs = logsData?.logs || []
  const newFeedback = feedback.filter((f) => f.status === "new")
  const patients = users.filter((u) => u.role === "patient")
  const activeUsers = users.filter((u) => u.is_active)

  if (loadingLogs || loadingUsers || loadingFeedback) return <PageSpinner />

  return (
    <div className="page-container">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-slate-900 mb-1">
          Admin Dashboard 🛠️
        </h1>
        <p className="text-slate-500 text-sm">
          Platform overview and system health.
        </p>
      </div>

      {/* Alerts */}
      {logs.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">
              {logsData?.total_last_24h || 0} critical error
              {logsData?.total_last_24h !== 1 ? "s" : ""} in the last 24 hours
            </p>
            <p className="text-xs text-red-600">
              Review error logs for details.
            </p>
          </div>
          <Link
            to="/admin/logs"
            className="text-xs font-semibold text-red-700 hover:underline"
          >
            View Logs →
          </Link>
        </div>
      )}

      {newFeedback.length > 0 && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-800">
              {newFeedback.length} new feedback item
              {newFeedback.length !== 1 ? "s" : ""} to review
            </p>
          </div>
          <Link
            to="/admin/feedback"
            className="text-xs font-semibold text-blue-700 hover:underline"
          >
            Review →
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Users}
          label="Total Users"
          value={users.length}
          color="bg-blue-50 text-blue-600"
          to="/admin/users"
          subtext={`${activeUsers.length} active`}
        />
        <StatCard
          icon={Activity}
          label="Patients"
          value={patients.length}
          color="bg-green-50 text-green-600"
          to="/admin/users"
        />
        <StatCard
          icon={MessageSquare}
          label="New Feedback"
          value={newFeedback.length}
          color="bg-purple-50 text-purple-600"
          to="/admin/feedback"
        />
        <StatCard
          icon={AlertCircle}
          label="Error Logs"
          value={logsData?.total || 0}
          color="bg-red-50 text-red-600"
          to="/admin/logs"
          subtext={`${logsData?.total_last_24h || 0} last 24h`}
        />
      </div>

      {/* Recent logs + feedback */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent errors */}
        <Card padding={false}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              Recent Errors
            </h3>
            <Link
              to="/admin/logs"
              className="text-xs text-primary-600 hover:underline"
            >
              View all
            </Link>
          </div>

          {logs.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No errors logged"
              description="System is running smoothly."
            />
          ) : (
            <div className="divide-y divide-slate-50">
              {logs.slice(0, 5).map((log) => (
                <div key={log.id} className="px-5 py-3">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded mt-0.5 flex-shrink-0">
                      {log.level}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 truncate">
                        {log.message}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {log.module} · {formatRelativeTime(log.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent feedback */}
        <Card padding={false}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-purple-400" />
              Recent Feedback
            </h3>
            <Link
              to="/admin/feedback"
              className="text-xs text-primary-600 hover:underline"
            >
              View all
            </Link>
          </div>

          {feedback.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No feedback yet"
              description="User feedback will appear here."
            />
          ) : (
            <div className="divide-y divide-slate-50">
              {feedback.slice(0, 5).map((fb) => (
                <div key={fb.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          fb.type === "bug_report"
                            ? "bg-red-50 text-red-600"
                            : fb.type === "feature_request"
                            ? "bg-blue-50 text-blue-600"
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {fb.type.replace("_", " ")}
                        </span>
                        {fb.status === "new" && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                      </div>
                      <p className="text-xs text-slate-700 truncate">
                        {fb.description}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {fb.user_name || "Anonymous"} ·{" "}
                        {formatRelativeTime(fb.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

export default AdminDashboardPage