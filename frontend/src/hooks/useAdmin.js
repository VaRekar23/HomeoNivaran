import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"
import { adminApi } from "../api/admin.api"
import { feedbackApi } from "../api/feedback.api"

export const useAdminLogs = (params = {}) => {
  return useQuery({
    queryKey: ["admin-logs", params],
    queryFn: async () => {
      const res = await adminApi.getLogs(params)
      return res.data
    },
  })
}

export const useCleanupLogs = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (days) => adminApi.cleanupLogs(days),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-logs"] })
      toast.success(res.data.message)
    },
    onError: () => toast.error("Cleanup failed"),
  })
}

export const useAdminUsers = (role = null) => {
  return useQuery({
    queryKey: ["admin-users", role],
    queryFn: async () => {
      const res = await adminApi.getUsers(role)
      return Array.isArray(res.data) ? res.data : []
    },
  })
}

export const useToggleUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => adminApi.toggleUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] })
      toast.success("User status updated!")
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to update user")
    },
  })
}

export const useAdminFeedback = (params = {}) => {
  return useQuery({
    queryKey: ["admin-feedback", params],
    queryFn: async () => {
      const res = await feedbackApi.getAll(params)
      return Array.isArray(res.data) ? res.data : []
    },
  })
}

export const useUpdateFeedback = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => feedbackApi.updateStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-feedback"] })
      toast.success("Feedback updated!")
    },
    onError: () => toast.error("Failed to update feedback"),
  })
}

export const useSubmitFeedback = () => {
  return useMutation({
    mutationFn: (data) => feedbackApi.submit(data),
    onSuccess: () => toast.success("Feedback submitted! Thank you."),
    onError: () => toast.error("Failed to submit feedback"),
  })
}

export const useChangeUserRole = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, role }) => adminApi.changeUserRole(id, role),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] })
      toast.success(res.data.message)
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.detail || "Failed to change role"
      )
    },
  })
}

export const useAdminOrders = (status = null) => {
  return useQuery({
    queryKey: ["admin-orders", status],
    queryFn: async () => {
      const res = await adminApi.getOrders(status)
      return Array.isArray(res.data) ? res.data : []
    },
  })
}

export const useAdminDispatchOrder = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => adminApi.dispatchOrder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] })
      toast.success("Order dispatched!")
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Dispatch failed")
    },
  })
}

export const useMarkDelivered = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => adminApi.markDelivered(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] })
      toast.success("Order marked as delivered!")
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.detail || "Failed to mark delivered"
      )
    },
  })
}

export const useAppHealth = () => {
  return useQuery({
    queryKey: ["app-health"],
    queryFn: async () => {
      const res = await adminApi.getHealth()
      return res.data
    },
    refetchInterval: 60000,
  })
}

export const useUnlockUser = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId) => adminApi.unlockUser(userId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] })
      toast.success(res.data.message || "Account unlocked successfully")
    },
    onError: (e) => {
      toast.error(
        e.response?.data?.detail || "Failed to unlock account"
      )
    },
  })
}