import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Package,
  Truck,
  CheckCircle2,
  Search,
  Eye,
  Send,
} from "lucide-react"

import Card from "../../components/ui/Card"
import Badge from "../../components/ui/Badge"
import Button from "../../components/ui/Button"
import Input from "../../components/ui/Input"
import Modal from "../../components/ui/Modal"
import EmptyState from "../../components/ui/EmptyState"
import { PageSpinner } from "../../components/ui/Spinner"
import {
  useDoctorOrders,
  useDispatchOrder,
} from "../../hooks/useDoctor"
import { formatDate, formatCurrency } from "../../utils/formatters"
import { dispatchSchema } from "../../utils/validators"
import { ORDER_STATUSES } from "../../utils/constants"

const STATUS_TABS = [
  { label: "All", value: "all" },
  { label: "Awaiting Payment", value: ORDER_STATUSES.AWAITING_PAYMENT },
  { label: "Ready to Dispatch", value: ORDER_STATUSES.PAID },
  { label: "Dispatched", value: ORDER_STATUSES.DISPATCHED },
  { label: "Delivered", value: ORDER_STATUSES.DELIVERED },
]

// ── Dispatch Modal ──
const DispatchModal = ({ order, onClose }) => {
  const dispatchMutation = useDispatchOrder()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(dispatchSchema),
    defaultValues: {
      courier_name: "",
      tracking_number: "",
    },
  })

  const onSubmit = async (data) => {
    await dispatchMutation.mutateAsync({
      id: order.id,
      data,
    })
    onClose()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4">
        <p className="text-sm font-medium text-blue-800">
          {order.patient_name} — {order.ailment_name}
        </p>
        <p className="text-xs text-blue-600 mt-0.5">
          {formatCurrency(order.total_amount)}
        </p>
      </div>

      <Input
        label="Courier Name"
        placeholder="e.g. BlueDart, DTDC, India Post"
        error={errors.courier_name?.message}
        {...register("courier_name")}
      />
      <Input
        label="Tracking Number"
        placeholder="e.g. BD123456789IN"
        error={errors.tracking_number?.message}
        {...register("tracking_number")}
      />

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={dispatchMutation.isPending}
          className="flex-1"
        >
          <Truck className="w-4 h-4" />
          Mark Dispatched
        </Button>
      </div>
    </form>
  )
}

// ── Order row ──
const OrderRow = ({ order, onDispatch }) => {
  const canDispatch = order.order_status === ORDER_STATUSES.PAID ||
    order.order_status === ORDER_STATUSES.PROCESSING

  return (
    <div className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-xl transition-colors">
      {/* Icon */}
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
        canDispatch ? "bg-green-50" : "bg-slate-50"
      }`}>
        {canDispatch
          ? <Package className="w-5 h-5 text-green-600" />
          : <CheckCircle2 className="w-5 h-5 text-slate-400" />
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p className="text-sm font-semibold text-slate-900">
            {order.patient_name}
          </p>
          <Badge status={order.order_status} />
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
          <span>{order.ailment_name}</span>
          <span>{formatCurrency(order.total_amount)}</span>
          <span>{order.patient_phone}</span>
          <span>{formatDate(order.created_at)}</span>
        </div>
        {order.tracking_number && (
          <p className="text-xs text-primary-600 mt-1">
            {order.courier_name}: {order.tracking_number}
          </p>
        )}
      </div>

      {/* Actions */}
      {canDispatch && (
        <Button
          variant="primary"
          onClick={() => onDispatch(order)}
          className="text-xs flex-shrink-0"
        >
          <Truck className="w-3.5 h-3.5" />
          Dispatch
        </Button>
      )}
    </div>
  )
}

// ── Main Page ──
const DoctorOrdersPage = () => {
  const [activeTab, setActiveTab] = useState("all")
  const [search, setSearch] = useState("")
  const [dispatchOrder, setDispatchOrder] = useState(null)

  const { data: orders = [], isLoading } = useDoctorOrders()

  const byStatus =
    activeTab === "all"
      ? orders
      : orders.filter((o) => o.order_status === activeTab)

  const filtered = byStatus.filter((o) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      o.patient_name?.toLowerCase().includes(q) ||
      o.ailment_name?.toLowerCase().includes(q) ||
      o.tracking_number?.toLowerCase().includes(q)
    )
  })

  const countByStatus = orders.reduce((acc, o) => {
    acc[o.order_status] = (acc[o.order_status] || 0) + 1
    return acc
  }, {})

  const totalRevenue = orders
    .filter((o) => o.payment_status === "success")
    .reduce((sum, o) => sum + Number(o.total_amount), 0)

  if (isLoading) return <PageSpinner />

  return (
    <div className="page-container">

      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="text-slate-900 mb-1">Orders</h1>
          <p className="text-slate-500 text-sm">
            Total Revenue: {formatCurrency(totalRevenue)}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by patient, ailment or tracking..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-9"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-5">
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
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  activeTab === tab.value
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Orders */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title={orders.length === 0 ? "No orders yet" : "No results"}
          description={
            orders.length === 0
              ? "Orders appear here once prescriptions are issued and patients pay."
              : "Try adjusting your search or filter."
          }
        />
      ) : (
        <Card padding={false}>
          <div className="px-4 py-3 border-b border-slate-50">
            <p className="text-xs text-slate-400">
              {filtered.length} order{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="divide-y divide-slate-50 p-2">
            {filtered.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                onDispatch={setDispatchOrder}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Dispatch Modal */}
      <Modal
        isOpen={!!dispatchOrder}
        onClose={() => setDispatchOrder(null)}
        title="Mark Order as Dispatched"
        size="sm"
      >
        {dispatchOrder && (
          <DispatchModal
            order={dispatchOrder}
            onClose={() => setDispatchOrder(null)}
          />
        )}
      </Modal>
    </div>
  )
}

export default DoctorOrdersPage