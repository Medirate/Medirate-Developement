'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DataProvider } from "@/context/DataContext";
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <DataProvider>
        {children}
      </DataProvider>
    </QueryClientProvider>
  );
} 