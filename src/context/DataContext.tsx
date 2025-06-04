"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";

export interface ServiceData {
  state_name: string;
  service_category: string;
  service_code: string;
  service_description?: string;
  modifier_1?: string;
  modifier_1_details?: string;
  modifier_2?: string;
  modifier_2_details?: string;
  modifier_3?: string;
  modifier_3_details?: string;
  modifier_4?: string;
  modifier_4_details?: string;
  rate: string;
  rate_effective_date: string;
  program: string;
  location_region: string;
  rate_per_hour?: string;
  duration_unit?: string;
  [key: string]: string | undefined;
}

interface FilterOptions {
  serviceCategories: string[];
  states: string[];
  serviceCodes: string[];
  serviceDescriptions: string[];
  programs: string[];
  locationRegions: string[];
  providerTypes: string[];
}

interface DataContextType {
  data: ServiceData[];
  loading: boolean;
  error: string | null;
  filterOptions: FilterOptions;
  refreshData: (filters?: Record<string, string>) => Promise<void>;
  refreshFilters: (serviceCategory?: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    serviceCategories: [],
    states: [],
    serviceCodes: [],
    serviceDescriptions: [],
    programs: [],
    locationRegions: [],
    providerTypes: []
  });
  const { isAuthenticated } = useKindeBrowserClient();

  const buildQueryString = (filters: Record<string, string>) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    return params.toString();
  };

  // New function to fetch only filter options
  const refreshFilters = useCallback(async (serviceCategory?: string) => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      const filters: Record<string, string> = { mode: 'filters' };
      if (serviceCategory) {
        filters.serviceCategory = serviceCategory;
      }
      
      const queryString = buildQueryString(filters);
      const response = await fetch(`/api/state-payment-comparison?${queryString}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch filter options');
      }

      const result = await response.json();
      setFilterOptions(result.filterOptions);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching filter options:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Updated function to fetch data
  const refreshData = useCallback(async (filters: Record<string, string> = {}) => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      const queryString = buildQueryString(filters);
      const response = await fetch(`/api/state-payment-comparison?${queryString}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const result = await response.json();
      setData(result.data);
      setFilterOptions(prev => ({
        ...prev,
        ...result.filterOptions
      }));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Initial load - only fetch filter options
  useEffect(() => {
    refreshFilters();
  }, [refreshFilters]);

  return (
    <DataContext.Provider value={{
      data,
      loading,
      error,
      filterOptions,
      refreshData,
      refreshFilters
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
} 