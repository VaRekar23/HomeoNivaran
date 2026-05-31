import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"
import { familyApi } from "../api/family.api"

// Query key constant — used everywhere to identify this cache
const QUERY_KEY = ["family-members", "user-family"]

// ── Fetch all members ──
export const useFamilyMembers = () => {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await familyApi.getAll()
      const data = res.data
      return Array.isArray(data) ? data : []
    },
  })
}

// ── Create member ──
export const useCreateFamilyMember = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => familyApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success("Family member added successfully!")
    },
    onError: (error) => {
      const msg = error.response?.data?.detail || "Failed to add member"
      toast.error(msg)
    },
  })
}

// ── Update member ──
export const useUpdateFamilyMember = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }) => familyApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success("Family member updated successfully!")
    },
    onError: (error) => {
      const msg = error.response?.data?.detail || "Failed to update member"
      toast.error(msg)
    },
  })
}

// ── Delete member ──
export const useDeleteFamilyMember = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id) => familyApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success("Family member removed successfully!")
    },
    onError: (error) => {
      const msg = error.response?.data?.detail || "Failed to remove member"
      toast.error(msg)
    },
  })
}