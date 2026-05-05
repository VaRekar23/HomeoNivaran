export const ROLES = {
  PATIENT: "patient",
  DOCTOR: "doctor",
  ADMIN: "admin",
}

export const CONSULTATION_STATUSES = {
  SUBMITTED: "submitted",
  UNDER_REVIEW: "under_review",
  PRESCRIPTION_ADDED: "prescription_added",
  CLOSED: "closed",
}

export const ORDER_STATUSES = {
  AWAITING_PAYMENT: "awaiting_payment",
  PAID: "paid",
  PROCESSING: "processing",
  DISPATCHED: "dispatched",
  DELIVERED: "delivered",
}

export const PAYMENT_STATUSES = {
  PENDING: "pending",
  SUCCESS: "success",
  FAILED: "failed",
  REFUNDED: "refunded",
}

export const FEEDBACK_TYPES = [
  { value: "bug_report", label: "Bug Report" },
  { value: "feature_request", label: "Feature Request" },
  { value: "general", label: "General Feedback" },
]

export const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
]

export const RELATION_OPTIONS = [
  { value: "self", label: "Self" },
  { value: "spouse", label: "Spouse" },
  { value: "child", label: "Child" },
  { value: "parent", label: "Parent" },
  { value: "sibling", label: "Sibling" },
  { value: "other", label: "Other" },
]

export const NOTIFICATION_POLL_INTERVAL = 30000
// Poll for new notifications every 30 seconds

// Add to existing constants.js
export const MEDICINE_CATEGORIES = [
  "Oral Medicine",
  "Topical Cream",
  "Hair Oil",
  "Hair Shampoo",
  "Face Wash",
  "Eye Drops",
  "Nasal Drops",
  "Ear Drops",
  "Syrup",
  "Supplement",
  "Other",
]