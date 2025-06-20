"use client";

import { useEffect, useState, useMemo, useId, useCallback } from "react";
import { Bar } from "react-chartjs-2";
import Select from "react-select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import AppLayout from "@/app/components/applayout";
import Modal from "@/app/components/modal";
import { FaChartLine, FaArrowUp, FaArrowDown, FaDollarSign, FaSpinner, FaFilter, FaChartBar, FaExclamationCircle } from 'react-icons/fa';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { useData } from "@/context/DataContext";
import { useRouter } from "next/navigation";
import { DataTable } from './DataTable';
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const colorSequence = [
  '#36A2EB', // Blue
  '#FF6384', // Red
  '#4BC0C0', // Teal
  '#FF9F40', // Orange
  '#9966FF', // Purple
  '#FFCD56', // Yellow
  '#C9CBCF', // Gray
  '#00A8E8', // Light Blue
  '#FF6B6B'  // Coral
];

// Chart.js default colors with 0.8 alpha for less transparency
const chartJsColors = [
  'rgba(54,162,235,0.8)',   // Blue
  'rgba(255,99,132,0.8)',   // Red
  'rgba(75,192,192,0.8)',   // Teal
  'rgba(255,159,64,0.8)',   // Orange
  'rgba(153,102,255,0.8)',  // Purple
  'rgba(255,205,86,0.8)',   // Yellow
  'rgba(201,203,207,0.8)',  // Gray
  'rgba(0,168,232,0.8)',    // Light Blue
  'rgba(255,107,107,0.8)',  // Coral
  'rgba(46,204,64,0.8)',    // Green
  'rgba(255,133,27,0.8)',   // Orange
  'rgba(127,219,255,0.8)',  // Aqua
  'rgba(177,13,201,0.8)',   // Violet
  'rgba(255,220,0,0.8)',    // Gold
  'rgba(0,31,63,0.8)',      // Navy
  'rgba(57,204,204,0.8)',   // Cyan
  'rgba(1,255,112,0.8)',    // Lime
  'rgba(133,20,75,0.8)',    // Maroon
  'rgba(240,18,190,0.8)',   // Fuchsia
  'rgba(61,153,112,0.8)',   // Olive
];

interface ServiceData {
  state_name: string;
  service_category: string;
  service_code: string;
  modifier_1?: string;
  modifier_1_details?: string;
  modifier_2?: string;
  modifier_2_details?: string;
  modifier_3?: string;
  modifier_3_details?: string;
  modifier_4?: string;
  modifier_4_details?: string;
  rate: string;
  rate_per_hour?: string;
  rate_effective_date: string;
  program: string;
  location_region: string;
  duration_unit?: string;
  service_description?: string;
  provider_type?: string; // Add this line
}

interface FilterSet {
  serviceCategory: string;
  states: string[];
  serviceCode: string;
  stateOptions: { value: string; label: string }[];
  serviceCodeOptions: string[];
}

const darkenColor = (color: string, amount: number): string => {
  // Convert hex to RGB
  let r = parseInt(color.slice(1, 3), 16);
  let g = parseInt(color.slice(3, 5), 16);
  let b = parseInt(color.slice(5, 7), 16);

  // Darken each component
  r = Math.max(0, Math.floor(r * (1 - amount)));
  g = Math.max(0, Math.floor(g * (1 - amount)));
  b = Math.max(0, Math.floor(b * (1 - amount)));

  // Convert back to hex
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

const lightenColor = (color: string, amount: number): string => {
  // Convert hex to RGB
  let r = parseInt(color.slice(1, 3), 16);
  let g = parseInt(color.slice(3, 5), 16);
  let b = parseInt(color.slice(5, 7), 16);

  // Lighten each component
  r = Math.min(255, Math.floor(r + (255 - r) * amount));
  g = Math.min(255, Math.floor(g + (255 - g) * amount));
  b = Math.min(255, Math.floor(b + (255 - b) * amount));

  // Convert back to hex
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

// Add back the customFilterOption function
const customFilterOption = (option: any, inputValue: string) => {
  const label = option.label.toLowerCase();
  const searchTerm = inputValue.toLowerCase();
  
  // First check if the label starts with the search term
  if (label.startsWith(searchTerm)) {
    return true;
  }
  
  // If no match at start, check if the label contains the search term
  return label.includes(searchTerm);
};

// Generate a stable unique key for a row
function getRowKey(item: ServiceData) {
  return [
    item.state_name,
    item.service_category,
    item.service_code,
    item.service_description,
    item.program,
    item.location_region,
    item.modifier_1,
    item.modifier_1_details,
    item.modifier_2,
    item.modifier_2_details,
    item.modifier_3,
    item.modifier_3_details,
    item.modifier_4,
    item.modifier_4_details,
    item.duration_unit,
    item.provider_type
  ].map(x => x ?? '').join('|');
}

export default function StatePaymentComparison() {
  const { isAuthenticated, isLoading, user } = useKindeBrowserClient();
  const { 
    data, 
    loading: dataLoading, 
    error: dataError,
    filterOptions,
    refreshData,
    refreshFilters,
    setData
  } = useData();
  const router = useRouter();

  // Add authentication check
  useEffect(() => {
    console.log('Auth State:', { isLoading, isAuthenticated, userEmail: user?.email });
    if (!isLoading && !isAuthenticated) {
      console.log('❌ Not authenticated, redirecting to login');
      router.push("/api/auth/login");
    } else if (isAuthenticated) {
      console.log('✅ Authenticated, checking subscription');
      checkSubscriptionAndSubUser();
    }
  }, [isAuthenticated, isLoading, router]);

  // Will add authentication monitoring after function definitions

  // Add subscription check function
  const checkSubscriptionAndSubUser = async () => {
    const userEmail = user?.email ?? "";
    const kindeUserId = user?.id ?? "";
    console.log('🔍 Checking subscription for:', { userEmail, kindeUserId });
    
    if (!userEmail || !kindeUserId) {
      console.log('❌ Missing user email or ID');
      return;
    }

    try {
      // Check if the user is a sub-user
      console.log('🔍 Checking if user is a sub-user...');
      const { data: subUserData, error: subUserError } = await supabase
        .from("subscription_users")
        .select("sub_users")
        .contains("sub_users", JSON.stringify([userEmail]));

      if (subUserError) {
        console.error("❌ Error checking sub-user:", subUserError);
        console.error("Full error object:", JSON.stringify(subUserError, null, 2));
        return;
      }

      console.log('📊 Sub-user check result:', { subUserData });

      if (subUserData && subUserData.length > 0) {
        console.log('✅ User is a sub-user, checking User table...');
        // Check if the user already exists in the User table
        const { data: existingUser, error: fetchError } = await supabase
          .from("User")
          .select("Email")
          .eq("Email", userEmail)
          .single();

        if (fetchError && fetchError.code !== "PGRST116") { // Ignore "no rows found" error
          console.error("❌ Error fetching user:", fetchError);
          return;
        }

        console.log('📊 Existing user check result:', { existingUser });

        if (existingUser) {
          console.log('🔄 Updating existing user role to sub-user...');
          // User exists, update their role to "sub-user"
          const { error: updateError } = await supabase
            .from("User")
            .update({ Role: "sub-user", UpdatedAt: new Date().toISOString() })
            .eq("Email", userEmail);

          if (updateError) {
            console.error("❌ Error updating user role:", updateError);
          } else {
            console.log("✅ User role updated to sub-user:", userEmail);
          }
        } else {
          console.log('➕ Inserting new sub-user...');
          // User does not exist, insert them as a sub-user
          const { error: insertError } = await supabase
            .from("User")
            .insert({
              KindeUserID: kindeUserId,
              Email: userEmail,
              Role: "sub-user",
              UpdatedAt: new Date().toISOString(),
            });

          if (insertError) {
            console.error("❌ Error inserting sub-user:", insertError);
          } else {
            console.log("✅ Sub-user inserted successfully:", userEmail);
          }
        }

        // Allow sub-user to access the dashboard
        console.log('✅ Sub-user access granted');
        setIsSubscriptionCheckComplete(true);
        return;
      }

      // If not a sub-user, check for an active subscription
      console.log('🔍 Checking for active subscription...');
      const response = await fetch("/api/stripe/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      });

      const data = await response.json();
      console.log('📊 Subscription check result:', data);

      if (data.error || data.status === 'no_customer' || data.status === 'no_subscription' || data.status === 'no_items') {
        console.log('❌ No active subscription, redirecting to subscribe page');
        router.push("/subscribe");
      } else {
        console.log('✅ Active subscription found');
        setIsSubscriptionCheckComplete(true);
      }
    } catch (error) {
      console.error("❌ Error in subscription check:", error);
      console.log('❌ Redirecting to subscribe page due to error');
      router.push("/subscribe");
    }
  };

  // Will add periodic authentication check after other hooks

  // State hooks
  const [filterLoading, setFilterLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [chartError, setChartError] = useState<string | null>(null);
  const [tableError, setTableError] = useState<string | null>(null);
  const [selectedServiceCategory, setSelectedServiceCategory] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedServiceCode, setSelectedServiceCode] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedLocationRegion, setSelectedLocationRegion] = useState("");
  const [selectedModifier, setSelectedModifier] = useState("");
  const [selectedServiceDescription, setSelectedServiceDescription] = useState("");
  const [selectedProviderType, setSelectedProviderType] = useState("");
  const [filterSets, setFilterSets] = useState<FilterSet[]>([
    { serviceCategory: "", states: [], serviceCode: "", stateOptions: [], serviceCodeOptions: [] }
  ]);
  const [showApplyToAllPrompt, setShowApplyToAllPrompt] = useState(false);
  const [lastSelectedModifier, setLastSelectedModifier] = useState<string | null>(null);
  const [selectedTableRows, setSelectedTableRows] = useState<{[state: string]: string[]}>({});
  const [showRatePerHour, setShowRatePerHour] = useState(false);
  const [isAllStatesSelected, setIsAllStatesSelected] = useState(false);
  const [globalModifierOrder, setGlobalModifierOrder] = useState<Map<string, number>>(new Map());
  const [globalSelectionOrder, setGlobalSelectionOrder] = useState<Map<string, number>>(new Map());
  const [sortOrder, setSortOrder] = useState<'default' | 'asc' | 'desc'>('default');
  const [selectedStateDetails, setSelectedStateDetails] = useState<{
    state: string;
    average: number;
    entries: ServiceData[];
  } | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<ServiceData | null>(null);
  const [comment, setComment] = useState<string | null>(null);
  const [comments, setComments] = useState<{ state: string; comment: string }[]>([]);
  const [serviceCategories, setServiceCategories] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [serviceCodes, setServiceCodes] = useState<string[]>([]);
  const [programs, setPrograms] = useState<string[]>([]);
  const [locationRegions, setLocationRegions] = useState<string[]>([]);
  const [modifiers, setModifiers] = useState<{ value: string; label: string; details?: string }[]>([]);
  const [serviceDescriptions, setServiceDescriptions] = useState<string[]>([]);
  const [selectedModifiers, setSelectedModifiers] = useState<{[key: string]: string}>({});
  const [providerTypes, setProviderTypes] = useState<string[]>([]);
  const [filterSetData, setFilterSetData] = useState<{ [index: number]: ServiceData[] }>({});
  const [selectedEntries, setSelectedEntries] = useState<{ [state: string]: ServiceData[] }>({});
  const [chartRefreshKey, setChartRefreshKey] = useState(0);
  // State to hold all states averages for All States mode
  const [allStatesAverages, setAllStatesAverages] = useState<{ state_name: string; avg_rate: number }[] | null>(null);
  const [isSubscriptionCheckComplete, setIsSubscriptionCheckComplete] = useState(false);
  
  // Add state to track authentication errors specifically
  const [authError, setAuthError] = useState<string | null>(null);

  // Add areFiltersComplete before it's used in useEffect
  const areFiltersComplete = useMemo(() => 
    filterSets.every(filterSet => 
      filterSet.serviceCategory && 
      filterSet.states.length > 0 && 
      filterSet.serviceCode
    ), 
    [filterSets]
  );

  const hasSelectedRows = useMemo(() => 
    Object.values(selectedTableRows).some(selections => selections.length > 0),
    [selectedTableRows]
  );

  const shouldShowChart = useMemo(() => 
    areFiltersComplete && (isAllStatesSelected || hasSelectedRows),
    [areFiltersComplete, isAllStatesSelected, hasSelectedRows]
  );

  const shouldShowMetrics = useMemo(() => 
    areFiltersComplete,
    [areFiltersComplete]
  );

  const shouldShowEmptyState = useMemo(() => 
    areFiltersComplete && !isAllStatesSelected && !hasSelectedRows,
    [areFiltersComplete, isAllStatesSelected, hasSelectedRows]
  );

  // Move formatText function to top level
  const formatText = (text: string | null | undefined) => {
    if (!text) return "-";
    return text.trim();
  };

  // Move handleTableRowSelection to top level
  const handleTableRowSelection = (state: string, item: ServiceData) => {
    const modifierKey = [
      item.modifier_1?.trim().toUpperCase() || '',
      item.modifier_2?.trim().toUpperCase() || '',
      item.modifier_3?.trim().toUpperCase() || '',
      item.modifier_4?.trim().toUpperCase() || '',
      item.program?.trim().toUpperCase() || '',
      item.location_region?.trim().toUpperCase() || ''
    ].join('|');

    setSelectedTableRows(prev => {
      const stateSelections = prev[state] || [];
      const newSelections = stateSelections.includes(modifierKey)
        ? stateSelections.filter(key => key !== modifierKey)
        : [...stateSelections, modifierKey];

      return {
        ...prev,
        [state]: newSelections
      };
    });

    // Update the selected entry
    setSelectedEntry(prev => 
      prev?.state_name === item.state_name &&
      prev?.service_code === item.service_code &&
      prev?.program === item.program &&
      prev?.location_region === item.location_region &&
      prev?.modifier_1 === item.modifier_1 &&
      prev?.modifier_2 === item.modifier_2 &&
      prev?.modifier_3 === item.modifier_3 &&
      prev?.modifier_4 === item.modifier_4
        ? null
        : item
    );
  };

  // Move latestRates calculation to top level
  const latestRates = useMemo(() => {
    const latestRatesMap = new Map<string, ServiceData>();
    data.forEach((item) => {
      const key = `${item.state_name}|${item.service_category}|${item.service_code}|${item.modifier_1}|${item.modifier_2}|${item.modifier_3}|${item.modifier_4}|${item.program}|${item.location_region}`;
      const currentDate = new Date(item.rate_effective_date);
      const existing = latestRatesMap.get(key);
      
      if (!existing || currentDate > new Date(existing.rate_effective_date)) {
        latestRatesMap.set(key, item);
      }
    });
    return Array.from(latestRatesMap.values());
  }, [data]);

  // Update deleteFilterSet function
  const deleteFilterSet = (index: number) => {
    // Get the states from the filter set being removed
    const removedFilterSet = filterSets[index];
    const statesToRemove = removedFilterSet.states;

    // Remove the filter set
    setFilterSets(prev => prev.filter((_, i) => i !== index));

    // Clear selected entries for the removed states
    setSelectedEntries(prev => {
      const newEntries = { ...prev };
      statesToRemove.forEach(state => {
        delete newEntries[state];
      });
      return newEntries;
    });

    // Clear filter set data for the removed index
    setFilterSetData(prev => {
      const newData = { ...prev };
      delete newData[index];
      return newData;
    });
  };

  // Add periodic authentication check for long-running sessions
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkAuthStatus = async () => {
      try {
        // Make a simple authenticated request to verify the session is still valid
        const response = await fetch('/api/user');
        if (response.status === 401) {
          console.warn('🔄 Session expired, redirecting to login...');
          setAuthError('Your session has expired. Please sign in again.');
          router.push("/api/auth/login");
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
      }
    };

    // Check authentication status every 5 minutes
    const authCheckInterval = setInterval(checkAuthStatus, 5 * 60 * 1000);

    // Also check when the page becomes visible again (user returns from another tab)
    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated) {
        checkAuthStatus();
        
        // Refresh data if filters are complete
        if (areFiltersComplete) {
          console.log('🔄 Tab became visible, refreshing data...');
          // Trigger a data refresh for all filter sets
          setChartRefreshKey(prev => prev + 1);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(authCheckInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, router, areFiltersComplete]);

  // Update useEffect to use refreshData
  useEffect(() => {
    const loadData = async () => {
      try {
        setFilterLoading(true);
        const result = await refreshData();
        if (result) {
          extractFilters(result.data);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        setFetchError("Failed to load data. Please try again.");
      } finally {
        setFilterLoading(false);
      }
    };
    loadData();
  }, []);

  // Update extractFilters to use filterOptions from context
  const extractFilters = (data: ServiceData[]) => {
    setServiceCategories(filterOptions.serviceCategories);
    setStates(filterOptions.states);
    setPrograms(filterOptions.programs);
    setLocationRegions(filterOptions.locationRegions);
    setModifiers(filterOptions.modifiers);
    setServiceDescriptions(filterOptions.serviceDescriptions);
    setProviderTypes(filterOptions.providerTypes);
  };

  // Update handleServiceCategoryChange to use refreshFilters
  const handleServiceCategoryChange = async (index: number, category: string) => {
    try {
      setFilterLoading(true);
    const newFilters = [...filterSets];
      // If 'All States' is already selected for this filter set, set all states and all codes for the category
      if (
        newFilters[index].states.length === filterOptions.states.length ||
        newFilters[index].states.includes("ALL_STATES")
      ) {
        // Set all states
        const allStates = filterOptions.states;
        newFilters[index] = {
          ...newFilters[index],
          serviceCategory: category,
          states: allStates,
          serviceCode: "",
          serviceCodeOptions: []
        };
        // Get all codes for the selected category
        const allCodes = Array.from(
          new Set(
            data
              .filter(item => item.service_category?.trim() === category.trim())
              .map(item => item.service_code?.trim())
          )
        ).filter(Boolean) as string[];
        newFilters[index].serviceCodeOptions = allCodes;
        setFilterSets(newFilters);
        setFilterLoading(false);
        return;
      }
      // Default: just update the category and clear dependent filters
    newFilters[index] = {
      ...newFilters[index],
      serviceCategory: category,
      states: [],
      serviceCode: "",
        serviceCodeOptions: []
    };
    setFilterSets(newFilters);
      await refreshFilters(category);
      if (index === filterSets.length - 1) {
        setServiceCodes([]);
    setPrograms([]);
    setLocationRegions([]);
    setModifiers([]);
    setProviderTypes([]);
    setServiceDescriptions([]);
      }
    } catch (error) {
      console.error("Error updating filters:", error);
      setFilterError("Failed to update filters. Please try again.");
    } finally {
      setFilterLoading(false);
    }
  };

  const handleStateChange = async (index: number, option: { value: string; label: string } | null) => {
    try {
      setFilterLoading(true);
    const newFilters = [...filterSets];
      const selectedState = option?.value || "";

      if (selectedState === "ALL_STATES") {
        setIsAllStatesSelected(true);
        // Set all states
        const allStates = filterOptions.states;
        newFilters[index] = {
          ...newFilters[index],
          states: allStates,
          serviceCode: "",
          serviceCodeOptions: []
        };
        // Query backend for all codes for the selected category
        if (newFilters[index].serviceCategory) {
          const result = await refreshFilters(newFilters[index].serviceCategory);
          console.log('refreshFilters result:', result);
          if (result && result.filterOptions && result.filterOptions.serviceCodes) {
            newFilters[index].serviceCodeOptions = result.filterOptions.serviceCodes;
          }
          console.log('serviceCodeOptions after refresh:', newFilters[index].serviceCodeOptions);
        }
        setFilterSets(newFilters);
        setSelectedState("ALL_STATES");
        setFilterLoading(false);
        return;
      } else {
        setIsAllStatesSelected(false);
        // Existing logic for single state
    newFilters[index] = {
      ...newFilters[index],
        states: selectedState ? [selectedState] : [],
      serviceCode: "",
      serviceCodeOptions: []
    };
    setFilterSets(newFilters);
      // Clear dependent filters for this filter set only
      if (index === filterSets.length - 1) {
        setServiceCodes([]);
    setPrograms([]);
    setLocationRegions([]);
    setModifiers([]);
    setProviderTypes([]);
    setServiceDescriptions([]);
      }
      if (selectedState && newFilters[index].serviceCategory) {
        // Refresh filters with both category and state to get service codes
        await refreshFilters(newFilters[index].serviceCategory, selectedState);
        // Update service codes from the filter options
        if (filterOptions.serviceCodes) {
          newFilters[index].serviceCodeOptions = filterOptions.serviceCodes;
      setFilterSets(newFilters);
        }
      }
      if (index === 0) setSelectedState(selectedState);
      }
    } catch (error) {
      console.error("Error updating state filters:", error);
      setFilterError("Failed to update state filters. Please try again.");
    } finally {
      setFilterLoading(false);
    }
  };

  // Fetch state averages for All States mode
  const fetchAllStatesAverages = useCallback(async (serviceCategory: string, serviceCode: string) => {
    try {
      const res = await fetch(`/api/state-payment-comparison?mode=stateAverages&serviceCategory=${encodeURIComponent(serviceCategory)}&serviceCode=${encodeURIComponent(serviceCode)}`);
      if (!res.ok) throw new Error('Failed to fetch state averages');
      const data = await res.json();
      setAllStatesAverages(data.stateAverages || []);
    } catch (err) {
      setAllStatesAverages([]);
      console.error('Error fetching state averages:', err);
    }
  }, []);

  // Update handleServiceCodeChange to use the new API in All States mode
  const handleServiceCodeChange = async (index: number, code: string) => {
    try {
      setFilterLoading(true);
    const newFilters = [...filterSets];
    newFilters[index] = {
      ...newFilters[index],
      serviceCode: code
    };
    setFilterSets(newFilters);
      // Clear dependent filters for this filter set only
      if (index === filterSets.length - 1) {
        setServiceCodes([]);
    setPrograms([]);
    setLocationRegions([]);
    setModifiers([]);
    setProviderTypes([]);
    setServiceDescriptions([]);
      }
    const filterSet = newFilters[index];
      if (isAllStatesSelected && filterSet.serviceCategory && filterSet.states.length > 0 && code) {
        // Fetch all state averages for this category and code
        await fetchAllStatesAverages(filterSet.serviceCategory, code);
        // Fetch all data for this category and code, across all states
        const result = await refreshData({
          serviceCategory: filterSet.serviceCategory,
          serviceCode: code,
          itemsPerPage: '1000' // Only set a high limit in All States mode
        });
        if (result && result.data) {
          setData(result.data); // This will update latestRates and the chart
        }
      } else {
        setAllStatesAverages(null); // Clear averages if not in All States mode
      }
      if (code && filterSet.serviceCategory && filterSet.states.length > 0) {
        // Refresh filters with service code to get all options and data
        const result = await refreshFilters(
          filterSet.serviceCategory,
          filterSet.states[0],
          code
        );
        if (result) {
          // Update all filter options for this filter set only if needed
          if (index === filterSets.length - 1) {
            setPrograms(result.filterOptions.programs || []);
            setLocationRegions(result.filterOptions.locationRegions || []);
            setProviderTypes(result.filterOptions.providerTypes || []);
            setServiceDescriptions(result.filterOptions.serviceDescriptions || []);
            setModifiers(result.filterOptions.modifiers || []);
          }
          // Store data for this filter set only
          if (result.filterOptions.data) {
            setFilterSetData(prev => {
              // Filter out any undefined values from prev
              const filteredPrev: { [index: number]: ServiceData[] } = {};
              Object.entries(prev).forEach(([k, v]) => {
                if (Array.isArray(v)) filteredPrev[Number(k)] = v;
              });
              // Set/replace the current index with the new data array, always as array
              filteredPrev[index] = Array.isArray(result.filterOptions.data) ? result.filterOptions.data : [];
              return filteredPrev;
            });
          }
        }
      }
    } catch (error) {
      console.error("Error updating service code filters:", error);
      setFilterError("Failed to update service code filters. Please try again.");
    } finally {
      setFilterLoading(false);
    }
  };

  const handleServiceDescriptionChange = (index: number, desc: string) => {
    setServiceDescriptions([]);
    setPrograms([]);
    setLocationRegions([]);
    setModifiers([]);
    setProviderTypes([]);

    const filterSet = filterSets[index];
    const descFilteredData = data.filter(item => {
      const itemCategory = item.service_category?.trim().toUpperCase();
      const selectedCategory = filterSet.serviceCategory.trim().toUpperCase();
      const itemState = item.state_name?.trim().toUpperCase();
      const selectedState = filterSet.states[0]?.trim().toUpperCase();
      const itemDesc = item.service_description?.trim();
      return itemCategory === selectedCategory && itemState === selectedState && itemDesc === desc.trim();
    });
    setPrograms([...new Set(descFilteredData.map(item => item.program?.trim()).filter((v): v is string => !!v))].sort());
    setLocationRegions([...new Set(descFilteredData.map(item => item.location_region?.trim()).filter((v): v is string => !!v))].sort());
    setProviderTypes([...new Set(descFilteredData.map(item => item.provider_type?.trim()).filter((v): v is string => !!v))].sort());
    const allModifiers = descFilteredData.flatMap(item => [item.modifier_1, item.modifier_2, item.modifier_3, item.modifier_4].filter((v): v is string => !!v));
    setModifiers([...new Set(allModifiers)].map(value => ({ value, label: value })));
  };

  // Then filter based on selections
  const filteredData = useMemo(() => {
    return latestRates.filter((item) => {
      return filterSets.some(filterSet => (
        (!filterSet.serviceCategory || item.service_category?.trim().toUpperCase() === filterSet.serviceCategory.trim().toUpperCase()) &&
        (!filterSet.states.length || filterSet.states.map(s => s.trim().toUpperCase()).includes(item.state_name?.trim().toUpperCase())) &&
        (!filterSet.serviceCode || item.service_code?.trim() === filterSet.serviceCode.trim()) &&
        (
          !selectedProgram ||
          (selectedProgram === '-' ? !item.program || item.program.trim() === '' : item.program?.trim() === selectedProgram.trim())
        ) &&
        (
          !selectedLocationRegion ||
          (selectedLocationRegion === '-' ? !item.location_region || item.location_region.trim() === '' : item.location_region?.trim() === selectedLocationRegion.trim())
        ) &&
        (
          !selectedModifier ||
          (selectedModifier === '-' ?
            (!item.modifier_1 && !item.modifier_2 && !item.modifier_3 && !item.modifier_4) :
            [item.modifier_1, item.modifier_2, item.modifier_3, item.modifier_4].includes(selectedModifier)
          )
        ) &&
        (
          !selectedServiceDescription ||
          (selectedServiceDescription === '-' ? !item.service_description || item.service_description.trim() === '' : item.service_description?.trim() === selectedServiceDescription.trim())
        ) &&
        (
          !selectedProviderType ||
          (selectedProviderType === '-' ? !item.provider_type || item.provider_type.trim() === '' : item.provider_type?.trim() === selectedProviderType.trim())
        )
      ));
    });
  }, [latestRates, filterSets, selectedProgram, selectedLocationRegion, selectedModifier, selectedServiceDescription, selectedProviderType]);

  // Group filtered data by state
  const groupedByState = useMemo(() => {
    const groups: { [state: string]: ServiceData[] } = {};
    filteredData.forEach(item => {
      if (!groups[item.state_name]) {
        groups[item.state_name] = [];
      }
      groups[item.state_name].push(item);
    });
    return groups;
  }, [filteredData]);

  // Move this function above the useMemo for processedData
  const calculateProcessedData = () => {
    const newProcessedData: { [state: string]: { [modifierKey: string]: number } } = {};

    filterSets.forEach(filterSet => {
      const filteredDataForSet = latestRates.filter((item) => (
        item.service_category === filterSet.serviceCategory &&
        filterSet.states.includes(item.state_name?.trim().toUpperCase()) &&
        item.service_code === filterSet.serviceCode &&
        (!selectedProgram || item.program === selectedProgram) &&
        (!selectedLocationRegion || item.location_region === selectedLocationRegion) &&
        (!selectedModifier || [item.modifier_1, item.modifier_2, item.modifier_3, item.modifier_4].includes(selectedModifier)) &&
        (!selectedServiceDescription || item.service_description === selectedServiceDescription) &&
        (!selectedProviderType || item.provider_type === selectedProviderType)
      ));

      // If "All States" is selected, calculate the average rate for each state
      if (filterSet.states.length === states.length && filterSets[0].states.length === states.length) {
        const stateRates: { [state: string]: number[] } = {};

        // Group rates by state
        filteredDataForSet.forEach(item => {
          const state = item.state_name;
          let rateValue = parseFloat(item.rate?.replace('$', '') || '0');
          const durationUnit = item.duration_unit?.toUpperCase();
          
          if (showRatePerHour) {
            if (durationUnit === '15 MINUTES') {
              rateValue *= 4;
            } else if (durationUnit !== 'PER HOUR') {
              rateValue = 0; // Or handle differently if needed
            }
          }

          if (!stateRates[state]) {
            stateRates[state] = [];
          }
          stateRates[state].push(rateValue);
        });

        // Calculate the average rate for each state
        Object.entries(stateRates).forEach(([state, rates]) => {
          const averageRate = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
          newProcessedData[state] = {
            'average': averageRate
          };
        });
      } else {
        // Otherwise, process data as usual
        filteredDataForSet.forEach(item => {
          const rate = showRatePerHour 
            ? (() => {
                let rateValue = parseFloat(item.rate?.replace('$', '') || '0');
                const durationUnit = item.duration_unit?.toUpperCase();
                
                if (durationUnit === '15 MINUTES') {
                  rateValue *= 4;
                } else if (durationUnit !== 'PER HOUR') {
                  rateValue = 0; // Or handle differently if needed
                }
                return Math.round(rateValue * 100) / 100;
              })()
            : Math.round(parseFloat(item.rate?.replace("$", "") || "0") * 100) / 100;

          const currentModifier = [
            item.modifier_1?.trim().toUpperCase() || '',
            item.modifier_2?.trim().toUpperCase() || '',
            item.modifier_3?.trim().toUpperCase() || '',
            item.modifier_4?.trim().toUpperCase() || '',
            item.program?.trim().toUpperCase() || '',
            item.location_region?.trim().toUpperCase() || ''
          ].join('|');
          const stateKey = item.state_name?.trim().toUpperCase();
          const stateSelections = selectedTableRows[stateKey] || [];

          if (stateSelections.includes(currentModifier)) {
            if (!newProcessedData[stateKey]) {
              newProcessedData[stateKey] = {};
            }
            newProcessedData[stateKey][currentModifier] = rate;
          }
        });
      }
    });

    return newProcessedData;
  };

  // Then use it in the useMemo
  const processedData = useMemo(() => calculateProcessedData(), [
    filterSets,
    latestRates,
    selectedTableRows,
    showRatePerHour,
    states.length,
  ]);

  // ✅ Prepare ECharts Data
  const echartOptions = useMemo(() => {
    if (isAllStatesSelected && filterSets[0]?.serviceCode && allStatesAverages) {
      // All States mode: use backend-aggregated averages
      const code = filterSets[0].serviceCode;
      const statesList = filterOptions.states;
      // Map state averages to the order of statesList
      const avgMap = new Map(
        allStatesAverages.map(row => [row.state_name.trim().toUpperCase(), Number(row.avg_rate)])
      );
      const chartData = statesList.map(state => {
        const avg = avgMap.get(state.trim().toUpperCase());
        return typeof avg === 'number' && !isNaN(avg) ? avg : undefined;
      });
      return {
        legend: { show: false },
        barCategoryGap: '30%',
      tooltip: {
        trigger: 'item',
          confine: true,
          extraCssText: 'max-width: 350px; white-space: normal;',
          position: (
            point: any,
            params: any,
            dom: any,
            rect: any,
            size: any
          ) => {
            const [x, y] = point;
            const chartWidth = size.viewSize[0];
            const chartHeight = size.viewSize[1];
            let posX = x;
            let posY = y;
            if (x + 350 > chartWidth) posX = chartWidth - 360;
            if (y + 200 > chartHeight) posY = chartHeight - 210;
            return [posX, posY];
          },
        formatter: (params: any) => {
            const state = params.name;
            const value = params.value;
            let tooltipContent = `<strong>State:</strong> ${state}<br/>`;
            tooltipContent += `<strong>Rate:</strong> $${value?.toFixed(2)}<br/>`;
            tooltipContent += `<strong>Service Category:</strong> ${filterSets[0].serviceCategory}<br/>`;
            tooltipContent += `<strong>Service Code:</strong> ${code}<br/>`;
            return tooltipContent;
        }
      },
      xAxis: {
        type: 'category',
        data: statesList,
          axisLabel: { rotate: 45, fontSize: 10 }
      },
      yAxis: {
        type: 'value',
        name: showRatePerHour ? 'Rate ($ per hour)' : 'Rate ($ per base unit)',
        nameLocation: 'middle',
        nameGap: 30
      },
        series: [{
          name: 'Rate',
          type: 'bar',
          itemStyle: { color: chartJsColors[0] },
          data: chartData,
          label: {
            show: true,
            position: 'top',
            formatter: (params: any) => params.value != null ? `$${Number(params.value).toFixed(2)}` : '',
            fontSize: 12,
            color: '#374151',
            fontWeight: 'bold'
          }
        }],
      grid: {
        containLabel: true,
        left: '3%',
        right: '3%',
          bottom: '16%',
        top: '5%'
        }
      };
    }
    // Multi-select/table-driven chart logic
    const states = Object.keys(selectedEntries);
    if (states.length === 0) {
      return {
        legend: { show: false },
        tooltip: { show: false },
        xAxis: { type: 'category', data: [] },
        yAxis: { type: 'value' },
        series: [],
        grid: { containLabel: true }
      };
    }
    // Get all unique modifier keys across all states
    const allModifierKeys = new Set<string>();
    states.forEach(state => {
      selectedEntries[state].forEach(item => {
        const modifierKey = [
          item.modifier_1?.trim().toUpperCase() || '',
          item.modifier_2?.trim().toUpperCase() || '',
          item.modifier_3?.trim().toUpperCase() || '',
          item.modifier_4?.trim().toUpperCase() || '',
          item.program?.trim().toUpperCase() || '',
          item.location_region?.trim().toUpperCase() || ''
        ].join('|');
        allModifierKeys.add(modifierKey);
      });
    });
    const modifierKeys = Array.from(allModifierKeys);
    const xAxisData: string[] = states;
    const series = modifierKeys.map((modifierKey, index) => {
      const data = xAxisData.map(state => {
        const stateEntries = selectedEntries[state] || [];
        const matchingEntry = stateEntries.find(item => {
          const itemModifierKey = [
            item.modifier_1?.trim().toUpperCase() || '',
            item.modifier_2?.trim().toUpperCase() || '',
            item.modifier_3?.trim().toUpperCase() || '',
            item.modifier_4?.trim().toUpperCase() || '',
            item.program?.trim().toUpperCase() || '',
            item.location_region?.trim().toUpperCase() || ''
          ].join('|');
          return itemModifierKey === modifierKey;
        });
        if (!matchingEntry) return 0; // Always return 0 for missing
        let rateValue = parseFloat(matchingEntry.rate?.replace('$', '') || '0');
        const durationUnit = matchingEntry.duration_unit?.toUpperCase();
        if (showRatePerHour) {
          if (durationUnit === '15 MINUTES') rateValue *= 4;
          else if (durationUnit === '30 MINUTES') rateValue *= 2;
          else if (durationUnit !== 'PER HOUR') rateValue = 0;
        }
        return Math.round(rateValue * 100) / 100;
      });
      return {
        name: modifierKey || 'No Modifiers',
        type: 'bar',
        barGap: '0%',
        data: data,
        itemStyle: { color: chartJsColors[index % chartJsColors.length] },
        label: {
          show: true,
          position: 'top',
          formatter: (params: any) => params.value > 0 ? `$${Number(params.value).toFixed(2)}` : '',
          fontSize: 10,
          color: '#374151',
          fontWeight: 'bold'
        },
        emphasis: {
          focus: 'series'
        }
      };
    });
    return {
      legend: { show: false },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const state = params.name;
          const seriesName = params.seriesName;
          const value = params.value;
          if (value <= 0) return '';
          const stateEntries = selectedEntries[state] || [];
          const matchingEntry = stateEntries.find(item => {
            const itemModifierKey = [
              item.modifier_1?.trim().toUpperCase() || '',
              item.modifier_2?.trim().toUpperCase() || '',
              item.modifier_3?.trim().toUpperCase() || '',
              item.modifier_4?.trim().toUpperCase() || '',
              item.program?.trim().toUpperCase() || '',
              item.location_region?.trim().toUpperCase() || ''
            ].join('|');
            return itemModifierKey === seriesName;
          });
          let result = `<strong>State:</strong> ${state}<br/>`;
          result += `<strong>Series:</strong> ${seriesName}<br/>`;
          result += `<strong>Rate:</strong> $${value.toFixed(2)}<br/>`;
          if (matchingEntry) {
            if (matchingEntry.service_description) {
              result += `<strong>Description:</strong> ${matchingEntry.service_description}<br/>`;
            }
            if (matchingEntry.program) {
              result += `<strong>Program:</strong> ${matchingEntry.program}<br/>`;
            }
            if (matchingEntry.location_region) {
              result += `<strong>Region:</strong> ${matchingEntry.location_region}<br/>`;
            }
            if (matchingEntry.provider_type) {
              result += `<strong>Provider:</strong> ${matchingEntry.provider_type}<br/>`;
            }
            if (matchingEntry.duration_unit) {
              result += `<strong>Unit:</strong> ${matchingEntry.duration_unit}<br/>`;
            }
            if (matchingEntry.rate_effective_date) {
              result += `<strong>Effective:</strong> ${new Date(matchingEntry.rate_effective_date).toLocaleDateString()}<br/>`;
            }
            const modifiers = [];
            if (matchingEntry.modifier_1) {
              modifiers.push(`Mod 1: ${matchingEntry.modifier_1}${matchingEntry.modifier_1_details ? ` (${matchingEntry.modifier_1_details})` : ''}`);
            }
            if (matchingEntry.modifier_2) {
              modifiers.push(`Mod 2: ${matchingEntry.modifier_2}${matchingEntry.modifier_2_details ? ` (${matchingEntry.modifier_2_details})` : ''}`);
            }
            if (matchingEntry.modifier_3) {
              modifiers.push(`Mod 3: ${matchingEntry.modifier_3}${matchingEntry.modifier_3_details ? ` (${matchingEntry.modifier_3_details})` : ''}`);
            }
            if (matchingEntry.modifier_4) {
              modifiers.push(`Mod 4: ${matchingEntry.modifier_4}${matchingEntry.modifier_4_details ? ` (${matchingEntry.modifier_4_details})` : ''}`);
            }
            if (modifiers.length > 0) {
              result += `<strong>Modifiers:</strong><br/>${modifiers.join('<br/>')}`;
            }
          }
          return result;
        }
      },
      xAxis: {
        type: 'category',
        data: xAxisData,
        axisLabel: { rotate: 45, fontSize: 10 },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        name: showRatePerHour ? 'Rate ($ per hour)' : 'Rate ($ per base unit)',
        nameLocation: 'middle',
        nameGap: 30
      },
      series: series,
      barCategoryGap: '10%',
      grid: {
        containLabel: true,
        left: '3%',
        right: '3%',
        bottom: '15%',
        top: '15%'
      }
    };
  }, [selectedEntries, showRatePerHour, isAllStatesSelected, filterSets, filterOptions.states, latestRates, allStatesAverages]);

  const ChartWithErrorBoundary = () => {
    try {
      return (
        <ReactECharts
          key={JSON.stringify(Object.keys(selectedEntries).sort()) + '-' + chartRefreshKey}
          option={echartOptions}
          style={{ height: '400px', width: '100%' }}
        />
      );
    } catch (error) {
      console.error("Error rendering chart:", error);
      return <div>Error: Failed to render chart.</div>;
    }
  };

  const ErrorMessage = ({ error, onRetry }: { error: string | null, onRetry?: () => void }) => {
    if (!error) return null;
    
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
        <div className="flex items-center">
          <FaExclamationCircle className="h-5 w-5 text-red-500 mr-2" />
          <p className="text-red-700">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="ml-auto px-3 py-1 text-sm font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  };

  const resetFilters = () => {
    // Reset filter sets to one empty filter set
    setFilterSets([{ serviceCategory: "", states: [], serviceCode: "", stateOptions: [], serviceCodeOptions: [] }]);

    // Reset other filter-related states
    setSelectedServiceCategory("");
    setSelectedState("");
    setSelectedServiceCode("");
    setSelectedEntry(null);
    setServiceCodes([]);
    setSelectedTableRows({});
    setIsAllStatesSelected(false);
    setSortOrder('default');
    setSelectedStateDetails(null);
    setSelectedEntries({});         // <-- Clear selected entries
    setChartRefreshKey(k => k + 1); // <-- Force chart to re-render/reset
  };

  // Calculate highest and lowest among currently selected bars
  const selectedRates = useMemo(() => {
    if (isAllStatesSelected && filterSets[0]?.serviceCode && allStatesAverages) {
      // Use the chartData for metrics (matches the bars shown)
      const statesList = filterOptions.states;
      const avgMap = new Map(
        allStatesAverages.map(row => [row.state_name.trim().toUpperCase(), Number(row.avg_rate)])
      );
      const chartData = statesList.map(state => {
        const avg = avgMap.get(state.trim().toUpperCase());
        return typeof avg === 'number' && !isNaN(avg) ? avg : undefined;
      });
      return chartData.filter((rate): rate is number => typeof rate === 'number' && !isNaN(rate));
    }
    // Flatten all selected entries and extract the rate value as a number
    return Object.values(selectedEntries)
      .flat()
      .map(item => {
        let rateValue = parseFloat(item.rate?.replace('$', '') || '0');
        const durationUnit = item.duration_unit?.toUpperCase();
        if (showRatePerHour) {
          if (durationUnit === '15 MINUTES') rateValue *= 4;
          else if (durationUnit === '30 MINUTES') rateValue *= 2;
          else if (durationUnit !== 'PER HOUR') rateValue = 0;
        }
        return rateValue;
      })
      .filter(rate => rate > 0);
  }, [selectedEntries, showRatePerHour, isAllStatesSelected, filterSets, allStatesAverages, filterOptions.states]);

  const filteredRates = useMemo(
    () => selectedRates.filter((rate): rate is number => typeof rate === 'number' && !isNaN(rate)),
    [selectedRates]
  );
  const maxRate = useMemo(() => filteredRates.length > 0 ? Math.max(...filteredRates) : 0, [filteredRates]);
  const minRate = useMemo(() => filteredRates.length > 0 ? Math.min(...filteredRates) : 0, [filteredRates]);
  const avgRate = useMemo(() => filteredRates.length > 0 ? filteredRates.reduce((sum, rate) => sum + rate, 0) / filteredRates.length : 0, [filteredRates]);

  // Calculate national average
  const nationalAverage = useMemo(() => {
    if (!selectedServiceCategory || !selectedServiceCode) return 0;

    const rates = data
      .filter((item: ServiceData) => 
        item.service_category === selectedServiceCategory &&
        item.service_code === selectedServiceCode
      )
      .map((item: ServiceData) => 
        (() => {
          let rateValue = parseFloat(item.rate?.replace('$', '') || '0');
          const durationUnit = item.duration_unit?.toUpperCase();
          
          if (durationUnit === '15 MINUTES') {
            rateValue *= 4;
          } else if (durationUnit !== 'PER HOUR') {
            rateValue = 0; // Or handle differently if needed
          }
          return Math.round(rateValue * 100) / 100;
        })()
      )
      .filter((rate: number) => rate > 0);

    if (rates.length === 0) return 0;

    const sum = rates.reduce((sum: number, rate: number) => sum + rate, 0);
    return (sum / rates.length).toFixed(2);
  }, [data, selectedServiceCategory, selectedServiceCode, showRatePerHour]);

  // Add this component to display the calculation details
  const CalculationDetails = () => {
    if (!selectedStateDetails) return null;

    return (
      <div className="mt-6 p-6 bg-white rounded-xl shadow-lg">
        <h3 className="text-xl font-semibold mb-4">
          Average Calculation for {selectedStateDetails.state}
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <p className="text-sm text-gray-600">
              <strong>Average Rate:</strong> ${selectedStateDetails.average.toFixed(2)}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Number of Entries:</strong> {selectedStateDetails.entries.length}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-2">Service Code</th>
                  <th className="px-4 py-2">Program</th>
                  <th className="px-4 py-2">Region</th>
                  <th className="px-4 py-2">Modifier 1</th>
                  <th className="px-4 py-2">Modifier 2</th>
                  <th className="px-4 py-2">Modifier 3</th>
                  <th className="px-4 py-2">Modifier 4</th>
                  <th className="px-4 py-2">Rate</th>
                  <th className="px-4 py-2">Effective Date</th>
                </tr>
              </thead>
              <tbody>
                {selectedStateDetails.entries.map((entry, index) => (
                  <tr key={index} className="bg-white border-b">
                    <td className="px-4 py-2">{entry.service_code}</td>
                    <td className="px-4 py-2">{entry.program}</td>
                    <td className="px-4 py-2">{entry.location_region}</td>
                    <td className="px-4 py-2">
                      {entry.modifier_1 ? `${entry.modifier_1}${entry.modifier_1_details ? ` - ${entry.modifier_1_details}` : ''}` : '-'}
                    </td>
                    <td className="px-4 py-2">
                      {entry.modifier_2 ? `${entry.modifier_2}${entry.modifier_2_details ? ` - ${entry.modifier_2_details}` : ''}` : '-'}
                    </td>
                    <td className="px-4 py-2">
                      {entry.modifier_3 ? `${entry.modifier_3}${entry.modifier_3_details ? ` - ${entry.modifier_3_details}` : ''}` : '-'}
                    </td>
                    <td className="px-4 py-2">
                      {entry.modifier_4 ? `${entry.modifier_4}${entry.modifier_4_details ? ` - ${entry.modifier_4_details}` : ''}` : '-'}
                    </td>
                    <td className="px-4 py-2">
                      ${showRatePerHour 
                        ? (() => {
                            let rateValue = parseFloat(entry.rate_per_hour?.replace('$', '') || '0');
                            const durationUnit = entry.duration_unit?.toUpperCase();
                            
                            if (durationUnit === '15 MINUTES') {
                              rateValue *= 4;
                            } else if (durationUnit !== 'PER HOUR') {
                              rateValue = 0; // Or handle differently if needed
                            }
                            return Math.round(rateValue * 100) / 100;
                          })()
                        : parseFloat(entry.rate?.replace("$", "") || "0").toFixed(2)}
                    </td>
                    <td className="px-4 py-2">
                      {new Date(entry.rate_effective_date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Add a function to check which columns have data
  const getVisibleColumns = useMemo(() => {
    const columns = {
      state_name: false,
      service_category: false,
      service_code: false,
      service_description: false,
      program: false,
      location_region: false,
      modifier_1: false,
      modifier_2: false,
      modifier_3: false,
      modifier_4: false,
      duration_unit: false,
      rate: false,
      rate_per_hour: false,
      rate_effective_date: false
    };

    if (filteredData.length > 0) {
      filteredData.forEach(item => {
        const rateStr = (item.rate || '').replace('$', '');
        const rate = parseFloat(rateStr);
        const durationUnit = item.duration_unit?.toUpperCase();
        
        if (!isNaN(rate) && 
            (durationUnit === '15 MINUTES' || 
             durationUnit === '30 MINUTES' || 
             durationUnit === 'PER HOUR')) {
          columns.rate_per_hour = true;
        }
        
        Object.keys(columns).forEach(key => {
          if (item[key as keyof ServiceData] && item[key as keyof ServiceData] !== '-') {
            columns[key as keyof typeof columns] = true;
          }
        });
      });
    }

    return columns;
  }, [filteredData]);

  // Debug: Log filterOptions and data when they change
  useEffect(() => {
    console.log('filterOptions:', filterOptions);
    console.log('data:', data);
  }, [filterOptions, data]);

  // Debug: Log when refreshData and refreshFilters are called
  useEffect(() => {
    console.log('Calling refreshFilters on mount');
  }, []);

  // Add useEffect to update filter options when service category or state changes
  useEffect(() => {
    // Log the params being sent to refreshFilters
    console.log('Calling refreshFilters with:', selectedServiceCategory, selectedState);
    if (selectedServiceCategory && selectedState) {
      refreshFilters(selectedServiceCategory, selectedState);
    } else if (selectedServiceCategory) {
      refreshFilters(selectedServiceCategory);
    }
  }, [selectedServiceCategory, selectedState, refreshFilters]);

  // Update the row selection handler to update selectedEntries and refresh chart
  const handleRowSelection = (state: string, item: ServiceData) => {
    setSelectedEntries(prev => {
      const prevArr = prev[state] || [];
      // Check if already selected (by unique key)
      const key = getRowKey(item);
      const exists = prevArr.some(i => getRowKey(i) === key);
      let newArr;
      if (exists) {
        newArr = prevArr.filter(i => getRowKey(i) !== key);
    } else {
        newArr = [...prevArr, item];
      }
      // If newArr is empty, remove the state key entirely
      if (newArr.length === 0) {
        const { [state]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [state]: newArr };
    });
    setChartRefreshKey(k => k + 1);
  };

  // Add this handler near other filter handlers
  const handleProviderTypeChange = async (providerType: string) => {
    setSelectedProviderType(providerType);
    if (typeof refreshData === 'function') {
      await refreshData({
        serviceCategory: selectedServiceCategory,
        state: selectedState,
        serviceCode: selectedServiceCode,
        serviceDescription: selectedServiceDescription,
        program: selectedProgram,
        locationRegion: selectedLocationRegion,
        modifier: selectedModifier,
        providerType: providerType
      });
    }
  };

  // Don't render anything until the subscription check is complete
  if (isLoading || !isAuthenticated || !isSubscriptionCheckComplete) {
    return (
      <div className="loader-overlay">
        <div className="cssloader">
          <div className="sh1"></div>
          <div className="sh2"></div>
          <h4 className="lt">loading</h4>
        </div>
      </div>
    );
  }

  return (
    <AppLayout activeTab="stateRateComparison">
      <div className="p-4 sm:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
        {/* Error Messages */}
        <div className="mb-4 sm:mb-8">
          <ErrorMessage 
            error={fetchError} 
            onRetry={() => window.location.reload()} 
          />
          <ErrorMessage error={filterError} />
          <ErrorMessage error={chartError} />
          <ErrorMessage error={tableError} />
          {authError && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
              <div className="flex items-center">
                <div className="h-5 w-5 text-yellow-500 mr-2">⚠️</div>
                <div>
                  <p className="text-yellow-700 font-medium">{authError}</p>
                  <button
                    onClick={() => router.push('/api/auth/login')}
                    className="mt-2 px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors text-sm"
                  >
                    Sign In Again
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Heading with Reset Button */}
        <div className="flex flex-col items-start mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-5xl md:text-6xl text-[#012C61] font-lemonMilkRegular uppercase mb-3 sm:mb-4">
            State Rate Comparison
          </h1>
          <button
            onClick={resetFilters}
            className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base bg-[#012C61] text-white rounded-lg hover:bg-blue-800 transition-colors"
          >
            Reset All Filters
          </button>
          <p className="text-sm text-gray-500 mt-2">
            <strong>Note:</strong> The rates displayed are the current rates as of the latest available data. Rates are subject to change based on updates from state programs.
          </p>
        </div>

        {/* Loading State */}
        {(filterLoading || dataLoading) && (
          <div className="loader-overlay">
            <div className="cssloader">
              <div className="sh1"></div>
              <div className="sh2"></div>
              <h4 className="lt">loading</h4>
            </div>
          </div>
        )}

        {!dataLoading && (
          <>
            {/* Filters */}
            <div className="mb-6 sm:mb-8">
              {filterSets.map((filterSet, index) => (
                <div key={index} className="p-4 sm:p-6 bg-white rounded-xl shadow-lg mb-4 relative">
                  {/* Filter Set Number Badge */}
                  <div className="absolute -top-3 -left-3 bg-[#012C61] text-white rounded-full w-8 h-8 flex items-center justify-center font-bold shadow-lg">
                    {index + 1}
                  </div>
                  {/* Remove button for extra filter sets */}
                  {index > 0 && (
                    <button
                      onClick={() => deleteFilterSet(index)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-xl font-bold focus:outline-none"
                      title="Remove this filter set"
                    >
                      ×
                    </button>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                    {/* Service Category Selector */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Service Line</label>
                      <Select
                        instanceId={`service-category-select-${index}`}
                        options={filterOptions.serviceCategories
                          .filter(category => {
                            const trimmedCategory = category.trim();
                            return trimmedCategory && 
                                   !['HCBS', 'IDD', 'SERVICE CATEGORY'].includes(trimmedCategory);
                          })
                          .map(category => ({ value: category, label: category }))}
                        value={filterSet.serviceCategory ? { value: filterSet.serviceCategory, label: filterSet.serviceCategory } : null}
                        onChange={(option) => handleServiceCategoryChange(index, option?.value || "")}
                        placeholder="Select Service Line"
                        isSearchable
                        filterOption={customFilterOption}
                        className="react-select-container"
                        classNamePrefix="react-select"
                      />
                    </div>

                    {/* State Selector */}
                    {filterSet.serviceCategory ? (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">State</label>
                        <Select
                          instanceId={`state-select-${index}`}
                          options={[
                            ...(index === 0 ? [{ value: "ALL_STATES", label: "All States" }] : []),
                            ...filterOptions.states.map(state => ({ value: state, label: state }))
                          ]}
                          value={
                            filterSet.states.length === filterOptions.states.length && index === 0
                              ? { value: "ALL_STATES", label: "All States" }
                              : filterSet.states.length > 0
                                ? { value: filterSet.states[0], label: filterSet.states[0] }
                                : null
                          }
                          onChange={(option) => {
                            handleStateChange(index, option);
                            setSelectedState(option?.value || "");
                            console.log('State selected (top-level):', option?.value);
                          }}
                          placeholder="Select State"
                          isSearchable
                          filterOption={customFilterOption}
                          className="react-select-container"
                          classNamePrefix="react-select"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">State</label>
                        <div className="text-gray-400 text-sm">
                          Select a service line first
                        </div>
                      </div>
                    )}

                    {/* Service Code Selector */}
                    {filterSet.serviceCategory && filterSet.states.length > 0 ? (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Service Code</label>
                        <Select
                          instanceId={`service-code-select-${index}`}
                          options={
                            isAllStatesSelected
                              ? filterSet.serviceCodeOptions.map(code => ({ value: code, label: code }))
                              : (filterOptions.serviceCodes || []).map((code) => ({ value: code, label: code }))
                          }
                          value={filterSet.serviceCode ? { value: filterSet.serviceCode, label: filterSet.serviceCode } : null}
                          onChange={(option) => handleServiceCodeChange(index, option?.value || "")}
                          placeholder="Select Service Code"
                          isSearchable
                          filterOption={customFilterOption}
                          className="react-select-container"
                          classNamePrefix="react-select"
                        />
                        {filterSet.serviceCode && (
                          <button
                            onClick={() => handleServiceCodeChange(index, "")}
                            className="text-xs text-blue-500 hover:underline mt-1"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Service Code</label>
                        <div className="text-gray-400 text-sm">
                          {filterSet.serviceCategory ? "Select a state to see available service codes" : "Select a service line first"}
                        </div>
                      </div>
                    )}

                    {/* Program Selector */}
                    {filterSet.serviceCategory && filterSet.states.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Program</label>
                        <Select
                          instanceId={`program-select-${index}`}
                          options={
                            (filterOptions.programs && filterOptions.programs.length > 0)
                              ? [{ value: '-', label: '-' }, ...filterOptions.programs.map(program => ({ value: program, label: program }))]
                              : []
                          }
                          value={selectedProgram ? { value: selectedProgram, label: selectedProgram } : null}
                          onChange={(option) => setSelectedProgram(option?.value || "")}
                          placeholder="Select Program"
                          isSearchable
                          filterOption={customFilterOption}
                          isDisabled={(filterOptions.programs || []).length === 0}
                          className={`react-select-container ${(filterOptions.programs || []).length === 0 ? 'opacity-50' : ''}`}
                          classNamePrefix="react-select"
                        />
                        {selectedProgram && (
                          <button
                            onClick={() => setSelectedProgram("")}
                            className="text-xs text-blue-500 hover:underline mt-1"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    )}

                    {/* Location/Region Selector */}
                    {filterSet.serviceCategory && filterSet.states.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Location/Region</label>
                        <Select
                          instanceId={`location-region-select-${index}`}
                          options={
                            (filterOptions.locationRegions && filterOptions.locationRegions.length > 0)
                              ? [{ value: '-', label: '-' }, ...filterOptions.locationRegions.map(region => ({ value: region, label: region }))]
                              : []
                          }
                          value={selectedLocationRegion ? { value: selectedLocationRegion, label: selectedLocationRegion } : null}
                          onChange={(option) => setSelectedLocationRegion(option?.value || "")}
                          placeholder="Select Location/Region"
                          isSearchable
                          filterOption={customFilterOption}
                          isDisabled={(filterOptions.locationRegions || []).length === 0}
                          className={`react-select-container ${(filterOptions.locationRegions || []).length === 0 ? 'opacity-50' : ''}`}
                          classNamePrefix="react-select"
                        />
                        {selectedLocationRegion && (
                          <button
                            onClick={() => setSelectedLocationRegion("")}
                            className="text-xs text-blue-500 hover:underline mt-1"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    )}

                    {/* Modifier Selector */}
                    {filterSet.serviceCategory && filterSet.states.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Modifier</label>
                        <Select
                          instanceId={`modifier-select-${index}`}
                          options={
                            (filterOptions.modifiers && filterOptions.modifiers.length > 0)
                              ? [{ value: '-', label: '-' }, ...filterOptions.modifiers]
                              : []
                          }
                          value={selectedModifier ? { value: selectedModifier, label: selectedModifier } : null}
                          onChange={(option) => setSelectedModifier(option?.value || "")}
                          placeholder="Select Modifier"
                          isSearchable
                          filterOption={customFilterOption}
                          isDisabled={(filterOptions.modifiers || []).length === 0}
                          className={`react-select-container ${(filterOptions.modifiers || []).length === 0 ? 'opacity-50' : ''}`}
                          classNamePrefix="react-select"
                        />
                        {selectedModifier && (
                          <button
                            onClick={() => setSelectedModifier("")}
                            className="text-xs text-blue-500 hover:underline mt-1"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    )}

                    {/* Provider Type Selector */}
                    {filterSet.serviceCategory && filterSet.states.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Provider Type</label>
                        <Select
                          instanceId={`provider-type-select-${index}`}
                          options={
                            (filterOptions.providerTypes && filterOptions.providerTypes.length > 0)
                              ? [{ value: '-', label: '-' }, ...filterOptions.providerTypes.map(type => ({ value: type, label: type }))]
                              : []
                          }
                          value={selectedProviderType ? { value: selectedProviderType, label: selectedProviderType } : null}
                          onChange={(option) => handleProviderTypeChange(option?.value || "")}
                          placeholder="Select Provider Type"
                          isSearchable
                          filterOption={customFilterOption}
                          isDisabled={(filterOptions.providerTypes || []).length === 0}
                          className={`react-select-container ${(filterOptions.providerTypes || []).length === 0 ? 'opacity-50' : ''}`}
                          classNamePrefix="react-select"
                        />
                        {selectedProviderType && (
                        <button
                            onClick={() => setSelectedProviderType("")}
                            className="text-xs text-blue-500 hover:underline mt-1"
                          >
                            Clear
                        </button>
                        )}
                      </div>
                    )}

                    {/* Service Description Selector */}
                    {filterSet.serviceCategory && filterSet.states.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Service Description</label>
                        <Select
                          instanceId={`service-description-select-${index}`}
                          options={
                            (filterOptions.serviceDescriptions && filterOptions.serviceDescriptions.length > 0)
                              ? [{ value: '-', label: '-' }, ...filterOptions.serviceDescriptions.map(desc => ({ value: desc, label: desc }))]
                              : []
                          }
                          value={selectedServiceDescription ? { value: selectedServiceDescription, label: selectedServiceDescription } : null}
                          onChange={(option) => setSelectedServiceDescription(option?.value || "")}
                          placeholder="Select Service Description"
                          isSearchable
                          filterOption={customFilterOption}
                          isDisabled={(filterOptions.serviceDescriptions || []).length === 0}
                          className={`react-select-container ${(filterOptions.serviceDescriptions || []).length === 0 ? 'opacity-50' : ''}`}
                          classNamePrefix="react-select"
                        />
                        {selectedServiceDescription && (
                          <button
                            onClick={() => setSelectedServiceDescription("")}
                            className="text-xs text-blue-500 hover:underline mt-1"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <button
                onClick={() => setFilterSets([...filterSets, { serviceCategory: "", states: [], serviceCode: "", stateOptions: [], serviceCodeOptions: [] }])}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Add State to Compare Rate
              </button>
            </div>

            {/* Comparison Metrics */}
            {shouldShowMetrics && (
              <div className="mb-8 p-6 bg-white rounded-xl shadow-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Highest Rate */}
                  <div className="flex items-center space-x-4 p-4 bg-green-100 rounded-lg">
                    <FaArrowUp className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-sm text-gray-500">Highest Rate of Selected States</p>
                      <p className="text-xl font-semibold text-gray-800">${maxRate.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Lowest Rate */}
                  <div className="flex items-center space-x-4 p-4 bg-red-50 rounded-lg">
                    <FaArrowDown className="h-8 w-8 text-red-500" />
                    <div>
                      <p className="text-sm text-gray-500">Lowest Rate of Selected States</p>
                      <p className="text-xl font-semibold text-gray-800">${minRate.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Graph Component */}
            {(isAllStatesSelected && filterSets[0]?.serviceCode && echartOptions) || (Object.values(selectedEntries).length > 0 && echartOptions) ? (
              <>
                {/* Display the comment above the graph */}
                {comments.length > 0 && (
                  <div className="space-y-4 mb-4">
                    {comments.map(({ state, comment }, index) => (
                      <div key={index} className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-700">
                          <strong>Comment for {state}:</strong> {comment}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {/* Chart component */}
                <ReactECharts
                  key={JSON.stringify(Object.keys(selectedEntries).sort()) + '-' + chartRefreshKey}
                  option={echartOptions}
                  style={{ height: '400px', width: '100%' }}
                />
              </>
            ) : null}

            {/* Empty State */}
            {shouldShowEmptyState && (
              <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-white rounded-xl shadow-lg text-center">
                <div className="flex justify-center items-center mb-2 sm:mb-3">
                  <FaChartBar className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
                </div>
                <p className="text-sm sm:text-base text-gray-600 font-medium">
                  Select data from the tables below to generate the rate comparison visualization
                </p>
              </div>
            )}

            {/* Data Table */}
            <DataTable
              filterSets={filterSets.map((set, index) => ({ ...set, number: index + 1 }))}
              latestRates={filterSets.flatMap((_, idx) => filterSetData[idx] || [])}
              selectedProgram={selectedProgram}
              selectedLocationRegion={selectedLocationRegion}
              selectedModifier={selectedModifier}
              selectedServiceDescription={selectedServiceDescription}
              selectedProviderType={selectedProviderType}
              selectedTableRows={selectedTableRows}
              isAllStatesSelected={isAllStatesSelected}
              onRowSelection={handleRowSelection}
              formatText={formatText}
              selectedEntries={selectedEntries}
            />

            {/* Calculation Details */}
            <CalculationDetails />
          </>
        )}
      </div>
    </AppLayout>
  );
}