import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Brain, Send } from "lucide-react"
import toast from "react-hot-toast"

import { PageSpinner } from "../../components/ui/Spinner"
import Button from "../../components/ui/Button"
import Step3_Questions from "../../components/patient/ConsultationWizard/Step3_Questions"
import { consultationsApi } from "../../api/consultations.api"
import { useSubmitAnswers } from "../../hooks/useConsultations"

const AnswerQuestionsPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [answers, setAnswers] = useState({})
  const submitMutation = useSubmitAnswers()

  const { data: consultation, isLoading } = useQuery({
    queryKey: ["consultation-questions", id],
    queryFn: async () => {
      const res = await consultationsApi.getQuestionsForAnswering(id)
      return res.data
    },
    enabled: !!id,
  })

  if (isLoading) return <PageSpinner />

  if (!consultation) {
    return (
      <div className="page-container">
        <div className="text-center py-16">
          <p className="text-slate-400">Consultation not found</p>
          <Button
            variant="secondary"
            onClick={() => navigate("/patient/consultations")}
            className="mt-4"
          >
            Back to Consultations
          </Button>
        </div>
      </div>
    )
  }

  const questions = consultation.questions || []
  const allAnswered = questions.every(
    (q) => (answers[q.id] || q.answer_text || "").trim()
  )

  // Pre-fill existing answers
  const mergedAnswers = { ...answers }
  questions.forEach((q) => {
    if (q.answer_text && !mergedAnswers[q.id]) {
      mergedAnswers[q.id] = q.answer_text
    }
  })

  const handleSubmit = async () => {
    const formatted = questions.map((q) => ({
      question_id:  q.id,
      answer_text:  mergedAnswers[q.id] || "",
    }))
    try {
      await submitMutation.mutateAsync({
        consultationId: id,
        answers: formatted,
      })
      toast.success(
        "Answers submitted! The doctor will review your case shortly."
      )
      navigate(`/patient/consultations/${id}`)
    } catch {
      // error handled by mutation
    }
  }

  return (
    <div className="page-container max-w-3xl mx-auto">
      <button
        onClick={() => navigate("/patient/consultations")}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Consultations
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
          <Brain className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-slate-900">Complete Your Answers</h1>
          <p className="text-slate-500 text-sm">
            Please answer all questions so the doctor can review
            your case.
          </p>
        </div>
      </div>

      <div className="card p-6 mb-6">
        <Step3_Questions
          consultation={{ ...consultation, questions }}
          answers={mergedAnswers}
          onAnswerChange={(qId, val) =>
            setAnswers((prev) => ({ ...prev, [qId]: val }))
          }
        />
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={() => navigate("/patient/consultations")}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!allAnswered}
          loading={submitMutation.isPending}
          className="py-3"
        >
          <Send className="w-4 h-4" />
          Submit Answers to Doctor
        </Button>
      </div>
    </div>
  )
}

export default AnswerQuestionsPage