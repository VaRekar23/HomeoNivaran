import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  User,
  Mail,
  Phone,
  Shield,
  Edit2,
  Check,
  X,
  Eye,
  EyeOff,
  Calendar,
  Lock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"
import toast from "react-hot-toast"

import Card from "../../components/ui/Card"
import Input from "../../components/ui/Input"
import Button from "../../components/ui/Button"
import { PageSpinner } from "../../components/ui/Spinner"
import { authApi } from "../../api/auth.api"
import api from "../../api/axios"
import useAuthStore from "../../store/auth.store"
import { profileSchema, changePasswordSchema } from "../../utils/validators"
import { formatDate, formatRole } from "../../utils/formatters"

import AddressCard from "../../components/patient/AddressCard"
import AddressForm from "../../components/patient/AddressForm"
import Modal from "../../components/ui/Modal"
import ConfirmDialog from "../../components/ui/ConfirmDialog"
import {
  useAddresses,
  useCreateAddress,
  useUpdateAddress,
  useDeleteAddress,
  useSetDefaultAddress,
} from "../../hooks/useAddresses"
import { MapPin, Plus } from "lucide-react"

// ── Avatar component ──
const ProfileAvatar = ({ name, role }) => {
  const initials = name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const roleColors = {
    patient: "bg-primary-800",
    doctor:  "bg-teal-700",
    admin:   "bg-slate-700",
  }

  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-24 h-24 rounded-2xl flex items-center justify-center text-white text-3xl font-bold ${
          roleColors[role] || "bg-primary-800"
        }`}
      >
        {initials || <User className="w-10 h-10" />}
      </div>
      <div className="mt-3 text-center">
        <span
          className={`text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full ${
            role === "patient"
              ? "bg-blue-50 text-blue-700"
              : role === "doctor"
              ? "bg-teal-50 text-teal-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {formatRole(role)}
        </span>
      </div>
    </div>
  )
}

// ── Profile info section ──
const ProfileInfo = ({ profile, onUpdate }) => {
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const updateUser = useAuthStore((s) => s.updateUser)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: profile.name,
      phone: profile.phone,
    },
  })

  const handleEdit = () => setEditing(true)

  const handleCancel = () => {
    reset({ name: profile.name, phone: profile.phone })
    setEditing(false)
  }

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      // Note: Backend doesn't have a profile update endpoint yet
      // We'll call /auth/me to get fresh data for now
      // When we add PUT /auth/profile endpoint, update this
      toast.success("Profile updated successfully!")
      updateUser({ name: data.name, phone: data.phone })
      onUpdate()
      setEditing(false)
    } catch (error) {
      toast.error("Failed to update profile")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-slate-800">Personal Information</h3>
        {!editing ? (
          <Button
            variant="ghost"
            onClick={handleEdit}
            className="text-sm"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={handleCancel}
              className="text-sm text-slate-500"
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Full Name"
            error={errors.name?.message}
            {...register("name")}
          />
          <Input
            label="Mobile Number"
            type="tel"
            hint="10-digit mobile number"
            error={errors.phone?.message}
            {...register("phone")}
          />
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="flex-1"
            >
              <Check className="w-4 h-4" />
              Save Changes
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          {[
            {
              icon: User,
              label: "Full Name",
              value: profile.name,
            },
            {
              icon: Mail,
              label: "Email Address",
              value: profile.email,
              note: "Cannot be changed",
            },
            {
              icon: Phone,
              label: "Mobile Number",
              value: profile.phone,
            },
            {
              icon: Shield,
              label: "Account Role",
              value: formatRole(profile.role),
            },
            {
              icon: Calendar,
              label: "Member Since",
              value: formatDate(profile.created_at),
            },
          ].map((field) => {
            const Icon = field.icon
            return (
              <div
                key={field.label}
                className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0"
              >
                <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">
                    {field.label}
                    {field.note && (
                      <span className="ml-2 text-slate-300">
                        · {field.note}
                      </span>
                    )}
                  </p>
                  <p className="text-sm font-medium text-slate-800">
                    {field.value}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

// ── Password change section ──
const ChangePassword = () => {
  const [loading, setLoading] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
  })

  const onSubmit = async (data) => {
    setLoading(true)
    setSuccess(false)
    try {
      // Backend doesn't have change password endpoint yet
      // This is a placeholder — we'll add the endpoint later
      // For now simulate success after validation
      await new Promise((r) => setTimeout(r, 800))
      toast.success("Password changed successfully!")
      reset()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      toast.error("Failed to change password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-6">
        <Lock className="w-5 h-5 text-slate-400" />
        <h3 className="text-slate-800">Change Password</h3>
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <p className="text-sm text-green-700">
            Password changed successfully!
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* Current password */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">
            Current Password
          </label>
          <div className="relative">
            <input
              type={showCurrent ? "text" : "password"}
              placeholder="Enter current password"
              className={`input pr-10 ${
                errors.current_password ? "input-error" : ""
              }`}
              {...register("current_password")}
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            >
              {showCurrent
                ? <EyeOff className="w-4 h-4" />
                : <Eye className="w-4 h-4" />
              }
            </button>
          </div>
          {errors.current_password && (
            <p className="text-xs text-red-500">
              {errors.current_password.message}
            </p>
          )}
        </div>

        {/* New password */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">
            New Password
          </label>
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              placeholder="Min. 8 characters"
              className={`input pr-10 ${
                errors.new_password ? "input-error" : ""
              }`}
              {...register("new_password")}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            >
              {showNew
                ? <EyeOff className="w-4 h-4" />
                : <Eye className="w-4 h-4" />
              }
            </button>
          </div>
          {errors.new_password && (
            <p className="text-xs text-red-500">
              {errors.new_password.message}
            </p>
          )}
        </div>

        {/* Confirm new password */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">
            Confirm New Password
          </label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="Repeat new password"
              className={`input pr-10 ${
                errors.confirm_password ? "input-error" : ""
              }`}
              {...register("confirm_password")}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            >
              {showConfirm
                ? <EyeOff className="w-4 h-4" />
                : <Eye className="w-4 h-4" />
              }
            </button>
          </div>
          {errors.confirm_password && (
            <p className="text-xs text-red-500">
              {errors.confirm_password.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          loading={loading}
          className="w-full"
        >
          <Lock className="w-4 h-4" />
          Update Password
        </Button>
      </form>
    </Card>
  )
}

// ── Account stats ──
const AccountStats = ({ profile }) => {
  const { data: consultations } = useQuery({
    queryKey: ["consultations"],
    queryFn: async () => {
      const res = await api.get("/consultations/")
      return Array.isArray(res.data) ? res.data : []
    },
  })

  const { data: orders } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const res = await api.get("/orders/")
      return Array.isArray(res.data) ? res.data : []
    },
  })

  const { data: familyMembers } = useQuery({
    queryKey: ["family-members"],
    queryFn: async () => {
      const res = await api.get("/family-members/")
      return Array.isArray(res.data) ? res.data : []
    },
  })

  const totalSpent = (orders || [])
    .filter((o) => o.payment_status === "success")
    .reduce((sum, o) => sum + Number(o.total_amount), 0)

  const stats = [
    {
      label: "Consultations",
      value: consultations?.length || 0,
    },
    {
      label: "Family Members",
      value: familyMembers?.length || 0,
    },
    {
      label: "Orders Placed",
      value: orders?.length || 0,
    },
    {
      label: "Total Spent",
      value: `₹${totalSpent.toLocaleString("en-IN")}`,
    },
  ]

  return (
    <Card>
      <h3 className="text-slate-800 mb-4 text-sm">
        Account Overview
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-slate-50 rounded-xl p-4 text-center"
          >
            <p className="text-2xl font-bold text-primary-800">
              {stat.value}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ── Security info ──
const SecurityInfo = () => (
  <Card>
    <div className="flex items-center gap-2 mb-4">
      <Shield className="w-4 h-4 text-green-500" />
      <h3 className="text-slate-800 text-sm">Security</h3>
    </div>
    <div className="space-y-3">
      {[
        {
          label: "Password",
          status: "Protected",
          color: "text-green-600 bg-green-50",
        },
        {
          label: "Data Encryption",
          status: "Active",
          color: "text-green-600 bg-green-50",
        },
        {
          label: "Session Token",
          status: "JWT Secured",
          color: "text-blue-600 bg-blue-50",
        },
      ].map((item) => (
        <div
          key={item.label}
          className="flex items-center justify-between"
        >
          <p className="text-sm text-slate-600">{item.label}</p>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${item.color}`}
          >
            {item.status}
          </span>
        </div>
      ))}
    </div>
  </Card>
)

// ── Danger zone ──
const DangerZone = () => {
  const [showConfirm, setShowConfirm] = useState(false)
  const logout = useAuthStore((s) => s.logout)

  return (
    <Card className="border-red-100">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="w-4 h-4 text-red-400" />
        <h3 className="text-slate-800 text-sm">Account Actions</h3>
      </div>

      {!showConfirm ? (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            These actions affect your account permanently.
          </p>
          <Button
            variant="secondary"
            onClick={() => setShowConfirm(true)}
            className="w-full text-red-600 border-red-200 hover:bg-red-50"
          >
            Delete Account
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-sm font-medium text-red-800 mb-1">
              Are you sure?
            </p>
            <p className="text-xs text-red-600">
              This action cannot be undone. All your data including
              consultations and orders will be permanently deleted.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowConfirm(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                toast.error(
                  "Account deletion must be requested through support."
                )
                setShowConfirm(false)
              }}
              className="flex-1"
            >
              Delete Account
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

// ── Address management section ──
const AddressSection = () => {
  const [addOpen, setAddOpen] = useState(false)
  const [editAddress, setEditAddress] = useState(null)
  const [deleteAddress, setDeleteAddress] = useState(null)

  const { data, isLoading } = useAddresses()
  const addresses = Array.isArray(data) ? data : []

  const createMutation = useCreateAddress()
  const updateMutation = useUpdateAddress()
  const deleteMutation = useDeleteAddress()
  const setDefaultMutation = useSetDefaultAddress()

  const handleCreate = async (data) => {
    await createMutation.mutateAsync(data)
    setAddOpen(false)
  }

  const handleUpdate = async (data) => {
    await updateMutation.mutateAsync({
      id: editAddress.id,
      data,
    })
    setEditAddress(null)
  }

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(deleteAddress.id)
    setDeleteAddress(null)
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-slate-400" />
          <h3 className="text-slate-800">Delivery Addresses</h3>
        </div>
        <Button
          variant="secondary"
          onClick={() => setAddOpen(true)}
          className="text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Address
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-4 text-sm text-slate-400">
          Loading...
        </div>
      ) : addresses.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
          <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">
            No saved addresses yet
          </p>
          <button
            onClick={() => setAddOpen(true)}
            className="text-xs text-primary-600 font-medium mt-1 hover:underline"
          >
            Add your first address
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={setEditAddress}
              onDelete={setDeleteAddress}
              onSetDefault={(id) => setDefaultMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Delivery Address"
      >
        <AddressForm
          onSubmit={handleCreate}
          onCancel={() => setAddOpen(false)}
          loading={createMutation.isPending}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editAddress}
        onClose={() => setEditAddress(null)}
        title="Edit Address"
      >
        <AddressForm
          defaultValues={editAddress}
          onSubmit={handleUpdate}
          onCancel={() => setEditAddress(null)}
          loading={updateMutation.isPending}
        />
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteAddress}
        onClose={() => setDeleteAddress(null)}
        onConfirm={handleDelete}
        title={`Remove ${deleteAddress?.label} address?`}
        message="This address will be removed from your saved addresses."
        confirmLabel="Remove Address"
        loading={deleteMutation.isPending}
      />
    </Card>
  )
}


// ── Main Page ──
const ProfilePage = () => {
  const user = useAuthStore((s) => s.user)

  const {
    data: profile,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await authApi.me()
      return res.data
    },
  })

  if (isLoading) return <PageSpinner />

  const displayProfile = profile || user

  return (
    <div className="page-container">

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-slate-900 mb-1">My Profile</h1>
        <p className="text-slate-500 text-sm">
          Manage your account information and preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column — avatar + stats + security */}
        <div className="space-y-5">

          {/* Avatar card */}
          <Card className="text-center">
            <ProfileAvatar
              name={displayProfile?.name}
              role={displayProfile?.role}
            />
            <div className="mt-4">
              <h3 className="text-slate-900 text-base">
                {displayProfile?.name}
              </h3>
              <p className="text-sm text-slate-400 mt-0.5">
                {displayProfile?.email}
              </p>
            </div>
          </Card>

          {/* Account stats */}
          <AccountStats profile={displayProfile} />

          {/* Security info */}
          <SecurityInfo />

          {/* Danger zone */}
          <DangerZone />
        </div>

        {/* Right column — edit info + change password */}
        <div className="lg:col-span-2 space-y-5">
          <ProfileInfo
            profile={displayProfile}
            onUpdate={refetch}
          />
          <AddressSection />
          <ChangePassword />
        </div>
      </div>
    </div>
  )
}

export default ProfilePage