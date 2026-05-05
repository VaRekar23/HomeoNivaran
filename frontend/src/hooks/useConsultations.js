import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"
import { consultationsApi } from "../api/consultations.api"

const QUERY_KEY = ["consultations"]

export const useConsultations = () => {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await consultationsApi.getAll()
      return Array.isArray(res.data) ? res.data : []
    },
  })
}

export const useConsultation = (id) => {
  return useQuery({
    queryKey: ["consultations", id],
    queryFn: async () => {
      const res = await consultationsApi.getById(id)
      return res.data
    },
    enabled: !!id,
    retry: 1,
  })
}

export const useCreateConsultation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => consultationsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
    onError: (error) => {
      const msg =
        error.response?.data?.detail || "Failed to start consultation"
      toast.error(msg)
    },
  })
}

export const useSubmitAnswers = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ consultationId, answers }) =>
      consultationsApi.submitAnswers(consultationId, { answers }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
    onError: (error) => {
      const msg =
        error.response?.data?.detail || "Failed to submit answers"
      toast.error(msg)
    },
  })
}