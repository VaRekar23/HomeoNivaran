import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  MessageSquarePlus,
  ClipboardList,
  ShoppingBag,
  Users,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Package,
  ArrowRight,
  HeartPulse,
} from "lucide-react"

import Card from "../../components/ui/Card"
import Badge from "../../components/ui/Badge"
import { PageSpinner } from "../../components/ui/Spinner"
import EmptyState from "../../components/ui/EmptyState"
import useAuthStore from "../../store/auth.store"
import { consultationsApi } from "../../api/consultations.api"
import { ordersApi } from "../../api/orders.api"
import { familyApi } from "../../api/family.api"
import { formatDate, formatCurrency, formatStatus } from "../../utils/formatters"

// ── Quick action card ──
const QuickAction = ({ to, icon: Icon, label, description, highlight }) => (
  <Link
    to={to}
    className={`card p-5 flex items-start gap-4 hover:shadow-md transition-all duration-200 group ${
      highlight
        ? "bg-primary-800 border-primary-700 hover:bg-primary-700"
        : "hover:border-primary-200"
    }`}
  >
    <div
      className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
        highlight
          ? "bg-white/20"
          : "bg-primary-50 group-hover:bg-primary-100"
      }`}
    >
      <Icon
        className={`w-6 h-6 ${
          highlight ? "text-white" : "text-primary-700"
        }`}
      />
    </div>
    <div className="flex-1 min-w-0">
      <p
        className={`font-semibold text-sm mb-0.5 ${
          highlight ? "text-white" : "text-slate-900"
        }`}
      >
        {label}
      </p>
      <p
        className={`text-xs ${
          highlight ? "text-primary-200" : "text-slate-500"
        }`}
      >
        {description}
      </p>
    </div>
    <ArrowRight
      className={`w-4 h-4 mt-1 flex-shrink-0 ${
        highlight ? "text-primary-300" : "text-slate-300 group-hover:text-primary-500"
      }`}
    />
  </Link>
)

// ── Stat card ──
const StatCard = ({ icon: Icon, label, value, color, subtext }) => (
  <div className="card p-5">
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

// ── Recent consultation row ──
const ConsultationRow = ({ consultation }) => (
  <Link
    to={`/patient/consultations/${consultation.id}`}
    className="flex items-center justify-between py-3 px-4 hover:bg-slate-50 rounded-lg transition-colors"
  >
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
        <HeartPulse className="w-4 h-4 text-blue-600" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-800">
          {consultation.ailment_name}
        </p>
        <p className="text-xs text-slate-400">
          {consultation.member_name} · {formatDate(consultation.submitted_at)}
        </p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <Badge status={consultation.status} />
      <ChevronRight className="w-4 h-4 text-slate-300" />
    </div>
  </Link>
)

// ── Recent order row ──
const OrderRow = ({ order }) => (
  <Link
    to={`/patient/orders/${order.id}`}
    className="flex items-center justify-between py-3 px-4 hover:bg-slate-50 rounded-lg transition-colors"
  >
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
        <Package className="w-4 h-4 text-green-600" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-800">
          {order.ailment_name}
        </p>
        <p className="text-xs text-slate-400">
          {formatCurrency(order.total_amount)} ·{" "}
          {formatDate(order.created_at)}
        </p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <Badge status={order.order_status} />
      <ChevronRight className="w-4 h-4 text-slate-300" />
    </div>
  </Link>
)

// ── Main Dashboard Page ──
const DashboardPage = () => {
  const user = useAuthStore((s) => s.user)

  // Fetch all data in parallel
  const { data: consultationsData, isLoading: loadingConsultations } =
    useQuery({
      queryKey: ["consultations"],
      queryFn: () => consultationsApi.getAll(),
    })

  const { data: ordersData, isLoading: loadingOrders } = useQuery({
    queryKey: ["orders"],
    queryFn: () => ordersApi.getAll(),
  })

  const { data: familyData, isLoading: loadingFamily } = useQuery({
    queryKey: ["family-members"],
    queryFn: () => familyApi.getAll(),
  })

  const consultations = Array.isArray(consultationsData?.data)
  ? consultationsData.data
  : []
  const orders = Array.isArray(ordersData?.data)
  ? ordersData.data
  : []
  const familyMembers = Array.isArray(familyData?.data)
  ? familyData.data
  : []

  // Compute stats
  const activeConsultations = consultations.filter(
    (c) => c.status !== "closed"
  ).length
  const pendingPayments = orders.filter(
    (o) => o.order_status === "awaiting_payment"
  ).length
  const recentConsultations = consultations.slice(0, 4)
  const recentOrders = orders.slice(0, 3)

  const isLoading = loadingConsultations || loadingOrders || loadingFamily

  if (isLoading) return <PageSpinner />

  return (
    <div className="page-container">

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-slate-900 mb-1">
          Good day, {user?.name?.split(" ")[0]}! 👋
        </h1>
        <p className="text-slate-500">
          Here's an overview of your health consultations and orders.
        </p>
      </div>

      {/* Pending payment alert */}
      {pendingPayments > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">
              Payment pending
            </p>
            <p className="text-xs text-amber-600">
              You have {pendingPayments} order
              {pendingPayments > 1 ? "s" : ""} awaiting payment.
            </p>
          </div>
          <Link
            to="/patient/orders"
            className="text-xs font-semibold text-amber-700 hover:underline flex-shrink-0"
          >
            View Orders →
          </Link>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Users}
          label="Family Members"
          value={familyMembers.length}
          color="bg-blue-50 text-blue-600"
          subtext="Profiles added"
        />
        <StatCard
          icon={ClipboardList}
          label="Consultations"
          value={consultations.length}
          color="bg-purple-50 text-purple-600"
          subtext="Total submitted"
        />
        <StatCard
          icon={Clock}
          label="Active Cases"
          value={activeConsultations}
          color="bg-amber-50 text-amber-600"
          subtext="In progress"
        />
        <StatCard
          icon={ShoppingBag}
          label="Orders"
          value={orders.length}
          color="bg-green-50 text-green-600"
          subtext="Total placed"
        />
      </div>

      {/* Quick actions */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-slate-800 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickAction
            to="/patient/consultations/new"
            icon={MessageSquarePlus}
            label="New Consultation"
            description="Start a consultation for any family member"
            highlight
          />
          <QuickAction
            to="/patient/family"
            icon={Users}
            label="Family Members"
            description="Add or manage family profiles"
          />
          <QuickAction
            to="/patient/consultations"
            icon={ClipboardList}
            label="View Consultations"
            description="Check your consultation history"
          />
          <QuickAction
            to="/patient/orders"
            icon={ShoppingBag}
            label="My Orders"
            description="Track your medicine orders"
          />
        </div>
      </div>

      {/* Recent activity — two columns on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent consultations */}
        <Card padding={false}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
            <h3 className="text-sm font-semibold text-slate-800">
              Recent Consultations
            </h3>
            <Link
              to="/patient/consultations"
              className="text-xs text-primary-600 font-medium hover:underline"
            >
              View all
            </Link>
          </div>

          {recentConsultations.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No consultations yet"
              description="Start your first consultation to get personalised homeopathy care."
              action={
                <Link
                  to="/patient/consultations/new"
                  className="btn-primary text-sm"
                >
                  Start Consultation
                </Link>
              }
            />
          ) : (
            <div className="p-2">
              {recentConsultations.map((c) => (
                <ConsultationRow key={c.id} consultation={c} />
              ))}
            </div>
          )}
        </Card>

        {/* Recent orders */}
        <Card padding={false}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
            <h3 className="text-sm font-semibold text-slate-800">
              Recent Orders
            </h3>
            <Link
              to="/patient/orders"
              className="text-xs text-primary-600 font-medium hover:underline"
            >
              View all
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="No orders yet"
              description="Your medicine orders will appear here after a prescription is issued."
            />
          ) : (
            <div className="p-2">
              {recentOrders.map((o) => (
                <OrderRow key={o.id} order={o} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

export default DashboardPage