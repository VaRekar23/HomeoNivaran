import { useState } from "react"
import {
  Users,
  Search,
  UserCheck,
  UserX,
  Shield,
  Stethoscope,
  User,
  LockOpen,
  Lock,
} from "lucide-react"

import Card from "../../components/ui/Card"
import Button from "../../components/ui/Button"
import EmptyState from "../../components/ui/EmptyState"
import { PageSpinner } from "../../components/ui/Spinner"
import ConfirmDialog from "../../components/ui/ConfirmDialog"
import { useAdminUsers, useToggleUser, useChangeUserRole, useUnlockUser } from "../../hooks/useAdmin"
import { formatDate, formatDateTime, formatRole } from "../../utils/formatters"

import Modal from "../../components/ui/Modal"

const ROLE_TABS = [
  { label: "All", value: "all" },
  { label: "Patients", value: "patient" },
  { label: "Doctors", value: "doctor" },
  { label: "Admins", value: "admin" },
]

const ROLE_ICONS = {
  patient: User,
  doctor:  Stethoscope,
  admin:   Shield,
}

const ROLE_COLORS = {
  patient: "bg-blue-50 text-blue-700",
  doctor:  "bg-teal-50 text-teal-700",
  admin:   "bg-slate-100 text-slate-700",
}

const isAccountLocked = (user) => {
  if (!user.locked_until) return false
  return new Date(user.locked_until) > new Date()
}

const getLockRemainingText = (lockedUntil) => {
  if (!lockedUntil) return ""
  const diff = new Date(lockedUntil) - new Date()
  if (diff <= 0) return "Expired"
  const minutes = Math.ceil(diff / 1000 / 60)
  if (minutes < 60) return `${minutes}m remaining`
  const hours = Math.ceil(minutes / 60)
  return `${hours}h remaining`
}

const RoleChangeModal = ({ user, onClose }) => {
  const changeRoleMutation = useChangeUserRole()
  const newRole = user.role === "patient" ? "doctor" : "patient"

  const handleConfirm = async () => {
    await changeRoleMutation.mutateAsync({
      id: user.id,
      role: newRole,
    })
    onClose()
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-amber-800 mb-1">
          Confirm Role Change
        </p>
        <p className="text-sm text-amber-700">
          Change <strong>{user.name}</strong> from{" "}
          <strong className="capitalize">{user.role}</strong> to{" "}
          <strong className="capitalize">{newRole}</strong>?
        </p>
      </div>
      <p className="text-xs text-slate-500">
        {newRole === "doctor"
          ? "This user will gain access to the doctor portal and can review patient cases."
          : "This user will lose doctor access and be moved to the patient portal."}
      </p>
      <div className="flex gap-3">
        <Button
          variant="secondary"
          onClick={onClose}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleConfirm}
          loading={changeRoleMutation.isPending}
          className="flex-1"
        >
          Confirm Change
        </Button>
      </div>
    </div>
  )
}

// ── User row ──
const UserRow = ({ user, onToggle, onChangeRole, onUnlock  }) => {
  const Icon = ROLE_ICONS[user.role] || User
  const canChangeRole = user.role !== "admin"
  const locked = isAccountLocked(user)

  return (
    <div className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-xl transition-colors">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm ${ROLE_COLORS[user.role]}`}>
        {user.name?.charAt(0)?.toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p className="text-sm font-semibold text-slate-900">
            {user.name}
          </p>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[user.role]}`}>
            <Icon className="w-3 h-3 inline mr-1" />
            {formatRole(user.role)}
          </span>
          {!user.is_active && (
            <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
              Deactivated
            </span>
          )}
          {locked && (
            <span
              className="text-xs bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full flex items-center gap-1"
              title={`Locked until ${formatDateTime(user.locked_until)}`}
            >
              <Lock className="w-2.5 h-2.5" />
              Locked · {getLockRemainingText(user.locked_until)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
          <span>{user.email}</span>
          <span>{user.phone}</span>
          <span>Joined {formatDate(user.created_at)}</span>
          {user.failed_login_attempts > 0 && (
            <span className="text-orange-400">
              {user.failed_login_attempts} failed login
              {user.failed_login_attempts !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Role change button */}
        {canChangeRole && (
          <Button
            variant="ghost"
            onClick={() => onChangeRole(user)}
            className="text-xs text-blue-600 hover:bg-blue-50"
          >
            <Shield className="w-3.5 h-3.5" />
            Change Role
          </Button>
        )}

        {locked && (
          <Button
            variant="ghost"
            onClick={() => onUnlock(user)}
            className="text-xs text-orange-600 border border-orange-200 hover:bg-orange-50"
          >
            <LockOpen className="w-3.5 h-3.5" />
            Unlock
          </Button>
        )}

        {/* Toggle active */}
        <Button
          variant={user.is_active ? "secondary" : "ghost"}
          onClick={() => onToggle(user)}
          className={`text-xs ${
            user.is_active
              ? "text-red-600 border-red-200 hover:bg-red-50"
              : "text-green-600 hover:bg-green-50"
          }`}
        >
          {user.is_active ? (
            <><UserX className="w-3.5 h-3.5" />Deactivate</>
          ) : (
            <><UserCheck className="w-3.5 h-3.5" />Activate</>
          )}
        </Button>
      </div>
    </div>
  )
}

// ── Main Page ──
const UsersPage = () => {
  const [activeTab, setActiveTab] = useState("all")
  const [search, setSearch] = useState("")
  const [selectedUser, setSelectedUser] = useState(null)
  const [roleChangeUser, setRoleChangeUser] = useState(null)
  const [unlockUser, setUnlockUser] = useState(null)

  const { data: users = [], isLoading } = useAdminUsers()
  const toggleMutation = useToggleUser()
  const unlockMutation = useUnlockUser()

  const byRole =
    activeTab === "all"
      ? users
      : users.filter((u) => u.role === activeTab)

  const filtered = byRole.filter((u) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.includes(q)
    )
  })

  const countByRole = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1
    return acc
  }, {})

  const activeCount = users.filter((u) => u.is_active).length
  const lockedCount = users.filter((u) => isAccountLocked(u)).length

  if (isLoading) return <PageSpinner />

  return (
    <div className="page-container">

      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="text-slate-900 mb-1">Users</h1>
          <p className="text-slate-500 text-sm">
            {users.length} total · {activeCount} active
            {lockedCount > 0 && (
              <span className="text-orange-500 ml-1">
                · {lockedCount} locked
              </span>
            )}
          </p>
        </div>
      </div>

      {lockedCount > 0 && (
        <div className="mb-5 bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
          <Lock className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-orange-800">
              {lockedCount} account{lockedCount !== 1 ? "s" : ""} temporarily locked
            </p>
            <p className="text-xs text-orange-600 mt-0.5">
              Account{lockedCount !== 1 ? "s" : ""} locked due to too many
              failed login attempts. {lockedCount !== 1 ? "They" : "It"} will
              unlock automatically, or you can unlock manually below.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Patients", count: countByRole.patient || 0, color: "bg-blue-50 text-blue-700" },
          { label: "Doctors", count: countByRole.doctor || 0, color: "bg-teal-50 text-teal-700" },
          { label: "Admins", count: countByRole.admin || 0, color: "bg-slate-100 text-slate-700" },
        ].map((s) => (
          <div key={s.label} className={`${s.color} rounded-xl p-4 text-center`}>
            <p className="text-2xl font-bold">{s.count}</p>
            <p className="text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, email or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-9"
        />
      </div>

      {/* Role tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-5">
        {ROLE_TABS.map((tab) => {
          const count =
            tab.value === "all"
              ? users.length
              : countByRole[tab.value] || 0
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

      {/* Users list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users found"
          description="Try adjusting your search or filter."
        />
      ) : (
        <Card padding={false}>
          <div className="px-4 py-3 border-b border-slate-50">
            <p className="text-xs text-slate-400">
              {filtered.length} user{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="divide-y divide-slate-50 p-2">
            {filtered.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                onToggle={setSelectedUser}
                onChangeRole={setRoleChangeUser}
                onUnlock={setUnlockUser}
              />
            ))}
          </div>
        </Card>
      )}

      <Modal
        isOpen={!!roleChangeUser}
        onClose={() => setRoleChangeUser(null)}
        title="Change User Role"
        size="sm"
      >
        {roleChangeUser && (
          <RoleChangeModal
            user={roleChangeUser}
            onClose={() => setRoleChangeUser(null)}
          />
        )}
      </Modal>

      {/* Confirm toggle */}
      <ConfirmDialog
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        onConfirm={async () => {
          await toggleMutation.mutateAsync(selectedUser.id)
          setSelectedUser(null)
        }}
        title={
          selectedUser?.is_active
            ? `Deactivate ${selectedUser?.name}?`
            : `Activate ${selectedUser?.name}?`
        }
        message={
          selectedUser?.is_active
            ? "This user will not be able to login until reactivated."
            : "This user will be able to login again."
        }
        confirmLabel={
          selectedUser?.is_active ? "Deactivate" : "Activate"
        }
        variant={selectedUser?.is_active ? "danger" : "primary"}
        loading={toggleMutation.isPending}
      />

      {/* Unlock confirm */}
      <ConfirmDialog
        isOpen={!!unlockUser}
        onClose={() => setUnlockUser(null)}
        onConfirm={async () => {
          await unlockMutation.mutateAsync(unlockUser.id)
          setUnlockUser(null)
        }}
        title={`Unlock ${unlockUser?.name}?`}
        message={
          unlockUser
            ? `This account was locked after ${unlockUser.failed_login_attempts} failed login attempt${
                unlockUser.failed_login_attempts !== 1 ? "s" : ""
              }. Unlocking will reset the counter and allow immediate login. Only do this if you trust the account owner made legitimate attempts.`
            : ""
        }
        confirmLabel="Yes, Unlock Account"
        variant="primary"
        loading={unlockMutation.isPending}
      />
    </div>
  )
}

export default UsersPage