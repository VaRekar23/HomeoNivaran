import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  TrendingUp, Users, DollarSign, Activity,
  Calendar, ArrowUp, ArrowDown
} from "lucide-react"
import api from "../../api/axios"

import Card from "../../components/ui/Card"
import { PageSpinner } from "../../components/ui/Spinner"
import { formatCurrency, formatDate } from "../../utils/formatters"

const PERIOD_OPTIONS = [
  { value: 7,   label: "Last 7 days" },
  { value: 30,  label: "Last 30 days" },
  { value: 90,  label: "Last 90 days" },
  { value: 365, label: "Last year" },
]

// ── Simple bar chart using CSS ──
const SimpleBarChart = ({ data, valueKey, labelKey, color = "bg-primary-500" }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-slate-400">
        No data for this period
      </div>
    )
  }
  const maxVal = Math.max(...data.map((d) => d[valueKey] || 0))

  return (
    <div className="space-y-2">
      {data.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-slate-400 w-20 flex-shrink-0 truncate">
            {item[labelKey]}
          </span>
          <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
            <div
              className={`h-full rounded-full ${color} transition-all duration-500`}
              style={{
                width: maxVal > 0
                  ? `${((item[valueKey] || 0) / maxVal) * 100}%`
                  : "0%"
              }}
            />
          </div>
          <span className="text-xs font-semibold text-slate-700 w-16 text-right flex-shrink-0">
            {typeof item[valueKey] === "number" && item[valueKey] > 100
              ? formatCurrency(item[valueKey])
              : item[valueKey]}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Trend chart (daily) ──
const TrendChart = ({ data, valueKey, color = "#1E40AF" }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-slate-400">
        No trend data
      </div>
    )
  }

  const values = data.map((d) => d[valueKey] || 0)
  const maxVal = Math.max(...values)
  const height = 80

  return (
    <div className="flex items-end gap-1 h-20">
      {data.map((item, i) => {
        const barH = maxVal > 0
          ? Math.max(4, (item[valueKey] / maxVal) * height)
          : 4
        return (
          <div
            key={i}
            className="flex-1 rounded-t-sm transition-all hover:opacity-80 cursor-default"
            style={{
              height:     `${barH}px`,
              backgroundColor: color,
              minWidth:   "4px",
            }}
            title={`${item.date || item.day}: ${item[valueKey]}`}
          />
        )
      })}
    </div>
  )
}

const AnalyticsPage = () => {
  const [days, setDays] = useState(30)

  const { data: consultData, isLoading: loadingC } = useQuery({
    queryKey: ["analytics-consultations", days],
    queryFn: async () => {
      const res = await api.get("/admin/analytics/consultations", {
        params: { days }
      })
      return res.data
    },
  })

  const { data: revenueData, isLoading: loadingR } = useQuery({
    queryKey: ["analytics-revenue", days],
    queryFn: async () => {
      const res = await api.get("/admin/analytics/revenue", {
        params: { days }
      })
      return res.data
    },
  })

  const { data: patientData, isLoading: loadingP } = useQuery({
    queryKey: ["analytics-patients", days],
    queryFn: async () => {
      const res = await api.get("/admin/analytics/patients", {
        params: { days }
      })
      return res.data
    },
  })

  const isLoading = loadingC || loadingR || loadingP
  if (isLoading) return <PageSpinner />

  return (
    <div className="page-container">
      {/* Header */}
      <div className="section-header mb-6">
        <div>
          <h1 className="text-slate-900 mb-1">Analytics & Reports</h1>
          <p className="text-slate-500 text-sm">
            Platform performance and key metrics.
          </p>
        </div>
        <select
          className="input w-auto"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          {PERIOD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          {
            label:    "Total Revenue",
            value:    formatCurrency(revenueData?.total_revenue || 0),
            sub:      `${formatCurrency(revenueData?.pending_revenue || 0)} pending`,
            icon:     DollarSign,
            color:    "bg-green-50 text-green-600",
          },
          {
            label:    "Consultations",
            value:    consultData?.total || 0,
            sub:      `${consultData?.online_count || 0} online · ${consultData?.offline_count || 0} offline`,
            icon:     Activity,
            color:    "bg-blue-50 text-blue-600",
          },
          {
            label:    "New Patients",
            value:    patientData?.new_patients || 0,
            sub:      `${patientData?.total_patients || 0} total registered`,
            icon:     Users,
            color:    "bg-purple-50 text-purple-600",
          },
          {
            label:    "Active Patients",
            value:    patientData?.active_this_period || 0,
            sub:      "consulted this period",
            icon:     TrendingUp,
            color:    "bg-amber-50 text-amber-600",
          },
        ].map((kpi) => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-500 uppercase tracking-wider">
                  {kpi.label}
                </span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${kpi.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mb-0.5">
                {kpi.value}
              </p>
              <p className="text-xs text-slate-400">{kpi.sub}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Revenue trend */}
        <Card>
          <h3 className="text-sm font-semibold text-slate-700 mb-4">
            Daily Revenue
          </h3>
          <TrendChart
            data={revenueData?.daily_revenue || []}
            valueKey="revenue"
            color="#16a34a"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-2">
            <span>
              {revenueData?.daily_revenue?.[0]?.date || ""}
            </span>
            <span>
              {revenueData?.daily_revenue?.[
                (revenueData?.daily_revenue?.length || 1) - 1
              ]?.date || ""}
            </span>
          </div>
        </Card>

        {/* Consultation trend */}
        <Card>
          <h3 className="text-sm font-semibold text-slate-700 mb-4">
            Daily Consultations
          </h3>
          <TrendChart
            data={consultData?.daily_trend || []}
            valueKey="count"
            color="#1E40AF"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-2">
            <span>
              {consultData?.daily_trend?.[0]?.date || ""}
            </span>
            <span>
              {consultData?.daily_trend?.[
                (consultData?.daily_trend?.length || 1) - 1
              ]?.date || ""}
            </span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Top conditions */}
        <Card>
          <h3 className="text-sm font-semibold text-slate-700 mb-4">
            Top Conditions by Revenue
          </h3>
          <SimpleBarChart
            data={revenueData?.top_ailments || []}
            valueKey="revenue"
            labelKey="ailment"
            color="bg-green-400"
          />
        </Card>

        {/* Consultations by category */}
        <Card>
          <h3 className="text-sm font-semibold text-slate-700 mb-4">
            Consultations by Category
          </h3>
          <SimpleBarChart
            data={consultData?.by_category || []}
            valueKey="count"
            labelKey="category"
            color="bg-primary-400"
          />
        </Card>
      </div>

      {/* Consultation status breakdown */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-700 mb-4">
          Consultation Status Breakdown
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.entries(consultData?.by_status || {}).map(
            ([s, count]) => (
              <div
                key={s}
                className="bg-slate-50 rounded-xl p-4 text-center"
              >
                <p className="text-2xl font-bold text-slate-900">
                  {count}
                </p>
                <p className="text-xs text-slate-500 mt-1 capitalize">
                  {s.replace(/_/g, " ")}
                </p>
              </div>
            )
          )}
        </div>
      </Card>

      {/* Patient signup trend */}
      <Card className="mt-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">
          New Patient Registrations
        </h3>
        <TrendChart
          data={patientData?.daily_signups || []}
          valueKey="count"
          color="#7C3AED"
        />
      </Card>
    </div>
  )
}

export default AnalyticsPage