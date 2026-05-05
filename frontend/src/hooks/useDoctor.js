import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"
import { doctorApi } from "../api/doctor.api"

export const useDoctorQueue = (status = null) => {
  return useQuery({
    queryKey: ["doctor-queue", status],
    queryFn: async () => {
      const res = await doctorApi.getQueue(status)
      return Array.isArray(res.data) ? res.data : []
    },
    refetchInterval: 60000,
    // Auto-refresh queue every minute
  })
}

export const useDoctorCase = (id) => {
  return useQuery({
    queryKey: ["doctor-case", id],
    queryFn: async () => {
      const res = await doctorApi.getCase(id)
      return res.data
    },
    enabled: !!id,
  })
}

export const useUpdateCaseStatus = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }) => doctorApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-queue"] })
      queryClient.invalidateQueries({ queryKey: ["doctor-case"] })
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to update status")
    },
  })
}

export const useAISummary = () => {
  return useMutation({
    mutationFn: (id) => doctorApi.getAISummary(id),
    onError: () => {
      toast.error("AI summary unavailable. Please review Q&A manually.")
    },
  })
}

export const useAIMedicines = () => {
  return useMutation({
    mutationFn: (id) => doctorApi.getAIMedicines(id),
    onError: () => {
      toast.error("AI suggestions unavailable. Please prescribe manually.")
    },
  })
}

export const useCreatePrescription = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => doctorApi.createPrescription(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-queue"] })
      queryClient.invalidateQueries({ queryKey: ["doctor-case"] })
      toast.success("Prescription created! Patient has been notified.")
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.detail || "Failed to create prescription"
      )
    },
  })
}

export const useDoctorOrders = (status = null) => {
  return useQuery({
    queryKey: ["doctor-orders", status],
    queryFn: async () => {
      const res = await doctorApi.getOrders(status)
      return Array.isArray(res.data) ? res.data : []
    },
  })
}

export const useDispatchOrder = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => doctorApi.dispatchOrder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-orders"] })
      toast.success("Order marked as dispatched! Patient notified.")
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to dispatch order")
    },
  })
}

export const useUpdatePrescription = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => doctorApi.updatePrescription(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-case"] })
      queryClient.invalidateQueries({ queryKey: ["prescription-full"] })
      toast.success("Prescription updated successfully!")
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.detail || "Failed to update prescription"
      )
    },
  })
}

export const useMarkOrderPaid = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => doctorApi.markOrderPaid(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-orders"] })
      queryClient.invalidateQueries({ queryKey: ["doctor-case"] })
      toast.success("Order marked as paid! Patient notified.")
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.detail || "Failed to mark as paid"
      )
    },
  })
}

export const usePatientHistory = (patientId, excludeId) => {
  return useQuery({
    queryKey: ["patient-history", patientId, excludeId],
    queryFn: async () => {
      const res = await doctorApi.getPatientHistory(patientId, excludeId)
      return Array.isArray(res.data) ? res.data : []
    },
    enabled: !!patientId,
  })
}