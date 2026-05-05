import { useState } from "react"
import { Plus, MapPin } from "lucide-react"
import { clsx } from "clsx"

import AddressCard from "../AddressCard"
import AddressForm from "../AddressForm"
import { PageSpinner } from "../../ui/Spinner"
import {
  useAddresses,
  useCreateAddress,
} from "../../../hooks/useAddresses"

const Step4_Address = ({ selectedAddressId, onSelect }) => {
  const [showAddForm, setShowAddForm] = useState(false)

  const { data, isLoading } = useAddresses()
  const addresses = Array.isArray(data) ? data : []
  const createMutation = useCreateAddress()

  const handleCreateAddress = async (formData) => {
    const res = await createMutation.mutateAsync(formData)
    // Auto-select the newly added address
    onSelect(res.data)
    setShowAddForm(false)
  }

  if (isLoading) return <PageSpinner />

  return (
    <div>
      <h2 className="text-slate-900 mb-1">
        Delivery Address
      </h2>
      <p className="text-slate-500 text-sm mb-6">
        Select where we should deliver your medicines.
      </p>

      {/* Add new form */}
      {showAddForm ? (
        <div className="card p-5 mb-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">
            Add New Address
          </h3>
          <AddressForm
            onSubmit={handleCreateAddress}
            onCancel={() => setShowAddForm(false)}
            loading={createMutation.isPending}
          />
        </div>
      ) : (
        <>
          {/* Saved addresses */}
          {addresses.length === 0 ? (
            <div className="text-center py-8 mb-4">
              <MapPin className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 text-sm mb-1">
                No saved addresses yet
              </p>
              <p className="text-slate-400 text-xs">
                Add your delivery address below
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {addresses.map((address) => (
                <AddressCard
                  key={address.id}
                  address={address}
                  selectable
                  selected={selectedAddressId === address.id}
                  onSelect={(a) => onSelect(a)}
                />
              ))}
            </div>
          )}

          {/* Add new button */}
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm font-medium text-slate-400 hover:border-primary-300 hover:text-primary-600 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add New Address
          </button>
        </>
      )}
    </div>
  )
}

export default Step4_Address