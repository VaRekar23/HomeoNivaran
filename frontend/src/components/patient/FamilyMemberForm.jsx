import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import Input from "../ui/Input"
import Select from "../ui/Select"
import Button from "../ui/Button"
import { familyMemberSchema } from "../../utils/validators"
import { GENDER_OPTIONS, RELATION_OPTIONS } from "../../utils/constants"

const toInputDate = (dob) => {
  if (!dob) return ""

  // Already in YYYY-MM-DD format — most common case from backend
  if (typeof dob === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    return dob
  }

  // Has time component e.g. "1997-03-15T00:00:00" or "1997-03-15T00:00:00Z"
  if (typeof dob === "string" && dob.includes("T")) {
    return dob.split("T")[0]
  }

  // JS Date object
  if (dob instanceof Date) {
    return dob.toISOString().split("T")[0]
  }

  // Fallback — try parsing
  try {
    return new Date(dob).toISOString().split("T")[0]
  } catch {
    return ""
  }
}

const FamilyMemberForm = ({
  onSubmit,
  onCancel,
  defaultValues = null,
  loading = false,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(familyMemberSchema),
    defaultValues: {
      name: "",
      age: "",
      gender: "",
      relation: "",
      known_allergies: "",
      medical_notes: "",
    },
  })

  // When editing, pre-fill form with existing data
  useEffect(() => {
    if (defaultValues) {
      reset({
        name: defaultValues.name || "",
        dob: toInputDate(defaultValues.dob),
        gender: defaultValues.gender || "",
        relation: defaultValues.relation || "",
        known_allergies: defaultValues.known_allergies || "",
        medical_notes: defaultValues.medical_notes || "",
      })
    }
  }, [defaultValues, reset])

  const handleFormSubmit = (data) => {
    // Convert age to number — HTML inputs return strings
    onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">

      {/* Name + Age side by side */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Full Name"
          placeholder="e.g. Priya Sharma"
          error={errors.name?.message}
          {...register("name")}
        />
        <Input
          label="Date of Birth"
          type="date"
          max={new Date().toISOString().split("T")[0]}
          error={errors.dob?.message}
          {...register("dob")}
        />
      </div>

      {/* Gender + Relation side by side */}
      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Gender"
          options={GENDER_OPTIONS}
          placeholder="Select gender"
          error={errors.gender?.message}
          {...register("gender")}
        />
        <Select
          label="Relation"
          options={RELATION_OPTIONS}
          placeholder="Select relation"
          error={errors.relation?.message}
          {...register("relation")}
        />
      </div>

      {/* Known Allergies */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-700">
          Known Allergies{" "}
          <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          rows={2}
          placeholder="e.g. Dust, pollen, certain foods..."
          className="input resize-none"
          {...register("known_allergies")}
        />
      </div>

      {/* Medical Notes */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-700">
          Medical Notes{" "}
          <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          rows={2}
          placeholder="e.g. History of asthma, diabetes..."
          className="input resize-none"
          {...register("medical_notes")}
        />
      </div>

      {/* Action buttons */}
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
          {defaultValues ? "Update Member" : "Add Member"}
        </Button>
      </div>
    </form>
  )
}

export default FamilyMemberForm