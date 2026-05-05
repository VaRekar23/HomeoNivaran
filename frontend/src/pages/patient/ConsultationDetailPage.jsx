import { useState } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  HeartPulse,
  User,
  Calendar,
  Clock,
  Pill,
  ShoppingBag,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Lock,
  CreditCard,
  Phone,
  MapPin,
  Star,
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"

import Card from "../../components/ui/Card"
import Badge from "../../components/ui/Badge"
import Button from "../../components/ui/Button"
import { PageSpinner } from "../../components/ui/Spinner"
import { useConsultation } from "../../hooks/useConsultations"
import { consultationsApi } from "../../api/consultations.api"
import { ordersApi } from "../../api/orders.api"
import {
  formatDate,
  formatDateTime,
  formatCurrency,
  formatStatus,
} from "../../utils/formatters"

import { usePublicAvailability } from "../../hooks/useAvailability"
import { treatmentFeedbackApi } from "../../api/treatmentFeedback.api"
import TreatmentFeedbackForm from "../../components/patient/TreatmentFeedbackForm"

// ── Format time helper ──
const formatTime = (timeStr) => {
  if (!timeStr) return ""
  const [h, m] = timeStr.split(":").map(Number)
  const period = h >= 12 ? "PM" : "AM"
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, "0")} ${period}`
}

const DAYS = [
  "Monday", "Tuesday", "Wednesday",
  "Thursday", "Friday", "Saturday", "Sunday"
]

// ── Teleconsult card shown on consultation detail ──
const TeleconsultCard = () => {
  const { data: availability = [], isLoading } = usePublicAvailability()

  if (isLoading || availability.length === 0) return null

  const doctor = availability[0]
  // Use first doctor (when multi-doctor is added later, match by case)

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Phone className="w-4 h-4 text-primary-600" />
        <h3 className="text-slate-800 text-sm">
          Need to Talk to the Doctor?
        </h3>
      </div>

      {/* Is available now badge */}
      <div className={`flex items-center gap-2 rounded-xl p-3 mb-4 ${
        doctor.is_available_now
          ? "bg-green-50 border border-green-200"
          : "bg-slate-50 border border-slate-200"
      }`}>
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
          doctor.is_available_now
            ? "bg-green-500 animate-pulse"
            : "bg-slate-300"
        }`} />
        <p className={`text-sm font-medium ${
          doctor.is_available_now
            ? "text-green-800"
            : "text-slate-600"
        }`}>
          {doctor.is_available_now
            ? "Doctor is available right now!"
            : "Doctor is currently offline"}
        </p>
      </div>

      {/* Call button */}
      {doctor.is_available_now && (
        <a
          href={`tel:${doctor.doctor_phone}`}
          className="flex items-center justify-center gap-2 bg-primary-800 text-white px-4 py-3 rounded-xl font-medium text-sm hover:bg-primary-700 transition-colors mb-4"
        >
          <Phone className="w-4 h-4" />
          Call Dr. {doctor.doctor_name.split(" ")[0]}
        </a>
      )}

      {/* Weekly schedule */}
      {doctor.slots?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Weekly Schedule
          </p>
          <div className="space-y-1.5">
            {DAYS.map((day, index) => {
              const daySlots = doctor.slots.filter(
                (s) => s.day_of_week === index
              )
              if (daySlots.length === 0) return null
              return (
                <div
                  key={day}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-slate-500 w-24">{day}</span>
                  <div className="flex flex-col items-end gap-0.5">
                    {daySlots.map((slot) => (
                      <span
                        key={slot.id}
                        className="text-slate-700 font-medium"
                      >
                        {formatTime(slot.start_time)} — {formatTime(slot.end_time)}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Next available */}
      {!doctor.is_available_now && doctor.next_slot && (
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <Calendar className="w-3.5 h-3.5" />
          Next available: {doctor.next_slot.day_name},{" "}
          {formatTime(doctor.next_slot.start_time)}
        </div>
      )}
    </Card>
  )
}

// ── Delivery Address Card ──
const DeliveryAddressCard = ({ address }) => {
  if (!address) return null

  const LABEL_ICONS = {
    Home: "🏠", Office: "🏢", Parents: "👨‍👩‍👧", Other: "📍"
  }

  return (
    <Card>
      <h3 className="text-slate-800 text-sm mb-3 flex items-center gap-2">
        <MapPin className="w-4 h-4 text-slate-400" />
        Delivery Address
      </h3>
      <div className="bg-slate-50 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-2">
          <span>{LABEL_ICONS[address.label] || "📍"}</span>
          <span className="text-xs font-semibold text-slate-700">
            {address.label}
          </span>
        </div>
        <p className="text-sm font-medium text-slate-800">
          {address.full_name}
        </p>
        <p className="text-xs text-slate-500">{address.phone}</p>
        <p className="text-xs text-slate-500 mt-1">
          {address.line1}
          {address.line2 && `, ${address.line2}`}
        </p>
        <p className="text-xs text-slate-500">
          {address.city}, {address.state} — {address.pincode}
        </p>
      </div>
    </Card>
  )
}

// ── Status timeline ──
const StatusTimeline = ({ status }) => {
  const steps = [
    {
      key: "submitted",
      label: "Submitted",
      desc: "Your case has been sent to the doctor",
    },
    {
      key: "under_review",
      label: "Under Review",
      desc: "Doctor is reviewing your answers",
    },
    {
      key: "prescription_added",
      label: "Prescription Ready",
      desc: "Doctor has prescribed your medicines",
    },
    {
      key: "closed",
      label: "Closed",
      desc: "Consultation completed",
    },
  ]

  const statusOrder = {
    submitted: 0,
    under_review: 1,
    prescription_added: 2,
    closed: 3,
  }
  const currentIndex = statusOrder[status] ?? 0

  return (
    <div className="space-y-0">
      {steps.map((step, index) => {
        const isDone = index < currentIndex
        const isActive = index === currentIndex
        const isFuture = index > currentIndex

        return (
          <div key={step.key} className="flex gap-3">
            {/* Left — connector */}
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 z-10 ${
                  isDone
                    ? "bg-green-500 border-green-500"
                    : isActive
                    ? "bg-primary-600 border-primary-600"
                    : "bg-white border-slate-200"
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-white" />
                ) : isActive ? (
                  <div className="w-2.5 h-2.5 bg-white rounded-full" />
                ) : (
                  <div className="w-2 h-2 bg-slate-200 rounded-full" />
                )}
              </div>
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={`w-0.5 h-8 mt-0.5 ${
                    isDone ? "bg-green-300" : "bg-slate-100"
                  }`}
                />
              )}
            </div>

            {/* Right — content */}
            <div className="pb-6 flex-1">
              <p
                className={`text-sm font-semibold ${
                  isDone
                    ? "text-green-700"
                    : isActive
                    ? "text-primary-700"
                    : "text-slate-400"
                }`}
              >
                {step.label}
              </p>
              <p
                className={`text-xs ${
                  isFuture ? "text-slate-300" : "text-slate-500"
                }`}
              >
                {step.desc}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Masked prescription (before payment) ──
const MaskedPrescription = ({ data, consultationId }) => {
  const navigate = useNavigate()

  const categoryIcons = {
    "Oral Medicine": "💊",
    "Topical Cream": "🧴",
    "Hair Oil":      "💆",
    "Hair Shampoo":  "🚿",
    "Face Wash":     "🫧",
    "Eye Drops":     "👁️",
    "Nasal Drops":   "👃",
    "Ear Drops":     "👂",
    "Syrup":         "🥤",
    "Supplement":    "💪",
    "Other":         "💊",
  }

  return (
    <div className="space-y-4">

      {/* Privacy notice */}
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
        <Lock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">
          Medicine names are revealed after payment to ensure
          medicines are dispensed through HomeoNivaran.
        </p>
      </div>

      {/* Masked medicine list with individual prices */}
      <div className="space-y-2">
        {data.items_masked?.map((item, index) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">
                {categoryIcons[item.medicine_category] || "💊"}
              </span>
              <div>
                <p className="text-sm font-medium text-slate-700">
                  {item.medicine_category}
                </p>
                <p className="text-xs text-slate-400">
                  Item {index + 1} of {data.item_count}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-700">
                {formatCurrency(item.medicine_price)}
              </span>
              <Lock className="w-3.5 h-3.5 text-slate-300" />
            </div>
          </div>
        ))}
      </div>

      {/* Fee breakdown */}
      <div className="border border-slate-100 rounded-xl overflow-hidden">
        <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Amount Breakdown
          </p>
        </div>
        <div className="px-4 py-3 space-y-2">
          {data.consultation_fee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Consultation Fee</span>
              <span className="font-medium">
                {formatCurrency(data.consultation_fee)}
              </span>
            </div>
          )}
          {data.items_masked?.map((item, i) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-slate-500">
                {item.medicine_category}
              </span>
              <span className="font-medium">
                {formatCurrency(item.medicine_price)}
              </span>
            </div>
          ))}
          {data.delivery_charges > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Delivery Charges</span>
              <span className="font-medium">
                {formatCurrency(data.delivery_charges)}
              </span>
            </div>
          )}
          <div className="border-t border-slate-100 pt-2 flex justify-between">
            <span className="text-sm font-semibold text-slate-700">
              Total
            </span>
            <span className="text-lg font-bold text-primary-800">
              {formatCurrency(data.total_amount)}
            </span>
          </div>
        </div>
      </div>

      {/* Pay CTA */}
      <Button
        variant="primary"
        className="w-full py-3"
        onClick={() => navigate(`/patient/orders`)}
      >
        <CreditCard className="w-4 h-4" />
        Pay {formatCurrency(data.total_amount)} to Reveal Prescription
      </Button>
    </div>
  )
}

// ── Full prescription (after payment) ──
const FullPrescription = ({ data }) => (
  <div className="space-y-4">

    {/* Paid badge */}
    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
      <p className="text-xs text-green-700 font-medium">
        Payment confirmed — full prescription unlocked
      </p>
    </div>

    {/* Doctor notes */}
    {data.doctor_notes && (
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-xs font-semibold text-blue-600 mb-1 uppercase tracking-wider">
          Doctor's Notes
        </p>
        <p className="text-sm text-blue-800">{data.doctor_notes}</p>
      </div>
    )}

    {/* Medicine items */}
    <div className="space-y-3">
      {data.items?.map((item) => (
        <div
          key={item.id}
          className="border border-slate-100 rounded-xl p-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Pill className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-slate-900 text-sm">
                  {item.medicine_name}
                </p>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                  {item.potency}
                </span>
                <span className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">
                  {item.medicine_category}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
                {[
                  ["Dosage", item.dosage],
                  ["Frequency", item.frequency],
                  ["Duration", item.duration],
                  item.instructions && ["Instructions", item.instructions],
                ]
                  .filter(Boolean)
                  .map(([label, value]) => (
                    <div key={label}>
                      <span className="text-xs text-slate-400">
                        {label}
                      </span>
                      <p className="text-xs font-medium text-slate-700">
                        {value}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>

    {/* Amount breakdown */}
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Amount Paid
        </p>
      </div>
      <div className="px-4 py-3 space-y-2">
        {data.consultation_fee > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Consultation Fee</span>
            <span className="font-medium">
              {formatCurrency(data.consultation_fee)}
            </span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">
            Medicines ({data.items?.length} item
            {data.items?.length !== 1 ? "s" : ""})
          </span>
          <span className="font-medium">
            {formatCurrency(
              data.total_amount -
              (data.consultation_fee || 0) -
              (data.delivery_charges || 0)
            )}
          </span>
        </div>
        {data.delivery_charges > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Delivery</span>
            <span className="font-medium">
              {formatCurrency(data.delivery_charges)}
            </span>
          </div>
        )}
        <div className="border-t border-slate-100 pt-2 flex justify-between">
          <span className="text-sm font-semibold text-slate-700">
            Total Paid
          </span>
          <span className="text-lg font-bold text-green-700">
            {formatCurrency(data.total_amount)}
          </span>
        </div>
      </div>
    </div>
  </div>
)

// ── Main prescription section ──
const PrescriptionSection = ({ consultationId }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["prescription", consultationId],
    queryFn: async () => {
      const res = await consultationsApi.getPrescription(consultationId)
      return res.data
    },
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="py-6 text-center text-sm text-slate-400">
        Checking prescription...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="py-6 text-center">
        <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-400">
          Prescription not ready yet.
          <br />
          The doctor will add it after reviewing your case.
        </p>
      </div>
    )
  }

  // Backend tells us whether to show full or masked
  if (data.is_paid) {
    return <FullPrescription data={data} />
  }

  return <MaskedPrescription data={data} consultationId={consultationId} />
}

// ── Order CTA section ──
const OrderSection = ({ consultationId }) => {
  const navigate = useNavigate()

  const { data: orders } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const res = await ordersApi.getAll()
      return Array.isArray(res.data) ? res.data : []
    },
  })

  const order = orders?.find(
    (o) => o.consultation_id === consultationId
  )

  if (!order) return null

  const isPaid = order.payment_status === "success"
  const isAwaiting = order.order_status === "awaiting_payment"

  return (
    <div
      className={`rounded-xl p-4 border ${
        isPaid
          ? "bg-green-50 border-green-200"
          : "bg-amber-50 border-amber-200"
      }`}
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {isPaid ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-500" />
          )}
          <div>
            <p
              className={`text-sm font-semibold ${
                isPaid ? "text-green-800" : "text-amber-800"
              }`}
            >
              {isPaid ? "Payment Complete" : "Payment Required"}
            </p>
            <p
              className={`text-xs ${
                isPaid ? "text-green-600" : "text-amber-600"
              }`}
            >
              {isPaid
                ? `Order ${formatStatus(order.order_status)}`
                : "Please complete payment to receive your medicines"}
            </p>
          </div>
        </div>
        <Button
          variant={isPaid ? "secondary" : "primary"}
          onClick={() =>
            navigate(`/patient/orders/${order.id}`)
          }
        >
          <ShoppingBag className="w-4 h-4" />
          {isPaid ? "Track Order" : "Pay Now"}
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

// ── Feedback Section ──
const FeedbackSection = ({ consultation }) => {
  const [showForm, setShowForm] = useState(false)

  const { data: existingFeedback, isLoading, refetch } = useQuery({
    queryKey: ["treatment-feedback", consultation.id],
    queryFn: async () => {
      try {
        const res = await treatmentFeedbackApi.getForConsultation(
          consultation.id
        )
        return res.data
      } catch {
        return null
      }
    },
    enabled: consultation.status === "closed",
    retry: false,
  })

  // Only show for closed consultations with paid orders
  if (consultation.status !== "closed") return null

  if (isLoading) return null

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Star className="w-4 h-4 text-amber-400" />
        <h3 className="text-slate-800 text-sm">
          Treatment Feedback
        </h3>
      </div>

      {existingFeedback ? (
        // Show existing feedback
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <p className="text-xs text-green-700 font-medium">
              You submitted feedback on{" "}
              {formatDate(existingFeedback.created_at)}
            </p>
          </div>

          {/* Show submitted ratings */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-28">
                Overall
              </span>
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map((s) => (
                  <Star key={s} className={`w-4 h-4 ${
                    s <= existingFeedback.overall_rating
                      ? "text-amber-400 fill-amber-400"
                      : "text-slate-200"
                  }`} />
                ))}
              </div>
            </div>
            {existingFeedback.feeling_better !== null && (
              <p className="text-xs text-slate-600">
                Feeling better:{" "}
                <strong>
                  {existingFeedback.feeling_better ? "Yes ✅" : "Not yet"}
                </strong>
              </p>
            )}
            {existingFeedback.comments && (
              <p className="text-xs text-slate-500 italic">
                "{existingFeedback.comments}"
              </p>
            )}
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="text-xs text-primary-600 hover:underline"
          >
            {showForm ? "Cancel" : "Update feedback"}
          </button>

          {showForm && (
            <TreatmentFeedbackForm
              consultationId={consultation.id}
              ailmentName={consultation.ailment_name}
              existingFeedback={existingFeedback}
              onSuccess={() => { setShowForm(false); refetch() }}
            />
          )}
        </div>
      ) : (
        // No feedback yet
        !showForm ? (
          <div>
            <p className="text-sm text-slate-500 mb-3">
              How was your treatment? Your feedback helps us improve
              and helps other patients make decisions.
            </p>
            <Button
              variant="secondary"
              onClick={() => setShowForm(true)}
              className="w-full"
            >
              <Star className="w-4 h-4" />
              Leave Feedback
            </Button>
          </div>
        ) : (
          <TreatmentFeedbackForm
            consultationId={consultation.id}
            ailmentName={consultation.ailment_name}
            onSuccess={() => { setShowForm(false); refetch() }}
          />
        )
      )}
    </Card>
  )
}

// ── Main Page ──
const ConsultationDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [showAllQA, setShowAllQA] = useState(false)

  const { data: consultation, isLoading, error } = useConsultation(id)

  if (isLoading) return <PageSpinner />

  if (error || !consultation) {
    return (
      <div className="page-container">
        <div className="text-center py-16">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-slate-500 mb-4">
            Consultation not found
          </h3>
          <Button
            variant="secondary"
            onClick={() => navigate("/patient/consultations")}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Consultations
          </Button>
        </div>
      </div>
    )
  }

  const questions = consultation.questions || []
  const visibleQA = showAllQA ? questions : questions.slice(0, 3)
  const hasPrescription =
    consultation.status === "prescription_added" ||
    consultation.status === "closed"

  return (
    <div className="page-container max-w-3xl mx-auto">

      {/* Back button */}
      <button
        onClick={() => navigate("/patient/consultations")}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Consultations
      </button>

      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-slate-900">
              {consultation.ailment_name}
            </h1>
            <Badge status={consultation.status} />
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-400 flex-wrap">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              {consultation.member_name}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(consultation.submitted_at)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column — main content */}
        <div className="lg:col-span-2 space-y-5">

          {/* Order / Payment CTA */}
          {hasPrescription && (
            <OrderSection consultationId={id} />
          )}

          {/* Q&A section */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-slate-400" />
              <h3 className="text-slate-800">
                Your Answers ({questions.length})
              </h3>
            </div>

            {questions.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">
                No questions answered yet
              </p>
            ) : (
              <div className="space-y-4">
                {visibleQA.map((q, index) => (
                  <div
                    key={q.id}
                    className="border-b border-slate-50 pb-4 last:border-0 last:pb-0"
                  >
                    <p className="text-xs text-slate-400 mb-1.5">
                      Q{index + 1}. {q.question_text}
                    </p>
                    <p className="text-sm font-medium text-slate-800">
                      {q.answer_text || (
                        <span className="text-amber-400 font-normal italic">
                          Not answered
                        </span>
                      )}
                    </p>
                  </div>
                ))}

                {/* Show more / less toggle */}
                {questions.length > 3 && (
                  <button
                    onClick={() => setShowAllQA(!showAllQA)}
                    className="text-xs text-primary-600 font-medium hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    {showAllQA
                      ? "Show less"
                      : `Show ${questions.length - 3} more`}
                  </button>
                )}
              </div>
            )}
          </Card>

          {/* Prescription section */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Pill className="w-5 h-5 text-slate-400" />
              <h3 className="text-slate-800">Prescription</h3>
            </div>
            <PrescriptionSection consultationId={id} />
          </Card>

          <FeedbackSection consultation={consultation} />
        </div>

        {/* Right column — sidebar */}
        <div className="space-y-5">

          {/* Status timeline */}
          <Card>
            <h3 className="text-slate-800 mb-4 text-sm">
              Consultation Status
            </h3>
            <StatusTimeline status={consultation.status} />
          </Card>

          <DeliveryAddressCard address={consultation.address} />

          <TeleconsultCard />

          {/* Consultation info */}
          <Card>
            <h3 className="text-slate-800 mb-4 text-sm">Details</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-400">Condition</p>
                <p className="text-sm font-medium text-slate-800">
                  {consultation.ailment_name}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {consultation.ailment_category}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Patient</p>
                <p className="text-sm font-medium text-slate-800">
                  {consultation.member_name}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Submitted</p>
                <p className="text-sm font-medium text-slate-800">
                  {formatDateTime(consultation.submitted_at)}
                </p>
              </div>
              {consultation.reviewed_at && (
                <div>
                  <p className="text-xs text-slate-400">
                    Review Started
                  </p>
                  <p className="text-sm font-medium text-slate-800">
                    {formatDateTime(consultation.reviewed_at)}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {consultation.status === "closed" && (
        <div className="mt-5 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <p className="text-sm font-medium text-slate-700 mb-1">
            Need another consultation for the same condition?
          </p>
          <p className="text-xs text-slate-400 mb-3">
            Start a follow-up consultation with the same member and ailment
            pre-selected.
          </p>
          <Link
            to={`/patient/consultations/new?followup_member=${consultation.member_id}&followup_ailment=${consultation.ailment_id}`}
            className="btn-secondary text-sm"
          >
            <RefreshCw className="w-4 h-4" />
              Start Follow-up Consultation
          </Link>
        </div>
      )}
    </div>
  )
}

export default ConsultationDetailPage