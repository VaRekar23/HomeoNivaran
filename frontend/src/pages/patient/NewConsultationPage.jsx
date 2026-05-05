import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, ArrowRight, Send, Loader2 } from "lucide-react"
import toast from "react-hot-toast"

import WizardProgress from "../../components/patient/ConsultationWizard/WizardProgress"
import Step1_Member from "../../components/patient/ConsultationWizard/Step1_Member"
import Step2_Ailment from "../../components/patient/ConsultationWizard/Step2_Ailment"
import Step3_Questions from "../../components/patient/ConsultationWizard/Step3_Questions"
import Step4_Review from "../../components/patient/ConsultationWizard/Step4_Review"
import Step4_Address from "../../components/patient/ConsultationWizard/Step4_Address"
import Button from "../../components/ui/Button"
import {
  useCreateConsultation,
  useSubmitAnswers,
} from "../../hooks/useConsultations"

import { useSearchParams } from "react-router-dom"
import { useEffect } from "react"
import { useFamilyMembers } from "../../hooks/useFamilyMembers"
import { useAilments } from "../../hooks/useAilments"

const TOTAL_STEPS = 5

const NewConsultationPage = () => {
  const navigate = useNavigate()

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1)

  // Selected data
  const [selectedMember, setSelectedMember] = useState(null)
  const [selectedAilment, setSelectedAilment] = useState(null)
  const [selectedAddress, setSelectedAddress] = useState(null)

  // Consultation created after step 2
  const [consultation, setConsultation] = useState(null)

  // Answers: { questionId: answerText }
  const [answers, setAnswers] = useState({})

  // Mutations
  const createMutation = useCreateConsultation()
  const submitMutation = useSubmitAnswers()

  //Followup Consultation
  const [searchParams] = useSearchParams()
  const followupMemberId = searchParams.get("followup_member")
  const followupAilmentId = searchParams.get("followup_ailment")

  const { data: membersData } = useFamilyMembers()
  const { data: ailmentsData } = useAilments()
  const members = Array.isArray(membersData) ? membersData : []
  const ailments = Array.isArray(ailmentsData) ? ailmentsData : []

  // ── Navigation helpers ──
  useEffect(() => {
    if (followupMemberId && members.length > 0) {
      const member = members.find((m) => m.id === followupMemberId)
      if (member) {
        setSelectedMember(member)
        setCurrentStep(2)
      }
    }
  }, [followupMemberId, members])

  useEffect(() => {
    if (followupAilmentId && ailments.length > 0 && currentStep === 2) {
      const ailment = ailments.find((a) => a.id === followupAilmentId)
      if (ailment) {
        setSelectedAilment(ailment)
      }
    }
  }, [followupAilmentId, ailments, currentStep])

  const canProceed = () => {
    if (currentStep === 1) return !!selectedMember
    if (currentStep === 2) return !!selectedAilment
    if (currentStep === 4) {
      const questions = consultation?.questions || []
      if (questions.length === 0) return false
      // All questions must be answered
      return questions.every(
        (q) => answers[q.id] && answers[q.id].trim()
      )
    }
    if (currentStep === 3) return !!selectedAddress
    if (currentStep === 5) return true
    return false
  }

  const handleNext = async () => {
    if (currentStep === 3) {
      await handleCreateConsultation()
    } else if (currentStep === 5) {
      await handleSubmit()
    } else {
      setCurrentStep((s) => s + 1)
    }
  }

  const handleBack = () => {
    if (currentStep === 1) {
      navigate("/patient/consultations")
    } else if (currentStep === 3) {
      setConsultation(null)
      setAnswers({})
      setCurrentStep(2)
    } else {
      setCurrentStep((s) => s - 1)
    }
  }

  // ── Create consultation and get AI questions ──
  const handleCreateConsultation = async () => {
    try {
      const res = await createMutation.mutateAsync({
        member_id: selectedMember.id,
        ailment_id: selectedAilment.id,
        address_id: selectedAddress.id,
      })
      setConsultation(res.data)
      setCurrentStep(4)
      toast.success(
        `${res.data.questions?.length || 0} questions generated!`
      )
    } catch {
      // Error handled by mutation onError
    }
  }

  // ── Submit all answers ──
  const handleSubmit = async () => {
    const questions = consultation?.questions || []
    const formattedAnswers = questions.map((q) => ({
      question_id: q.id,
      answer_text: answers[q.id] || "",
    }))

    try {
      await submitMutation.mutateAsync({
        consultationId: consultation.id,
        answers: formattedAnswers,
      })

      toast.success(
        "Consultation submitted! The doctor will review your case shortly."
      )
      navigate(`/patient/consultations/${consultation.id}`)
    } catch {
      // Error handled by mutation onError
    }
  }

  // ── Answer change handler ──
  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  // ── Loading state during AI generation ──
  const isCreating = createMutation.isPending
  const isSubmitting = submitMutation.isPending

  return (
    <div className="page-container max-w-3xl mx-auto">

      {/* Page header */}
      <div className="mb-6">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {currentStep === 1 ? "Back to Consultations" : "Previous Step"}
        </button>
        <h1 className="text-slate-900">New Consultation</h1>
      </div>

      {/* Progress indicator */}
      <WizardProgress currentStep={currentStep} />

      {/* AI generating loading overlay */}
      {isCreating && (
        <div className="card p-12 text-center mb-6">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
          <h3 className="text-slate-800 mb-2">
            Generating your questions...
          </h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">
            Our AI is preparing personalised clinical questions based
            on {selectedMember?.name}'s age, gender, and the condition.
            This takes a few seconds.
          </p>
        </div>
      )}

      {/* Step content */}
      {!isCreating && (
        <div className="card p-6 mb-6">
          {currentStep === 1 && (
            <Step1_Member
              selectedMemberId={selectedMember?.id}
              onSelect={(member) => {
                setSelectedMember(member)
                setCurrentStep(2)
              }}
            />
          )}

          {currentStep === 2 && (
            <Step2_Ailment
              selectedAilmentId={selectedAilment?.id}
              onSelect={(ailment) => {
                setSelectedAilment(ailment)
              }}
            />
          )}

          {currentStep === 3 && (
            <Step4_Address
              selectedAddressId={selectedAddress?.id}
              onSelect={(address) => setSelectedAddress(address)}
            />
          )}

          {currentStep === 4 && consultation && (
            <Step3_Questions
              consultation={consultation}
              answers={answers}
              onAnswerChange={handleAnswerChange}
            />
          )}

          {currentStep === 5 && (
            <Step4_Review
              member={selectedMember}
              ailment={selectedAilment}
              address={selectedAddress}
              questions={consultation?.questions || []}
              answers={answers}
            />
          )}
        </div>
      )}

      {/* Navigation buttons */}
      {!isCreating && (
        <div className="flex items-center justify-between">

          <Button
            variant="secondary"
            onClick={handleBack}
          >
            <ArrowLeft className="w-4 h-4" />
            {currentStep === 1 ? "Cancel" : "Back"}
          </Button>

          {/* Step 1 — auto-advances on selection, no Next button */}
          {currentStep === 1 && (
            <p className="text-xs text-slate-400">
              Select a member to continue
            </p>
          )}

          {/* Step 2 — show Next only when ailment selected */}
          {currentStep === 2 && (
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={!canProceed()}
              loading={isCreating}
            >
              Select Address
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}

          {currentStep === 3 && (
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={!canProceed()}
              loading={isCreating}
            >
              Generate Questions
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}

          {/* Step 3 — Next to review */}
          {currentStep === 4 && (
            <div className="flex items-center gap-3">
              {!canProceed() && (
                <p className="text-xs text-amber-500">
                  Answer all questions to continue
                </p>
              )}
              <Button
                variant="primary"
                onClick={() => setCurrentStep(5)}
                disabled={!canProceed()}
              >
                Review Answers
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Step 4 — Submit */}
          {currentStep === 5 && (
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={isSubmitting}
            >
              <Send className="w-4 h-4" />
              Submit to Doctor
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default NewConsultationPage