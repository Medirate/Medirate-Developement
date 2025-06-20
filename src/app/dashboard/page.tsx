"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import AppLayout from "@/app/components/applayout";
import { FaExclamationCircle, FaFilter } from 'react-icons/fa';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useData, ServiceData } from "@/context/DataContext";
import Select from 'react-select';
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Removed unused useClickOutside hook - React-select handles dropdown behavior

const FilterNote = ({ step }: { step: number }) => {
  const messages = [
    "Please select a Service Line to begin filtering",
    "Now select a State to continue",
    "Select a Service Code, Service Description, or Fee Schedule Date to complete filtering"
  ];

  // Don't show message if we're past step 3
  if (step > 3) return null;

  return (
    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <p className="text-sm text-blue-700">
        {messages[step - 1]}
      </p>
    </div>
  );
};

// Add this interface near the top of the file with other interfaces
interface RefreshDataResponse {
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
    modifiers: string[];
  };
}

// Add these mappings near the top, after imports and before the Dashboard component
const SERVICE_CATEGORY_ABBREVIATIONS: Record<string, string> = {
  "APPLIED BEHAVIOR ANALYSIS": "ABA",
  "APPLIED BEHAVIORAL ANALYSIS (ABA)": "ABA",
  "BEHAVIORAL HEALTH": "BH",
  "BEHAVIORAL HEALTH AND/OR SUBSTANCE USE DISORDER SERVICES": "BH/SUD",
  "HOME AND COMMUNITY BASED SERVICES": "HCBS",
  // Add more as needed
};

const STATE_ABBREVIATIONS: Record<string, string> = {
  "ALABAMA": "AL",
  "ALASKA": "AK",
  "ARIZONA": "AZ",
  "ARKANSAS": "AR",
  "CALIFORNIA": "CA",
  "COLORADO": "CO",
  "CONNECTICUT": "CT",
  "DELAWARE": "DE",
  "FLORIDA": "FL",
  "GEORGIA": "GA",
  "HAWAII": "HI",
  "IDAHO": "ID",
  "ILLINOIS": "IL",
  "INDIANA": "IN",
  "IOWA": "IA",
  "KANSAS": "KS",
  "KENTUCKY": "KY",
  "LOUISIANA": "LA",
  "MAINE": "ME",
  "MARYLAND": "MD",
  "MASSACHUSETTS": "MA",
  "MICHIGAN": "MI",
  "MINNESOTA": "MN",
  "MISSISSIPPI": "MS",
  "MISSOURI": "MO",
  "MONTANA": "MT",
  "NEBRASKA": "NE",
  "NEVADA": "NV",
  "NEW HAMPSHIRE": "NH",
  "NEW JERSEY": "NJ",
  "NEW MEXICO": "NM",
  "NEW YORK": "NY",
  "NORTH CAROLINA": "NC",
  "NORTH DAKOTA": "ND",
  "OHIO": "OH",
  "OKLAHOMA": "OK",
  "OREGON": "OR",
  "PENNSYLVANIA": "PA",
  "RHODE ISLAND": "RI",
  "SOUTH CAROLINA": "SC",
  "SOUTH DAKOTA": "SD",
  "TENNESSEE": "TN",
  "TEXAS": "TX",
  "UTAH": "UT",
  "VERMONT": "VT",
  "VIRGINIA": "VA",
  "WASHINGTON": "WA",
  "WEST VIRGINIA": "WV",
  "WISCONSIN": "WI",
  "WYOMING": "WY",
  // Add more if needed
};

// Insert a type alias (Option) near the top (e.g. after imports)
type Option = { value: string; label: string };

// Add this custom filter function before the Dashboard component
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

export default function Dashboard() {
  const { isAuthenticated, isLoading, user } = useKindeBrowserClient();
  const router = useRouter();
  const [isSubscriptionCheckComplete, setIsSubscriptionCheckComplete] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50; // Adjust this number based on your needs

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

  // Add a periodic authentication check for long-running sessions
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkAuthStatus = async () => {
      try {
        // Make a lightweight authenticated request to verify the session is still valid
        const response = await fetch('/api/auth-check');
        if (response.status === 401) {
          console.warn('🔄 Session expired, redirecting to login...');
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
        
        // If user has searched before and no auth errors, refresh the current data
        if (hasSearched && !authError && getAreFiltersApplied()) {
          console.log('🔄 Tab became visible, refreshing current search...');
          handleSearch();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(authCheckInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, router]);

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

  // Update useData destructuring to include refreshFilters
  const { data, loading, error, filterOptions, refreshData, refreshFilters } = useData();

  // Add state to track authentication errors specifically
  const [authError, setAuthError] = useState<string | null>(null);

  // Filter states
  const [selectedServiceCategory, setSelectedServiceCategory] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedServiceCode, setSelectedServiceCode] = useState("");
  const [selectedServiceDescription, setSelectedServiceDescription] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedLocationRegion, setSelectedLocationRegion] = useState("");
  const [selectedModifier, setSelectedModifier] = useState("");
  const [selectedProviderType, setSelectedProviderType] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // Dropdown visibility states - now handled by react-select component
  // Removed unused visibility state variables for cleaner code

  // Unique filter options
  const [serviceCategories, setServiceCategories] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [serviceCodes, setServiceCodes] = useState<string[]>([]);
  const [serviceDescriptions, setServiceDescriptions] = useState<string[]>([]);
  const [programs, setPrograms] = useState<string[]>([]);
  const [locationRegions, setLocationRegions] = useState<string[]>([]);
  const [providerTypes, setProviderTypes] = useState<string[]>([]);
  const [modifiers, setModifiers] = useState<{ value: string; label: string }[]>([]);

  // Add missing variables that are referenced but not declared
  const [hasSearched, setHasSearched] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);

  // Removed unused dropdown refs and click-outside handlers
  // React-select handles dropdown behavior internally

  // Add new state for selected year
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // Add a state to track the current step
  const [filterStep, setFilterStep] = useState(1);

  // Add Fee Schedule Dates Dropdown
  const [selectedFeeScheduleDate, setSelectedFeeScheduleDate] = useState("");
  const [feeScheduleDates, setFeeScheduleDates] = useState<string[]>([]);

  // Simplified state for filter options
  const [allFilterOptions, setAllFilterOptions] = useState<{
    [key: string]: string[];
  }>({});

  // Simple initial load - no complex preloading
  useEffect(() => {
    const loadInitialOptions = async () => {
      try {
        const response = await fetch('/api/state-payment-comparison?mode=filters');
        if (!response.ok) throw new Error('Failed to fetch filter options');
        const data = await response.json();
        
        setServiceCategories(data.filterOptions.serviceCategories);
        setStates(data.filterOptions.states);
        
        setAllFilterOptions({
          serviceCategories: data.filterOptions.serviceCategories,
          states: data.filterOptions.states
        });
      } catch (error) {
        console.error('Error loading filter options:', error);
        setLocalError('Failed to load filter options. Please refresh the page.');
      }
    };

    loadInitialOptions();
  }, []);

  // Ultra-fast service category change - no API calls needed
  const handleServiceCategoryChange = (category: string) => {
    setSelectedServiceCategory(category);
    setSelectedState("");
    setSelectedServiceCode("");
    setSelectedServiceDescription("");
    setSelectedProgram("");
    setSelectedLocationRegion("");
    setSelectedModifier("");
    setSelectedProviderType("");
    setFilterStep(2);
    setCurrentPage(1);

    // Reset all dependent filter options
    setServiceCodes([]);
    setServiceDescriptions([]);
    setPrograms([]);
    setLocationRegions([]);
    setModifiers([]);
    setProviderTypes([]);

    // No API call needed - states are already loaded!
    // The states dropdown will show all available states
  };

  // Removed automatic filter options syncing to avoid conflicts with manual loading

  // Removed automatic syncing to prevent conflicts with manual API calls

  // Removed state syncing to avoid conflicts

  // Move the parseDate function here, before filteredData
  const parseDate = (dateString: string | null) => {
    if (!dateString) return null; // Skip null or undefined dates

    if (!isNaN(Number(dateString))) {
      const serialDate = Number(dateString);
      const date = new Date(Date.UTC(1900, 0, serialDate - 1)); // Convert serial date to Date object
      if (isNaN(date.getTime())) {
        return null; // Skip invalid serial dates
      }
      return date;
    }

    const dateParts = dateString.split('/');
    if (dateParts.length !== 3) {
      return null; // Skip invalid date formats
    }

    const month = parseInt(dateParts[0], 10) - 1; // Months are 0-based in JavaScript
    const day = parseInt(dateParts[1], 10);
    const year = parseInt(dateParts[2], 10);

    if (isNaN(month) || isNaN(day) || isNaN(year)) {
      return null; // Skip invalid date parts
    }

    const date = new Date(Date.UTC(year, month, day));
    if (isNaN(date.getTime())) {
      return null; // Skip invalid dates
    }

    return date;
  };

  // Since backend handles all filtering, we use the data directly
  // No need for complex frontend filtering that duplicates backend work

  // Update the sortConfig state initialization
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }[]>([]);

  // Function to check if filters are applied - avoids variable declaration order issues
  const getAreFiltersApplied = () => selectedState && selectedServiceCategory && (selectedServiceCode || selectedServiceDescription || selectedFeeScheduleDate || (startDate && endDate));

  // Update the handleSort function
  const handleSort = (key: string, event: React.MouseEvent) => {
    event.preventDefault();
    
    setSortConfig(prev => {
      const isCtrlPressed = event.ctrlKey;
      const existingSort = prev.find(sort => sort.key === key);
      const existingIndex = prev.findIndex(sort => sort.key === key);
      
      if (existingSort) {
        // If it's any sort (primary or secondary) and Ctrl isn't pressed
        if (!isCtrlPressed) {
          // If already descending, remove the sort
          if (existingSort.direction === 'desc') {
            return prev.filter(sort => sort.key !== key);
          }
          // Otherwise, toggle direction
          return prev.map((sort, i) => 
            i === existingIndex ? { ...sort, direction: sort.direction === 'asc' ? 'desc' : 'asc' } : sort
          );
        }
        // If Ctrl is pressed and it's a secondary sort, toggle its direction
        if (existingIndex > 0) {
          return prev.map((sort, i) => 
            i === existingIndex ? { ...sort, direction: sort.direction === 'asc' ? 'desc' : 'asc' } : sort
          );
        }
        // Remove if it's a secondary sort with Ctrl pressed
        return prev.filter(sort => sort.key !== key);
      }
      
      // Add new sort
      const newSort = { key, direction: 'asc' as const };
      
      if (isCtrlPressed) {
        return [...prev, newSort];
      }
      
      return [newSort];
    });
    
    // Add animation class
    const header = event.currentTarget;
    header.classList.add('sort-animation');
    setTimeout(() => {
      header.classList.remove('sort-animation');
    }, 200);
  };

  // Update the SortIndicator component
  const SortIndicator = ({ sortKey }: { sortKey: string }) => {
    const sort = sortConfig.find(sort => sort.key === sortKey);
    if (!sort) return null;
    
    return (
      <span className="ml-1 sort-indicator">
        <span className="arrow" style={{ 
          display: 'inline-block',
          transition: 'transform 0.2s ease',
          transform: sort.direction === 'asc' ? 'rotate(0deg)' : 'rotate(180deg)'
        }}>
          ▲
        </span>
        {sortConfig.length > 1 && (
          <sup className="sort-priority">
            {sortConfig.findIndex(s => s.key === sortKey) + 1}
          </sup>
        )}
      </span>
    );
  };

  // Simplified sorting using backend-filtered data directly
  const sortedData = useMemo(() => {
    if (sortConfig.length === 0) return data;

    return [...data].sort((a, b) => {
      for (const sort of sortConfig) {
        let valueA: string | number | Date = a[sort.key] || '';
        let valueB: string | number | Date = b[sort.key] || '';
        
        // Handle rate column specifically
        if (sort.key === 'rate') {
          valueA = Number((valueA as string)?.replace(/[^0-9.]/g, "") || 0);
          valueB = Number((valueB as string)?.replace(/[^0-9.]/g, "") || 0);
        }
        // Handle other numeric strings
        else if (typeof valueA === 'string' && !isNaN(Number(valueA))) {
          valueA = Number(valueA);
          valueB = Number(valueB);
        }
        
        // Handle dates
        if (sort.key === 'rate_effective_date') {
          valueA = new Date(valueA);
          valueB = new Date(valueB);
        }
        
        if (valueA < valueB) return sort.direction === 'asc' ? -1 : 1;
        if (valueA > valueB) return sort.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortConfig]);

  // Removed unused table height calculation

  // Removed expensive data analysis and logging that was causing performance issues

  // Update ErrorMessage component to handle null
  const ErrorMessage = ({ error }: { error: string | null }) => {
    if (!error) return null;
    
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
        <div className="flex items-center">
          <FaExclamationCircle className="h-5 w-5 text-red-500 mr-2" />
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  };

  // All filtering now handled by backend for optimal performance
  // Removed unused dropdown utility functions

  const handleServiceCodeChange = async (code: string) => {
    setSelectedServiceCode(code);
    setSelectedServiceDescription("");
    setSelectedProgram("");
    setSelectedLocationRegion("");
    setSelectedModifier("");
    setSelectedProviderType("");
    setFilterStep(4);
    setCurrentPage(1);

    // Clear other filter options
    setPrograms([]);
    setLocationRegions([]);
    setModifiers([]);
    setProviderTypes([]);

    if (code) {
      // NOW load the full table data
      console.log('🔄 Loading table data for service code:', code);
      setIsSearching(true);
      try {
        const filters = addDateFilters({
      serviceCategory: selectedServiceCategory,
      state: selectedState,
          serviceCode: code,
          page: "1",
          itemsPerPage: String(itemsPerPage)
        });
        
        const result = await refreshData(filters);
        
        if (result?.data && Array.isArray(result.data)) {
          console.log('✅ Table data loaded:', result.data.length, 'rows');
          setTotalCount(result.totalCount);
          setHasSearched(true);
        }
      } catch (error) {
        console.error('Error loading table data:', error);
        setLocalError('Failed to load data for selected service code.');
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handleServiceDescriptionChange = async (desc: string) => {
    setSelectedServiceDescription(desc);
    setSelectedServiceCode("");
    setSelectedProgram("");
    setSelectedLocationRegion("");
    setSelectedModifier("");
    setSelectedProviderType("");
    setFilterStep(4);
    setCurrentPage(1);

    // Clear other filter options
    setPrograms([]);
    setLocationRegions([]);
    setModifiers([]);
    setProviderTypes([]);

    if (desc) {
      // NOW load the full table data
      console.log('🔄 Loading table data for service description:', desc);
      setIsSearching(true);
      try {
        const filters = addDateFilters({
      serviceCategory: selectedServiceCategory,
      state: selectedState,
          serviceDescription: desc,
          page: "1",
          itemsPerPage: String(itemsPerPage)
        });
        
        const result = await refreshData(filters);
        
        if (result?.data && Array.isArray(result.data)) {
          console.log('✅ Table data loaded:', result.data.length, 'rows');
          setTotalCount(result.totalCount);
          setHasSearched(true);
        }
      } catch (error) {
        console.error('Error loading table data:', error);
        setLocalError('Failed to load data for selected service description.');
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handleProgramChange = async (program: string) => {
    setSelectedProgram(program);
    setSelectedLocationRegion("");
    setSelectedModifier("");
    setSelectedProviderType("");

    // Reset dependent filter options
    setLocationRegions([]);
    setModifiers([]);
    setProviderTypes([]);

    try {
      const filters = addDateFilters({
        serviceCategory: selectedServiceCategory,
        state: selectedState,
        serviceCode: selectedServiceCode,
        serviceDescription: selectedServiceDescription,
        program: program
      });
      await refreshData(filters);
    } catch (error) {
      console.error('Error updating program filter:', error);
      setLocalError('Failed to update program filter. Please try again.');
    }
  };

  const handleLocationRegionChange = async (region: string) => {
    setSelectedLocationRegion(region);
    setSelectedModifier("");
    setSelectedProviderType("");

    // Reset dependent filter options
    setModifiers([]);
    setProviderTypes([]);

    try {
      const filters = addDateFilters({
        serviceCategory: selectedServiceCategory,
        state: selectedState,
        serviceCode: selectedServiceCode,
        serviceDescription: selectedServiceDescription,
        program: selectedProgram,
        locationRegion: region
      });
      await refreshData(filters);
    } catch (error) {
      console.error('Error updating location/region filter:', error);
      setLocalError('Failed to update location/region filter. Please try again.');
    }
  };

  const ClearButton = ({ onClick }: { onClick: () => void }) => (
    <button
      onClick={onClick}
      className="text-xs text-blue-500 hover:underline mt-1"
    >
      Clear
    </button>
  );

  // Update the resetFilters function
  const resetFilters = async () => {
    setSelectedServiceCategory("");
    setSelectedState("");
    setSelectedServiceCode("");
    setSelectedServiceDescription("");
    setSelectedProgram("");
    setSelectedLocationRegion("");
    setSelectedModifier("");
    setSelectedProviderType("");
    setSelectedFeeScheduleDate("");
    setStartDate(null);
    setEndDate(null);
    setServiceCodes([]);
    setStates([]);
    setPrograms([]);
    setLocationRegions([]);
    setModifiers([]);
    setProviderTypes([]);
    setFilterStep(1);
    setCurrentPage(1);
    setHasSearched(false);

    // Reset to initial filter options
    await refreshFilters();
    
    // Update filter options
    setServiceCategories(filterOptions.serviceCategories);
    setStates(filterOptions.states);
  };

  // Helper function to fetch fee schedule dates
  const fetchFeeScheduleDates = async (serviceCategory: string, state: string) => {
    try {
      console.log('🔄 Loading fee schedule dates for:', serviceCategory, state);
      const response = await fetch(`/api/state-payment-comparison?mode=feeScheduleDates&serviceCategory=${encodeURIComponent(serviceCategory)}&state=${encodeURIComponent(state)}`);
      
      if (response.ok) {
        const data = await response.json();
        setFeeScheduleDates(data.dates || []);
        console.log(`✅ Loaded ${data.dates?.length || 0} fee schedule dates`);
      }
    } catch (error) {
      console.error('❌ Error loading fee schedule dates:', error);
    }
  };

  // Smart state change - only load filter options, not full data
  const handleStateChange = async (state: string) => {
    console.log('=== State Change ===');
    console.log('Selected state:', state);
    
    setSelectedState(state);
    setSelectedServiceCode("");
    setSelectedServiceDescription("");
    setSelectedProgram("");
    setSelectedLocationRegion("");
    setSelectedModifier("");
    setSelectedProviderType("");
    setSelectedFeeScheduleDate("");
    setStartDate(null);
    setEndDate(null);
    setFilterStep(3);
    setCurrentPage(1);

    // Reset dependent filter options
    setServiceCodes([]);
    setServiceDescriptions([]);
    setPrograms([]);
    setLocationRegions([]);
    setModifiers([]);
    setProviderTypes([]);

    if (!state) {
      setIsLoadingFilters(false);
      return;
    }

    setIsLoadingFilters(true);
    try {
      // Only fetch filter options (service codes, descriptions, dates) - NO table data yet
      console.log('🔄 Loading filter options for:', selectedServiceCategory, state);
      const url = `/api/state-payment-comparison?mode=filters&serviceCategory=${encodeURIComponent(selectedServiceCategory)}&state=${encodeURIComponent(state)}`;
      console.log('📡 API URL:', url);
      
      const response = await fetch(url);
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📡 Full API response:', data);
        
        // Check if the response has the expected structure
        if (data.filterOptions) {
          setServiceCodes(data.filterOptions.serviceCodes || []);
          setServiceDescriptions(data.filterOptions.serviceDescriptions || []);
          setPrograms(data.filterOptions.programs || []);
          setLocationRegions(data.filterOptions.locationRegions || []);
          setModifiers(data.filterOptions.modifiers || []);
          setProviderTypes(data.filterOptions.providerTypes || []);
          
          // Also load fee schedule dates for this service category and state
          if (data.filterOptions.feeScheduleDates) {
            setFeeScheduleDates(data.filterOptions.feeScheduleDates);
      } else {
            setFeeScheduleDates([]);
          }
          
          console.log(`✅ Loaded filter options:`);
          console.log(`  - Service codes: ${data.filterOptions.serviceCodes?.length || 0}`);
          console.log(`  - Service descriptions: ${data.filterOptions.serviceDescriptions?.length || 0}`);
          console.log(`  - Programs: ${data.filterOptions.programs?.length || 0}`);
          console.log(`  - Location regions: ${data.filterOptions.locationRegions?.length || 0}`);
          console.log(`  - Provider types: ${data.filterOptions.providerTypes?.length || 0}`);
          console.log(`  - Modifiers: ${data.filterOptions.modifiers?.length || 0}`);
          console.log(`  - Fee schedule dates: ${data.filterOptions.feeScheduleDates?.length || 0}`);
        } else {
          console.error('❌ API response missing filterOptions:', data);
          setLocalError('Invalid response format from API');
        }
      } else {
        const errorText = await response.text();
        console.error('❌ API error:', response.status, errorText);
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Error loading filter options:', error);
      setLocalError('Failed to load filter options for selected state.');
    } finally {
      setIsLoadingFilters(false);
    }
  };

  // Removed unused dropdown selection logic
  // React-select components handle their own dropdown behavior

  // Update the handleYearSelect function
  const handleYearSelect = (year: number) => {
    if (selectedYear === year) {
      // If clicking the same year, reset to default date range
      setSelectedYear(null);
      setStartDate(null);
      setEndDate(null);
    } else {
      // Set the selected year and update date range
      setSelectedYear(year);
      setStartDate(new Date(year, 0, 1)); // January 1st of selected year
      setEndDate(new Date(year, 11, 31)); // December 31st of selected year
    }
  };

  // Removed getVisibleColumns - now using static column layout for better performance

  // Create a utility function to format text
  const formatText = (text: string | null | undefined) => {
    return text || '-';
  };

  // Static IDs for form elements (no need for useId() overhead)
  const serviceCategoryId = "serviceCategorySelect";
  const stateId = "stateSelect";
  const serviceCodeId = "serviceCodeSelect";
  const serviceDescriptionId = "serviceDescriptionSelect";
  const programId = "programSelect";
  const locationRegionId = "locationRegionSelect";
  const modifierId = "modifierSelect";

  // Fee schedule dates will be loaded with other filter options

  // Optimized data processing - pre-compute expensive operations
  const optimizedData = useMemo(() => {
    return sortedData.map((item: ServiceData, index: number) => {
      const num = item.rate ? Number(item.rate.replace(/[^0-9.]/g, "")) : NaN;
      return {
        ...item,
        // Pre-compute expensive string operations
        stateDisplay: STATE_ABBREVIATIONS[item.state_name?.toUpperCase() || ""] || item.state_name || '-',
        categoryDisplay: SERVICE_CATEGORY_ABBREVIATIONS[item.service_category?.trim().toUpperCase() || ""] || item.service_category || '-',
        rateDisplay: item.rate ? (isNaN(num) ? (item.rate.startsWith('$') ? item.rate : ('$' + item.rate)) : `$${num.toFixed(2)}`) : '-',
        modifier1Display: item.modifier_1 ? `${item.modifier_1}${item.modifier_1_details ? ` - ${item.modifier_1_details}` : ''}` : '-',
        modifier2Display: item.modifier_2 ? `${item.modifier_2}${item.modifier_2_details ? ` - ${item.modifier_2_details}` : ''}` : '-',
        modifier3Display: item.modifier_3 ? `${item.modifier_3}${item.modifier_3_details ? ` - ${item.modifier_3_details}` : ''}` : '-',
        modifier4Display: item.modifier_4 ? `${item.modifier_4}${item.modifier_4_details ? ` - ${item.modifier_4_details}` : ''}` : '-',
        // Use index as key for better performance
        rowKey: `row-${index}`
      };
    });
  }, [sortedData]);

  // Update the Date Range fields to disable them when a Fee Schedule Date is selected
  const isDateRangeDisabled = !!selectedFeeScheduleDate;

  // Variables were moved up to prevent duplication
  
  // Remove this definition and define it inline where needed
  
  const handleSearch = useCallback(async () => {
    setIsSearching(true);
    try {
      console.log('handleSearch called. currentPage:', currentPage);
      const filters: any = {
        serviceCategory: selectedServiceCategory,
        state: selectedState,
        serviceCode: selectedServiceCode,
        serviceDescription: selectedServiceDescription,
        program: selectedProgram,
        locationRegion: selectedLocationRegion,
        modifier: selectedModifier,
        providerType: selectedProviderType,
        page: String(currentPage),
        itemsPerPage: String(itemsPerPage)
      };

      // Add date filters if they are set
      if (selectedFeeScheduleDate) {
        filters.feeScheduleDate = selectedFeeScheduleDate;
      } else if (startDate && endDate) {
        filters.startDate = startDate.toISOString().split('T')[0];
        filters.endDate = endDate.toISOString().split('T')[0];
      } else if (startDate) {
        filters.startDate = startDate.toISOString().split('T')[0];
      } else if (endDate) {
        filters.endDate = endDate.toISOString().split('T')[0];
      }
      
      // Log the filters being sent
      console.log('Filters sent to refreshData:', filters);
      
      // Ensure state filter is included
      if (!filters.state) {
        console.warn('No state selected for search');
        setLocalError('Please select a state to search');
        return;
      }
      
      const result = await refreshData(filters) as RefreshDataResponse | null;
      console.log('Result received from refreshData:', result);
      
      if (result?.data && Array.isArray(result.data)) {
        console.log('Search successful. Data length:', result.data.length);
        setTotalCount(result.totalCount);
        setHasSearched(true);
        setAuthError(null); // Clear any previous auth errors on success
      } else {
        console.error('Invalid response format:', result);
        setLocalError('Received invalid data format from server');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      
      // Check if it's an authentication error
      if (error instanceof Error && error.message.includes('Authentication')) {
        setAuthError('Your session has expired. Please sign in again.');
        setLocalError(null);
      } else {
      setLocalError('Failed to fetch data. Please try again.');
        setAuthError(null);
      }
    } finally {
      setIsSearching(false);
    }
  }, [
    currentPage,
    selectedServiceCategory,
    selectedState,
    selectedServiceCode,
    selectedServiceDescription,
    selectedProgram,
    selectedLocationRegion,
    selectedModifier,
    selectedProviderType,
    selectedFeeScheduleDate,
    startDate,
    endDate,
    itemsPerPage,
    refreshData,
    setIsSearching,
    setLocalError,
    setTotalCount,
    setHasSearched
  ]);

  // Fetch new data when the page changes (after a search)
  useEffect(() => {
    if (hasSearched) {
      handleSearch();
    }
  }, [currentPage, hasSearched, handleSearch]);

  // Add pagination controls component
  const PaginationControls = () => {
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    const maxPageButtons = 7;
    const pageNumbers = [];
    let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    let endPage = startPage + maxPageButtons - 1;
    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - maxPageButtons + 1);
    }
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalCount);
    return (
      <div className="flex flex-col items-center justify-center mt-4">
        <div className="mb-2 text-sm text-gray-700">
          Showing <span className="font-medium">{startItem}</span> to <span className="font-medium">{endItem}</span> of <span className="font-medium">{totalCount}</span> results
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-2 py-1 rounded hover:bg-blue-100 disabled:opacity-50"
            >
              {'<<'}
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-2 py-1 rounded hover:bg-blue-100 disabled:opacity-50"
            >
              {'<'}
            </button>
            {startPage > 1 && <span className="px-2">...</span>}
            {pageNumbers.map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 rounded ${currentPage === page ? 'bg-blue-600 text-white' : 'hover:bg-blue-100'}`}
              >
                {page}
              </button>
            ))}
            {endPage < totalPages && <span className="px-2">...</span>}
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-2 py-1 rounded hover:bg-blue-100 disabled:opacity-50"
            >
              {'>'}
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-2 py-1 rounded hover:bg-blue-100 disabled:opacity-50"
            >
              {'>>'}
            </button>
          </div>
          {/* Searchable page number input */}
          <form
            onSubmit={e => {
              e.preventDefault();
              const page = Number(e.currentTarget.pageInput.value);
              if (!isNaN(page) && page >= 1 && page <= totalPages) {
                setCurrentPage(page);
              }
            }}
            className="flex items-center space-x-2"
          >
            <span>Go to</span>
            <input
              name="pageInput"
              type="number"
              min={1}
              max={totalPages}
              defaultValue={currentPage}
              className="w-16 px-2 py-1 border rounded text-center"
            />
            <span>of {totalPages}</span>
            <button
              type="submit"
              className="ml-2 px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600"
            >
              Go
            </button>
          </form>
        </div>
      </div>
    );
  };

  // Backend handles pagination, so we use sortedData directly

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Filter options are now handled by the backend API

  // Replace the getDropdownOptions function with the following:
  const getDropdownOptions = (options: (Option | string)[], isMandatory: boolean): readonly Option[] => {
    const opts: Option[] = options.map(opt => (typeof opt === 'string' ? { value: opt, label: opt } : opt));
    return isMandatory ? opts : [{ value: '-', label: '-' }, ...opts] as const;
  };

  // Add this after state declarations
  const isStateSelected = !!selectedState && (serviceCodes.length > 0 || serviceDescriptions.length > 0 || feeScheduleDates.length > 0) && !isLoadingFilters;
  const hasAnyPrimaryFilter =
    !!selectedServiceCode ||
    !!selectedServiceDescription ||
    (!!startDate && !!endDate) ||
    !!selectedFeeScheduleDate;

  // Helper function to add date filters to any filter object
  const addDateFilters = (filters: any) => {
    if (selectedFeeScheduleDate) {
      filters.feeScheduleDate = selectedFeeScheduleDate;
    } else if (startDate && endDate) {
      filters.startDate = startDate.toISOString().split('T')[0];
      filters.endDate = endDate.toISOString().split('T')[0];
    } else if (startDate) {
      filters.startDate = startDate.toISOString().split('T')[0];
    } else if (endDate) {
      filters.endDate = endDate.toISOString().split('T')[0];
    }
    return filters;
  };

  // Add this handler near other filter handlers
  const handleProviderTypeChange = async (providerType: string) => {
    setSelectedProviderType(providerType);
    setFilterStep(4);
    const filters = addDateFilters({
      serviceCategory: selectedServiceCategory,
      state: selectedState,
      serviceCode: selectedServiceCode,
      serviceDescription: selectedServiceDescription,
      program: selectedProgram,
      locationRegion: selectedLocationRegion,
      modifier: selectedModifier,
      providerType: providerType
    });
    await refreshData(filters);
  };

  // Add date filter handlers
  const handleStartDateChange = async (date: Date | null) => {
    setStartDate(date);
    if (date && endDate) {
      // Both dates are set, load table data
      console.log('🔄 Loading table data for date range:', date.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0]);
      setCurrentPage(1);
      setIsSearching(true);
      
      try {
        const result = await refreshData({
          serviceCategory: selectedServiceCategory,
          state: selectedState,
          startDate: date.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          page: "1",
          itemsPerPage: String(itemsPerPage)
        });
        
        if (result?.data && Array.isArray(result.data)) {
          console.log('✅ Table data loaded:', result.data.length, 'rows');
          setTotalCount(result.totalCount);
          setHasSearched(true);
        }
      } catch (error) {
        console.error('Error loading table data:', error);
        setLocalError('Failed to load data for selected date range.');
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handleEndDateChange = async (date: Date | null) => {
    setEndDate(date);
    if (date && startDate) {
      // Both dates are set, load table data
      console.log('🔄 Loading table data for date range:', startDate.toISOString().split('T')[0], 'to', date.toISOString().split('T')[0]);
      setCurrentPage(1);
      setIsSearching(true);
      
      try {
        const result = await refreshData({
          serviceCategory: selectedServiceCategory,
          state: selectedState,
          startDate: startDate.toISOString().split('T')[0],
          endDate: date.toISOString().split('T')[0],
          page: "1",
          itemsPerPage: String(itemsPerPage)
        });
        
        if (result?.data && Array.isArray(result.data)) {
          console.log('✅ Table data loaded:', result.data.length, 'rows');
          setTotalCount(result.totalCount);
          setHasSearched(true);
        }
      } catch (error) {
        console.error('Error loading table data:', error);
        setLocalError('Failed to load data for selected date range.');
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handleFeeScheduleDateChange = async (feeScheduleDate: string) => {
    setSelectedFeeScheduleDate(feeScheduleDate);
    setCurrentPage(1);
    
    if (feeScheduleDate) {
      setStartDate(null);
      setEndDate(null);
      
      // Load table data with fee schedule date filter
      console.log('🔄 Loading table data for fee schedule date:', feeScheduleDate);
      setIsSearching(true);
      try {
        const result = await refreshData({
          serviceCategory: selectedServiceCategory,
          state: selectedState,
          feeScheduleDate: feeScheduleDate,
          page: "1",
          itemsPerPage: String(itemsPerPage)
        });
        
        if (result?.data && Array.isArray(result.data)) {
          console.log('✅ Table data loaded:', result.data.length, 'rows');
          setTotalCount(result.totalCount);
          setHasSearched(true);
        }
      } catch (error) {
        console.error('Error loading table data:', error);
        setLocalError('Failed to load data for selected fee schedule date.');
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handleStartDateClear = async () => {
    setStartDate(null);
    if (endDate) {
      // If end date is still set, just clear start date from backend
      await refreshData({
        serviceCategory: selectedServiceCategory,
        state: selectedState,
        serviceCode: selectedServiceCode,
        serviceDescription: selectedServiceDescription,
        program: selectedProgram,
        locationRegion: selectedLocationRegion,
        modifier: selectedModifier,
        providerType: selectedProviderType,
        endDate: endDate.toISOString().split('T')[0]
      });
    } else {
      // Clear all date filters
      await refreshData({
        serviceCategory: selectedServiceCategory,
        state: selectedState,
        serviceCode: selectedServiceCode,
        serviceDescription: selectedServiceDescription,
        program: selectedProgram,
        locationRegion: selectedLocationRegion,
        modifier: selectedModifier,
        providerType: selectedProviderType
      });
    }
  };

  const handleEndDateClear = async () => {
    setEndDate(null);
    if (startDate) {
      // If start date is still set, just clear end date from backend
      await refreshData({
        serviceCategory: selectedServiceCategory,
        state: selectedState,
        serviceCode: selectedServiceCode,
        serviceDescription: selectedServiceDescription,
        program: selectedProgram,
        locationRegion: selectedLocationRegion,
        modifier: selectedModifier,
        providerType: selectedProviderType,
        startDate: startDate.toISOString().split('T')[0]
      });
    } else {
      // Clear all date filters
      await refreshData({
        serviceCategory: selectedServiceCategory,
        state: selectedState,
        serviceCode: selectedServiceCode,
        serviceDescription: selectedServiceDescription,
        program: selectedProgram,
        locationRegion: selectedLocationRegion,
        modifier: selectedModifier,
        providerType: selectedProviderType
      });
    }
  };

  // All hooks properly organized at component top level

  return (
    <AppLayout activeTab="dashboard">
      <div className="p-4 sm:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
        {/* Error Messages */}
        <ErrorMessage error={localError} />
        {authError && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
            <div className="flex items-center">
              <FaExclamationCircle className="h-5 w-5 text-yellow-500 mr-2" />
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

        {/* Heading and Date Range */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-5xl md:text-6xl text-[#012C61] font-lemonMilkRegular uppercase mb-3 sm:mb-0">
            Dashboard
          </h1>
          <div className="flex flex-col items-end">
            {/* Date Range Filter */}
            <div className="flex space-x-4 mb-4" style={{ zIndex: 900 }}>
              <div className="relative">
                <label className="block text-sm font-medium text-[#012C61] mb-2">Start Date</label>
                <DatePicker
                  selected={startDate}
                  onChange={handleStartDateChange}
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  className={`w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2 text-gray-700 placeholder-gray-400 ${!isStateSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!isStateSelected}
                  popperClassName="z-[900]"
                  popperModifiers={[{ name: 'preventOverflow', options: { rootBoundary: 'viewport', tether: false, altAxis: true }, fn: (state) => state }]}
                  popperPlacement="bottom-start"
                  portalId="datepicker-portal"
                />
                {startDate && (
                  <button
                    onClick={handleStartDateClear}
                    className="text-xs text-blue-500 hover:underline mt-1"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-[#012C61] mb-2">End Date</label>
                <DatePicker
                  selected={endDate}
                  onChange={handleEndDateChange}
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  minDate={startDate || undefined}
                  className={`w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2 text-gray-700 placeholder-gray-400 ${!isStateSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!isStateSelected}
                  popperClassName="z-[900]"
                  popperModifiers={[{ name: 'preventOverflow', options: { rootBoundary: 'viewport', tether: false, altAxis: true }, fn: (state) => state }]}
                  popperPlacement="bottom-start"
                  portalId="datepicker-portal"
                />
                {endDate && (
                  <button
                    onClick={handleEndDateClear}
                    className="text-xs text-blue-500 hover:underline mt-1"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            {/* Fee Schedule Dates Dropdown */}
            <div className="relative" style={{ zIndex: 800 }}>
              <label className="block text-sm font-medium text-[#012C61] mb-2">Fee Schedule Date</label>
              <Select
                instanceId="feeScheduleDatesId"
                options={feeScheduleDates.map(date => {
                  const dateObj = new Date(date);
                  const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
                  const day = String(dateObj.getUTCDate()).padStart(2, '0');
                  const year = dateObj.getUTCFullYear();
                  return { value: date, label: `${month}/${day}/${year}` };
                })}
                value={selectedFeeScheduleDate ? { 
                  value: selectedFeeScheduleDate, 
                  label: (() => {
                    const dateObj = new Date(selectedFeeScheduleDate);
                    const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
                    const day = String(dateObj.getUTCDate()).padStart(2, '0');
                    const year = dateObj.getUTCFullYear();
                    return `${month}/${day}/${year}`;
                  })()
                } : null}
                onChange={(option) => handleFeeScheduleDateChange(option?.value || "")}
                placeholder="Select Fee Schedule Date"
                isSearchable
                isDisabled={!selectedState || feeScheduleDates.length === 0 || isLoadingFilters}
                className={`react-select-container ${!selectedState || feeScheduleDates.length === 0 || isLoadingFilters ? 'opacity-50' : ''}`}
                classNamePrefix="react-select"
                menuPortalTarget={document.body}
                styles={{
                  menuPortal: (base) => ({ ...base, zIndex: 800 }),
                }}
              />
              {selectedFeeScheduleDate && (
                <ClearButton onClick={() => handleFeeScheduleDateChange("")} />
              )}
            </div>
          </div>
        </div>

        {/* Reset Filters Button */}
        <button
          onClick={() => {
            resetFilters();
            setSelectedYear(null);
          }}
          className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base bg-[#012C61] text-white rounded-lg hover:bg-blue-800 transition-colors mt-4 sm:mt-0 mb-4"
        >
          Reset All Filters
        </button>

        {/* Filters */}
        <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-white rounded-xl shadow-lg relative z-40">
          <FilterNote step={filterStep} />
          
          {/* Loading indicator for filter options */}
          {isLoadingFilters && (
            <div className="loader-overlay">
              <div className="cssloader">
                <div className="sh1"></div>
                <div className="sh2"></div>
                <h4 className="lt">loading filter options</h4>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Service Category Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Service Line</label>
              <Select
                instanceId={serviceCategoryId}
                options={serviceCategories.map(category => ({ value: category, label: category }))}
                value={selectedServiceCategory ? { value: selectedServiceCategory, label: selectedServiceCategory } : null}
                onChange={(option) => handleServiceCategoryChange(option?.value || "")}
                placeholder="Select Service Line"
                isSearchable
                filterOption={customFilterOption}
                className="react-select-container"
                classNamePrefix="react-select"
              />
              {selectedServiceCategory && (
                <ClearButton onClick={() => handleServiceCategoryChange("")} />
              )}
            </div>

            {/* State Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">State</label>
              <Select
                instanceId={stateId}
                options={states.map(state => ({ value: state, label: state }))}
                value={selectedState ? { value: selectedState, label: selectedState } : null}
                onChange={(option) => handleStateChange(option?.value || "")}
                placeholder="Select State"
                isSearchable
                filterOption={customFilterOption}
                isDisabled={!selectedServiceCategory}
                className={`react-select-container ${!selectedServiceCategory ? 'opacity-50' : ''}`}
                classNamePrefix="react-select"
              />
              {selectedState && (
                <ClearButton onClick={() => handleStateChange("")} />
              )}
            </div>

            {/* Service Code Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Service Code</label>
              <Select
                instanceId={serviceCodeId}
                options={(() => {
                  if (serviceCodes.length === 0 && selectedServiceCode) {
                    return [{ value: selectedServiceCode, label: selectedServiceCode }];
                  }
                  const opts = serviceCodes.map(code => ({ value: code, label: code }));
                  if (selectedServiceCode && !serviceCodes.includes(selectedServiceCode)) {
                    opts.unshift({ value: selectedServiceCode, label: selectedServiceCode });
                  }
                  return opts;
                })()}
                value={selectedServiceCode ? { value: selectedServiceCode, label: selectedServiceCode } : null}
                onChange={(option) => {
                  if (option?.value) {
                    handleServiceCodeChange(option.value);
                  } else {
                    handleServiceCodeChange("");
                  }
                }}
                placeholder="Select Service Code"
                isSearchable
                filterOption={customFilterOption}
                isDisabled={!selectedState || serviceCodes.length === 0 || isLoadingFilters}
                className={`react-select-container ${!selectedState || serviceCodes.length === 0 || isLoadingFilters ? 'opacity-50' : ''}`}
                classNamePrefix="react-select"
              />
              {selectedServiceCode && (
                <ClearButton onClick={() => handleServiceCodeChange("")} />
              )}
            </div>

            {/* Service Description Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Service Description</label>
              <Select
                instanceId={serviceDescriptionId}
                options={(() => {
                  if (serviceDescriptions.length === 0 && selectedServiceDescription) {
                    return [{ value: selectedServiceDescription, label: selectedServiceDescription }];
                  }
                  const opts = serviceDescriptions.map(desc => ({ value: desc, label: desc }));
                  if (selectedServiceDescription && !serviceDescriptions.includes(selectedServiceDescription)) {
                    opts.unshift({ value: selectedServiceDescription, label: selectedServiceDescription });
                  }
                  return opts;
                })()}
                value={selectedServiceDescription ? { value: selectedServiceDescription, label: selectedServiceDescription } : null}
                onChange={(option) => {
                  if (option?.value) {
                    handleServiceDescriptionChange(option.value);
                  } else {
                    handleServiceDescriptionChange("");
                  }
                }}
                placeholder="Select Service Description"
                isSearchable
                filterOption={customFilterOption}
                isDisabled={!selectedState || serviceDescriptions.length === 0 || isLoadingFilters}
                className={`react-select-container ${!selectedState || serviceDescriptions.length === 0 || isLoadingFilters ? 'opacity-50' : ''}`}
                classNamePrefix="react-select"
              />
              {selectedServiceDescription && (
                <ClearButton onClick={() => handleServiceDescriptionChange("")} />
              )}
            </div>

            {/* Program Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Program</label>
              <Select
                instanceId={programId}
                options={getDropdownOptions(programs, false)}
                value={selectedProgram ? { value: selectedProgram, label: selectedProgram } : null}
                onChange={(option) => handleProgramChange(option?.value || '')}
                placeholder="Select Program"
                isSearchable
                filterOption={customFilterOption}
                isDisabled={!selectedServiceCode && !selectedServiceDescription}
                className={`react-select-container ${!selectedServiceCode && !selectedServiceDescription ? 'opacity-50' : ''}`}
                classNamePrefix="react-select"
              />
              {selectedProgram && (
                <ClearButton onClick={() => handleProgramChange('')} />
              )}
            </div>

            {/* Location/Region Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Location/Region</label>
              <Select
                instanceId={locationRegionId}
                options={getDropdownOptions(locationRegions, false)}
                value={selectedLocationRegion ? { value: selectedLocationRegion, label: selectedLocationRegion } : null}
                onChange={(option) => handleLocationRegionChange(option?.value || '')}
                placeholder="Select Location/Region"
                isSearchable
                filterOption={customFilterOption}
                isDisabled={!selectedServiceCode && !selectedServiceDescription}
                className={`react-select-container ${!selectedServiceCode && !selectedServiceDescription ? 'opacity-50' : ''}`}
                classNamePrefix="react-select"
              />
              {selectedLocationRegion && (
                <ClearButton onClick={() => handleLocationRegionChange('')} />
              )}
            </div>

            {/* Modifier Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Modifier</label>
              <Select
                instanceId={modifierId}
                options={getDropdownOptions(modifiers, false)}
                value={selectedModifier ? { value: selectedModifier, label: selectedModifier } : null}
                onChange={(option) => setSelectedModifier(option?.value || '')}
                placeholder="Select Modifier"
                isSearchable
                filterOption={customFilterOption}
                isDisabled={!selectedServiceCode && !selectedServiceDescription}
                className={`react-select-container ${!selectedServiceCode && !selectedServiceDescription ? 'opacity-50' : ''}`}
                classNamePrefix="react-select"
              />
              {selectedModifier && (
                <ClearButton onClick={() => setSelectedModifier('')} />
              )}
            </div>

            {/* Provider Type Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Provider Type</label>
              <Select
                instanceId="providerTypeId"
                options={getDropdownOptions(providerTypes, false)}
                value={selectedProviderType ? { value: selectedProviderType, label: selectedProviderType } : null}
                onChange={(option) => handleProviderTypeChange(option?.value || '')}
                placeholder="Select Provider Type"
                isSearchable
                filterOption={customFilterOption}
                isDisabled={!selectedServiceCode && !selectedServiceDescription}
                className={`react-select-container ${!selectedServiceCode && !selectedServiceDescription ? 'opacity-50' : ''}`}
                classNamePrefix="react-select"
              />
              {selectedProviderType && (
                <button
                  onClick={() => setSelectedProviderType('')}
                  className="text-xs text-blue-500 hover:underline mt-1"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sorting Instructions - Show above table when filters aren't applied */}
        {!loading && !(selectedState && selectedServiceCategory && (selectedServiceCode || selectedServiceDescription || selectedFeeScheduleDate || (startDate && endDate))) && (
        <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
          <div className="flex items-center space-x-2 mb-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h3 className="text-sm font-semibold text-blue-800">Sorting Instructions</h3>
          </div>
          <ul className="text-sm text-blue-700 space-y-1 pl-5 list-disc">
            <li>Click any column header to sort the data</li>
            <li>Click again to toggle between ascending and descending order</li>
            <li>Click a third time to deselect the sort</li>
            <li>Hold <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs">Ctrl</kbd> while clicking to apply multiple sort levels</li>
            <li>Sort priority is indicated by numbers next to the sort arrows (1 = primary sort, 2 = secondary sort, etc.)</li>
          </ul>
        </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="loader-overlay">
            <div className="cssloader">
              <div className="sh1"></div>
              <div className="sh2"></div>
              <h4 className="lt">loading</h4>
            </div>
          </div>
        )}

        {/* Empty State Message */}
        {!loading && !getAreFiltersApplied() && (
          <div className="p-6 bg-white rounded-xl shadow-lg text-center">
            <div className="flex justify-center items-center mb-4">
              <FaFilter className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-lg font-medium text-gray-700 mb-2">
              Please select filters to view dashboard data
            </p>
            <p className="text-sm text-gray-500">
              Choose a state and one of: service code, service description, fee schedule date, or date range
            </p>
          </div>
        )}

        {/* Show the table when filters are applied and data is loaded */}
        {!loading && getAreFiltersApplied() && data.length > 0 && (
          <>
          <div 
            className="rounded-lg shadow-lg bg-white relative z-30 overflow-x-auto"
            style={{ 
              maxHeight: 'calc(100vh - 5.5rem)', 
              overflow: 'auto'
            }}
          >
            <table className="min-w-full">
              <thead className="bg-gray-50 sticky top-[5.5rem] z-20">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={(e) => handleSort('state_name', e)}>
                    State<SortIndicator sortKey="state_name" />
                    </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={(e) => handleSort('service_category', e)}>
                    Service Category<SortIndicator sortKey="service_category" />
                    </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={(e) => handleSort('service_code', e)}>
                    Service Code<SortIndicator sortKey="service_code" />
                    </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={(e) => handleSort('service_description', e)}>
                    Service Description<SortIndicator sortKey="service_description" />
                    </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={(e) => handleSort('duration_unit', e)}>
                    Duration Unit<SortIndicator sortKey="duration_unit" />
                    </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={(e) => handleSort('rate', e)}>
                    Rate per Base Unit<SortIndicator sortKey="rate" />
                    </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={(e) => handleSort('rate_effective_date', e)}>
                    Effective Date<SortIndicator sortKey="rate_effective_date" />
                    </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={(e) => handleSort('modifier_1', e)}>
                    Modifier 1<SortIndicator sortKey="modifier_1" />
                    </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={(e) => handleSort('modifier_2', e)}>
                    Modifier 2<SortIndicator sortKey="modifier_2" />
                    </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={(e) => handleSort('modifier_3', e)}>
                    Modifier 3<SortIndicator sortKey="modifier_3" />
                    </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={(e) => handleSort('modifier_4', e)}>
                    Modifier 4<SortIndicator sortKey="modifier_4" />
                    </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={(e) => handleSort('program', e)}>
                    Program<SortIndicator sortKey="program" />
                    </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={(e) => handleSort('location_region', e)}>
                    Location/Region<SortIndicator sortKey="location_region" />
                    </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={(e) => handleSort('provider_type', e)}>
                    Provider Type<SortIndicator sortKey="provider_type" />
                    </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {optimizedData.map((item) => (
                  <tr key={item.rowKey} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.stateDisplay}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.categoryDisplay}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.service_code || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-[220px] truncate" title={item.service_description || '-'}>{item.service_description || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.duration_unit || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.rateDisplay}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.rate_effective_date || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.modifier1Display}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.modifier2Display}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.modifier3Display}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.modifier4Display}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.program || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.location_region || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{(item as any).provider_type || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

            {/* Add pagination controls */}
            <PaginationControls />
          </>
        )}
      </div>

      {/* Custom CSS for select dropdowns */}
      <style jsx>{`
        select {
          appearance: none;
          background-color: white;
          background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%233b82f6%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
          background-repeat: no-repeat;
          background-position: right 0.75rem center;
          background-size: 0.75rem;
        }
        select:focus {
          outline: none;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
        }
        th.sortable {
          cursor: pointer;
          position: relative;
          user-select: none;
          transition: all 0.2s ease;
          padding: 12px 16px;
        }

        th.sortable:hover {
          background-color: #f5f5f5;
          box-shadow: inset 0 -2px 0 #3b82f6;
        }

        th.sortable.active {
          background-color: #e8f0fe;
          font-weight: 600;
          box-shadow: inset 0 -2px 0 #3b82f6;
        }

        .sort-indicator {
          margin-left: 4px;
          font-size: 0.8em;
          color: #666;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
        }

        th.sortable:hover .sort-indicator {
          color: #3b82f6;
        }

        .sort-priority {
          font-size: 0.6em;
          vertical-align: super;
          color: #3b82f6;
          margin-left: 2px;
          font-weight: 500;
          background-color: #e8f0fe;
          padding: 2px 4px;
          border-radius: 3px;
          transition: all 0.2s ease;
        }

        .arrow {
          transition: transform 0.2s ease;
        }

        .sorted-column {
          background-color: #f8f9fa;
        }

        .sorted-column:hover {
          background-color: #e9ecef;
        }

        .sort-animation {
          animation: sortPulse 0.2s ease;
        }

        @keyframes sortPulse {
          0% { background-color: transparent; }
          50% { background-color: #e8f0fe; }
          100% { background-color: transparent; }
        }

        @keyframes fade-in {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        .react-select__menu {
          z-index: 1000;
        }

        .react-datepicker-popper {
          z-index: 1000;
        }

        thead {
          z-index: 50;
          position: sticky;
          top: 0;
        }
      `}</style>
      <style jsx>{`
        .loader-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(57,57,57,0.9);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.2s;
        }
        .cssloader {
          padding-top: 0;
        }
        .sh1 {
          width: 0;
          height: 0;
          border-style: solid;
          border-width: 50px 50px 0 0;
          border-color: #012C61 transparent transparent transparent;
          margin: 0 auto;
          animation: shk1 1s ease-in-out infinite normal;
        }
        .sh2 {
          width: 0;
          height: 0;
          border-style: solid;
          border-width: 0 0 50px 50px;
          border-color: transparent  transparent #3b82f6 transparent ;
          margin: -50px auto 0;
          animation: shk2 1s ease-in-out infinite alternate;
        }
        @keyframes shk1 {
          0% { transform: rotate(-360deg); }
          100% {}
        }
        @keyframes shk2 {
          0% { transform: rotate(360deg); }
          100% {}
        }
        .lt {
          color: #bdbdbd;
          font-family: 'Roboto', 'Arial', sans-serif;
          margin: 30px auto;
          text-align: center;
          font-weight: 100;
          letter-spacing: 10px;
          text-transform: lowercase;
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        @keyframes fade-in {
          0% { opacity: 0; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </AppLayout>
  );
}