import { Link } from "react-router-dom"
import {
  ClipboardList,
  ShoppingBag,
  Clock,
  CheckCircle2,
  ChevronRight,
  HeartPulse,
  AlertCircle,
  Package,
  Users,
} from "lucide-react"

import Card from "../../components/ui/Card"
import Badge from "../../components/ui/Badge"
import { PageSpinner } from "../../components/ui/Spinner"
import EmptyState from "../../components/ui/EmptyState"
import useAuthStore from "../../store/auth.store"
import { useDoctorQueue } from "../../hooks/useDoctor"
import { useDoctorOrders } from "../../hooks/useDoctor"
import { formatDate, formatCurrency } from "../../utils/formatters"

// ── Stat card ──
const StatCard = ({ icon: Icon, label, value, color, to }) => {
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
      <p className="text-3xl font-bold text-slate-900">{value}</p>
    </div>
  )

  return to ? <Link to={to}>{content}</Link> : content
}

// ── Queue item row ──
const QueueRow = ({ item }) => (
  <Link
    to={`/doctor/cases/${item.id}`}
    className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-xl transition-colors group"
  >
    <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary-100">
      <HeartPulse className="w-5 h-5 text-primary-600" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <p className="text-sm font-semibold text-slate-900">
          {item.patient_name}
        </p>
        <Badge status={item.status} />
      </div>
      <p className="text-xs text-slate-400">
        {item.ailment_name} · {item.member_name} ·{" "}
        {formatDate(item.submitted_at)}
      </p>
    </div>
    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary-500" />
  </Link>
)

// ── Main Page ──
const DoctorDashboardPage = () => {
  const user = useAuthStore((s) => s.user)

  const { data: queue = [], isLoading: loadingQueue } =
    useDoctorQueue()
  const { data: orders = [], isLoading: loadingOrders } =
    useDoctorOrders()

  const pending = queue.filter((c) => c.status === "submitted")
  const inReview = queue.filter((c) => c.status === "under_review")
  const pendingDispatch = orders.filter(
    (o) => o.order_status === "paid"
  )
  const totalRevenue = orders
    .filter((o) => o.payment_status === "success")
    .reduce((sum, o) => sum + Number(o.total_amount), 0)

  if (loadingQueue || loadingOrders) return <PageSpinner />

  return (
    <div className="page-container">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-slate-900 mb-1">
          Welcome, {user?.name?.split(" ")[0]}! 👩‍⚕️
        </h1>
        <p className="text-slate-500">
          Here's your practice overview for today.
        </p>
      </div>

      {/* Urgent alerts */}
      {pending.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">
              {pending.length} case{pending.length > 1 ? "s" : ""}{" "}
              awaiting review
            </p>
            <p className="text-xs text-amber-600">
              Patients are waiting for your prescription.
            </p>
          </div>
          <Link
            to="/doctor/queue"
            className="text-xs font-semibold text-amber-700 hover:underline"
          >
            View Queue →
          </Link>
        </div>
      )}

      {pendingDispatch.length > 0 && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <Package className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-800">
              {pendingDispatch.length} order
              {pendingDispatch.length > 1 ? "s" : ""} ready to dispatch
            </p>
            <p className="text-xs text-blue-600">
              Payment received — medicines need to be sent.
            </p>
          </div>
          <Link
            to="/doctor/orders"
            className="text-xs font-semibold text-blue-700 hover:underline"
          >
            View Orders →
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={ClipboardList}
          label="Pending Review"
          value={pending.length}
          color="bg-amber-50 text-amber-600"
          to="/doctor/queue"
        />
        <StatCard
          icon={Clock}
          label="In Review"
          value={inReview.length}
          color="bg-blue-50 text-blue-600"
          to="/doctor/queue"
        />
        <StatCard
          icon={Package}
          label="Ready to Dispatch"
          value={pendingDispatch.length}
          color="bg-purple-50 text-purple-600"
          to="/doctor/orders"
        />
        <StatCard
          icon={CheckCircle2}
          label="Total Revenue"
          value={formatCurrency(totalRevenue)}
          color="bg-green-50 text-green-600"
        />
      </div>

      {/* Recent queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding={false}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
            <h3 className="text-sm font-semibold text-slate-800">
              Pending Cases
            </h3>
            <Link
              to="/doctor/queue"
              className="text-xs text-primary-600 font-medium hover:underline"
            >
              View all
            </Link>
          </div>
          {pending.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="All caught up!"
              description="No pending cases to review."
            />
          ) : (
            <div className="p-2">
              {pending.slice(0, 5).map((item) => (
                <QueueRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </Card>

        <Card padding={false}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
            <h3 className="text-sm font-semibold text-slate-800">
              Orders to Dispatch
            </h3>
            <Link
              to="/doctor/orders"
              className="text-xs text-primary-600 font-medium hover:underline"
            >
              View all
            </Link>
          </div>
          {pendingDispatch.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No pending dispatches"
              description="Paid orders will appear here."
            />
          ) : (
            <div className="p-2">
              {pendingDispatch.slice(0, 5).map((order) => (
                <Link
                  key={order.id}
                  to="/doctor/orders"
                  className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-xl transition-colors group"
                >
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {order.patient_name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {order.ailment_name} ·{" "}
                      {formatCurrency(order.total_amount)}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary-500" />
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

export default DoctorDashboardPage