import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import {
  Package, Plus, AlertTriangle, TrendingDown,
  Edit2, BarChart3, Search, RefreshCw, ArrowUp, ArrowDown
} from "lucide-react"
import toast from "react-hot-toast"
import api from "../../api/axios"

import Card from "../../components/ui/Card"
import Button from "../../components/ui/Button"
import Input from "../../components/ui/Input"
import Select from "../../components/ui/Select"
import Modal from "../../components/ui/Modal"
import Badge from "../../components/ui/Badge"
import EmptyState from "../../components/ui/EmptyState"
import { PageSpinner } from "../../components/ui/Spinner"
import { formatCurrency } from "../../utils/formatters"
import { MEDICINE_CATEGORIES } from "../../utils/constants"

const CATEGORY_OPTIONS = MEDICINE_CATEGORIES.map((c) => ({
  value: c, label: c
}))

const UNIT_OPTIONS = [
  { value: "units",   label: "Units" },
  { value: "bottles", label: "Bottles" },
  { value: "tubes",   label: "Tubes" },
  { value: "strips",  label: "Strips" },
  { value: "boxes",   label: "Boxes" },
]

// ── Hooks ──
const useInventory = (params = {}) => useQuery({
  queryKey: ["inventory", params],
  queryFn: async () => {
    const res = await api.get("/inventory", { params })
    return Array.isArray(res.data) ? res.data : []
  },
})

const useInventoryStats = () => useQuery({
  queryKey: ["inventory-stats"],
  queryFn: async () => {
    const res = await api.get("/inventory/stats")
    return res.data
  },
})

// ── Stock Adjustment Modal ──
const AdjustStockModal = ({ item, onClose }) => {
  const queryClient = useQueryClient()
  const { register, handleSubmit, watch } = useForm({
    defaultValues: { quantity: 0, movement_type: "stock_in", reason: "" }
  })
  const direction = watch("movement_type")

  const mutation = useMutation({
    mutationFn: (data) => api.post(`/inventory/${item.id}/adjust`, {
      ...data,
      quantity: direction === "stock_out"
        ? -Math.abs(Number(data.quantity))
        : Math.abs(Number(data.quantity))
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
      queryClient.invalidateQueries({ queryKey: ["inventory-stats"] })
      toast.success("Stock updated!")
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.detail || "Failed")
  })

  return (
    <form onSubmit={handleSubmit(mutation.mutate)} className="space-y-4">
      <div className="bg-slate-50 rounded-xl p-3">
        <p className="text-sm font-semibold text-slate-800">
          {item.medicine_name}
          {item.potency && <span className="text-slate-400 ml-2">{item.potency}</span>}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          Current stock: {item.quantity_in_stock} {item.unit}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">
            Direction
          </label>
          <select className="input" {...register("movement_type")}>
            <option value="stock_in">➕ Add Stock</option>
            <option value="stock_out">➖ Remove Stock</option>
            <option value="adjustment">⚖️ Adjustment</option>
          </select>
        </div>
        <Input
          label="Quantity"
          type="number"
          min="1"
          placeholder="e.g. 50"
          {...register("quantity", { required: true, min: 1 })}
        />
      </div>

      <Input
        label="Reason (optional)"
        placeholder="e.g. Monthly restock from supplier"
        {...register("reason")}
      />

      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={mutation.isPending} className="flex-1">
          Update Stock
        </Button>
      </div>
    </form>
  )
}

// ── Add/Edit Item Modal ──
const ItemFormModal = ({ item = null, onClose }) => {
  const queryClient = useQueryClient()

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: item ? {
      medicine_name:     item.medicine_name,
      medicine_category: item.medicine_category,
      potency:           item.potency || "",
      quantity_in_stock: item.quantity_in_stock,
      unit:              item.unit,
      reorder_level:     item.reorder_level,
      cost_price:        item.cost_price,
      selling_price:     item.selling_price,
      supplier:          item.supplier || "",
      notes:             item.notes || "",
    } : {
      medicine_category: "Oral Medicine",
      unit: "units",
      reorder_level: 10,
      quantity_in_stock: 0,
      cost_price: 0,
      selling_price: 0,
    }
  })

  const mutation = useMutation({
    mutationFn: (data) => item
      ? api.put(`/inventory/${item.id}`, data)
      : api.post("/inventory", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
      queryClient.invalidateQueries({ queryKey: ["inventory-stats"] })
      toast.success(item ? "Medicine updated!" : "Medicine added to inventory!")
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.detail || "Failed")
  })

  return (
    <form onSubmit={handleSubmit(mutation.mutate)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Medicine Name"
          placeholder="e.g. Bryonia Alba"
          error={errors.medicine_name?.message}
          {...register("medicine_name", { required: "Name required" })}
        />
        <Select
          label="Category"
          options={CATEGORY_OPTIONS}
          error={errors.medicine_category?.message}
          {...register("medicine_category", { required: true })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Potency (optional)"
          placeholder="e.g. 30C, 200C"
          {...register("potency")}
        />
        <Select
          label="Unit"
          options={UNIT_OPTIONS}
          {...register("unit")}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Input
          label={item ? "Stock Qty" : "Opening Stock"}
          type="number" min="0"
          {...register("quantity_in_stock")}
        />
        <Input
          label="Reorder Level"
          type="number" min="0"
          {...register("reorder_level")}
        />
        <Input
          label=""
          className="invisible"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Cost Price (₹)"
          type="number" min="0" step="0.01"
          {...register("cost_price")}
        />
        <Input
          label="Selling Price (₹)"
          type="number" min="0" step="0.01"
          {...register("selling_price")}
        />
      </div>

      <Input
        label="Supplier (optional)"
        placeholder="e.g. Boiron India, SBL"
        {...register("supplier")}
      />

      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={mutation.isPending} className="flex-1">
          {item ? "Update Medicine" : "Add to Inventory"}
        </Button>
      </div>
    </form>
  )
}

// ── Main Inventory Page ──
const InventoryPage = () => {
  const [search, setSearch] = useState("")
  const [filterCategory, setFilterCategory] = useState("")
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [adjustItem, setAdjustItem] = useState(null)

  const { data: stats } = useInventoryStats()
  const { data: items = [], isLoading, refetch } = useInventory({
    low_stock_only: lowStockOnly || undefined,
    category:       filterCategory || undefined,
  })

  const filtered = items.filter((item) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      item.medicine_name?.toLowerCase().includes(q) ||
      item.potency?.toLowerCase().includes(q) ||
      item.supplier?.toLowerCase().includes(q)
    )
  })

  if (isLoading) return <PageSpinner />

  return (
    <div className="page-container">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="text-slate-900 mb-1">Medicine Inventory</h1>
          <p className="text-slate-500 text-sm">
            Track stock levels and manage medicine inventory.
          </p>
        </div>
        <Button variant="primary" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Medicine
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: "Total Medicines",
              value: stats.total_medicines,
              icon: Package,
              color: "bg-blue-50 text-blue-600"
            },
            {
              label: "Low Stock",
              value: stats.low_stock_count,
              icon: AlertTriangle,
              color: "bg-amber-50 text-amber-600"
            },
            {
              label: "Out of Stock",
              value: stats.out_of_stock_count,
              icon: TrendingDown,
              color: "bg-red-50 text-red-600"
            },
            {
              label: "Inventory Value",
              value: formatCurrency(stats.total_inventory_value),
              icon: BarChart3,
              color: "bg-green-50 text-green-600"
            },
          ].map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500 uppercase tracking-wider">
                    {stat.label}
                  </span>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${stat.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {stat.value}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search medicine, potency or supplier..."
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
          {MEDICINE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          onClick={() => setLowStockOnly(!lowStockOnly)}
          className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
            lowStockOnly
              ? "bg-amber-100 text-amber-700 border-amber-300"
              : "bg-white text-slate-600 border-slate-200 hover:border-amber-300"
          }`}
        >
          <AlertTriangle className="w-4 h-4 inline mr-1" />
          Low Stock Only
        </button>
        <Button variant="ghost" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Inventory list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title={items.length === 0 ? "No medicines in inventory" : "No results"}
          description={
            items.length === 0
              ? "Add your medicine inventory to track stock levels."
              : "Try adjusting your search or filter."
          }
          action={
            items.length === 0 && (
              <Button variant="primary" onClick={() => setAddOpen(true)}>
                <Plus className="w-4 h-4" />
                Add First Medicine
              </Button>
            )
          }
        />
      ) : (
        <Card padding={false}>
          <div className="px-4 py-3 border-b border-slate-50">
            <p className="text-xs text-slate-400">
              {filtered.length} medicine{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="divide-y divide-slate-50">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors"
              >
                {/* Status indicator */}
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  item.quantity_in_stock === 0
                    ? "bg-red-500"
                    : item.is_low_stock
                    ? "bg-amber-500"
                    : "bg-green-500"
                }`} />

                {/* Medicine info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900">
                      {item.medicine_name}
                    </p>
                    {item.potency && (
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {item.potency}
                      </span>
                    )}
                    <span className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">
                      {item.medicine_category}
                    </span>
                    {item.quantity_in_stock === 0 && (
                      <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">
                        Out of Stock
                      </span>
                    )}
                    {item.is_low_stock && item.quantity_in_stock > 0 && (
                      <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-medium">
                        Low Stock
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                    <span>
                      Stock:{" "}
                      <strong className={`${
                        item.quantity_in_stock === 0
                          ? "text-red-600"
                          : item.is_low_stock
                          ? "text-amber-600"
                          : "text-slate-700"
                      }`}>
                        {item.quantity_in_stock} {item.unit}
                      </strong>
                    </span>
                    <span>Reorder at: {item.reorder_level}</span>
                    <span>
                      Sell: {formatCurrency(item.selling_price)}
                    </span>
                    {item.supplier && <span>{item.supplier}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    variant="secondary"
                    onClick={() => setAdjustItem(item)}
                    className="text-xs"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                    Adjust
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setEditItem(item)}
                    className="text-xs"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modals */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add Medicine to Inventory">
        <ItemFormModal onClose={() => setAddOpen(false)} />
      </Modal>

      <Modal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Edit Medicine">
        {editItem && <ItemFormModal item={editItem} onClose={() => setEditItem(null)} />}
      </Modal>

      <Modal isOpen={!!adjustItem} onClose={() => setAdjustItem(null)} title="Adjust Stock">
        {adjustItem && <AdjustStockModal item={adjustItem} onClose={() => setAdjustItem(null)} />}
      </Modal>
    </div>
  )
}

export default InventoryPage