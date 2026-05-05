import { useState } from "react"
import {
  MessageSquare,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  Star,
} from "lucide-react"
import { useForm } from "react-hook-form"

import Card from "../../components/ui/Card"
import Badge from "../../components/ui/Badge"
import Button from "../../components/ui/Button"
import Modal from "../../components/ui/Modal"
import EmptyState from "../../components/ui/EmptyState"
import { PageSpinner } from "../../components/ui/Spinner"
import { useAdminFeedback, useUpdateFeedback } from "../../hooks/useAdmin"
import { formatDate, formatRelativeTime } from "../../utils/formatters"

const TYPE_COLORS = {
  bug_report:      "bg-red-50 text-red-700",
  feature_request: "bg-blue-50 text-blue-700",
  general:         "bg-slate-100 text-slate-600",
}

const TYPE_TABS = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
  { label: "Bug Reports", value: "bug_report" },
  { label: "Feature Requests", value: "feature_request" },
  { label: "General", value: "general" },
  { label: "Resolved", value: "resolved" },
]

// ── Star rating display ──
const StarRating = ({ rating }) => {
  if (!rating) return null
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3 h-3 ${
            s <= rating
              ? "text-amber-400 fill-amber-400"
              : "text-slate-200"
          }`}
        />
      ))}
    </div>
  )
}

// ── Review Modal ──
const ReviewModal = ({ feedback, onClose }) => {
  const updateMutation = useUpdateFeedback()
  const { register, handleSubmit } = useForm({
    defaultValues: {
      status: feedback.status,
      admin_notes: feedback.admin_notes || "",
    },
  })

  const onSubmit = async (data) => {
    await updateMutation.mutateAsync({ id: feedback.id, data })
    onClose()
  }

  return (
    <div className="space-y-4">
      {/* Feedback details */}
      <div className="bg-slate-50 rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            TYPE_COLORS[feedback.type]
          }`}>
            {feedback.type.replace(/_/g, " ")}
          </span>
          <StarRating rating={feedback.rating} />
        </div>
        <p className="text-sm text-slate-800">{feedback.description}</p>
        <div className="text-xs text-slate-400 space-y-0.5">
          <p>From: {feedback.user_name || "Anonymous"}</p>
          {feedback.page && <p>Page: {feedback.page}</p>}
          <p>Submitted: {formatDate(feedback.created_at)}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">
            Update Status
          </label>
          <select className="input" {...register("status")}>
            <option value="new">New</option>
            <option value="reviewed">Reviewed</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">
            Admin Notes (optional)
          </label>
          <textarea
            rows={3}
            placeholder="Add notes about this feedback..."
            className="input resize-none"
            {...register("admin_notes")}
          />
        </div>

        <div className="flex gap-3">
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
            loading={updateMutation.isPending}
            className="flex-1"
          >
            <CheckCircle2 className="w-4 h-4" />
            Update Feedback
          </Button>
        </div>
      </form>
    </div>
  )
}

// ── Feedback row ──
const FeedbackRow = ({ feedback, onReview }) => (
  <div className="flex items-start gap-4 p-4 hover:bg-slate-50 rounded-xl transition-colors">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
      feedback.status === "new"
        ? "bg-blue-50"
        : feedback.status === "resolved"
        ? "bg-green-50"
        : "bg-slate-50"
    }`}>
      <MessageSquare className={`w-5 h-5 ${
        feedback.status === "new"
          ? "text-blue-500"
          : feedback.status === "resolved"
          ? "text-green-500"
          : "text-slate-400"
      }`} />
    </div>

    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          TYPE_COLORS[feedback.type]
        }`}>
          {feedback.type.replace(/_/g, " ")}
        </span>
        <Badge status={feedback.status} />
        <StarRating rating={feedback.rating} />
        {feedback.status === "new" && (
          <span className="w-2 h-2 bg-blue-500 rounded-full" />
        )}
      </div>

      <p className="text-sm text-slate-800 mb-1 line-clamp-2">
        {feedback.description}
      </p>

      <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
        <span>{feedback.user_name || "Anonymous"}</span>
        {feedback.page && <span>on {feedback.page}</span>}
        <span>{formatRelativeTime(feedback.created_at)}</span>
      </div>

      {feedback.admin_notes && (
        <div className="mt-2 text-xs bg-amber-50 text-amber-700 px-2 py-1.5 rounded-lg">
          Admin note: {feedback.admin_notes}
        </div>
      )}
    </div>

    <Button
      variant="ghost"
      onClick={() => onReview(feedback)}
      className="text-xs flex-shrink-0"
    >
      Review
    </Button>
  </div>
)

// ── Main Page ──
const FeedbackPage = () => {
  const [activeTab, setActiveTab] = useState("all")
  const [search, setSearch] = useState("")
  const [selectedFeedback, setSelectedFeedback] = useState(null)

  const { data: feedback = [], isLoading } = useAdminFeedback()

  const filtered = feedback.filter((fb) => {
    const matchesTab =
      activeTab === "all" ||
      fb.status === activeTab ||
      fb.type === activeTab
    const matchesSearch =
      !search.trim() ||
      fb.description?.toLowerCase().includes(search.toLowerCase()) ||
      fb.user_name?.toLowerCase().includes(search.toLowerCase())
    return matchesTab && matchesSearch
  })

  const countByStatus = feedback.reduce((acc, fb) => {
    acc[fb.status] = (acc[fb.status] || 0) + 1
    acc[fb.type] = (acc[fb.type] || 0) + 1
    return acc
  }, {})

  if (isLoading) return <PageSpinner />

  return (
    <div className="page-container">

      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="text-slate-900 mb-1">User Feedback</h1>
          <p className="text-slate-500 text-sm">
            {feedback.length} total · {countByStatus.new || 0} new
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search feedback..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-9"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-5">
        {TYPE_TABS.map((tab) => {
          const count =
            tab.value === "all"
              ? feedback.length
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

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No feedback found"
          description={
            feedback.length === 0
              ? "User feedback will appear here."
              : "Try adjusting your filter."
          }
        />
      ) : (
        <Card padding={false}>
          <div className="px-4 py-3 border-b border-slate-50">
            <p className="text-xs text-slate-400">
              {filtered.length} item{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="divide-y divide-slate-50 p-2">
            {filtered.map((fb) => (
              <FeedbackRow
                key={fb.id}
                feedback={fb}
                onReview={setSelectedFeedback}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Review modal */}
      <Modal
        isOpen={!!selectedFeedback}
        onClose={() => setSelectedFeedback(null)}
        title="Review Feedback"
        size="md"
      >
        {selectedFeedback && (
          <ReviewModal
            feedback={selectedFeedback}
            onClose={() => setSelectedFeedback(null)}
          />
        )}
      </Modal>
    </div>
  )
}

export default FeedbackPage