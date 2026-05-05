import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  CreditCard,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Pill,
  MapPin,
  Copy,
  ExternalLink,
  ShieldCheck,
  HeartPulse,
} from "lucide-react"
import toast from "react-hot-toast"

import Card from "../../components/ui/Card"
import Badge from "../../components/ui/Badge"
import Button from "../../components/ui/Button"
import { PageSpinner } from "../../components/ui/Spinner"
import { useOrder, useInitiatePayment, useVerifyPayment } from "../../hooks/useOrders"
import { consultationsApi } from "../../api/consultations.api"
import { useQuery } from "@tanstack/react-query"
import {
  formatDate,
  formatDateTime,
  formatCurrency,
  formatStatus,
} from "../../utils/formatters"
import { ORDER_STATUSES, PAYMENT_STATUSES } from "../../utils/constants"

// ── Order status progress bar ──
const OrderProgress = ({ status }) => {
  const steps = [
    { key: "awaiting_payment", label: "Payment", icon: CreditCard },
    { key: "paid", label: "Confirmed", icon: CheckCircle2 },
    { key: "processing", label: "Processing", icon: Clock },
    { key: "dispatched", label: "Dispatched", icon: Truck },
    { key: "delivered", label: "Delivered", icon: Package },
  ]

  const ORDER = {
    awaiting_payment: 0,
    paid: 1,
    processing: 2,
    dispatched: 3,
    delivered: 4,
  }
  const currentIndex = ORDER[status] ?? 0

  return (
    <div>
      <div className="flex items-center justify-between relative">
        {/* Background line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-slate-100 z-0" />
        {/* Progress line */}
        <div
          className="absolute top-4 left-0 h-0.5 bg-primary-500 z-0 transition-all duration-500"
          style={{
            width: `${(currentIndex / (steps.length - 1)) * 100}%`,
          }}
        />

        {steps.map((step, index) => {
          const Icon = step.icon
          const isDone = index < currentIndex
          const isActive = index === currentIndex

          return (
            <div
              key={step.key}
              className="flex flex-col items-center gap-2 relative z-10"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                  isDone
                    ? "bg-primary-600 border-primary-600"
                    : isActive
                    ? "bg-white border-primary-500"
                    : "bg-white border-slate-200"
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isDone
                      ? "text-white"
                      : isActive
                      ? "text-primary-600"
                      : "text-slate-300"
                  }`}
                />
              </div>
              <span
                className={`text-xs font-medium ${
                  isActive
                    ? "text-primary-700"
                    : isDone
                    ? "text-slate-600"
                    : "text-slate-300"
                }`}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Razorpay payment handler ──
const PaymentSection = ({ order, onPaymentSuccess }) => {
  const [paying, setPaying] = useState(false)
  const initiateMutation = useInitiatePayment()
  const verifyMutation = useVerifyPayment()

  const handlePay = async () => {
    setPaying(true)
    try {
      // Step 1 — Create Razorpay order on our backend
      const res = await initiateMutation.mutateAsync(order.id)
      const {
        razorpay_order_id,
        amount,
        currency,
        razorpay_key_id,
      } = res.data

      // Step 2 — Open Razorpay popup
      const options = {
        key: razorpay_key_id,
        amount,
        currency,
        name: "HomeoNivaran",
        description: `Consultation payment for ${order.ailment_name}`,
        order_id: razorpay_order_id,
        prefill: {
          name: order.member_name || "",
        },
        theme: {
          color: "#1E40AF",
        },

        // Called when payment succeeds in Razorpay popup
        handler: async (response) => {
          try {
            // Step 3 — Verify with our backend
            await verifyMutation.mutateAsync({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
            onPaymentSuccess()
          } catch {
            // verifyMutation onError shows toast
          }
        },

        // Called when user closes popup without paying
        modal: {
          ondismiss: () => {
            toast("Payment cancelled.", { icon: "ℹ️" })
            setPaying(false)
          },
        },
      }

      // Load Razorpay script if not already loaded
      if (!window.Razorpay) {
        await loadRazorpayScript()
      }

      const rzp = new window.Razorpay(options)
      rzp.open()

    } catch {
      // initiateMutation onError shows toast
      setPaying(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Amount summary */}
      <div className="flex items-center justify-between bg-slate-50 rounded-xl px-5 py-4">
        <div>
          <p className="text-sm text-slate-500">Amount to Pay</p>
          <p className="text-2xl font-bold text-primary-800 mt-0.5">
            {formatCurrency(order.total_amount)}
          </p>
        </div>
        <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
          <CreditCard className="w-6 h-6 text-amber-500" />
        </div>
      </div>

      {/* Pay button */}
      <Button
        variant="primary"
        onClick={handlePay}
        loading={paying || initiateMutation.isPending}
        className="w-full py-4 text-base"
      >
        <CreditCard className="w-5 h-5" />
        Pay {formatCurrency(order.total_amount)} Securely
      </Button>

      {/* Security note */}
      <div className="flex items-center gap-2 justify-center text-xs text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
        Secured by Razorpay · 256-bit SSL encryption
      </div>
    </div>
  )
}

// ── Load Razorpay script dynamically ──
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    // Check if already loaded
    if (document.getElementById("razorpay-script")) {
      resolve()
      return
    }
    const script = document.createElement("script")
    script.id = "razorpay-script"
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.onload = resolve
    document.body.appendChild(script)
  })
}

const PrescriptionDetail = ({ consultationId, isPaid }) => {
  const { data, isLoading } = useQuery({
    queryKey: ["prescription", consultationId],
    queryFn: async () => {
      const res = await consultationsApi.getPrescription(consultationId)
      return res.data
    },
    retry: false,
    enabled: !!consultationId,
  })

  if (isLoading || !data) return null

  // Only show full prescription on order page after payment
  if (!isPaid) return null

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Pill className="w-4 h-4 text-slate-400" />
        <h3 className="text-slate-800 text-sm">Your Prescription</h3>
      </div>

      {data.doctor_notes && (
        <div className="bg-blue-50 rounded-lg p-3 mb-4">
          <p className="text-xs font-medium text-blue-600 mb-1">
            Doctor's Notes
          </p>
          <p className="text-xs text-blue-800">{data.doctor_notes}</p>
        </div>
      )}

      <div className="space-y-3">
        {data.items?.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0"
          >
            <div className="w-7 h-7 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Pill className="w-3.5 h-3.5 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-slate-800">
                  {item.medicine_name}
                </p>
                <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                  {item.potency}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {item.dosage} · {item.frequency} · {item.duration}
              </p>
              {item.instructions && (
                <p className="text-xs text-slate-400 mt-0.5 italic">
                  {item.instructions}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ── Tracking section ──
const TrackingSection = ({ order }) => {
  const copyTracking = () => {
    navigator.clipboard.writeText(order.tracking_number)
    toast.success("Tracking number copied!")
  }

  if (!order.tracking_number) return null

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Truck className="w-4 h-4 text-slate-400" />
        <h3 className="text-slate-800 text-sm">Tracking Information</h3>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
          <div>
            <p className="text-xs text-slate-400 mb-0.5">
              Courier
            </p>
            <p className="text-sm font-semibold text-slate-800">
              {order.courier_name}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
          <div>
            <p className="text-xs text-slate-400 mb-0.5">
              Tracking Number
            </p>
            <p className="text-sm font-semibold text-slate-800 font-mono">
              {order.tracking_number}
            </p>
          </div>
          <button
            onClick={copyTracking}
            className="btn-ghost p-2 text-slate-400 hover:text-primary-600"
            title="Copy tracking number"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>

        {order.dispatched_at && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            Dispatched on {formatDateTime(order.dispatched_at)}
          </div>
        )}
      </div>
    </Card>
  )
}

// ── Main Page ──
const OrderDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: order, isLoading, refetch } = useOrder(id)

  const handlePaymentSuccess = () => {
    // Refetch order to show updated status
    refetch()
  }

  if (isLoading) return <PageSpinner />

  if (!order) {
    return (
      <div className="page-container">
        <div className="text-center py-16">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-slate-500 mb-4">Order not found</h3>
          <Button
            variant="secondary"
            onClick={() => navigate("/patient/orders")}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Orders
          </Button>
        </div>
      </div>
    )
  }

  const isAwaitingPayment =
    order.order_status === ORDER_STATUSES.AWAITING_PAYMENT
  const isPaid = order.payment_status === PAYMENT_STATUSES.SUCCESS
  const isDelivered = order.order_status === ORDER_STATUSES.DELIVERED

  return (
    <div className="page-container max-w-3xl mx-auto">

      {/* Back */}
      <button
        onClick={() => navigate("/patient/orders")}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Orders
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-slate-900">{order.ailment_name}</h1>
            <Badge status={order.order_status} />
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-400 flex-wrap">
            <span>{order.member_name}</span>
            <span>{formatDate(order.created_at)}</span>
            <span className="font-semibold text-slate-600">
              {formatCurrency(order.total_amount)}
            </span>
          </div>
        </div>

        {/* View consultation link */}
        <button
          onClick={() =>
            navigate(
              `/patient/consultations/${order.consultation_id}`
            )
          }
          className="btn-ghost text-sm flex items-center gap-1"
        >
          <HeartPulse className="w-4 h-4" />
          View Consultation
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      {/* Order progress */}
      <Card className="mb-6">
        <h3 className="text-slate-800 text-sm mb-6">Order Progress</h3>
        <OrderProgress status={order.order_status} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left — payment or tracking */}
        <div className="lg:col-span-2 space-y-5">

          {/* Payment section */}
          {isAwaitingPayment && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-4 h-4 text-slate-400" />
                <h3 className="text-slate-800 text-sm">
                  Complete Payment
                </h3>
              </div>
              <PaymentSection
                order={order}
                onPaymentSuccess={handlePaymentSuccess}
              />
            </Card>
          )}

          {/* Payment success confirmation */}
          {isPaid && !isAwaitingPayment && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-800">
                    Payment Confirmed
                  </p>
                  <p className="text-xs text-green-600">
                    {formatCurrency(order.total_amount)} paid
                    successfully. Your medicine is being prepared.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Delivered confirmation */}
          {isDelivered && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <Package className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-green-800 mb-1">
                Order Delivered!
              </p>
              <p className="text-xs text-green-600">
                Your medicine has been delivered.
                {order.delivered_at &&
                  ` Delivered on ${formatDate(order.delivered_at)}.`}
              </p>
            </div>
          )}

          {/* Tracking */}
          <TrackingSection order={order} />

          {/* Prescription */}
          <PrescriptionDetail
            consultationId={order.consultation_id}
            isPaid={isPaid}
          />
        </div>

        {/* Right — order summary */}
        <div className="space-y-5">
          <Card>
            <h3 className="text-slate-800 text-sm mb-4">
              Order Summary
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-400">Order ID</p>
                <p className="text-xs font-mono text-slate-600 mt-0.5 break-all">
                  {order.id}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Condition</p>
                <p className="text-sm font-medium text-slate-800">
                  {order.ailment_name}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Patient</p>
                <p className="text-sm font-medium text-slate-800">
                  {order.member_name}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">
                  Order Date
                </p>
                <p className="text-sm font-medium text-slate-800">
                  {formatDate(order.created_at)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">
                  Payment Status
                </p>
                <Badge status={order.payment_status} />
              </div>
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-400">
                  Total Amount
                </p>
                <p className="text-xl font-bold text-primary-800">
                  {formatCurrency(order.total_amount)}
                </p>
              </div>
            </div>
          </Card>

          {/* Doctor notes if available */}
          {order.doctor_notes && (
            <Card>
              <h3 className="text-slate-800 text-sm mb-2">
                Doctor's Notes
              </h3>
              <p className="text-sm text-slate-600">
                {order.doctor_notes}
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default OrderDetailPage