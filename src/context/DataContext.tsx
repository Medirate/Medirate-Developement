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
  modifiers: { value: string; label: string }[];
}

interface DataContextType {
  data: ServiceData[];
  loading: boolean;
  error: string | null;
  filterOptions: FilterOptions;
  refreshData: (filters?: Record<string, string>) => Promise<{
    data: ServiceData[];
    totalCount: number;
    currentPage: number;
    itemsPerPage: number;
    filterOptions: {
      serviceCodes: string[];
      serviceDescriptions: string[];
      programs: string[];
      locationRegions: string[];
      providerTypes: string[];
      modifiers: { value: string; label: string }[];
      data: ServiceData[];
    };
  } | null>;
  refreshFilters: (serviceCategory?: string, state?: string, serviceCode?: string) => Promise<{
    filterOptions: FilterOptions & { data?: ServiceData[] };
  } | null>;
  fetchFeeScheduleDates: (state: string, serviceCategory: string, serviceCode: string) => Promise<string[]>;
  setData: (data: ServiceData[]) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setDataState] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    serviceCategories: [],
    states: [],
    serviceCodes: [],
    serviceDescriptions: [],
    programs: [],
    locationRegions: [],
    providerTypes: [],
    modifiers: []
  });
  const { isAuthenticated, isLoading } = useKindeBrowserClient();

  const buildQueryString = (filters: Record<string, string>) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    return params.toString();
  };

  // Enhanced fetch with authentication error handling and retry logic
  const authenticatedFetch = async (url: string, retryCount = 0): Promise<Response> => {
    const maxRetries = 2;
    
    try {
      const response = await fetch(url);
      
      // If unauthorized and we haven't exceeded retries
      if (response.status === 401 && retryCount < maxRetries) {
        console.warn(`Authentication failed, attempt ${retryCount + 1}/${maxRetries + 1}. Retrying...`);
        
        // Wait a moment before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Force a page refresh to re-authenticate if this is the last retry
        if (retryCount === maxRetries - 1) {
          console.error('Authentication failed after retries. Redirecting to login...');
          window.location.href = '/api/auth/login';
          throw new Error('Authentication required');
        }
        
        return authenticatedFetch(url, retryCount + 1);
      }
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      if (retryCount < maxRetries && !(error instanceof TypeError)) {
        console.warn(`Request failed, retrying... (${retryCount + 1}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return authenticatedFetch(url, retryCount + 1);
      }
      throw error;
    }
  };

  // Update refreshFilters to handle service code
  const refreshFilters = useCallback(async (serviceCategory?: string, state?: string, serviceCode?: string) => {
    // Don't make requests if not authenticated or still loading
    if (!isAuthenticated || isLoading) {
      console.log('🔄 Skipping filter refresh - authentication pending');
      return null;
    }

    try {
      setLoading(true);
      const filters: Record<string, string> = { mode: 'filters' };
      if (serviceCategory) filters.serviceCategory = serviceCategory;
      if (state) filters.state = state;
      if (serviceCode) filters.serviceCode = serviceCode;
      
      const queryString = buildQueryString(filters);
      const response = await authenticatedFetch(`/api/state-payment-comparison?${queryString}`);
      const result = await response.json();
      
      // Update filter options, preserving existing service codes if not provided in response
      setFilterOptions(prev => ({
        ...prev,
        ...result.filterOptions,
        serviceCodes: result.filterOptions.serviceCodes || prev.serviceCodes
      }));
      
      setError(null);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      console.error('Error fetching filter options:', err);
      
      // Don't set error for authentication issues - let the auth redirect handle it
      if (!errorMessage.includes('Authentication')) {
        setError(errorMessage);
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, isLoading]);

  // Updated function to fetch data
  const refreshData = useCallback(async (filters: Record<string, string> = {}) => {
    // Don't make requests if not authenticated or still loading
    if (!isAuthenticated || isLoading) {
      console.log('🔄 Skipping data refresh - authentication pending');
      return null;
    }

    try {
      setLoading(true);
      const queryString = buildQueryString(filters);
      const response = await authenticatedFetch(`/api/state-payment-comparison?${queryString}`);
      const result = await response.json();
      
      // Only update data if we got a valid response
      if (result && Array.isArray(result.data)) {
        setDataState(result.data);
        setFilterOptions(prev => ({
          ...prev,
          ...result.filterOptions
        }));
        setError(null);
      } else {
        throw new Error('Invalid data format received');
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      console.error('Error fetching data:', err);
      
      // Don't set error for authentication issues - let the auth redirect handle it
      if (!errorMessage.includes('Authentication')) {
        setError(errorMessage);
      }
      // Don't clear the data on error, just return null
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, isLoading]);

  const fetchFeeScheduleDates = async (state: string, serviceCategory: string, serviceCode: string): Promise<string[]> => {
    if (!state || !serviceCategory || !serviceCode || !isAuthenticated) return [];
    try {
      const response = await authenticatedFetch(
        `/api/state-payment-comparison?mode=feeScheduleDates&state=${encodeURIComponent(state)}&serviceCategory=${encodeURIComponent(serviceCategory)}&serviceCode=${encodeURIComponent(serviceCode)}`
      );
      const data = await response.json();
      return (data.dates || []).sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime());
    } catch (error) {
      console.error('Error fetching fee schedule dates:', error);
      return [];
    }
  };

  // Enhanced initial load with better authentication handling
  useEffect(() => {
    // Only attempt to load data when authentication is settled
    if (!isLoading) {
      if (isAuthenticated) {
        console.log('🔄 Authentication confirmed, loading filters...');
        refreshFilters();
      } else {
        console.log('❌ Not authenticated, clearing data...');
        // Clear data when not authenticated
        setDataState([]);
        setFilterOptions({
          serviceCategories: [],
          states: [],
          serviceCodes: [],
          serviceDescriptions: [],
          programs: [],
          locationRegions: [],
          providerTypes: [],
          modifiers: []
        });
        setLoading(false);
      }
    }
  }, [isAuthenticated, isLoading, refreshFilters]);

  // Add setData function
  const setData = useCallback((newData: ServiceData[]) => {
    setDataState(newData);
  }, []);

  const value = {
    data,
    loading,
    error,
    filterOptions,
    refreshData,
    refreshFilters,
    fetchFeeScheduleDates,
    setData
  };

  return (
    <DataContext.Provider value={value}>
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