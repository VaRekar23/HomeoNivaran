import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"
import { availabilityApi } from "../api/availability.api"

const DOCTOR_KEY  = ["doctor-availability"]
const PATIENT_KEY = ["availability"]

export const useMyAvailability = () => {
  return useQuery({
    queryKey: DOCTOR_KEY,
    queryFn: async () => {
      const res = await availabilityApi.getMySlots()
      return Array.isArray(res.data) ? res.data : []
    },
  })
}

export const usePublicAvailability = () => {
  return useQuery({
    queryKey: PATIENT_KEY,
    queryFn: async () => {
      const res = await availabilityApi.getAvailability()
      return Array.isArray(res.data) ? res.data : []
    },
  })
}

export const useAddSlot = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => availabilityApi.addSlot(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCTOR_KEY })
      toast.success("Availability slot added!")
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to add slot")
    },
  })
}

export const useDeleteSlot = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => availabilityApi.deleteSlot(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCTOR_KEY })
      toast.success("Slot removed!")
    },
  })
}