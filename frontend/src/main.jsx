import React from "react"
import ReactDOM from "react-dom/client"
import { RouterProvider } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { Toaster } from "react-hot-toast"

import { router } from "./routes"
import "./index.css"

// React Query client configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      // Retry once on failure — don't hammer a failing server
      staleTime: 1000 * 60 * 2,
      // Data is fresh for 2 minutes — won't refetch unnecessarily
      refetchOnWindowFocus: false,
      // Don't refetch when user switches browser tabs
    },
    mutations: {
      retry: 0,
      // Never retry mutations — don't double-submit forms
    },
  },
})

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#1E293B",
            color: "#F8FAFC",
            fontSize: "14px",
            borderRadius: "8px",
          },
          success: {
            iconTheme: { primary: "#059669", secondary: "#F8FAFC" },
          },
          error: {
            iconTheme: { primary: "#DC2626", secondary: "#F8FAFC" },
          },
        }}
      />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
)