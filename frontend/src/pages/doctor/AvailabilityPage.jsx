import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Clock,
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
  Phone,
} from "lucide-react"
import toast from "react-hot-toast"

import Card from "../../components/ui/Card"
import Button from "../../components/ui/Button"
import Input from "../../components/ui/Input"
import Select from "../../components/ui/Select"
import ConfirmDialog from "../../components/ui/ConfirmDialog"
import { PageSpinner } from "../../components/ui/Spinner"
import {
  useMyAvailability,
  useAddSlot,
  useDeleteSlot,
} from "../../hooks/useAvailability"
import useAuthStore from "../../store/auth.store"

const DAYS = [
  { value: "0", label: "Monday" },
  { value: "1", label: "Tuesday" },
  { value: "2", label: "Wednesday" },
  { value: "3", label: "Thursday" },
  { value: "4", label: "Friday" },
  { value: "5", label: "Saturday" },
  { value: "6", label: "Sunday" },
]

const DAY_NAMES = [
  "Monday", "Tuesday", "Wednesday", "Thursday",
  "Friday", "Saturday", "Sunday"
]

// ── Format time to 12-hour ──
const formatTime = (timeStr) => {
  if (!timeStr) return ""
  const [h, m] = timeStr.split(":").map(Number)
  const period = h >= 12 ? "PM" : "AM"
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, "0")} ${period}`
}

const slotSchema = z.object({
  day_of_week: z.string().min(1, "Select a day"),
  start_time:  z.string().min(1, "Select start time"),
  end_time:    z.string().min(1, "Select end time"),
  label:       z.string().optional(),
}).refine(
  (d) => d.start_time < d.end_time,
  { message: "End time must be after start time", path: ["end_time"] }
)

// ── Add Slot Form ──
const AddSlotForm = ({ onClose }) => {
  const addMutation = useAddSlot()

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(slotSchema),
  })

  const onSubmit = async (data) => {
    await addMutation.mutateAsync({
      day_of_week: parseInt(data.day_of_week),
      start_time:  data.start_time,
      end_time:    data.end_time,
      label:       data.label || null,
    })
    onClose()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Select
        label="Day of Week"
        options={DAYS}
        placeholder="Select day"
        error={errors.day_of_week?.message}
        {...register("day_of_week")}
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">
            Start Time
          </label>
          <input
            type="time"
            className={`input ${errors.start_time ? "input-error" : ""}`}
            {...register("start_time")}
          />
          {errors.start_time && (
            <p className="text-xs text-red-500">
              {errors.start_time.message}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">
            End Time
          </label>
          <input
            type="time"
            className={`input ${errors.end_time ? "input-error" : ""}`}
            {...register("end_time")}
          />
          {errors.end_time && (
            <p className="text-xs text-red-500">
              {errors.end_time.message}
            </p>
          )}
        </div>
      </div>

      <Input
        label="Label (optional)"
        placeholder="e.g. Morning Session, Evening Hours"
        {...register("label")}
      />

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
          loading={addMutation.isPending}
          className="flex-1"
        >
          <Plus className="w-4 h-4" />
          Add Slot
        </Button>
      </div>
    </form>
  )
}

// ── Slot Card ──
const SlotCard = ({ slot, onDelete }) => (
  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center">
        <Clock className="w-4 h-4 text-primary-600" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">
          {formatTime(slot.start_time)} — {formatTime(slot.end_time)}
        </p>
        {slot.label && (
          <p className="text-xs text-slate-400">{slot.label}</p>
        )}
      </div>
    </div>
    <button
      onClick={() => onDelete(slot)}
      className="btn-ghost p-1.5 text-slate-400 hover:text-red-500"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  </div>
)

// ── Main Page ──
const AvailabilityPage = () => {
  const [showAddForm, setShowAddForm] = useState(false)
  const [deletingSlot, setDeletingSlot] = useState(null)
  const user = useAuthStore((s) => s.user)

  const { data: slots = [], isLoading } = useMyAvailability()
  const deleteMutation = useDeleteSlot()

  // Group slots by day
  const byDay = DAY_NAMES.reduce((acc, day, index) => {
    acc[index] = slots.filter((s) => s.day_of_week === index)
    return acc
  }, {})

  const totalSlots = slots.length

  if (isLoading) return <PageSpinner />

  return (
    <div className="page-container max-w-3xl mx-auto">

      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="text-slate-900 mb-1">
            Teleconsult Availability
          </h1>
          <p className="text-slate-500 text-sm">
            Set when patients can call you for teleconsultation.
            {totalSlots > 0 && ` ${totalSlots} slot${totalSlots !== 1 ? "s" : ""} configured.`}
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="w-4 h-4" />
          Add Time Slot
        </Button>
      </div>

      {/* Info banner */}
      <div className="mb-6 bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
        <Phone className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-800 mb-1">
            How this works
          </p>
          <p className="text-xs text-blue-600">
            Patients will see your availability on their consultation
            page and know when to call you directly on your registered
            phone number ({user?.phone}). No booking required —
            just set your available hours.
          </p>
        </div>
      </div>

      {/* Add form */}
      {showAddForm && (
        <Card className="mb-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">
            Add New Time Slot
          </h3>
          <AddSlotForm onClose={() => setShowAddForm(false)} />
        </Card>
      )}

      {/* Weekly schedule */}
      {totalSlots === 0 && !showAddForm ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-slate-500 mb-2">
            No availability set yet
          </h3>
          <p className="text-slate-400 text-sm mb-4">
            Add your teleconsultation hours so patients know when to call.
          </p>
          <Button
            variant="primary"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="w-4 h-4" />
            Add First Slot
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {DAY_NAMES.map((day, index) => {
            const daySlots = byDay[index] || []
            if (daySlots.length === 0) return null
            return (
              <Card key={day} padding={false}>
                <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">
                    {day}
                  </h3>
                  <span className="text-xs text-slate-400">
                    {daySlots.length} slot{daySlots.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="p-3 space-y-2">
                  {daySlots.map((slot) => (
                    <SlotCard
                      key={slot.id}
                      slot={slot}
                      onDelete={setDeletingSlot}
                    />
                  ))}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={!!deletingSlot}
        onClose={() => setDeletingSlot(null)}
        onConfirm={async () => {
          await deleteMutation.mutateAsync(deletingSlot.id)
          setDeletingSlot(null)
        }}
        title="Remove this slot?"
        message={`Remove ${deletingSlot?.day_name} ${
          deletingSlot ? formatTime(deletingSlot.start_time) : ""
        } – ${deletingSlot ? formatTime(deletingSlot.end_time) : ""}?`}
        confirmLabel="Remove Slot"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

export default AvailabilityPage