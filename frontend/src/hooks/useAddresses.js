import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"
import { addressesApi } from "../api/addresses.api"

const QUERY_KEY = ["addresses"]

export const useAddresses = () => {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await addressesApi.getAll()
      return Array.isArray(res.data) ? res.data : []
    },
  })
}

export const useCreateAddress = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => addressesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success("Address saved!")
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.detail || "Failed to save address"
      )
    },
  })
}

export const useUpdateAddress = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => addressesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success("Address updated!")
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.detail || "Failed to update address"
      )
    },
  })
}

export const useDeleteAddress = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => addressesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success("Address removed!")
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.detail || "Failed to remove address"
      )
    },
  })
}

export const useSetDefaultAddress = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => addressesApi.setDefault(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success("Default address updated!")
    },
  })
}