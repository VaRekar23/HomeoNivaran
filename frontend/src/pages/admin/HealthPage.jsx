import { useQuery } from "@tanstack/react-query"
import {
  Activity,
  Database,
  Brain,
  Users,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
} from "lucide-react"

import Card from "../../components/ui/Card"
import Button from "../../components/ui/Button"
import { PageSpinner } from "../../components/ui/Spinner"
import { useAppHealth } from "../../hooks/useAdmin"
import { formatDateTime, formatCurrency } from "../../utils/formatters"

import toast from "react-hot-toast"
import api from "../../api/axios"

const StatusBadge = ({ status }) => {
  const config = {
    healthy:        { color: "bg-green-100 text-green-700", icon: CheckCircle2 },
    configured:     { color: "bg-green-100 text-green-700", icon: CheckCircle2 },
    degraded:       { color: "bg-amber-100 text-amber-700", icon: AlertCircle },
    unhealthy:      { color: "bg-red-100 text-red-700",    icon: AlertCircle },
    not_configured: { color: "bg-slate-100 text-slate-500", icon: AlertCircle },
    error:          { color: "bg-red-100 text-red-700",    icon: AlertCircle },
  }
  const c = config[status] || config.degraded
  const Icon = c.icon
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${c.color}`}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  )
}

const HealthPage = () => {
  const { data: health, isLoading, refetch, isFetching } = useAppHealth()

  if (isLoading) return <PageSpinner />

  const db = health?.checks?.database
  const records = health?.checks?.records
  const ai = health?.checks?.ai_provider

  return (
    <div className="page-container">
      <div className="section-header">
        <div>
          <h1 className="text-slate-900 mb-1">Application Health</h1>
          <p className="text-slate-500 text-sm">
            Last checked: {health?.timestamp
              ? formatDateTime(health.timestamp)
              : "—"}
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => refetch()}
          loading={isFetching}
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Overall status */}
      <div className={`rounded-xl p-5 mb-6 flex items-center gap-4 ${
        health?.status === "healthy"
          ? "bg-green-50 border border-green-200"
          : "bg-amber-50 border border-amber-200"
      }`}>
        <Activity className={`w-8 h-8 flex-shrink-0 ${
          health?.status === "healthy"
            ? "text-green-600"
            : "text-amber-600"
        }`} />
        <div>
          <p className={`text-lg font-bold ${
            health?.status === "healthy"
              ? "text-green-800"
              : "text-amber-800"
          }`}>
            System is{" "}
            {health?.status === "healthy" ? "Healthy" : "Degraded"}
          </p>
          <p className={`text-sm ${
            health?.status === "healthy"
              ? "text-green-600"
              : "text-amber-600"
          }`}>
            All components are{" "}
            {health?.status === "healthy"
              ? "operating normally"
              : "experiencing issues"}
          </p>
        </div>
        <StatusBadge status={health?.status || "unknown"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Database */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-slate-800 text-sm">Database</h3>
              <p className="text-xs text-slate-400">PostgreSQL</p>
            </div>
            <div className="ml-auto">
              <StatusBadge status={db?.status || "unknown"} />
            </div>
          </div>
          {db?.response_ms !== undefined && (
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-xs">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500">Response time</span>
                <span className="font-semibold text-slate-800 ml-auto">
                  {db.response_ms}ms
                </span>
              </div>
            </div>
          )}
          {db?.error && (
            <p className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded-lg">
              {db.error}
            </p>
          )}
        </Card>

        {/* AI Provider */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
              <Brain className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-slate-800 text-sm">AI Provider</h3>
              <p className="text-xs text-slate-400 capitalize">
                {ai?.provider || "—"}
              </p>
            </div>
            <div className="ml-auto">
              <StatusBadge status={ai?.status || "unknown"} />
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600">
            {ai?.status === "configured"
              ? "API key is configured and ready"
              : "API key not configured"}
          </div>
        </Card>

        {/* Redis Cache */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-slate-800 text-sm">Redis Cache</h3>
              <p className="text-xs text-slate-400">Question caching</p>
            </div>
            <div className="ml-auto">
              <StatusBadge status={health?.checks?.redis?.status || "unknown"} />
            </div>
          </div>

          {health?.checks?.redis?.status === "connected" && (
            <div className="space-y-2">
              {[
                { label: "Total Keys",  value: health.checks.redis.total_keys },
                { label: "Hit Rate",    value: health.checks.redis.hit_rate },
                { label: "Memory Used", value: health.checks.redis.memory },
              ].map((r) => (
                <div key={r.label} className="flex justify-between text-sm">
                  <span className="text-slate-500">{r.label}</span>
                  <span className="font-semibold text-slate-800">{r.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Cache management buttons */}
          <div className="mt-4 space-y-2">
            <Button
              variant="secondary"
              onClick={async () => {
                await api.delete("/admin/cache/questions")
                toast.success("Question cache cleared")
              }}
              className="w-full text-xs"
            >
              Clear Question Cache
            </Button>
          </div>
        </Card>

        {/* Record counts */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-slate-800 text-sm">Data Records</h3>
            </div>
            <div className="ml-auto">
              <StatusBadge status={records?.status || "unknown"} />
            </div>
          </div>
          {records && (
            <div className="space-y-2">
              {[
                { label: "Users", value: records.users },
                { label: "Consultations", value: records.consultations },
                { label: "Orders", value: records.orders },
                {
                  label: "Total Revenue",
                  value: formatCurrency(records.total_revenue),
                },
              ].map((r) => (
                <div
                  key={r.label}
                  className="flex justify-between items-center text-sm"
                >
                  <span className="text-slate-500">{r.label}</span>
                  <span className="font-semibold text-slate-800">
                    {r.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

export default HealthPage