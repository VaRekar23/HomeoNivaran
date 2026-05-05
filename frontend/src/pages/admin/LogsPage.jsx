import { useState } from "react"
import {
  AlertCircle,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react"

import Card from "../../components/ui/Card"
import Button from "../../components/ui/Button"
import EmptyState from "../../components/ui/EmptyState"
import { PageSpinner } from "../../components/ui/Spinner"
import ConfirmDialog from "../../components/ui/ConfirmDialog"
import { useAdminLogs, useCleanupLogs } from "../../hooks/useAdmin"
import { formatDateTime, formatRelativeTime } from "../../utils/formatters"

// ── Single expandable log row ──
const LogRow = ({ log }) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border-b border-slate-50 last:border-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors"
      >
        {/* Level badge */}
        <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded flex-shrink-0 mt-0.5">
          {log.level}
        </span>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 break-words">
            {log.message}
          </p>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
            {log.module && <span>{log.module}</span>}
            {log.function_name && <span>{log.function_name}()</span>}
            {log.line_number && <span>line {log.line_number}</span>}
            <span>{formatRelativeTime(log.created_at)}</span>
          </div>
        </div>

        {/* Expand icon */}
        <div className="flex-shrink-0">
          {expanded
            ? <ChevronUp className="w-4 h-4 text-slate-400" />
            : <ChevronDown className="w-4 h-4 text-slate-400" />
          }
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 bg-slate-50/50">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-slate-400 mb-0.5">Timestamp</p>
              <p className="font-medium text-slate-700">
                {formatDateTime(log.created_at)}
              </p>
            </div>
            {log.request_method && log.request_url && (
              <div>
                <p className="text-slate-400 mb-0.5">Request</p>
                <p className="font-medium text-slate-700 font-mono">
                  {log.request_method} {log.request_url}
                </p>
              </div>
            )}
            {log.user_id && (
              <div>
                <p className="text-slate-400 mb-0.5">User ID</p>
                <p className="font-medium text-slate-700 font-mono text-xs break-all">
                  {log.user_id}
                </p>
              </div>
            )}
          </div>

          {log.traceback && (
            <div>
              <p className="text-xs text-slate-400 mb-1">Traceback</p>
              <pre className="text-xs bg-slate-900 text-green-400 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap break-words max-h-48">
                {log.traceback}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Page ──
const LogsPage = () => {
  const [limit, setLimit] = useState(50)
  const [showCleanup, setShowCleanup] = useState(false)
  const [cleanupDays, setCleanupDays] = useState(10)

  const { data, isLoading, refetch } = useAdminLogs({ limit })
  const cleanupMutation = useCleanupLogs()

  const logs = data?.logs || []

  if (isLoading) return <PageSpinner />

  return (
    <div className="page-container">

      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="text-slate-900 mb-1">Error Logs</h1>
          <p className="text-slate-500 text-sm">
            {data?.total || 0} total critical errors ·{" "}
            {data?.total_last_24h || 0} in last 24 hours
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => refetch()}
            className="text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button
            variant="danger"
            onClick={() => setShowCleanup(true)}
            className="text-sm"
          >
            <Trash2 className="w-4 h-4" />
            Cleanup Old Logs
          </Button>
        </div>
      </div>

      {/* Info banner */}
      <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">
          Only <strong>CRITICAL</strong> level errors are stored in the database.
          Logs older than 10 days are auto-deleted nightly.
          All other log levels are available in the server console.
        </p>
      </div>

      {/* Logs list */}
      {logs.length === 0 ? (
        <EmptyState
          icon={AlertCircle}
          title="No error logs"
          description="Critical errors will appear here when they occur."
        />
      ) : (
        <Card padding={false}>
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Showing {logs.length} of {data?.total || 0} logs
            </p>
            <p className="text-xs text-slate-400">
              Click a row to expand details
            </p>
          </div>
          <div>
            {logs.map((log) => (
              <LogRow key={log.id} log={log} />
            ))}
          </div>

          {/* Load more */}
          {logs.length < (data?.total || 0) && (
            <div className="px-4 py-3 border-t border-slate-100 text-center">
              <Button
                variant="ghost"
                onClick={() => setLimit((l) => l + 50)}
                className="text-sm"
              >
                Load More Logs
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Cleanup confirm dialog */}
      <ConfirmDialog
        isOpen={showCleanup}
        onClose={() => setShowCleanup(false)}
        onConfirm={async () => {
          await cleanupMutation.mutateAsync(cleanupDays)
          setShowCleanup(false)
        }}
        title="Cleanup Old Logs"
        message={`Delete all log records older than ${cleanupDays} days. This cannot be undone.`}
        confirmLabel={`Delete Logs Older Than ${cleanupDays} Days`}
        loading={cleanupMutation.isPending}
        variant="danger"
      />
    </div>
  )
}

export default LogsPage