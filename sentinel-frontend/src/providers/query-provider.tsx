'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,       // 1 minute default
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }))
  
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
