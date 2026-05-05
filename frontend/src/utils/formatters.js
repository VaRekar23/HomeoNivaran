import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"

dayjs.extend(relativeTime)

// Date formatting
export const formatDate = (date) =>
  dayjs(date).format("DD MMM YYYY")

export const formatDateTime = (date) =>
  dayjs(date).format("DD MMM YYYY, hh:mm A")

export const formatRelativeTime = (date) =>
  dayjs(date).fromNow()

// Currency formatting
export const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount)

// Status label formatting
export const formatStatus = (status) => {
  const labels = {
    submitted:          "Submitted",
    under_review:       "Under Review",
    prescription_added: "Prescription Ready",
    closed:             "Closed",
    awaiting_payment:   "Awaiting Payment",
    paid:               "Paid",
    processing:         "Processing",
    dispatched:         "Dispatched",
    delivered:          "Delivered",
    pending:            "Pending",
    success:            "Success",
    failed:             "Failed",
    refunded:           "Refunded",
    new:                "New",
    reviewed:           "Reviewed",
    resolved:           "Resolved",
  }
  return labels[status] || status
}

// Status color mapping — returns Tailwind classes
export const getStatusColor = (status) => {
  const colors = {
    // Consultation statuses
    submitted:          "bg-blue-100 text-blue-700",
    under_review:       "bg-amber-100 text-amber-700",
    prescription_added: "bg-purple-100 text-purple-700",
    closed:             "bg-slate-100 text-slate-600",

    // Order statuses
    awaiting_payment:   "bg-amber-100 text-amber-700",
    paid:               "bg-green-100 text-green-700",
    processing:         "bg-blue-100 text-blue-700",
    dispatched:         "bg-indigo-100 text-indigo-700",
    delivered:          "bg-green-100 text-green-700",

    // Payment statuses
    pending:            "bg-amber-100 text-amber-700",
    success:            "bg-green-100 text-green-700",
    failed:             "bg-red-100 text-red-700",
    refunded:           "bg-slate-100 text-slate-600",

    // Feedback statuses
    new:                "bg-blue-100 text-blue-700",
    reviewed:           "bg-amber-100 text-amber-700",
    resolved:           "bg-green-100 text-green-700",
  }
  return colors[status] || "bg-slate-100 text-slate-600"
}

// Role label
export const formatRole = (role) => {
  const labels = {
    patient: "Patient",
    doctor:  "Doctor",
    admin:   "Administrator",
  }
  return labels[role] || role
}

// Truncate long text
export const truncate = (text, length = 100) => {
  if (!text) return ""
  return text.length > length ? `${text.slice(0, length)}...` : text
}