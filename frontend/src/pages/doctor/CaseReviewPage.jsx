import { useRef, useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useParams, useNavigate } from "react-router-dom"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  ArrowLeft,
  Brain,
  Pill,
  Plus,
  Trash2,
  Send,
  User,
  HeartPulse,
  MessageSquare,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  FileText,
  MapPin,
  CheckCircle2,
  ClipboardList,
  Star,
} from "lucide-react"
import toast from "react-hot-toast"
import { z } from "zod"

import Card from "../../components/ui/Card"
import Badge from "../../components/ui/Badge"
import Button from "../../components/ui/Button"
import Input from "../../components/ui/Input"
import Select from "../../components/ui/Select"
import { PageSpinner } from "../../components/ui/Spinner"
import {
  useDoctorCase,
  useAISummary,
  useAIMedicines,
  useCreatePrescription,
} from "../../hooks/useDoctor"
import { formatDate, formatCurrency } from "../../utils/formatters"
import { MEDICINE_CATEGORIES } from "../../utils/constants"
import PrescriptionLetterhead from "../../components/doctor/PrescriptionLetterhead"
import { usePrescriptionPDF } from "../../hooks/usePrescriptionPDF"
import { Edit2, CreditCard, Download } from "lucide-react"
import { doctorApi } from "../../api/doctor.api"

import { useUpdatePrescription, useMarkOrderPaid, usePatientHistory } from "../../hooks/useDoctor"
import ConfirmDialog from "../../components/ui/ConfirmDialog"

import { treatmentFeedbackApi } from "../../api/treatmentFeedback.api"

const CATEGORY_FIELD_CONFIG = {
  "Oral Medicine":  { potency: true,  dosage: true,  dosageLabel: "Dosage" },
  "Eye Drops":      { potency: true,  dosage: true,  dosageLabel: "Drops per dose" },
  "Nasal Drops":    { potency: true,  dosage: true,  dosageLabel: "Drops per dose" },
  "Ear Drops":      { potency: true,  dosage: true,  dosageLabel: "Drops per dose" },
  "Syrup":          { potency: true,  dosage: true,  dosageLabel: "Amount (ml/tsp)" },
  "Topical Cream":  { potency: false, dosage: true,  dosageLabel: "Amount to apply" },
  "Hair Oil":       { potency: false, dosage: true,  dosageLabel: "Amount to apply" },
  "Hair Shampoo":   { potency: false, dosage: false, dosageLabel: "" },
  "Face Wash":      { potency: false, dosage: false, dosageLabel: "" },
  "Supplement":     { potency: false, dosage: true,  dosageLabel: "Dosage" },
  "Other":          { potency: false, dosage: false, dosageLabel: "" },
}

// ── Prescription schema ──
const prescriptionSchema = z.object({
  consultation_fee: z.coerce.number().min(0),
  delivery_charges: z.coerce.number().min(0),
  doctor_notes: z.string().optional(),
  medicines: z.array(
    z.object({
      medicine_name: z.string().min(2, "Medicine name required"),
      medicine_category: z.string().min(1, "Category required"),
      medicine_price: z.coerce.number().min(0, "Price must be 0 or more"),
      potency: z.string().optional(),
      dosage: z.string().optional(),
      frequency: z.string().min(1, "Frequency required"),
      duration: z.string().min(1, "Duration required"),
      instructions: z.string().optional(),
    })
  ).min(1, "Add at least one medicine"),
})

// ── Patient info card ──
const PatientInfoCard = ({ caseData }) => (
  <Card>
    <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
      <User className="w-4 h-4" />
      Patient Details
    </h3>
    <div className="space-y-3">
      {[
        { label: "Patient", value: caseData.patient_name },
        { label: "Email", value: caseData.patient_email },
        { label: "Phone", value: caseData.patient_phone },
        { label: "For", value: caseData.member_name },
        {
          label: "Age / Gender",
          value: `${caseData.member_age} yrs · ${caseData.member_gender}`,
        },
        { label: "Relation", value: caseData.member_relation },
        {
          label: "Allergies",
          value: caseData.member_known_allergies || "None",
        },
      ].map((f) => (
        <div key={f.label}>
          <p className="text-xs text-slate-400">{f.label}</p>
          <p className="text-sm font-medium text-slate-800">
            {f.value}
          </p>
        </div>
      ))}
    </div>
  </Card>
)

// ── Ailment info card ──
const AilmentCard = ({ caseData }) => (
  <Card>
    <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
      <HeartPulse className="w-4 h-4" />
      Condition
    </h3>
    <div className="space-y-2">
      <p className="font-semibold text-slate-900">
        {caseData.ailment_name}
      </p>
      <p className="text-xs text-slate-400">
        {caseData.ailment_category}
      </p>
      {caseData.ailment_description && (
        <p className="text-sm text-slate-600">
          {caseData.ailment_description}
        </p>
      )}
      <div className="pt-2">
        <Badge status={caseData.status} />
      </div>
    </div>
  </Card>
)

// ── Q&A review card ──
const QACard = ({ caseData }) => {
  const [expanded, setExpanded] = useState(true)
  const qa = caseData.qa_pairs || []

  return (
    <Card>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between mb-4"
      >
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Patient Q&A ({qa.length} questions)
        </h3>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-slate-400" />
          : <ChevronDown className="w-4 h-4 text-slate-400" />
        }
      </button>

      {expanded && (
        <div className="space-y-4">
          {qa.map((pair, index) => (
            <div
              key={index}
              className="border-b border-slate-50 pb-3 last:border-0 last:pb-0"
            >
              <p className="text-xs text-slate-400 mb-1">
                Q{index + 1}. {pair.question_text}
              </p>
              <p className="text-sm font-medium text-slate-800">
                {pair.answer_text || (
                  <span className="text-amber-400 italic font-normal">
                    Not answered
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// ── AI Summary card ──
const AISummaryCard = ({ consultationId }) => {
  const [summary, setSummary] = useState(null)
  const aiSummaryMutation = useAISummary()

  const handleGenerate = async () => {
    try {
      const res = await aiSummaryMutation.mutateAsync(consultationId)
      setSummary(res.data.summary)
    } catch {
      // error handled in hook
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Brain className="w-4 h-4 text-blue-500" />
          AI Patient Summary
        </h3>
        <Button
          variant="secondary"
          onClick={handleGenerate}
          loading={aiSummaryMutation.isPending}
          className="text-xs"
        >
          <Sparkles className="w-3 h-3" />
          {summary ? "Regenerate" : "Generate Summary"}
        </Button>
      </div>

      {!summary && !aiSummaryMutation.isPending && (
        <div className="text-center py-6">
          <Brain className="w-8 h-8 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">
            Click Generate to get an AI summary of this patient case.
          </p>
        </div>
      )}

      {aiSummaryMutation.isPending && (
        <div className="flex items-center gap-3 py-4">
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          <p className="text-sm text-slate-500">
            Analysing patient answers...
          </p>
        </div>
      )}

      {summary && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-sm text-blue-900 leading-relaxed">
            {summary}
          </p>
        </div>
      )}
    </Card>
  )
}

// ── AI Medicine suggestions card ──
const AIMedicinesCard = ({ consultationId, onUseSuggestion }) => {
  const [suggestions, setSuggestions] = useState(null)
  const aiMedicinesMutation = useAIMedicines()

  const handleGenerate = async () => {
    try {
      const res = await aiMedicinesMutation.mutateAsync(consultationId)
      setSuggestions(res.data)
    } catch {
      // error handled in hook
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Pill className="w-4 h-4 text-green-500" />
          AI Medicine Suggestions
        </h3>
        <Button
          variant="secondary"
          onClick={handleGenerate}
          loading={aiMedicinesMutation.isPending}
          className="text-xs"
        >
          <Sparkles className="w-3 h-3" />
          {suggestions ? "Regenerate" : "Get Suggestions"}
        </Button>
      </div>

      {!suggestions && !aiMedicinesMutation.isPending && (
        <div className="text-center py-6">
          <Pill className="w-8 h-8 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">
            Get AI medicine suggestions based on this case.
          </p>
        </div>
      )}

      {aiMedicinesMutation.isPending && (
        <div className="flex items-center gap-3 py-4">
          <Loader2 className="w-5 h-5 text-green-500 animate-spin" />
          <p className="text-sm text-slate-500">
            Analysing case and suggesting medicines...
          </p>
        </div>
      )}

      {suggestions && (
        <div className="space-y-3">
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
            <p className="text-xs text-amber-700">
              ⚠️ {suggestions.disclaimer}
            </p>
          </div>

          {suggestions.suggestions?.map((s, i) => (
            <div
              key={i}
              className="border border-slate-100 rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900 text-sm">
                      {s.medicine}
                    </p>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {s.potency}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {s.reason}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {s.dosage} · {s.frequency}
                  </p>
                </div>
                <button
                  onClick={() => onUseSuggestion(s)}
                  className="text-xs font-medium text-primary-600 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                >
                  Use This
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// ── Feedback card for doctor ──
const FeedbackCard = ({ consultationId }) => {
  const { data: feedback } = useQuery({
    queryKey: ["doctor-feedback", consultationId],
    queryFn: async () => {
      try {
        const res = await treatmentFeedbackApi.getForDoctor(consultationId)
        return res.data
      } catch {
        return null
      }
    },
    enabled: !!consultationId,
    retry: false,
  })

  if (!feedback) return null

  return (
    <Card>
      <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
        <Star className="w-4 h-4 text-amber-400" />
        Patient Feedback
      </h3>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 w-24">Overall</span>
          <div className="flex gap-0.5">
            {[1,2,3,4,5].map((s) => (
              <Star key={s} className={`w-4 h-4 ${
                s <= feedback.overall_rating
                  ? "text-amber-400 fill-amber-400"
                  : "text-slate-200"
              }`} />
            ))}
          </div>
        </div>
        {feedback.treatment_effectiveness && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Effectiveness</span>
            <span className="font-medium">
              {feedback.treatment_effectiveness}/5
            </span>
          </div>
        )}
        {feedback.doctor_communication && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Communication</span>
            <span className="font-medium">
              {feedback.doctor_communication}/5
            </span>
          </div>
        )}
        {feedback.feeling_better !== null && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Feeling better</span>
            <span className={`font-medium ${
              feedback.feeling_better
                ? "text-green-600"
                : "text-amber-600"
            }`}>
              {feedback.feeling_better ? "Yes ✅" : "Not yet"}
            </span>
          </div>
        )}
        {feedback.comments && (
          <div className="bg-slate-50 rounded-lg p-2 mt-2">
            <p className="text-xs text-slate-600 italic">
              "{feedback.comments}"
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}

// ── Medicine row in prescription builder ──
const MedicineRow = ({ index, register, errors, watch, onRemove }) => {
  const categoryOptions = MEDICINE_CATEGORIES.map((c) => ({
    value: c,
    label: c,
  }))

  const potencyOptions = [
    { value: "6C",   label: "6C" },
    { value: "30C",  label: "30C" },
    { value: "200C", label: "200C" },
    { value: "1M",   label: "1M" },
    { value: "10M",  label: "10M" },
    { value: "CM",   label: "CM" },
    { value: "Q",    label: "Q (Mother Tincture)" },
    { value: "LM1",  label: "LM1" },
    { value: "LM2",  label: "LM2" },
  ]

  // Watch the category for this specific medicine row
  const selectedCategory = watch(`medicines.${index}.medicine_category`) || "Oral Medicine"
  const fieldConfig = CATEGORY_FIELD_CONFIG[selectedCategory] || {
    potency: false,
    dosage: false,
    dosageLabel: ""
  }

  return (
    <div className="border border-slate-100 rounded-xl p-4 space-y-3 bg-slate-50/50">

      {/* Row header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-primary-600 uppercase tracking-wider">
          Medicine {index + 1}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="text-red-400 hover:text-red-600 transition-colors p-1"
          title="Remove medicine"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Name + Category */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Medicine Name"
          placeholder="e.g. Bryonia Alba / Jaborandi Oil"
          error={errors?.medicines?.[index]?.medicine_name?.message}
          {...register(`medicines.${index}.medicine_name`)}
        />
        <Select
          label="Category"
          options={categoryOptions}
          placeholder="Select category"
          error={errors?.medicines?.[index]?.medicine_category?.message}
          {...register(`medicines.${index}.medicine_category`)}
        />
      </div>

      {/* Price field — always shown */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Input
          label="Price (₹)"
          type="number"
          min="0"
          step="0.01"
          placeholder="e.g. 150"
          error={errors?.medicines?.[index]?.medicine_price?.message}
          {...register(`medicines.${index}.medicine_price`)}
        />

        {/* Potency — only for relevant categories */}
        {fieldConfig.potency ? (
          <Select
            label="Potency"
            options={potencyOptions}
            placeholder="Select"
            error={errors?.medicines?.[index]?.potency?.message}
            {...register(`medicines.${index}.potency`)}
          />
        ) : (
          <div className="flex items-end pb-2">
            <span className="text-xs text-slate-400 italic">
              Potency not applicable for {selectedCategory}
            </span>
          </div>
        )}

        {/* Dosage — shown with dynamic label */}
        {fieldConfig.dosage ? (
          <Input
            label={fieldConfig.dosageLabel || "Dosage"}
            placeholder={
              fieldConfig.potency
                ? "e.g. 4 pills"
                : "e.g. Apply thin layer"
            }
            error={errors?.medicines?.[index]?.dosage?.message}
            {...register(`medicines.${index}.dosage`)}
          />
        ) : (
          selectedCategory !== "Oral Medicine" && (
            <div className="flex items-end pb-2">
              <span className="text-xs text-slate-400 italic">
                {selectedCategory === "Hair Shampoo"
                  ? "Use as directed"
                  : "Apply as needed"}
              </span>
            </div>
          )
        )}
      </div>

      {/* Frequency + Duration — always shown */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Frequency"
          placeholder={
            fieldConfig.potency
              ? "e.g. 3 times a day"
              : "e.g. Once daily"
          }
          error={errors?.medicines?.[index]?.frequency?.message}
          {...register(`medicines.${index}.frequency`)}
        />
        <Input
          label="Duration"
          placeholder="e.g. 7 days / 2 weeks"
          error={errors?.medicines?.[index]?.duration?.message}
          {...register(`medicines.${index}.duration`)}
        />
      </div>

      {/* Instructions — always shown */}
      <Input
        label="Instructions (optional)"
        placeholder={
          fieldConfig.potency
            ? "e.g. 30 min before meals"
            : "e.g. Apply on damp hair, leave for 5 mins"
        }
        {...register(`medicines.${index}.instructions`)}
      />
    </div>
  )
}

// ── Edit existing prescription ──
const EditPrescriptionForm = ({
  prescription,
  consultationId,
  onSuccess,
}) => {
  const updateMutation = useUpdatePrescription()

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {
      consultation_fee:  prescription.consultation_fee || 0,
      delivery_charges:  prescription.delivery_charges || 0,
      doctor_notes:      prescription.doctor_notes || "",
      medicines: prescription.items?.map((item) => ({
        medicine_name:     item.medicine_name,
        medicine_category: item.medicine_category,
        medicine_price:    item.medicine_price || 0,
        potency:           item.potency || "",
        dosage:            item.dosage || "",
        frequency:         item.frequency || "",
        duration:          item.duration || "",
        instructions:      item.instructions || "",
      })) || [
        {
          medicine_name: "", medicine_category: "Oral Medicine",
          medicine_price: 0, potency: "", dosage: "",
          frequency: "", duration: "", instructions: "",
        }
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "medicines",
  })

  const watchedMedicines = watch("medicines")
  const consultationFee  = Number(watch("consultation_fee")) || 0
  const deliveryCharges  = Number(watch("delivery_charges")) || 0
  const medicinesTotal   = watchedMedicines.reduce(
    (sum, m) => sum + (Number(m.medicine_price) || 0), 0
  )
  const totalAmount = consultationFee + medicinesTotal + deliveryCharges

  const onSubmit = async (data) => {
    const finalTotal =
      Number(data.consultation_fee) +
      data.medicines.reduce((s, m) => s + (Number(m.medicine_price) || 0), 0) +
      Number(data.delivery_charges)

    await updateMutation.mutateAsync({
      id: prescription.id,
      data: {
        consultation_fee:  Number(data.consultation_fee),
        delivery_charges:  Number(data.delivery_charges),
        total_amount:      finalTotal,
        doctor_notes:      data.doctor_notes || null,
        medicines:         data.medicines.map((m) => ({
          ...m,
          medicine_price: Number(m.medicine_price) || 0,
          potency:        m.potency || null,
          dosage:         m.dosage || null,
        })),
      },
    })
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <p className="text-xs text-amber-700">
          Editing prescription — patient has not paid yet.
          Changes will update the amount shown to the patient.
        </p>
      </div>

      <Card>
        {/* Fee fields */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Input
            label="Consultation Fee (₹)"
            type="number" min="0" step="0.01"
            {...register("consultation_fee")}
          />
          <Input
            label="Delivery Charges (₹)"
            type="number" min="0" step="0.01"
            {...register("delivery_charges")}
          />
        </div>

        {/* Medicines */}
        <div className="space-y-4 mb-4">
          {fields.map((field, index) => (
            <MedicineRow
              key={field.id}
              index={index}
              register={register}
              errors={errors}
              watch={watch}
              onRemove={() => fields.length > 1 && remove(index)}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => append({
            medicine_name: "", medicine_category: "Oral Medicine",
            medicine_price: 0, potency: "", dosage: "",
            frequency: "", duration: "", instructions: "",
          })}
          className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-primary-300 hover:text-primary-600 transition-all flex items-center justify-center gap-2 mb-4"
        >
          <Plus className="w-4 h-4" />
          Add Medicine
        </button>

        {/* Live total */}
        <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-100">
          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
            Updated Total
          </p>
          <div className="space-y-1.5">
            {consultationFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Consultation Fee</span>
                <span>{formatCurrency(consultationFee)}</span>
              </div>
            )}
            {watchedMedicines.map((m, i) =>
              m.medicine_name ? (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-slate-500 truncate max-w-[200px]">
                    {m.medicine_name}
                  </span>
                  <span>{formatCurrency(Number(m.medicine_price) || 0)}</span>
                </div>
              ) : null
            )}
            {deliveryCharges > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Delivery</span>
                <span>{formatCurrency(deliveryCharges)}</span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold">
              <span>New Total</span>
              <span className="text-primary-800">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Doctor notes */}
        <div className="space-y-1 mb-5">
          <label className="block text-sm font-medium text-slate-700">
            Doctor's Notes
          </label>
          <textarea
            rows={3}
            className="input resize-none"
            {...register("doctor_notes")}
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          loading={updateMutation.isPending}
          className="w-full py-3"
        >
          <Edit2 className="w-4 h-4" />
          Save Updated Prescription
        </Button>
      </Card>
    </form>
  )
}

// ── Prescription Builder ──
const PrescriptionBuilder = ({ consultationId, onSuccess }) => {
  const createMutation = useCreatePrescription()

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {
      consultation_fee: 200,
      delivery_charges: 50,
      doctor_notes: "",
      medicines: [
        {
          medicine_name: "",
          medicine_category: "Oral Medicine",
          medicine_price: 0,
          potency: "",
          dosage: "",
          frequency: "",
          duration: "",
          instructions: "",
        },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "medicines",
  })

  // Watch all values for live total calculation
  const watchedMedicines = watch("medicines")
  const consultationFee = Number(watch("consultation_fee")) || 0
  const deliveryCharges = Number(watch("delivery_charges")) || 0

  // Sum each medicine's individual price
  const medicinesTotal = watchedMedicines.reduce(
    (sum, m) => sum + (Number(m.medicine_price) || 0),
    0
  )
  const totalAmount = consultationFee + medicinesTotal + deliveryCharges

  // Use AI suggestion — fills medicine row
  const handleUseSuggestion = (suggestion) => {
    const emptyIndex = watchedMedicines.findIndex(
      (m) => !m.medicine_name
    )

    const newMed = {
      medicine_name: suggestion.medicine,
      medicine_category: "Oral Medicine",
      medicine_price: 0,
      potency: suggestion.potency || "30C",
      dosage: suggestion.dosage || "4 pills",
      frequency: suggestion.frequency || "3 times a day",
      duration: "7 days",
      instructions: "",
    }

    if (emptyIndex >= 0) {
      Object.entries(newMed).forEach(([key, val]) => {
        setValue(`medicines.${emptyIndex}.${key}`, val)
      })
    } else {
      append(newMed)
    }
    toast.success(`"${suggestion.medicine}" added to prescription`)
  }

  const onSubmit = async (data) => {
    // Compute final total from actual medicine prices
    const finalMedicinesTotal = data.medicines.reduce(
      (sum, m) => sum + (Number(m.medicine_price) || 0),
      0
    )
    const finalTotal =
      Number(data.consultation_fee) +
      finalMedicinesTotal +
      Number(data.delivery_charges)

    await createMutation.mutateAsync({
      consultation_id: consultationId,
      consultation_fee: Number(data.consultation_fee),
      delivery_charges: Number(data.delivery_charges),
      total_amount: finalTotal,
      doctor_notes: data.doctor_notes,
      medicines: data.medicines.map((m) => ({
        ...m,
        medicine_price: Number(m.medicine_price) || 0,
        // Send null for empty optional fields
        potency: m.potency || null,
        dosage: m.dosage || null,
      })),
    })
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

      {/* AI tools */}
      <AISummaryCard consultationId={consultationId} />
      <AIMedicinesCard
        consultationId={consultationId}
        onUseSuggestion={handleUseSuggestion}
      />

      {/* Prescription form */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Write Prescription
        </h3>

        {/* Fee fields */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <Input
            label="Consultation Fee (₹)"
            type="number"
            min="0"
            step="0.01"
            error={errors.consultation_fee?.message}
            {...register("consultation_fee")}
          />
          <Input
            label="Delivery Charges (₹)"
            type="number"
            min="0"
            step="0.01"
            error={errors.delivery_charges?.message}
            {...register("delivery_charges")}
          />
        </div>

        {/* Medicines */}
        <div className="space-y-4 mb-4">
          {fields.map((field, index) => (
            <MedicineRow
              key={field.id}
              index={index}
              register={register}
              errors={errors}
              watch={watch}
              onRemove={() => fields.length > 1 && remove(index)}
            />
          ))}
        </div>

        {/* Add medicine */}
        <button
          type="button"
          onClick={() =>
            append({
              medicine_name: "",
              medicine_category: "Oral Medicine",
              medicine_price: 0,
              potency: "",
              dosage: "",
              frequency: "",
              duration: "",
              instructions: "",
            })
          }
          className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm font-medium text-slate-400 hover:border-primary-300 hover:text-primary-600 transition-all flex items-center justify-center gap-2 mb-4"
        >
          <Plus className="w-4 h-4" />
          Add Another Medicine
        </button>

        {/* Live total preview */}
        <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-100">
          <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">
            Amount Patient Will Pay
          </p>
          <div className="space-y-2">
            {consultationFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Consultation Fee</span>
                <span className="font-medium">
                  {formatCurrency(consultationFee)}
                </span>
              </div>
            )}

            {/* Per-medicine breakdown */}
            {watchedMedicines.map((m, i) => (
              m.medicine_name && (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-slate-500">
                    {m.medicine_name || `Medicine ${i + 1}`}
                    {m.medicine_category && (
                      <span className="text-slate-300 ml-1">
                        ({m.medicine_category})
                      </span>
                    )}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(Number(m.medicine_price) || 0)}
                  </span>
                </div>
              )
            ))}

            {deliveryCharges > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Delivery</span>
                <span className="font-medium">
                  {formatCurrency(deliveryCharges)}
                </span>
              </div>
            )}

            {/* Total */}
            <div className="border-t border-slate-200 pt-2 flex justify-between">
              <span className="text-sm font-bold text-slate-800">
                Total
              </span>
              <span className="text-lg font-bold text-primary-800">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Doctor notes */}
        <div className="space-y-1 mb-5">
          <label className="block text-sm font-medium text-slate-700">
            Doctor's Notes{" "}
            <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            rows={3}
            placeholder="e.g. Avoid cold water and spicy food. Rest well."
            className="input resize-none"
            {...register("doctor_notes")}
          />
        </div>

        {/* Submit */}
        <Button
          type="submit"
          variant="primary"
          loading={createMutation.isPending}
          className="w-full py-3 text-base"
        >
          <Send className="w-4 h-4" />
          Send Prescription to Patient
        </Button>
        <p className="text-xs text-center text-slate-400 mt-2">
          Patient will be notified to make payment once submitted.
        </p>
      </Card>
    </form>
  )
}

const MarkPaidSection = ({ consultationId }) => {
  const markPaidMutation = useMarkOrderPaid()
  const [showConfirm, setShowConfirm] = useState(false)
  const { data: orders } = useQuery({
    queryKey: ["doctor-orders"],
    queryFn: async () => {
      const res = await doctorApi.getOrders()
      return Array.isArray(res.data) ? res.data : []
    },
  })

  const order = orders?.find(
    (o) => o.consultation_id === consultationId &&
           o.order_status === "awaiting_payment"
  )

  if (!order) return null

  return (
    <>
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CreditCard className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">
              Patient paid offline?
            </p>
            <p className="text-xs text-green-600">
              Mark payment as received if patient paid in person (cash/UPI).
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={() => setShowConfirm(true)}
          className="text-sm text-green-700 border-green-300 hover:bg-green-100 flex-shrink-0"
        >
          <CheckCircle2 className="w-4 h-4" />
          Mark Paid
        </Button>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={async () => {
          await markPaidMutation.mutateAsync(order.id)
          setShowConfirm(false)
        }}
        title="Confirm Offline Payment?"
        message={`Mark ${formatCurrency(order.total_amount)} as received offline. This will reveal the full prescription to the patient.`}
        confirmLabel="Yes, Mark as Paid"
        loading={markPaidMutation.isPending}
        variant="primary"
      />
    </>
  )
}

const PatientHistoryCard = ({ patientId, currentConsultationId }) => {
  const { data: history = [] } = usePatientHistory(
    patientId, currentConsultationId
  )

  if (history.length === 0) return null

  return (
    <Card>
      <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
        <ClipboardList className="w-4 h-4" />
        Past Consultations ({history.length})
      </h3>
      <div className="space-y-2">
        {history.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50"
          >
            <span className="text-slate-700 font-medium">
              {c.ailment_name}
            </span>
            <div className="flex items-center gap-2">
              <Badge status={c.status} />
              <span className="text-slate-400">
                {formatDate(c.submitted_at)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ── Main Case Review Page ──
const CaseReviewPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [prescribed, setPrescribed] = useState(false)
  const [requestingFeedback, setRequestingFeedback] = useState(false)
  const { letterheadRef, generating, generatePDF } = usePrescriptionPDF()

  const { data: caseData, isLoading, error } = useDoctorCase(id)

  const [editingPrescription, setEditingPrescription] = useState(false)

  // Fetch prescription for letterhead
  const { data: prescriptionData, refetch: refetchPrescription } = useQuery({
    queryKey: ["doctor-prescription", id],
    queryFn: async () => {
      const res = await doctorApi.getPrescriptionByConsultation(id)
      return res.data
    },
    enabled: !!id && (
      caseData?.status === "prescription_added" ||
      caseData?.status === "closed" ||
      prescribed
    ),
    retry: false,
  })

  const handleRequestFeedback = async () => {
    setRequestingFeedback(true)
    try {
      await doctorApi.requestFeedback(id)
      toast.success("Feedback request sent to patient!")
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
        "Failed to send feedback request"
      )
    } finally {
      setRequestingFeedback(false)
    }
  }

  // Also add this effect to refetch after prescription is created:
  useEffect(() => {
    if (prescribed) {
      refetchPrescription()
    }
  }, [prescribed])

  if (isLoading) return <PageSpinner />

  if (error || !caseData) {
    return (
      <div className="page-container">
        <div className="text-center py-16">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-slate-500 mb-4">Case not found</h3>
          <Button
            variant="secondary"
            onClick={() => navigate("/doctor/queue")}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Queue
          </Button>
        </div>
      </div>
    )
  }

  const alreadyPrescribed =
    caseData.status === "prescription_added" ||
    caseData.status === "closed"

  return (
    <div className="page-container max-w-5xl mx-auto">

      {/* Back */}
      <button
        onClick={() => navigate("/doctor/queue")}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Queue
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-slate-900">{caseData.ailment_name}</h1>
            <Badge status={caseData.status} />
          </div>
          <p className="text-slate-500 text-sm">
            {caseData.patient_name} · {caseData.member_name} ·{" "}
            {formatDate(caseData.submitted_at)}
          </p>
          {caseData?.status === "closed" && (
            <Button
              variant="secondary"
              onClick={handleRequestFeedback}
              loading={requestingFeedback}
              className="text-sm"
            >
              <MessageSquare className="w-4 h-4" />
              Request Feedback
            </Button>
          )}
        </div>
        {/* Add print button when prescription exists */}
        {(alreadyPrescribed || prescribed) && (
          <Button
            variant="secondary"
            onClick={() =>
              generatePDF(
                caseData.member_name,
                id
              )
            }
            loading={generating}
            className="flex-shrink-0"
          >
            <Download className="w-4 h-4" />
            Print Prescription
          </Button>
        )}
      </div>

      {alreadyPrescribed && !prescribed && (
        <div className="lg:col-span-2 space-y-5">

        {/* Check if payment made */}
        {prescriptionData && !prescriptionData.is_paid ? (
          // Unpaid — allow editing
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    Prescription sent — Payment pending
                  </p>
                  <p className="text-xs text-amber-600">
                    Patient has not paid yet. You can edit the prescription.
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={() => setEditingPrescription(!editingPrescription)}
                className="text-sm flex-shrink-0"
              >
                <Edit2 className="w-4 h-4" />
                {editingPrescription ? "Cancel Edit" : "Edit Prescription"}
              </Button>
            </div>

            {editingPrescription && prescriptionData && (
              <EditPrescriptionForm
                prescription={prescriptionData}
                consultationId={id}
                onSuccess={() => {
                  setEditingPrescription(false)
                  refetchPrescription()
                }}
              />
            )}

            {/* Mark paid offline button */}
            {!editingPrescription && (
              <MarkPaidSection consultationId={id} />
            )}
          </>
        ) : (
          // Paid — locked
          <Card>
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 text-green-200 mx-auto mb-3" />
              <h3 className="text-slate-600 mb-2">
                Prescription Complete & Paid
              </h3>
              <p className="text-sm text-slate-400">
                Payment confirmed. Prescription is locked.
              </p>
            </div>
          </Card>
        )}
        </div>
      )}

      {/* Success notice */}
      {prescribed && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <Send className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">
              Prescription sent successfully!
            </p>
            <p className="text-xs text-green-600">
              Patient has been notified and can now make payment.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left — patient info */}
        <div className="space-y-5">
          <PatientInfoCard caseData={caseData} />
          <AilmentCard caseData={caseData} />
          
          {caseData.delivery_address && (
          <Card>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Delivery Address
            </h3>
            <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-0.5">
              <p className="font-semibold text-slate-800">
                {caseData.delivery_address.full_name}
              </p>
              <p className="text-slate-500">
                {caseData.delivery_address.phone}
              </p>
              <p className="text-slate-500 mt-1">
                {caseData.delivery_address.line1}
                {caseData.delivery_address.line2 &&
                `, ${caseData.delivery_address.line2}`}
              </p>
              <p className="text-slate-500">
                {caseData.delivery_address.city},{" "}
                {caseData.delivery_address.state} —{" "}
                {caseData.delivery_address.pincode}
              </p>
            </div>
          </Card>
          )}
          <FeedbackCard consultationId={id} />
          <PatientHistoryCard
            patientId={caseData.patient_id}
            currentConsultationId={id}
          />
          <QACard caseData={caseData} />
        </div>

        {/* Right — prescription builder */}
        <div className="lg:col-span-2">
          {!alreadyPrescribed ? (
            <PrescriptionBuilder
              consultationId={id}
              onSuccess={() => setPrescribed(true)}
            />
          ) : (
            <Card>
              <div className="text-center py-8">
                <Pill className="w-12 h-12 text-green-200 mx-auto mb-3" />
                <h3 className="text-slate-600 mb-2">
                  Prescription Complete
                </h3>
                <p className="text-sm text-slate-400">
                  This case has been prescribed. Waiting for patient
                  payment.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
      {/* Hidden letterhead for PDF generation */}
      {prescriptionData && (
        <div
          style={{
            position: "absolute",
            left: "-9999px",
            top: "0",
            zIndex: -1,
          }}
        >
          <PrescriptionLetterhead
            ref={letterheadRef}
            caseData={caseData}
            prescription={prescriptionData}
          />
        </div>
      )}
    </div>
  )
}

export default CaseReviewPage