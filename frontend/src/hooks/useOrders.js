import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"
import { ordersApi } from "../api/orders.api"
import { paymentsApi } from "../api/payments.api"

const ORDERS_KEY = ["orders", "user-orders"]

export const useOrders = () => {
  return useQuery({
    queryKey: ORDERS_KEY,
    queryFn: async () => {
      const res = await ordersApi.getAll()
      return Array.isArray(res.data) ? res.data : []
    },
  })
}

export const useOrder = (id) => {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: async () => {
      const res = await ordersApi.getById(id)
      return res.data
    },
    enabled: !!id,
  })
}

export const useInitiatePayment = () => {
  return useMutation({
    mutationFn: (orderId) => paymentsApi.initiate(orderId),
    onError: (error) => {
      const msg =
        error.response?.data?.detail || "Failed to initiate payment"
      toast.error(msg)
    },
  })
}

export const useVerifyPayment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => paymentsApi.verify(data),
    onSuccess: () => {
      // Invalidate orders and consultations — both change on payment
      queryClient.invalidateQueries({ queryKey: ORDERS_KEY })
      queryClient.invalidateQueries({ queryKey: ["consultations"] })
      toast.success("Payment successful! Your order is confirmed.")
    },
    onError: (error) => {
      const msg =
        error.response?.data?.detail || "Payment verification failed"
      toast.error(msg)
    },
  })
}