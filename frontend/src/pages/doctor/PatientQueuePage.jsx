import { useState } from "react"
import { Link } from "react-router-dom"
import {
  Search,
  HeartPulse,
  ChevronRight,
  Clock,
  User,
  Filter,
} from "lucide-react"

import Card from "../../components/ui/Card"
import Badge from "../../components/ui/Badge"
import EmptyState from "../../components/ui/EmptyState"
import { PageSpinner } from "../../components/ui/Spinner"
import { useDoctorQueue } from "../../hooks/useDoctor"
import { formatDate, formatRelativeTime } from "../../utils/formatters"

const STATUS_TABS = [
  { label: "All", value: "all" },
  { label: "Submitted", value: "submitted" },
  { label: "Under Review", value: "under_review" },
  { label: "Prescribed", value: "prescription_added" },
  { label: "Closed", value: "closed" },
]

const QueueItem = ({ item }) => (
  <Link
    to={`/doctor/cases/${item.id}`}
    className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-xl transition-colors group"
  >
    {/* Patient avatar */}
    <div className="w-11 h-11 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-primary-700 text-sm group-hover:bg-primary-100">
      {item.patient_name?.charAt(0)?.toUpperCase()}
    </div>

    {/* Info */}
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <p className="text-sm font-semibold text-slate-900">
          {item.patient_name}
        </p>
        <Badge status={item.status} />
        <span className="text-xs text-slate-300">·</span>
        <span className="text-xs text-slate-400 capitalize">
          {item.ailment_category}
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
        <span className="flex items-center gap-1">
          <HeartPulse className="w-3 h-3" />
          {item.ailment_name}
        </span>
        <span className="flex items-center gap-1">
          <User className="w-3 h-3" />
          {item.member_name} · {item.member_age}y ·{" "}
          {item.member_gender}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatRelativeTime(item.submitted_at)}
        </span>
      </div>
    </div>

    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary-500 flex-shrink-0" />
  </Link>
)

const PatientQueuePage = () => {
  const [activeTab, setActiveTab] = useState("all")
  const [search, setSearch] = useState("")

  const { data: queue = [], isLoading } = useDoctorQueue()

  const byStatus =
    activeTab === "all"
      ? queue
      : queue.filter((c) => c.status === activeTab)

  const filtered = byStatus.filter((c) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      c.patient_name?.toLowerCase().includes(q) ||
      c.ailment_name?.toLowerCase().includes(q) ||
      c.member_name?.toLowerCase().includes(q)
    )
  })

  const countByStatus = queue.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1
    return acc
  }, {})

  if (isLoading) return <PageSpinner />

  return (
    <div className="page-container">

      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="text-slate-900 mb-1">Patient Queue</h1>
          <p className="text-slate-500 text-sm">
            {queue.length} total consultation
            {queue.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by patient, ailment or member..."
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
              ? queue.length
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

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Filter}
          title={
            queue.length === 0
              ? "No consultations yet"
              : "No results found"
          }
          description={
            queue.length === 0
              ? "Patient consultations will appear here."
              : "Try adjusting your search or filter."
          }
        />
      ) : (
        <Card padding={false}>
          <div className="px-4 py-3 border-b border-slate-50">
            <p className="text-xs text-slate-400">
              {filtered.length} case{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="divide-y divide-slate-50 p-2">
            {filtered.map((item) => (
              <QueueItem key={item.id} item={item} />
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

export default PatientQueuePage