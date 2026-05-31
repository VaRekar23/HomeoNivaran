import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Brain, Activity, Zap, Clock, AlertTriangle,
  TrendingUp, Trash2, RefreshCw, DollarSign,
  CheckCircle2, Database, Shield
} from "lucide-react"
import toast from "react-hot-toast"
import api from "../../api/axios"

import Card from "../../components/ui/Card"
import Button from "../../components/ui/Button"
import ConfirmDialog from "../../components/ui/ConfirmDialog"
import { PageSpinner } from "../../components/ui/Spinner"
import { formatCurrency, formatDateTime } from "../../utils/formatters"

const PERIOD_OPTIONS = [
  { value: 7,   label: "Last 7 days" },
  { value: 14,  label: "Last 14 days" },
  { value: 30,  label: "Last 30 days" },
  { value: 90,  label: "Last 90 days" },
]

// ── Simple bar chart ──
const MiniBar = ({ value, max, color = "bg-primary-500" }) => (
  <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
    <div
      className={`h-full rounded-full ${color} transition-all`}
      style={{ width: max > 0 ? `${(value / max) * 100}%` : "0%" }}
    />
  </div>
)

// ── Token Blocklist Section ──
const TokenBlocklistSection = () => {
  const queryClient = useQueryClient()
  const [showCleanupDays, setShowCleanupDays] = useState(false)
  const [days, setDays] = useState(30)
  const [confirmAction, setConfirmAction] = useState(null)

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ["token-stats"],
    queryFn: async () => {
      const res = await api.get("/admin/tokens/stats")
      return res.data
    },
  })

  const cleanupExpiredMutation = useMutation({
    mutationFn: () => api.delete("/admin/tokens/cleanup-expired"),
    onSuccess: (res) => {
      toast.success(res.data.message)
      queryClient.invalidateQueries({ queryKey: ["token-stats"] })
      setConfirmAction(null)
    },
    onError: () => toast.error("Cleanup failed"),
  })

  const cleanupOlderMutation = useMutation({
    mutationFn: (d) =>
      api.delete("/admin/tokens/cleanup-older-than", {
        data: { days: d }
      }),
    onSuccess: (res) => {
      toast.success(res.data.message)
      queryClient.invalidateQueries({ queryKey: ["token-stats"] })
      setConfirmAction(null)
    },
    onError: () => toast.error("Cleanup failed"),
  })

  if (isLoading) return <div className="text-sm text-slate-400">Loading...</div>

  return (
    <Card>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary-600" />
          <h3 className="text-slate-800">Token Blocklist</h3>
        </div>
        <Button variant="ghost" onClick={() => refetch()} className="text-xs">
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          {
            label: "Total Tokens",
            value: stats?.total_tokens || 0,
            color: "text-slate-800",
          },
          {
            label: "Expired (safe to delete)",
            value: stats?.expired_tokens || 0,
            color: "text-amber-600",
          },
          {
            label: "Still Active",
            value: stats?.active_tokens || 0,
            color: "text-green-600",
          },
          {
            label: "Est. Size",
            value: `${stats?.estimated_size_kb || 0} KB`,
            color: "text-slate-600",
          },
        ].map((s) => (
          <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Oldest entry */}
      {stats?.oldest_entry && (
        <p className="text-xs text-slate-400 mb-4">
          Oldest token blocked:{" "}
          {formatDateTime(stats.oldest_entry)}
        </p>
      )}

      {/* Cleanup actions */}
      <div className="space-y-3">
        <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-100 rounded-xl">
          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-green-800">
              Clean Expired Tokens
            </p>
            <p className="text-xs text-green-600 mt-0.5">
              Removes {stats?.expired_tokens || 0} expired tokens.
              100% safe — expired tokens are already invalid.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => setConfirmAction("expired")}
            className="text-xs flex-shrink-0"
            disabled={!stats?.expired_tokens}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clean
          </Button>
        </div>

        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800">
              Clean Tokens Older Than N Days
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              More aggressive. Removes tokens by age regardless
              of expiry. Use if JWT expiry not stored.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-amber-700">Delete older than</span>
              <input
                type="number"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                min="1"
                max="365"
                className="w-16 px-2 py-1 text-xs border border-amber-300 rounded-lg bg-white"
              />
              <span className="text-xs text-amber-700">days</span>
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={() => setConfirmAction("older")}
            className="text-xs text-amber-700 border-amber-300 hover:bg-amber-100 flex-shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clean
          </Button>
        </div>
      </div>

      {/* Confirm dialogs */}
      <ConfirmDialog
        isOpen={confirmAction === "expired"}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => cleanupExpiredMutation.mutate()}
        title="Clean Expired Tokens?"
        message={`This will delete ${stats?.expired_tokens || 0} expired tokens. These tokens are already invalid and safe to remove.`}
        confirmLabel="Yes, Clean Expired"
        loading={cleanupExpiredMutation.isPending}
        variant="primary"
      />

      <ConfirmDialog
        isOpen={confirmAction === "older"}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => cleanupOlderMutation.mutate(days)}
        title={`Clean Tokens Older Than ${days} Days?`}
        message={`This will delete all blocked tokens that were added more than ${days} days ago. Make sure your JWT expiry is shorter than ${days} days.`}
        confirmLabel={`Delete Tokens > ${days} Days Old`}
        loading={cleanupOlderMutation.isPending}
        variant="danger"
      />
    </Card>
  )
}

// ── AI Usage Section ──
const AIUsageSection = ({ days }) => {
  const { data, isLoading } = useQuery({
    queryKey: ["ai-usage", days],
    queryFn: async () => {
      const res = await api.get("/admin/monitor/ai-usage", {
        params: { days }
      })
      return res.data
    },
  })

  if (isLoading) return <div className="text-sm text-slate-400 py-4">Loading AI stats...</div>
  if (!data) return null

  const maxFeatureCost = Math.max(
    ...( data.by_feature?.map((f) => f.cost) || [0] )
  )

  return (
    <div className="space-y-5">

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label:  "Total AI Calls",
            value:  data.ai_calls,
            sub:    `${data.cached_calls} from cache`,
            icon:   Brain,
            color:  "bg-purple-50 text-purple-600",
          },
          {
            label:  "Total Tokens Used",
            value:  data.total_tokens?.toLocaleString() || 0,
            sub:    `${data.prompt_tokens?.toLocaleString()} in / ${data.completion_tokens?.toLocaleString()} out`,
            icon:   Zap,
            color:  "bg-blue-50 text-blue-600",
          },
          {
            label:  "Total Cost (USD)",
            value:  `$${data.total_cost_usd}`,
            sub:    `$${data.all_time?.cost} all time`,
            icon:   DollarSign,
            color:  "bg-green-50 text-green-600",
          },
          {
            label:  "Cache Hit Rate",
            value:  `${data.cache_hit_rate_pct}%`,
            sub:    "Redis cache savings",
            icon:   CheckCircle2,
            color:  "bg-teal-50 text-teal-600",
          },
        ].map((kpi) => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 uppercase tracking-wider">
                  {kpi.label}
                </span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${kpi.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl font-bold text-slate-900">{kpi.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{kpi.sub}</p>
            </div>
          )
        })}
      </div>

      {/* By feature */}
      {data.by_feature?.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-slate-700 mb-4">
            Usage by Feature
          </h3>
          <div className="space-y-3">
            {data.by_feature.map((feature) => (
              <div key={feature.feature} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 capitalize font-medium">
                    {feature.feature.replace(/_/g, " ")}
                  </span>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>{feature.calls} calls</span>
                    <span>{feature.tokens?.toLocaleString()} tokens</span>
                    <span className="font-semibold text-slate-700">
                      ${feature.cost}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MiniBar
                    value={feature.cost}
                    max={maxFeatureCost}
                    color="bg-purple-400"
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Daily cost trend */}
      {data.daily_trend?.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-slate-700 mb-4">
            Daily AI Cost (USD)
          </h3>
          <div className="flex items-end gap-1 h-16">
            {data.daily_trend.map((day, i) => {
              const maxCost = Math.max(
                ...data.daily_trend.map((d) => d.cost || 0)
              )
              const h = maxCost > 0
                ? Math.max(4, (day.cost / maxCost) * 64)
                : 4
              return (
                <div
                  key={i}
                  className="flex-1 bg-purple-400 rounded-t-sm"
                  style={{ height: `${h}px`, minWidth: "4px" }}
                  title={`${day.date}: $${day.cost}`}
                />
              )
            })}
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>{data.daily_trend[0]?.date}</span>
            <span>{data.daily_trend[data.daily_trend.length - 1]?.date}</span>
          </div>
        </Card>
      )}

      {/* Avg response time */}
      <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-3">
        <Clock className="w-5 h-5 text-slate-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-slate-700">
            Average AI response time:{" "}
            <strong>{data.avg_duration_ms}ms</strong>
          </p>
          <p className="text-xs text-slate-400">
            All-time: {data.all_time?.calls} calls,{" "}
            {data.all_time?.tokens?.toLocaleString()} tokens,{" "}
            ${data.all_time?.cost} total cost
          </p>
        </div>
      </div>
    </div>
  )
}

// ── API Monitor Section ──
const APIMonitorSection = ({ days }) => {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["api-requests", days],
    queryFn: async () => {
      const res = await api.get("/admin/monitor/api-requests", {
        params: { days }
      })
      return res.data
    },
  })

  const cleanupMutation = useMutation({
    mutationFn: (d) =>
      api.delete("/admin/monitor/api-logs/cleanup", {
        data: { days: d }
      }),
    onSuccess: (res) => {
      toast.success(res.data.message)
      queryClient.invalidateQueries({ queryKey: ["api-requests"] })
    },
  })

  if (isLoading) return (
    <div className="text-sm text-slate-400 py-4">Loading API stats...</div>
  )
  if (!data) return null

  const maxHits = Math.max(
    ...(data.top_endpoints?.map((e) => e.hits) || [0])
  )

  return (
    <div className="space-y-5">

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total Requests",
            value: data.total_requests?.toLocaleString(),
            icon:  Activity,
            color: "bg-blue-50 text-blue-600",
          },
          {
            label: "Error Rate",
            value: `${data.error_rate_pct}%`,
            sub:   `${data.error_requests} errors`,
            icon:  AlertTriangle,
            color: data.error_rate_pct > 5
              ? "bg-red-50 text-red-600"
              : "bg-green-50 text-green-600",
          },
          {
            label: "Avg Response",
            value: `${data.avg_duration_ms}ms`,
            icon:  Clock,
            color: "bg-purple-50 text-purple-600",
          },
          {
            label: "Slowest Response",
            value: `${data.max_duration_ms}ms`,
            icon:  TrendingUp,
            color: "bg-amber-50 text-amber-600",
          },
        ].map((kpi) => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 uppercase tracking-wider">
                  {kpi.label}
                </span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${kpi.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl font-bold text-slate-900">{kpi.value}</p>
              {kpi.sub && (
                <p className="text-xs text-slate-400 mt-0.5">{kpi.sub}</p>
              )}
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Top endpoints */}
        <Card>
          <h3 className="text-sm font-semibold text-slate-700 mb-4">
            Top Endpoints (by hits)
          </h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {data.top_endpoints?.slice(0, 10).map((ep, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded font-mono ${
                    ep.method === "GET"    ? "bg-blue-50 text-blue-700" :
                    ep.method === "POST"   ? "bg-green-50 text-green-700" :
                    ep.method === "PUT"    ? "bg-amber-50 text-amber-700" :
                    ep.method === "DELETE" ? "bg-red-50 text-red-700" :
                    "bg-slate-100 text-slate-600"
                  }`}>
                    {ep.method}
                  </span>
                  <span className="text-xs text-slate-700 font-mono truncate flex-1">
                    {ep.path.replace("/api", "")}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0 text-xs">
                    <span className="text-slate-500">{ep.hits}x</span>
                    <span className="text-slate-400">{ep.avg_ms}ms</span>
                    {ep.errors > 0 && (
                      <span className="text-red-500">
                        {ep.errors} err
                      </span>
                    )}
                  </div>
                </div>
                <MiniBar
                  value={ep.hits}
                  max={maxHits}
                  color="bg-blue-300"
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Slowest endpoints */}
        <Card>
          <h3 className="text-sm font-semibold text-slate-700 mb-4">
            Slowest Endpoints (avg ms)
          </h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {data.slowest_endpoints?.map((ep, i) => {
              const maxMs = Math.max(
                ...data.slowest_endpoints.map((e) => e.avg_ms)
              )
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-slate-400 font-mono">
                        {ep.method}
                      </span>
                      <span className="text-xs text-slate-700 font-mono truncate">
                        {ep.path.replace("/api", "")}
                      </span>
                    </div>
                    <span className={`text-xs font-bold flex-shrink-0 ${
                      ep.avg_ms > 2000 ? "text-red-600" :
                      ep.avg_ms > 1000 ? "text-amber-600" :
                      "text-slate-600"
                    }`}>
                      {ep.avg_ms}ms
                    </span>
                  </div>
                  <MiniBar
                    value={ep.avg_ms}
                    max={maxMs}
                    color={
                      ep.avg_ms > 2000 ? "bg-red-400" :
                      ep.avg_ms > 1000 ? "bg-amber-400" :
                      "bg-green-400"
                    }
                  />
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Status code breakdown + by role */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Card>
          <h3 className="text-sm font-semibold text-slate-700 mb-4">
            By Status Code
          </h3>
          <div className="space-y-2">
            {data.by_status_code?.map((s) => (
              <div key={s.status} className="flex items-center gap-3">
                <span className={`text-xs font-bold w-12 ${
                  s.status >= 500 ? "text-red-600" :
                  s.status >= 400 ? "text-amber-600" :
                  s.status >= 300 ? "text-blue-600" :
                  "text-green-600"
                }`}>
                  {s.status}
                </span>
                <MiniBar
                  value={s.count}
                  max={Math.max(...data.by_status_code.map((x) => x.count))}
                  color={
                    s.status >= 500 ? "bg-red-400" :
                    s.status >= 400 ? "bg-amber-400" :
                    s.status >= 300 ? "bg-blue-400" :
                    "bg-green-400"
                  }
                />
                <span className="text-xs text-slate-500 w-16 text-right">
                  {s.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-slate-700 mb-4">
            By User Role
          </h3>
          <div className="space-y-2">
            {data.by_role?.map((r) => {
              const maxCount = Math.max(
                ...data.by_role.map((x) => x.count)
              )
              return (
                <div key={r.role} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-600 w-28 capitalize">
                    {r.role}
                  </span>
                  <MiniBar
                    value={r.count}
                    max={maxCount}
                    color="bg-primary-400"
                  />
                  <span className="text-xs text-slate-500 w-16 text-right">
                    {r.count.toLocaleString()}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Hourly distribution */}
      {data.by_hour?.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-slate-700 mb-4">
            Request Volume by Hour (UTC)
          </h3>
          <div className="flex items-end gap-1 h-16">
            {Array.from({ length: 24 }, (_, h) => {
              const found = data.by_hour?.find((x) => x.hour === h)
              const count = found?.count || 0
              const maxCount = Math.max(
                ...data.by_hour.map((x) => x.count)
              )
              const height = maxCount > 0
                ? Math.max(4, (count / maxCount) * 64)
                : 4
              return (
                <div
                  key={h}
                  className="flex-1 bg-primary-400 rounded-t-sm opacity-80 hover:opacity-100 transition-opacity cursor-default"
                  style={{ height: `${height}px`, minWidth: "6px" }}
                  title={`${h}:00 — ${count} requests`}
                />
              )
            })}
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:00</span>
          </div>
        </Card>
      )}

      {/* Cleanup old logs */}
      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
        <div>
          <p className="text-sm font-medium text-slate-700">
            Clean Up Old API Logs
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            API request logs grow fast. Recommend keeping 30 days.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => cleanupMutation.mutate(30)}
          loading={cleanupMutation.isPending}
          className="text-xs text-red-600 border-red-200 hover:bg-red-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete Older Than 30 Days
        </Button>
      </div>
    </div>
  )
}

// ── Main Page ──
const MonitorPage = () => {
  const [activeTab, setActiveTab] = useState("ai")
  const [days, setDays] = useState(30)

  const TABS = [
    { id: "tokens", label: "Token Blocklist", icon: Shield },
    { id: "ai",     label: "AI Usage",        icon: Brain },
    { id: "api",    label: "API Monitor",      icon: Activity },
  ]

  return (
    <div className="page-container">

      {/* Header */}
      <div className="section-header mb-6">
        <div>
          <h1 className="text-slate-900 mb-1">
            Application Monitor
          </h1>
          <p className="text-slate-500 text-sm">
            Token management, AI usage tracking and API monitoring.
          </p>
        </div>

        {/* Period selector — only for AI and API tabs */}
        {activeTab !== "tokens" && (
          <select
            className="input w-auto"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        )}
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-6 border-b border-slate-100 pb-0">
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px ${
                activeTab === tab.id
                  ? "border-primary-600 text-primary-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {activeTab === "tokens" && <TokenBlocklistSection />}
      {activeTab === "ai"     && <AIUsageSection days={days} />}
      {activeTab === "api"    && <APIMonitorSection days={days} />}
    </div>
  )
}

export default MonitorPage