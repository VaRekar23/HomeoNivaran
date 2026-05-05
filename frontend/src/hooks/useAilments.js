import { useQuery } from "@tanstack/react-query"
import { ailmentsApi } from "../api/ailments.api"

export const useAilments = (category = null) => {
  return useQuery({
    queryKey: ["ailments", category],
    queryFn: async () => {
      const res = await ailmentsApi.getAll(category)
      return Array.isArray(res.data) ? res.data : []
    },
    staleTime: 1000 * 60 * 10,
    // Ailments rarely change — cache for 10 minutes
  })
}

export const useAilmentCategories = () => {
  return useQuery({
    queryKey: ["ailment-categories"],
    queryFn: async () => {
      const res = await ailmentsApi.getCategories()
      return Array.isArray(res.data) ? res.data : []
    },
    staleTime: 1000 * 60 * 10,
  })
}

export const usePublicAilments = () => {
  return useQuery({
    queryKey: ["public-ailments"],
    queryFn: async () => {
      const res = await ailmentsApi.getPublicAilments()
      return Array.isArray(res.data) ? res.data : []
    },
    staleTime: 1000 * 60 * 10,
  })
}

export const usePublicAilmentCategories = () => {
  return useQuery({
    queryKey: ["public-ailment-categories"],
    queryFn: async () => {
      const res = await ailmentsApi.getAilmentCategories()
      return Array.isArray(res.data) ? res.data : []
    },
    staleTime: 1000 * 60 * 10,
  })
}