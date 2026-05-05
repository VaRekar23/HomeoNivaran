import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  HeartPulse, Plus, Edit2, Power, PowerOff,
  Search, AlertCircle, CheckCircle2
} from "lucide-react"
import toast from "react-hot-toast"

import Card from "../../components/ui/Card"
import Button from "../../components/ui/Button"
import Input from "../../components/ui/Input"
import Select from "../../components/ui/Select"
import Modal from "../../components/ui/Modal"
import ConfirmDialog from "../../components/ui/ConfirmDialog"
import EmptyState from "../../components/ui/EmptyState"
import { PageSpinner } from "../../components/ui/Spinner"
import api from "../../api/axios"
import {
  getAilmentIcon,
  isValidIconName,
  getAvailableIcons,
} from "../../utils/ailmentIcons"

// ── Hooks ──
const useAilments = (includeInactive = false) => useQuery({
  queryKey: ["ailments-doctor", includeInactive],
  queryFn: async () => {
    const res = await api.get("/ailments", {
      params: { include_inactive: includeInactive }
    })
    return Array.isArray(res.data) ? res.data : []
  },
})

// ── Icon Picker Component ──
const IconPicker = ({ value, onChange, error }) => {
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const allIcons = getAvailableIcons()

  const filtered = allIcons.filter((name) =>
    name.toLowerCase().includes(search.toLowerCase())
  )

  const SelectedIcon = getAilmentIcon(value)

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-slate-700">
        Icon
      </label>

      {/* Preview + open button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex items-center gap-3 p-3 border rounded-xl w-full text-left hover:border-primary-400 transition-colors ${
          error ? "border-red-300" : "border-slate-200"
        }`}
      >
        <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <SelectedIcon className="w-5 h-5 text-primary-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-800">
            {value || "HeartPulse"}
          </p>
          <p className="text-xs text-slate-400">
            Click to change icon
          </p>
        </div>
      </button>
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {/* Icon picker modal */}
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Select Icon"
        size="md"
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search icons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9"
            />
          </div>

          <p className="text-xs text-slate-400">
            {filtered.length} icons available. Type any Lucide icon name.
          </p>

          <div className="grid grid-cols-6 gap-2 max-h-64 overflow-y-auto">
            {filtered.map((iconName) => {
              const Icon = getAilmentIcon(iconName)
              const isSelected = iconName === value
              return (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => {
                    onChange(iconName)
                    setOpen(false)
                  }}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${
                    isSelected
                      ? "border-primary-500 bg-primary-50"
                      : "border-slate-100 hover:border-primary-300 hover:bg-slate-50"
                  }`}
                  title={iconName}
                >
                  <Icon className={`w-5 h-5 ${
                    isSelected ? "text-primary-600" : "text-slate-500"
                  }`} />
                  <span className="text-[9px] text-slate-400 truncate w-full text-center">
                    {iconName}
                  </span>
                </button>
              )
            })}
          </div>

          <p className="text-xs text-slate-400 text-center">
            Can't find your icon? You can also type the exact Lucide
            icon name in the form field.
          </p>
        </div>
      </Modal>
    </div>
  )
}

// ── Ailment Form ──
const ailmentSchema = z.object({
  name:        z.string().min(2, "Name required"),
  category:    z.string().min(2, "Category required"),
  description: z.string().optional(),
  icon:        z.string().min(1, "Select an icon"),
})

const AilmentForm = ({ ailment = null, onClose }) => {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(ailmentSchema),
    defaultValues: ailment ? {
      name:        ailment.name,
      category:    ailment.category,
      description: ailment.description || "",
      icon:        ailment.icon || "HeartPulse",
    } : {
      name:     "",
      category: "",
      icon:     "HeartPulse",
    }
  })

  const selectedIcon = watch("icon")

  const mutation = useMutation({
    mutationFn: (data) => ailment
      ? api.put(`/ailments/${ailment.id}`, data)
      : api.post("/ailments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ailments-doctor"] })
      queryClient.invalidateQueries({ queryKey: ["ailments"] })
      toast.success(ailment ? "Ailment updated!" : "Ailment added!")
      onClose()
    },
    onError: (e) => {
      toast.error(e.response?.data?.detail || "Failed to save ailment")
    }
  })

  // Common categories for quick select
  const CATEGORY_OPTIONS = [
    { value: "Cold & Flu",  label: "Cold & Flu" },
    { value: "Skin",        label: "Skin" },
    { value: "Hair",        label: "Hair" },
    { value: "Digestive",   label: "Digestive" },
    { value: "General",     label: "General" },
    { value: "Respiratory", label: "Respiratory" },
    { value: "Joint & Bone", label: "Joint & Bone" },
    { value: "Eye",         label: "Eye" },
    { value: "Ear",         label: "Ear" },
    { value: "Mental Health", label: "Mental Health" },
    { value: "Women's Health", label: "Women's Health" },
    { value: "Children's Health", label: "Children's Health" },
    { value: "Other",       label: "Other" },
  ]

  return (
    <form onSubmit={handleSubmit(mutation.mutate)} className="space-y-4">

      <Input
        label="Ailment Name"
        placeholder="e.g. Common Cold, Acne, Hair Fall"
        error={errors.name?.message}
        {...register("name")}
      />

      {/* Category — allow typing OR selecting */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-700">
          Category
        </label>
        <input
          type="text"
          list="category-options"
          placeholder="Type or select a category"
          className={`input ${errors.category ? "input-error" : ""}`}
          {...register("category")}
        />
        <datalist id="category-options">
          {CATEGORY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} />
          ))}
        </datalist>
        {errors.category && (
          <p className="text-xs text-red-500">
            {errors.category.message}
          </p>
        )}
        <p className="text-xs text-slate-400">
          Select existing or type a new category name
        </p>
      </div>

      {/* Icon picker */}
      <IconPicker
        value={selectedIcon}
        onChange={(name) => setValue("icon", name)}
        error={errors.icon?.message}
      />

      {/* Description */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-700">
          Description{" "}
          <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          rows={2}
          placeholder="Brief description of this condition..."
          className="input resize-none"
          {...register("description")}
        />
      </div>

      <div className="flex gap-3 pt-2">
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
          loading={mutation.isPending}
          className="flex-1"
        >
          {ailment ? "Update Ailment" : "Add Ailment"}
        </Button>
      </div>
    </form>
  )
}

// ── Ailment Card ──
const AilmentCard = ({ ailment, onEdit, onToggle }) => {
  const Icon = getAilmentIcon(ailment.icon)

  return (
    <div className={`card p-4 transition-all ${
      !ailment.is_active ? "opacity-60 border-dashed" : ""
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            ailment.is_active
              ? "bg-primary-50"
              : "bg-slate-100"
          }`}>
            <Icon className={`w-5 h-5 ${
              ailment.is_active
                ? "text-primary-600"
                : "text-slate-400"
            }`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {ailment.name}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-400">
                {ailment.category}
              </span>
              <span className="text-xs text-slate-200">·</span>
              <span className="text-xs text-slate-300">
                {ailment.icon}
              </span>
              {!ailment.is_active && (
                <span className="text-xs bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full">
                  Disabled
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-1">
          <button
            onClick={() => onEdit(ailment)}
            className="btn-ghost p-1.5 text-slate-400 hover:text-primary-600"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onToggle(ailment)}
            className={`btn-ghost p-1.5 ${
              ailment.is_active
                ? "text-slate-400 hover:text-red-500"
                : "text-slate-400 hover:text-green-500"
            }`}
            title={ailment.is_active ? "Disable" : "Enable"}
          >
            {ailment.is_active
              ? <PowerOff className="w-4 h-4" />
              : <Power className="w-4 h-4" />
            }
          </button>
        </div>
      </div>

      {ailment.description && (
        <p className="text-xs text-slate-400 mt-2 line-clamp-2">
          {ailment.description}
        </p>
      )}
    </div>
  )
}

// ── Main Page ──
const AilmentsPage = () => {
  const [search, setSearch] = useState("")
  const [showInactive, setShowInactive] = useState(false)
  const [filterCategory, setFilterCategory] = useState("")
  const [addOpen, setAddOpen] = useState(false)
  const [editAilment, setEditAilment] = useState(null)
  const [toggleAilment, setToggleAilment] = useState(null)

  const queryClient = useQueryClient()
  const { data: ailments = [], isLoading } = useAilments(showInactive)

  const toggleMutation = useMutation({
    mutationFn: (id) => api.put(`/ailments/${id}/toggle`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["ailments-doctor"] })
      queryClient.invalidateQueries({ queryKey: ["ailments"] })
      toast.success(res.data.message)
      setToggleAilment(null)
    },
    onError: (e) => {
      toast.error(e.response?.data?.detail || "Failed to toggle ailment")
    }
  })

  // Get unique categories from loaded ailments
  const categories = [...new Set(ailments.map((a) => a.category))]

  const filtered = ailments.filter((a) => {
    const matchesSearch = !search.trim() ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.category.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = !filterCategory ||
      a.category === filterCategory
    return matchesSearch && matchesCategory
  })

  // Group by category
  const grouped = categories
    .filter((c) => !filterCategory || c === filterCategory)
    .reduce((acc, cat) => {
      acc[cat] = filtered.filter((a) => a.category === cat)
      return acc
    }, {})

  const activeCount   = ailments.filter((a) => a.is_active).length
  const inactiveCount = ailments.filter((a) => !a.is_active).length

  if (isLoading) return <PageSpinner />

  return (
    <div className="page-container">

      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="text-slate-900 mb-1">Ailments Management</h1>
          <p className="text-slate-500 text-sm">
            {activeCount} active ·{" "}
            {inactiveCount} disabled
          </p>
        </div>
        <Button variant="primary" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Ailment
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search ailments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <select
          className="input w-auto"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          onClick={() => setShowInactive(!showInactive)}
          className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
            showInactive
              ? "bg-slate-100 text-slate-700 border-slate-300"
              : "bg-white text-slate-600 border-slate-200"
          }`}
        >
          {showInactive ? "Hide Disabled" : "Show Disabled"}
        </button>
      </div>

      {/* Grouped ailments */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={HeartPulse}
          title="No ailments found"
          description={
            ailments.length === 0
              ? "Add your first ailment to get started."
              : "Try adjusting your search or filter."
          }
          action={
            ailments.length === 0 && (
              <Button variant="primary" onClick={() => setAddOpen(true)}>
                <Plus className="w-4 h-4" />
                Add First Ailment
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, items]) => {
            if (items.length === 0) return null
            const CategoryIcon = getAilmentIcon(
              items[0]?.icon || "HeartPulse"
            )
            return (
              <div key={category}>
                {/* Category header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-7 h-7 bg-primary-50 rounded-lg flex items-center justify-center">
                    <CategoryIcon className="w-4 h-4 text-primary-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-700">
                    {category}
                  </h3>
                  <span className="text-xs text-slate-400">
                    ({items.length})
                  </span>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>

                {/* Ailment cards grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((ailment) => (
                    <AilmentCard
                      key={ailment.id}
                      ailment={ailment}
                      onEdit={setEditAilment}
                      onToggle={setToggleAilment}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add New Ailment"
      >
        <AilmentForm onClose={() => setAddOpen(false)} />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editAilment}
        onClose={() => setEditAilment(null)}
        title="Edit Ailment"
      >
        {editAilment && (
          <AilmentForm
            ailment={editAilment}
            onClose={() => setEditAilment(null)}
          />
        )}
      </Modal>

      {/* Toggle confirm */}
      <ConfirmDialog
        isOpen={!!toggleAilment}
        onClose={() => setToggleAilment(null)}
        onConfirm={() => toggleMutation.mutate(toggleAilment.id)}
        title={
          toggleAilment?.is_active
            ? `Disable "${toggleAilment?.name}"?`
            : `Enable "${toggleAilment?.name}"?`
        }
        message={
          toggleAilment?.is_active
            ? "This ailment will be hidden from new consultations. All existing consultations and orders using this ailment will remain intact."
            : "This ailment will become available for new consultations."
        }
        confirmLabel={
          toggleAilment?.is_active ? "Yes, Disable" : "Yes, Enable"
        }
        variant={toggleAilment?.is_active ? "danger" : "primary"}
        loading={toggleMutation.isPending}
      />
    </div>
  )
}

export default AilmentsPage