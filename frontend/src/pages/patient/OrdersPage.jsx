import { useState } from "react"
import { Link } from "react-router-dom"
import {
  ShoppingBag,
  ChevronRight,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  CreditCard,
  Search,
  Filter,
} from "lucide-react"

import Card from "../../components/ui/Card"
import Badge from "../../components/ui/Badge"
import Button from "../../components/ui/Button"
import EmptyState from "../../components/ui/EmptyState"
import { PageSpinner } from "../../components/ui/Spinner"
import { useOrders } from "../../hooks/useOrders"
import {
  formatDate,
  formatCurrency,
  formatStatus,
} from "../../utils/formatters"
import { ORDER_STATUSES } from "../../utils/constants"

// ── Status icon mapping ──
const STATUS_ICONS = {
  awaiting_payment: CreditCard,
  paid:             CheckCircle2,
  processing:       Clock,
  dispatched:       Truck,
  delivered:        Package,
}

// ── Filter tabs ──
const STATUS_TABS = [
  { label: "All Orders", value: "all" },
  { label: "Pending Payment", value: ORDER_STATUSES.AWAITING_PAYMENT },
  { label: "Paid", value: ORDER_STATUSES.PAID },
  { label: "Dispatched", value: ORDER_STATUSES.DISPATCHED },
  { label: "Delivered", value: ORDER_STATUSES.DELIVERED },
]

// ── Single order card ──
const OrderCard = ({ order }) => {
  const Icon = STATUS_ICONS[order.order_status] || Package
  const isPending = order.order_status === ORDER_STATUSES.AWAITING_PAYMENT

  return (
    <Link
      to={`/patient/orders/${order.id}`}
      className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-xl transition-colors group"
    >
      {/* Status icon */}
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isPending
            ? "bg-amber-50"
            : "bg-green-50 group-hover:bg-green-100"
        } transition-colors`}
      >
        <Icon
          className={`w-5 h-5 ${
            isPending ? "text-amber-500" : "text-green-600"
          }`}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p className="text-sm font-semibold text-slate-900">
            {order.ailment_name}
          </p>
          <Badge status={order.order_status} />
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
          <span>{order.member_name}</span>
          <span>{formatDate(order.created_at)}</span>
          <span
            className={`font-semibold ${
              isPending ? "text-amber-600" : "text-slate-600"
            }`}
          >
            {formatCurrency(order.total_amount)}
          </span>
        </div>

        {/* Tracking info if dispatched */}
        {order.tracking_number && (
          <p className="text-xs text-primary-600 mt-1">
            Tracking: {order.tracking_number}
          </p>
        )}
      </div>

      {/* Arrow + Pay Now label */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {isPending && (
          <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
            Pay Now
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary-500 transition-colors" />
      </div>
    </Link>
  )
}

// ── Summary stats ──
const OrderStats = ({ orders }) => {
  const pending = orders.filter(
    (o) => o.order_status === ORDER_STATUSES.AWAITING_PAYMENT
  ).length
  const dispatched = orders.filter(
    (o) => o.order_status === ORDER_STATUSES.DISPATCHED
  ).length
  const delivered = orders.filter(
    (o) => o.order_status === ORDER_STATUSES.DELIVERED
  ).length
  const totalSpent = orders
    .filter((o) => o.payment_status === "success")
    .reduce((sum, o) => sum + Number(o.total_amount), 0)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {[
        {
          label: "Pending Payment",
          value: pending,
          color: "text-amber-600",
          bg: "bg-amber-50",
        },
        {
          label: "In Transit",
          value: dispatched,
          color: "text-blue-600",
          bg: "bg-blue-50",
        },
        {
          label: "Delivered",
          value: delivered,
          color: "text-green-600",
          bg: "bg-green-50",
        },
        {
          label: "Total Spent",
          value: formatCurrency(totalSpent),
          color: "text-primary-700",
          bg: "bg-primary-50",
        },
      ].map((stat) => (
        <div
          key={stat.label}
          className={`${stat.bg} rounded-xl p-4 text-center`}
        >
          <p className={`text-xl font-bold ${stat.color}`}>
            {stat.value}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
        </div>
      ))}
    </div>
  )
}

// ── Main Page ──
const OrdersPage = () => {
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  const { data, isLoading } = useOrders()
  const orders = Array.isArray(data) ? data : []

  // Filter by tab
  const byStatus =
    activeTab === "all"
      ? orders
      : orders.filter((o) => o.order_status === activeTab)

  // Filter by search
  const filtered = byStatus.filter((o) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      o.ailment_name?.toLowerCase().includes(q) ||
      o.member_name?.toLowerCase().includes(q) ||
      o.tracking_number?.toLowerCase().includes(q)
    )
  })

  // Count per status for tab badges
  const countByStatus = orders.reduce((acc, o) => {
    acc[o.order_status] = (acc[o.order_status] || 0) + 1
    return acc
  }, {})

  if (isLoading) return <PageSpinner />

  return (
    <div className="page-container">

      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="text-slate-900 mb-1">My Orders</h1>
          <p className="text-slate-500 text-sm">
            Track your medicine orders and payment status.
          </p>
        </div>
        <Link to="/patient/consultations/new">
          <Button variant="primary">
            New Consultation
          </Button>
        </Link>
      </div>

      {/* Stats */}
      {orders.length > 0 && <OrderStats orders={orders} />}

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by ailment, member or tracking number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input pl-9"
        />
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-5 scrollbar-hide">
        {STATUS_TABS.map((tab) => {
          const count =
            tab.value === "all"
              ? orders.length
              : countByStatus[tab.value] || 0

          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                activeTab === tab.value
                  ? "bg-primary-800 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-primary-300"
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                    activeTab === tab.value
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Orders list */}
      {filtered.length === 0 ? (
        orders.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No orders yet"
            description="Orders are created automatically after your doctor writes a prescription."
          />
        ) : (
          <EmptyState
            icon={Filter}
            title="No results found"
            description="Try adjusting your search or filter."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setActiveTab("all")
                  setSearchQuery("")
                }}
              >
                Clear Filters
              </Button>
            }
          />
        )
      ) : (
        <Card padding={false}>
          <div className="px-4 py-3 border-b border-slate-50">
            <p className="text-xs text-slate-400">
              {filtered.length} order{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="divide-y divide-slate-50 p-2">
            {filtered.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

export default OrdersPage