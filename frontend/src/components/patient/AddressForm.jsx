import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Input from "../ui/Input"
import Select from "../ui/Select"
import Button from "../ui/Button"

const LABEL_OPTIONS = [
  { value: "Home",    label: "🏠 Home" },
  { value: "Office",  label: "🏢 Office" },
  { value: "Parents", label: "👨‍👩‍👧 Parents" },
  { value: "Other",   label: "📍 Other" },
]

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
  "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra",
  "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Delhi",
  "Jammu and Kashmir", "Ladakh", "Lakshadweep",
  "Puducherry", "Dadra and Nagar Haveli"
].map((s) => ({ value: s, label: s }))

const addressSchema = z.object({
  label:      z.string().min(1, "Select a label"),
  full_name:  z.string().min(2, "Full name required"),
  phone:      z.string().regex(/^\d{10}$/, "Enter valid 10-digit phone"),
  line1:      z.string().min(5, "Address line 1 required"),
  line2:      z.string().optional(),
  city:       z.string().min(2, "City required"),
  state:      z.string().min(2, "State required"),
  pincode:    z.string().regex(/^\d{6}$/, "Enter valid 6-digit pincode"),
  is_default: z.boolean().optional(),
})

const AddressForm = ({
  defaultValues = null,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label:      "Home",
      full_name:  "",
      phone:      "",
      line1:      "",
      line2:      "",
      city:       "",
      state:      "",
      pincode:    "",
      is_default: false,
    },
  })

  useEffect(() => {
    if (defaultValues) {
      reset({
        label:      defaultValues.label || "Home",
        full_name:  defaultValues.full_name || "",
        phone:      defaultValues.phone || "",
        line1:      defaultValues.line1 || "",
        line2:      defaultValues.line2 || "",
        city:       defaultValues.city || "",
        state:      defaultValues.state || "",
        pincode:    defaultValues.pincode || "",
        is_default: defaultValues.is_default || false,
      })
    }
  }, [defaultValues, reset])

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
    >
      {/* Label */}
      <Select
        label="Address Label"
        options={LABEL_OPTIONS}
        error={errors.label?.message}
        {...register("label")}
      />

      {/* Full name + Phone */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Full Name"
          placeholder="Name at delivery address"
          error={errors.full_name?.message}
          {...register("full_name")}
        />
        <Input
          label="Phone"
          type="tel"
          placeholder="10-digit number"
          error={errors.phone?.message}
          {...register("phone")}
        />
      </div>

      {/* Address lines */}
      <Input
        label="Address Line 1"
        placeholder="Flat / House No / Building"
        error={errors.line1?.message}
        {...register("line1")}
      />
      <Input
        label="Address Line 2 (optional)"
        placeholder="Street / Area / Landmark"
        {...register("line2")}
      />

      {/* City + Pincode */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="City"
          placeholder="e.g. Mumbai"
          error={errors.city?.message}
          {...register("city")}
        />
        <Input
          label="Pincode"
          placeholder="6-digit pincode"
          error={errors.pincode?.message}
          {...register("pincode")}
        />
      </div>

      {/* State */}
      <Select
        label="State"
        options={INDIAN_STATES}
        placeholder="Select state"
        error={errors.state?.message}
        {...register("state")}
      />

      {/* Set as default */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          className="w-4 h-4 text-primary-600 rounded"
          {...register("is_default")}
        />
        <span className="text-sm text-slate-600">
          Set as default delivery address
        </span>
      </label>

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
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
          {defaultValues ? "Update Address" : "Save Address"}
        </Button>
      </div>
    </form>
  )
}

export default AddressForm