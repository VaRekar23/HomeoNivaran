import { useState } from "react"
import { Link } from "react-router-dom"
import {
  ClipboardList,
  MessageSquarePlus,
  ChevronRight,
  Search,
  Filter,
  HeartPulse,
  Calendar,
  User,
  ArrowRight,
} from "lucide-react"

import Card from "../../components/ui/Card"
import Badge from "../../components/ui/Badge"
import Button from "../../components/ui/Button"
import EmptyState from "../../components/ui/EmptyState"
import { PageSpinner } from "../../components/ui/Spinner"
import { useConsultations } from "../../hooks/useConsultations"
import {
  formatDate,
  formatStatus,
  getStatusColor,
} from "../../utils/formatters"
import { CONSULTATION_STATUSES } from "../../utils/constants"

// ── Status filter tabs ──
const STATUS_TABS = [
  { label: "All", value: "all" },
  { label: "Submitted", value: CONSULTATION_STATUSES.SUBMITTED },
  { label: "Under Review", value: CONSULTATION_STATUSES.UNDER_REVIEW },
  {
    label: "Prescription Ready",
    value: CONSULTATION_STATUSES.PRESCRIPTION_ADDED,
  },
  { label: "Closed", value: CONSULTATION_STATUSES.CLOSED },
]

const ResumeAlert = ({ consultations }) => {
  const unanswered = consultations.filter(
    (c) => c.status === "submitted" && c.has_unanswered_questions
  )
  if (unanswered.length === 0) return null

  return (
    <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-800 mb-1">
            Incomplete consultation
            {unanswered.length > 1 ? "s" : ""}
          </p>
          <p className="text-xs text-amber-600 mb-3">
            You have {unanswered.length} consultation
            {unanswered.length > 1 ? "s" : ""} with unanswered
            questions. Please complete them so the doctor can review
            your case.
          </p>
          {unanswered.map((c) => (
            <Link
              key={c.id}
              to={`/patient/consultations/${c.id}/answer`}
              className="inline-flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors mr-2"
            >
              Resume: {c.ailment_name}
              <ArrowRight className="w-3 h-3" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Single consultation list item ──
const ConsultationItem = ({ consultation }) => {
  const isResumable =
    consultation.status === "submitted" &&
    !consultation.has_answers
    // Backend should return has_answers: true/false

  return (
    <div className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-xl transition-colors group">
      {/* Icon */}
      <div className="w-11 h-11 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary-100 transition-colors">
        <HeartPulse className="w-5 h-5 text-primary-600" />
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h4 className="text-slate-900 text-sm font-semibold">
            {consultation.ailment_name}
          </h4>
          <Badge status={consultation.status} />
          {isResumable && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              Answers Pending
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {consultation.member_name}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(consultation.submitted_at)}
          </span>
        </div>
      </div>

      {/* Action */}
      {isResumable ? (
        <Link
          to={`/patient/consultations/${consultation.id}/answer`}
          className="btn-primary text-xs px-3 py-2 flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          Answer Questions
          <ArrowRight className="w-3 h-3" />
        </Link>
      ) : (
       <></> 
      )}
      <Link
          to={`/patient/consultations/${consultation.id}`}
          className="flex items-center"
        >
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary-500 flex-shrink-0 transition-colors" />
        </Link>
    </div>
  )
}

// ── Main Page ──
const ConsultationHistoryPage = () => {
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  const { data, isLoading } = useConsultations()
  const consultations = Array.isArray(data) ? data : []

  // Filter by status tab
  const byStatus =
    activeTab === "all"
      ? consultations
      : consultations.filter((c) => c.status === activeTab)

  // Filter by search query
  const filtered = byStatus.filter((c) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      c.ailment_name?.toLowerCase().includes(q) ||
      c.member_name?.toLowerCase().includes(q) ||
      c.ailment_category?.toLowerCase().includes(q)
    )
  })

  // Group by status for counts on tabs
  const countByStatus = consultations.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1
    return acc
  }, {})

  if (isLoading) return <PageSpinner />

  return (
    <div className="page-container">

      {/* Page header */}
      <div className="section-header">
        <div>
          <h1 className="text-slate-900 mb-1">My Consultations</h1>
          <p className="text-slate-500 text-sm">
            Track all your consultation requests and their status.
          </p>
        </div>
        <Link to="/patient/consultations/new">
          <Button variant="primary">
            <MessageSquarePlus className="w-4 h-4" />
            New Consultation
          </Button>
        </Link>
      </div>

      {/* Search bar */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by ailment, member or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input pl-9"
        />
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-5 scrollbar-hide">
        {STATUS_TABS.map((tab) => {
          const count =
            tab.value === "all"
              ? consultations.length
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

      {/* Results */}
      {filtered.length === 0 ? (
        consultations.length === 0 ? (
          // No consultations at all
          <EmptyState
            icon={ClipboardList}
            title="No consultations yet"
            description="Start your first consultation to get personalised homeopathy care from our doctor."
            action={
              <Link to="/patient/consultations/new">
                <Button variant="primary">
                  <MessageSquarePlus className="w-4 h-4" />
                  Start First Consultation
                </Button>
              </Link>
            }
          />
        ) : (
          // Has consultations but filter returns nothing
          <EmptyState
            icon={Filter}
            title="No results found"
            description="Try adjusting your search or filter to find consultations."
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
          {/* Result count */}
          <div className="px-4 py-3 border-b border-slate-50">
            <p className="text-xs text-slate-400">
              {filtered.length} consultation
              {filtered.length !== 1 ? "s" : ""}
              {searchQuery && ` matching "${searchQuery}"`}
            </p>
          </div>

          {/* List */}
          <div className="divide-y divide-slate-50 p-2">
            {filtered.map((c) => (
              <ConsultationItem key={c.id} consultation={c} />
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

export default ConsultationHistoryPage