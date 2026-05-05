import { useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  UserPlus,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  User,
  ClipboardList,
  ArrowRight,
  ArrowLeft,
  MapPin,
} from "lucide-react"
import toast from "react-hot-toast"
import { useNavigate } from "react-router-dom"

import Card from "../../components/ui/Card"
import Button from "../../components/ui/Button"
import Input from "../../components/ui/Input"
import Select from "../../components/ui/Select"
import { PageSpinner } from "../../components/ui/Spinner"
import { walkinApi } from "../../api/walkin.api"
import { useAilments } from "../../hooks/useAilments"
import { GENDER_OPTIONS, RELATION_OPTIONS } from "../../utils/constants"

// ── Step 1: Find or create patient ──
const PatientStep = ({ onSelect }) => {
  const [searchQuery, setSearchQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createdInfo, setCreatedInfo] = useState(null)

  const { register: regSearch, handleSubmit: handleSearch } =
    useForm()

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { name: "", phone: "", email: "" },
  })

  const onSearch = async (data) => {
    const query = data.query?.trim()
    if (!query || query.length < 2) {
      toast.error("Please enter at least 2 characters to search")
      return
    }
    setSearching(true)
    setSearched(false)
    try {
      const res = await walkinApi.searchPatients(data.query)
      setResults(Array.isArray(res.data) ? res.data : [])
      setSearched(true)
    } catch {
      toast.error("Search failed")
    } finally {
      setSearching(false)
    }
  }

  const onCreateWalkIn = async (data) => {
    setCreating(true)
    try {
      const res = await walkinApi.createWalkIn(data)
      const patient = res.data
      setCreatedInfo(patient)
      if (patient.already_existed) {
        toast.success(`Found existing patient: ${patient.name}`)
      } else {
        toast.success(`Patient account created!`)
      }
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Failed to create patient"
      )
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <h2 className="text-slate-900 mb-1">
        Find or Add Patient
      </h2>
      <p className="text-slate-500 text-sm mb-6">
        Search for an existing patient or create a new walk-in account.
      </p>

      {/* Search */}
      <Card className="mb-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">
          Search Existing Patient
        </h3>
        <form
          onSubmit={handleSearch(onSearch)}
          className="flex gap-2"
        >
          <input
            type="text"
            placeholder="Search by name, phone or email..."
            className="input flex-1"
            {...regSearch("query")}
          />
          <Button
            type="submit"
            variant="primary"
            loading={searching}
          >
            <Search className="w-4 h-4" />
            Search
          </Button>
        </form>

        {/* Results */}
        {searched && (
          <div className="mt-3 space-y-2">
            {results.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-3">
                No patients found. Create a new walk-in account below.
              </p>
            ) : (
              results.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelect(p)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-left"
                >
                  <div className="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center font-bold text-primary-700 text-sm flex-shrink-0">
                    {p.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {p.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {p.phone} · {p.email}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 ml-auto" />
                </button>
              ))
            )}
          </div>
        )}
      </Card>

      {/* Create walk-in */}
      <Card>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="w-full flex items-center justify-between"
        >
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary-600" />
            Create New Walk-in Patient
          </h3>
          <span className="text-xs text-primary-600">
            {showCreateForm ? "Cancel" : "Expand"}
          </span>
        </button>

        {showCreateForm && (
          <>
            {createdInfo ? (
              <div className="mt-4 space-y-3">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <p className="text-sm font-semibold text-green-800">
                      {createdInfo.already_existed
                        ? "Existing patient found"
                        : "Patient account created"}
                    </p>
                  </div>
                  <p className="text-sm text-green-700 mb-1">
                    <strong>{createdInfo.name}</strong> · {createdInfo.phone}
                  </p>
                  {!createdInfo.already_existed && (
                    <div className="bg-white rounded-lg p-3 mt-2">
                      <p className="text-xs text-slate-500 mb-1">
                        Temporary Password (share with patient):
                      </p>
                      <p className="text-sm font-mono font-bold text-slate-800">
                        {createdInfo.temp_password}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Patient can login and change this password.
                      </p>
                    </div>
                  )}
                </div>
                <Button
                  variant="primary"
                  onClick={() => onSelect(createdInfo)}
                  className="w-full"
                >
                  Continue with {createdInfo.name}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit(onCreateWalkIn)}
                className="mt-4 space-y-3"
              >
                <Input
                  label="Full Name"
                  placeholder="Patient's full name"
                  error={errors.name?.message}
                  {...register("name", { required: "Name is required" })}
                />
                <Input
                  label="Phone Number"
                  type="tel"
                  placeholder="10-digit mobile number"
                  error={errors.phone?.message}
                  {...register("phone", { required: "Phone is required" })}
                />
                <Input
                  label="Email (optional)"
                  type="email"
                  placeholder="patient@example.com"
                  {...register("email")}
                />
                <Button
                  type="submit"
                  variant="primary"
                  loading={creating}
                  className="w-full"
                >
                  <UserPlus className="w-4 h-4" />
                  Create Patient Account
                </Button>
              </form>
            )}
          </>
        )}
      </Card>
    </div>
  )
}

// ── Step 2: Create offline consultation ──
const offlineSchema = z.object({
  member_name:             z.string().min(2, "Name required"),
  member_dob:              z.string().min(1, "DOB required"),
  member_gender:           z.string().min(1, "Gender required"),
  member_relation:         z.string().min(1, "Relation required"),
  member_known_allergies:  z.string().optional(),
  ailment_id:              z.string().min(1, "Select ailment"),
  doctor_notes:            z.string().optional(),
  address: z.object({
    label:     z.string().min(1),
    full_name: z.string().min(2, "Name required"),
    phone:     z.string().regex(/^\d{10}$/, "10-digit phone required"),
    line1:     z.string().min(5, "Address required"),
    line2:     z.string().optional(),
    city:      z.string().min(2, "City required"),
    state:     z.string().min(2, "State required"),
    pincode:   z.string().regex(/^\d{6}$/, "6-digit pincode required"),
  }).optional(),
  qa_pairs: z.array(z.object({
    question: z.string().min(3, "Question required"),
    answer:   z.string().min(1, "Answer required"),
  })).min(1, "Add at least one Q&A"),
})

const ConsultationStep = ({ patient, onSuccess }) => {
  const [submitting, setSubmitting] = useState(false)
  const { data: ailmentsData = [] } = useAilments()

  const ailmentOptions = ailmentsData.map((a) => ({
    value: a.id,
    label: `${a.name} (${a.category})`,
  }))

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(offlineSchema),
    defaultValues: {
      member_name:    patient.name || "",
      member_dob:     "",
      member_gender:  "",
      member_relation:"self",
      qa_pairs: [{ question: "", answer: "" }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "qa_pairs",
  })

  const onSubmit = async (data) => {
    setSubmitting(true)
    try {
      const res = await walkinApi.createOfflineConsult({
        patient_id:             patient.id,
        member_name:            data.member_name,
        member_dob:             data.member_dob,
        member_gender:          data.member_gender,
        member_relation:        data.member_relation,
        member_known_allergies: data.member_known_allergies || null,
        ailment_id:             data.ailment_id,
        doctor_notes:           data.doctor_notes || null,
        qa_pairs:               data.qa_pairs,
      })
      toast.success("Offline consultation created!")
      onSuccess(res.data)
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
        "Failed to create consultation"
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <h2 className="text-slate-900 mb-1">
        Record Consultation
      </h2>
      <p className="text-slate-500 text-sm mb-4">
        For patient:{" "}
        <strong className="text-slate-800">{patient.name}</strong>{" "}
        ({patient.phone})
      </p>

      {/* Member details */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <User className="w-4 h-4" />
          Patient Member Details
        </h3>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <Input
            label="Member Name"
            placeholder="Who is this for?"
            error={errors.member_name?.message}
            {...register("member_name")}
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Date of Birth
            </label>
            <input
              type="date"
              max={new Date().toISOString().split("T")[0]}
              className={`input ${errors.member_dob ? "input-error" : ""}`}
              {...register("member_dob")}
            />
            {errors.member_dob && (
              <p className="text-xs text-red-500">
                {errors.member_dob.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <Select
            label="Gender"
            options={GENDER_OPTIONS}
            placeholder="Select gender"
            error={errors.member_gender?.message}
            {...register("member_gender")}
          />
          <Select
            label="Relation"
            options={RELATION_OPTIONS}
            placeholder="Select relation"
            error={errors.member_relation?.message}
            {...register("member_relation")}
          />
        </div>

        <Input
          label="Known Allergies (optional)"
          placeholder="e.g. Dust, pollen"
          {...register("member_known_allergies")}
        />
      </Card>

      {/* Ailment */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-700 mb-4">
          Condition
        </h3>
        <Select
          label="Select Ailment"
          options={ailmentOptions}
          placeholder="Choose the condition"
          error={errors.ailment_id?.message}
          {...register("ailment_id")}
        />
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Delivery Address (optional)
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Add patient's delivery address for medicine dispatch.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <Select
            label="Label"
            options={[
              { value: "Home",    label: "🏠 Home" },
              { value: "Office",  label: "🏢 Office" },
              { value: "Other",   label: "📍 Other" },
            ]}
            {...register("address.label")}
          />
          <Input
            label="Contact Name"
            placeholder="Name at address"
            {...register("address.full_name")}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <Input
            label="Phone"
            placeholder="10-digit number"
            {...register("address.phone")}
          />
          <Input
            label="Pincode"
            placeholder="6-digit pincode"
            {...register("address.pincode")}
          />
        </div>

        <Input
          label="Address Line 1"
          placeholder="House/Flat/Building"
          className="mb-3"
          {...register("address.line1")}
        />
        <Input
          label="Address Line 2 (optional)"
          placeholder="Street/Area/Landmark"
          className="mb-3"
          {...register("address.line2")}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="City"
            placeholder="e.g. Mumbai"
            {...register("address.city")}
          />
          <Input
            label="State"
            placeholder="e.g. Maharashtra"
            {...register("address.state")}
          />
        </div>
      </Card>

      {/* Q&A pairs */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <ClipboardList className="w-4 h-4" />
          Clinical Notes (Q&A)
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Record your clinical questions and the patient's answers.
          These become the case history.
        </p>

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="bg-slate-50 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary-600 uppercase tracking-wider">
                  Q&A {index + 1}
                </span>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Input
                label="Question"
                placeholder="e.g. How long have symptoms persisted?"
                error={errors.qa_pairs?.[index]?.question?.message}
                {...register(`qa_pairs.${index}.question`)}
              />
              <Input
                label="Patient's Answer"
                placeholder="e.g. About 2 weeks"
                error={errors.qa_pairs?.[index]?.answer?.message}
                {...register(`qa_pairs.${index}.answer`)}
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => append({ question: "", answer: "" })}
          className="mt-3 w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-primary-300 hover:text-primary-600 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Another Q&A
        </button>
      </Card>

      {/* Doctor notes */}
      <Card>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Doctor's Initial Notes (optional)
        </label>
        <textarea
          rows={3}
          placeholder="Any initial observations or notes..."
          className="input resize-none"
          {...register("doctor_notes")}
        />
      </Card>

      <Button
        type="submit"
        variant="primary"
        loading={submitting}
        className="w-full py-3 text-base"
      >
        <ClipboardList className="w-5 h-5" />
        Create Consultation Record
      </Button>
    </form>
  )
}

// ── Success Screen ──
const SuccessScreen = ({ result, onAnother }) => {
  const navigate = useNavigate()
  return (
    <div className="text-center py-12">
      <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="w-10 h-10 text-green-500" />
      </div>
      <h2 className="text-slate-900 mb-2">
        Consultation Recorded!
      </h2>
      <p className="text-slate-500 text-sm mb-2">
        {result.member_name}'s case for{" "}
        <strong>{result.ailment_name}</strong> has been created.
      </p>
      <p className="text-slate-400 text-xs mb-8">
        You can now write the prescription from the case review page.
      </p>
      <div className="flex flex-col gap-3 max-w-xs mx-auto">
        <Button
          variant="primary"
          onClick={() =>
            navigate(`/doctor/cases/${result.id}`)
          }
        >
          Go to Case Review
          <ArrowRight className="w-4 h-4" />
        </Button>
        <Button
          variant="secondary"
          onClick={onAnother}
        >
          Add Another Patient
        </Button>
      </div>
    </div>
  )
}

// ── Main Page ──
const AddPatientPage = () => {
  const [step, setStep] = useState(1)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [result, setResult] = useState(null)

  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient)
    setStep(2)
  }

  const handleSuccess = (consultResult) => {
    setResult(consultResult)
    setStep(3)
  }

  const handleAnother = () => {
    setStep(1)
    setSelectedPatient(null)
    setResult(null)
  }

  return (
    <div className="page-container max-w-3xl mx-auto">

      {/* Header */}
      {step < 3 && (
        <>
          <div className="flex items-center gap-3 mb-6">
            {step === 2 && (
              <button
                onClick={() => { setStep(1); setSelectedPatient(null) }}
                className="btn-ghost p-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h1 className="text-slate-900">Add Patient</h1>
              <p className="text-slate-400 text-xs">
                Step {step} of 2 —{" "}
                {step === 1
                  ? "Find or create patient"
                  : "Record consultation"}
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="flex gap-2 mb-6">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  s <= step
                    ? "bg-primary-600"
                    : "bg-slate-200"
                }`}
              />
            ))}
          </div>
        </>
      )}

      {step === 1 && (
        <PatientStep onSelect={handlePatientSelect} />
      )}
      {step === 2 && selectedPatient && (
        <ConsultationStep
          patient={selectedPatient}
          onSuccess={handleSuccess}
        />
      )}
      {step === 3 && result && (
        <SuccessScreen
          result={result}
          onAnother={handleAnother}
        />
      )}
    </div>
  )
}

export default AddPatientPage