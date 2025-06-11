"use client";

import { useEffect, useState, useMemo, useRef, useId } from "react";
import AppLayout from "@/app/components/applayout";
import { FaSpinner, FaExclamationCircle, FaChevronDown, FaFilter } from 'react-icons/fa';
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

// Update the useClickOutside hook to use HTMLDivElement
const useClickOutside = (ref: React.RefObject<HTMLDivElement | null>, callback: () => void) => {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref, callback]);
};

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

  // Filter states
  const [selectedServiceCategory, setSelectedServiceCategory] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedServiceCode, setSelectedServiceCode] = useState("");
  const [selectedServiceDescription, setSelectedServiceDescription] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedLocationRegion, setSelectedLocationRegion] = useState("");
  const [selectedModifier, setSelectedModifier] = useState("");
  const [selectedProviderType, setSelectedProviderType] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(new Date(2017, 0, 1));
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [localError, setLocalError] = useState<string | null>(null);

  // Visibility states for dropdowns
  const [showServiceCategoryDropdown, setShowServiceCategoryDropdown] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showServiceCodeDropdown, setShowServiceCodeDropdown] = useState(false);
  const [showServiceDescriptionDropdown, setShowServiceDescriptionDropdown] = useState(false);
  const [showProgramDropdown, setShowProgramDropdown] = useState(false);
  const [showLocationRegionDropdown, setShowLocationRegionDropdown] = useState(false);
  const [showModifierDropdown, setShowModifierDropdown] = useState(false);

  // Unique filter options
  const [serviceCategories, setServiceCategories] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [serviceCodes, setServiceCodes] = useState<string[]>([]);
  const [serviceDescriptions, setServiceDescriptions] = useState<string[]>([]);
  const [programs, setPrograms] = useState<string[]>([]);
  const [locationRegions, setLocationRegions] = useState<string[]>([]);
  const [providerTypes, setProviderTypes] = useState<string[]>([]);
  const [modifiers, setModifiers] = useState<{ value: string; label: string }[]>([]);

  // Calculate dynamic height based on window size
  const [visibleRows, setVisibleRows] = useState(5); // Default to a minimum number of rows

  // Add refs for each dropdown
  const serviceCategoryRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<HTMLDivElement>(null);
  const serviceCodeRef = useRef<HTMLDivElement>(null);
  const serviceDescriptionRef = useRef<HTMLDivElement>(null);
  const programRef = useRef<HTMLDivElement>(null);
  const locationRegionRef = useRef<HTMLDivElement>(null);
  const modifierRef = useRef<HTMLDivElement>(null);

  // Use the click-outside hook for each dropdown
  useClickOutside(serviceCategoryRef, () => setShowServiceCategoryDropdown(false));
  useClickOutside(stateRef, () => setShowStateDropdown(false));
  useClickOutside(serviceCodeRef, () => setShowServiceCodeDropdown(false));
  useClickOutside(serviceDescriptionRef, () => setShowServiceDescriptionDropdown(false));
  useClickOutside(programRef, () => setShowProgramDropdown(false));
  useClickOutside(locationRegionRef, () => setShowLocationRegionDropdown(false));
  useClickOutside(modifierRef, () => setShowModifierDropdown(false));

  const areFiltersApplied = selectedState && selectedServiceCategory;

  // Add new state for selected year
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // Add a state to track the current step
  const [filterStep, setFilterStep] = useState(1);

  // Add Fee Schedule Dates Dropdown
  const [selectedFeeScheduleDate, setSelectedFeeScheduleDate] = useState("");
  const [feeScheduleDates, setFeeScheduleDates] = useState<string[]>([]);

  // Add this after other state declarations
  const [allFilterOptions, setAllFilterOptions] = useState<{
    [key: string]: string[];
  }>({});

  // Add this after other useEffect hooks
  useEffect(() => {
    const preloadFilterOptions = async () => {
      try {
        const response = await fetch('/api/state-payment-comparison?mode=filters');
        if (!response.ok) throw new Error('Failed to fetch filter options');
        const data = await response.json();
        
        // Store all filter options
        setAllFilterOptions({
          serviceCategories: data.filterOptions.serviceCategories,
          states: data.filterOptions.states
        });
        
        // Set initial service categories
        setServiceCategories(data.filterOptions.serviceCategories);
      } catch (error) {
        console.error('Error preloading filter options:', error);
        setLocalError('Failed to load filter options. Please refresh the page.');
      }
    };

    preloadFilterOptions();
  }, []);

  // Update handleServiceCategoryChange to use preloaded data
  const handleServiceCategoryChange = async (category: string) => {
    console.log('=== Service Category Change ===');
    console.log('Selected category:', category);
    
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
    setStates([]);
    setServiceCodes([]);
    setServiceDescriptions([]);
    setPrograms([]);
    setLocationRegions([]);
    setModifiers([]);
    setProviderTypes([]);

    // Use preloaded states
    if (allFilterOptions.states) {
      setStates(allFilterOptions.states);
    }
  };

  // Update useEffect to handle initial filter options
  useEffect(() => {
    if (filterOptions?.serviceCategories) {
      // Deduplicate and sort service categories, but do not change case
      const normalizedCategories = Array.from(
        new Set(
          filterOptions.serviceCategories
            .map(cat => cat?.trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b));
      setServiceCategories(normalizedCategories);
    }
    if (filterOptions?.states) {
      // Deduplicate and sort states, but do not change case
      const normalizedStates = Array.from(
        new Set(
          filterOptions.states
            .map(state => state?.trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b));
      setStates(normalizedStates);
    }
  }, [filterOptions]);

  // Place this useEffect immediately after all useState declarations
  useEffect(() => {
    if (filterOptions) {
      setServiceCodes(filterOptions.serviceCodes || []);
      setServiceDescriptions(filterOptions.serviceDescriptions || []);
      setPrograms(filterOptions.programs || []);
      setLocationRegions(filterOptions.locationRegions || []);
      setProviderTypes(filterOptions.providerTypes || []);
      setModifiers(filterOptions.modifiers || []);
    }
  }, [filterOptions]);

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

  // Now the filteredData useMemo hook can safely use parseDate
  const filteredData = useMemo(() => {
    if (!selectedState) return [];
    
    console.log('=== Filtering Data ===');
    console.log('Initial data length:', data.length);

    let filtered = data;

    // Apply additional filters if they are selected
    if (selectedServiceCode) {
      filtered = filtered.filter(item => item.service_code?.trim() === selectedServiceCode.trim());
    }

    if (selectedProgram === '-') {
      filtered = filtered.filter(item => !item.program || item.program.trim() === '');
    } else if (selectedProgram) {
      filtered = filtered.filter(item => item.program?.trim() === selectedProgram.trim());
    }

    if (selectedLocationRegion === '-') {
      filtered = filtered.filter(item => !item.location_region || item.location_region.trim() === '');
    } else if (selectedLocationRegion) {
      filtered = filtered.filter(item => item.location_region?.trim() === selectedLocationRegion.trim());
    }

    if (selectedProviderType === '-') {
      filtered = filtered.filter(item => !item.provider_type || item.provider_type.trim() === '');
    } else if (selectedProviderType) {
      filtered = filtered.filter(item => item.provider_type?.trim() === selectedProviderType.trim());
    }

    if (selectedModifier === '-') {
      filtered = filtered.filter(item =>
        (!item.modifier_1 || item.modifier_1.trim() === '') &&
        (!item.modifier_2 || item.modifier_2.trim() === '') &&
        (!item.modifier_3 || item.modifier_3.trim() === '') &&
        (!item.modifier_4 || item.modifier_4.trim() === '')
      );
    } else if (selectedModifier) {
        const selectedModifierCode = selectedModifier.split(' - ')[0];
      filtered = filtered.filter(item => 
          (item.modifier_1 && item.modifier_1.split(' - ')[0] === selectedModifierCode) ||
          (item.modifier_2 && item.modifier_2.split(' - ')[0] === selectedModifierCode) ||
          (item.modifier_3 && item.modifier_3.split(' - ')[0] === selectedModifierCode) ||
        (item.modifier_4 && item.modifier_4.split(' - ')[0] === selectedModifierCode)
      );
    }

    // Apply date filters
    filtered = filtered.filter(item => {
      const parsedDate = parseDate(item.rate_effective_date);
      if (!parsedDate) return true;

      if (selectedFeeScheduleDate) {
        const itemDate = parsedDate.toISOString().split('T')[0];
        return itemDate === selectedFeeScheduleDate;
      }

      if (selectedYear) {
        return parsedDate.getFullYear() === selectedYear;
      }

      if (startDate && endDate) {
        return parsedDate >= startDate && parsedDate <= endDate;
      }

      return true;
    });

    return filtered;
  }, [
    data,
    selectedState,
    selectedServiceCode,
    selectedProgram,
    selectedLocationRegion,
    selectedModifier,
    selectedProviderType,
    selectedFeeScheduleDate,
    selectedYear,
    startDate,
    endDate
  ]);

  // Update the sortConfig state initialization
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }[]>([]);

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

  // Update the sortedData calculation
  const sortedData = useMemo(() => {
    if (sortConfig.length === 0) return filteredData;

    return [...filteredData].sort((a, b) => {
      for (const sort of sortConfig) {
        let valueA: string | number | Date = a[sort.key] || '';
        let valueB: string | number | Date = b[sort.key] || '';
        
        // Handle numeric strings
        if (typeof valueA === 'string' && !isNaN(Number(valueA))) {
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
  }, [filteredData, sortConfig]);

  useEffect(() => {
    const calculateTableHeight = () => {
      const windowHeight = window.innerHeight;
      const headerHeight = 200; // Approximate height of header and other elements
      const rowHeight = 50; // Approximate height of each row
      const maxRows = Math.floor((windowHeight - headerHeight) / rowHeight);
      
      setVisibleRows(maxRows); // Show all rows that fit
    };

    calculateTableHeight(); // Initial calculation

    const handleResize = () => {
      calculateTableHeight();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (data.length > 0) {
      // Add data analysis
      console.log('=== Data Analysis ===');
      console.log('Total data items:', data.length);
      
      // Check specifically for ABA
      const abaData = data.filter(item => 
        item.service_category?.trim().toUpperCase() === 'APPLIED BEHAVIOR ANALYSIS'
      );
      console.log('ABA entries:', abaData.length);
      if (abaData.length > 0) {
        console.log('Sample ABA entries:', abaData.slice(0, 3));
        console.log('States with ABA:', 
          [...new Set(abaData.map(item => item.state_name?.trim().toUpperCase()))].sort()
        );
      }

      // Check all service categories
      const allCategories = [...new Set(data.map(item => item.service_category?.trim().toUpperCase()))].filter(Boolean);
      console.log('All available service categories:', allCategories);
      
      // Check data for each category
      allCategories.forEach(category => {
        const categoryData = data.filter(item => 
          item.service_category?.trim().toUpperCase() === category
        );
        console.log(`Category "${category}":`, {
          count: categoryData.length,
          sampleStates: [...new Set(categoryData.map(item => item.state_name?.trim().toUpperCase()))].slice(0, 3),
          sampleServiceCodes: [...new Set(categoryData.map(item => item.service_code?.trim()))].slice(0, 3)
        });
      });
      
      extractFilters(data);
    }
  }, [data]);

  useEffect(() => {
    console.log('Total data:', data.length);
    console.log('Filtered data:', filteredData.length);
  }, [data, filteredData]);

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

  const extractFilters = (data: ServiceData[]) => {
    // Get service categories
    const categories = data
      .map((item) => item.service_category?.trim())
      .filter((category): category is string => !!category);
    const uniqueCategories = [...new Set(categories)].sort((a, b) => a.localeCompare(b));
    console.log('Available service categories (with string details):', 
      uniqueCategories.map(cat => ({
        category: cat,
        length: cat.length,
        charCodes: Array.from(cat).map(c => c.charCodeAt(0))
      }))
    );
    setServiceCategories(uniqueCategories);

    // Get states
    const states = data
      .map((item) => item.state_name?.trim().toUpperCase())
      .filter((state): state is string => !!state);
    setStates([...new Set(states)].sort((a, b) => a.localeCompare(b)));

    // Get provider types
    const types = data
      .map((item) => item.provider_type?.trim())
      .filter((type): type is string => !!type);
    setProviderTypes([...new Set(types)].sort((a, b) => a.localeCompare(b)));
  };

  const toggleDropdown = (dropdownSetter: React.Dispatch<React.SetStateAction<boolean>>, otherSetters: React.Dispatch<React.SetStateAction<boolean>>[]) => {
    // Close all other dropdowns
    otherSetters.forEach(setter => setter(false));
    // Toggle the current dropdown
    dropdownSetter(prev => !prev);
  };

  // Utility to ensure selected value is always in options
  function ensureOptionInList(options: string[], selected: string): string[] {
    if (selected && !options.includes(selected)) {
      return [selected, ...options];
    }
    return options;
      }

  const handleServiceCodeChange = async (code: string) => {
    // Find the matching item for this code
    const matchingItem = data.find(item => item.service_code?.trim() === code.trim());
    const matchingDescription = matchingItem?.service_description?.trim() || '';
    setSelectedServiceCode(code);
    setSelectedServiceDescription(matchingDescription);
    setSelectedProgram("");
    setSelectedLocationRegion("");
    setSelectedModifier("");
    setSelectedProviderType("");
    setFilterStep(4);
    setPrograms([]);
    setLocationRegions([]);
    setModifiers([]);
    setProviderTypes([]);
    await refreshData({
      serviceCategory: selectedServiceCategory,
      state: selectedState,
      serviceCode: code // Only use code for backend filtering
    });
  };

  const handleServiceDescriptionChange = async (desc: string) => {
    // If the current code already matches this description, do nothing
    const currentItem = data.find(item => item.service_code?.trim() === selectedServiceCode?.trim());
    if (currentItem && currentItem.service_description?.trim() === desc) {
    setSelectedServiceDescription(desc);
      return;
    }
    // Otherwise, find the first item with this description
    const matchingItem = data.find(item => item.service_description?.trim() === desc);
    const matchingCode = matchingItem?.service_code?.trim() || '';
    setSelectedServiceDescription(desc);
    setSelectedServiceCode(matchingCode);
    setSelectedProgram("");
    setSelectedLocationRegion("");
    setSelectedModifier("");
    setSelectedProviderType("");
    setFilterStep(4);
    setPrograms([]);
    setLocationRegions([]);
    setModifiers([]);
    setProviderTypes([]);
    await refreshData({
      serviceCategory: selectedServiceCategory,
      state: selectedState,
      serviceCode: matchingCode // Only use code for backend filtering
    });
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
      await refreshData({
        serviceCategory: selectedServiceCategory,
        state: selectedState,
        serviceCode: selectedServiceCode,
        serviceDescription: selectedServiceDescription,
        program: program
      });
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
      await refreshData({
        serviceCategory: selectedServiceCategory,
        state: selectedState,
        serviceCode: selectedServiceCode,
        serviceDescription: selectedServiceDescription,
        program: selectedProgram,
        locationRegion: region
      });
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
    setSelectedFeeScheduleDate("");
    setStartDate(null);
    setEndDate(null);
    setServiceCodes([]);
    setStates([]);
    setPrograms([]);
    setLocationRegions([]);
    setModifiers([]);
    setFilterStep(1);

    // Reset to initial filter options
    await refreshFilters();
    
    // Update filter options
    setServiceCategories(filterOptions.serviceCategories);
    setStates(filterOptions.states);
  };

  // Update the handleStateChange function
  const handleStateChange = async (state: string) => {
    console.log('=== State Change ===');
    console.log('Selected state:', state);
    
    // First update the UI state
    setSelectedState(state);
    setSelectedServiceCode("");
    setSelectedServiceDescription("");
    setSelectedProgram("");
    setSelectedLocationRegion("");
    setSelectedModifier("");
    setSelectedProviderType("");
    setFilterStep(3);
    setCurrentPage(1);

    // Reset dependent filter options
    setServiceCodes([]);
    setServiceDescriptions([]);
    setPrograms([]);
    setLocationRegions([]);
    setModifiers([]);
    setProviderTypes([]);

    try {
      // Load filter options for this state
      await refreshFilters(selectedServiceCategory);
      
      // Then fetch the data with the new state filter
      const filters = {
        serviceCategory: selectedServiceCategory,
        state: state,
        page: "1",
        itemsPerPage: String(itemsPerPage)
      };
      
      console.log('Fetching data with filters:', filters);
      const result = await refreshData(filters);
      
      if (result?.data && Array.isArray(result.data)) {
        console.log('State filter applied successfully. Data length:', result.data.length);
        setTotalCount(result.totalCount);
        setHasSearched(true);
      } else {
        console.error('Invalid response format from refreshData:', result);
        setLocalError('Failed to apply state filter. Please try again.');
      }
    } catch (error) {
      console.error('Error applying state filter:', error);
      setLocalError('Failed to apply state filter. Please try again.');
    }
  };

  // Update the dropdown selection logic
  const handleDropdownSelection = (setter: React.Dispatch<React.SetStateAction<string>>, value: string, type: string) => {
    setter(value);
    
    // Call the appropriate handler based on the filter type
    switch (type) {
      case 'serviceCategory':
        handleServiceCategoryChange(value);
        break;
      case 'state':
        handleStateChange(value);
        break;
      case 'serviceCode':
        handleServiceCodeChange(value);
        break;
      case 'program':
        handleProgramChange(value);
        break;
      case 'locationRegion':
        handleLocationRegionChange(value);
        break;
      case 'modifier':
        // Add modifier-specific logic if needed
        break;
      default:
        break;
    }
    
    // Close all dropdowns
    setShowServiceCategoryDropdown(false);
    setShowStateDropdown(false);
    setShowServiceCodeDropdown(false);
    setShowServiceDescriptionDropdown(false);
    setShowProgramDropdown(false);
    setShowLocationRegionDropdown(false);
    setShowModifierDropdown(false);
  };

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

  // Update getVisibleColumns to use the backend data array (data) instead of filteredData
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
      rate_effective_date: false,
      provider_type: false
    };

    if (data.length > 0) {
      data.forEach(item => {
        const rateStr = (item.rate || '').replace('$', '');
        const rate = parseFloat(rateStr);
        const durationUnit = item.duration_unit?.toUpperCase();
        
        Object.keys(columns).forEach((key) => {
          const columnKey = key as keyof typeof columns;
          if (item[columnKey] && item[columnKey] !== '-') {
            columns[columnKey] = true;
          }
        });
      });
    }

    return columns;
  }, [data]);

  // Create a utility function to format text
  const formatText = (text: string | null | undefined) => {
    return text || '-';
  };

  // Inside your Dashboard component, add this before the return statement
  const serviceCategoryId = useId();
  const stateId = useId();
  const serviceCodeId = useId();
  const serviceDescriptionId = useId();
  const programId = useId();
  const locationRegionId = useId();
  const modifierId = useId();

  useEffect(() => {
    if (data.length > 0) {
      // Comment out or remove this line
      // console.log("Raw rate_effective_date values:", data.map(item => item.rate_effective_date));
      extractFeeScheduleDates(data);
    }
  }, [data]);

  const extractFeeScheduleDates = (data: ServiceData[]) => {
    const filteredDates = data
      .filter(item => 
        (!selectedServiceCategory || item.service_category === selectedServiceCategory) &&
        (!selectedState || item.state_name.toUpperCase() === selectedState.toUpperCase()) &&
        (!selectedServiceCode || item.service_code === selectedServiceCode) &&
        (!selectedServiceDescription || item.service_description === selectedServiceDescription)
      )
      .map(item => {
        const parsedDate = parseDate(item.rate_effective_date);
        if (!parsedDate) return null; // Skip invalid dates
        return parsedDate.toISOString().split('T')[0]; // Use ISO format for consistency
      })
      .filter((date): date is string => !!date); // Filter out null values

    // Comment out or remove this line
    // console.log("Extracted Fee Schedule Dates:", filteredDates); // Log the extracted dates
    setFeeScheduleDates(
      [...new Set(filteredDates)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    );
  };

  useEffect(() => {
    if (data.length > 0) {
      extractFeeScheduleDates(data);
    }
  }, [data, selectedServiceCategory, selectedState, selectedServiceCode, selectedServiceDescription]);

  // Update the Date Range fields to disable them when a Fee Schedule Date is selected
  const isDateRangeDisabled = !!selectedFeeScheduleDate;

  // Add this after other state declarations
  const [hasSearched, setHasSearched] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const handleSearch = async () => {
    setIsSearching(true);
    try {
      console.log('handleSearch called. currentPage:', currentPage);
      const filters = {
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
      } else {
        console.error('Invalid response format:', result);
        setLocalError('Received invalid data format from server');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setLocalError('Failed to fetch data. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Fetch new data when the page changes (after a search)
  useEffect(() => {
    if (hasSearched) {
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

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

  // Add this before the return statement
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

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

  // Add a function to extract filter options from data
  function extractFilterOptionsFromData(data: ServiceData[]) {
    const isValidString = (value: any): value is string => 
      typeof value === 'string' && value.length > 0;

    // Get unique service codes
    const uniqueServiceCodes = [...new Set(data
      .map(item => item.service_code?.trim())
      .filter(isValidString)
    )].sort() as string[];
    setServiceCodes(uniqueServiceCodes);

    // Get unique service descriptions
    const uniqueDescriptions = [...new Set(data
      .map(item => item.service_description?.trim())
      .filter(isValidString)
    )].sort() as string[];
    setServiceDescriptions(uniqueDescriptions);

    // Get unique programs
    const uniquePrograms = [...new Set(data
      .map(item => item.program?.trim())
      .filter(isValidString)
    )].sort() as string[];
    setPrograms(uniquePrograms);

    // Get unique location regions
    const uniqueRegions = [...new Set(data
      .map(item => item.location_region?.trim())
      .filter(isValidString)
    )].sort() as string[];
    setLocationRegions(uniqueRegions);

    // Get unique provider types
    const uniqueProviderTypes = [...new Set(data
      .map(item => item.provider_type?.trim())
      .filter(isValidString)
    )].sort() as string[];
    setProviderTypes(uniqueProviderTypes);

    // Get unique modifiers
    const allModifiers = data.flatMap(item => {
      const modifiers = [];
      if (item.modifier_1) {
        modifiers.push({
          value: item.modifier_1.trim(),
          details: item.modifier_1_details?.trim() || '',
          fullText: `${item.modifier_1.trim()}${item.modifier_1_details ? ` - ${item.modifier_1_details.trim()}` : ''}`
        });
      }
      if (item.modifier_2) {
        modifiers.push({
          value: item.modifier_2.trim(),
          details: item.modifier_2_details?.trim() || '',
          fullText: `${item.modifier_2.trim()}${item.modifier_2_details ? ` - ${item.modifier_2_details.trim()}` : ''}`
        });
      }
      if (item.modifier_3) {
        modifiers.push({
          value: item.modifier_3.trim(),
          details: item.modifier_3_details?.trim() || '',
          fullText: `${item.modifier_3.trim()}${item.modifier_3_details ? ` - ${item.modifier_3_details.trim()}` : ''}`
        });
      }
      if (item.modifier_4) {
        modifiers.push({
          value: item.modifier_4.trim(),
          details: item.modifier_4_details?.trim() || '',
          fullText: `${item.modifier_4.trim()}${item.modifier_4_details ? ` - ${item.modifier_4_details.trim()}` : ''}`
        });
      }
      return modifiers;
    });

    const uniqueModifiers = [...new Set(allModifiers.map(mod => mod.fullText))].map(fullText => {
      const mod = allModifiers.find(m => m.fullText === fullText);
      return {
        value: fullText,
        label: fullText,
        details: mod?.details || ''
      };
    });
    setModifiers(uniqueModifiers);
  }

  // Replace the getDropdownOptions function with the following:
  const getDropdownOptions = (options: (Option | string)[], isMandatory: boolean): readonly Option[] => {
    const opts: Option[] = options.map(opt => (typeof opt === 'string' ? { value: opt, label: opt } : opt));
    return isMandatory ? opts : [{ value: '-', label: '-' }, ...opts] as const;
  };

  return (
    <AppLayout activeTab="dashboard">
      <div className="p-4 sm:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
        {/* Error Message */}
        <ErrorMessage error={localError} />

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
                  onChange={(date: Date | null) => date && setStartDate(date)}
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  className={`w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2 text-gray-700 placeholder-gray-400 ${
                    selectedFeeScheduleDate ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={!!selectedFeeScheduleDate}
                  popperClassName="z-[900]" // Adjusted z-index
                  popperModifiers={[
                    {
                      name: 'preventOverflow',
                      options: {
                        rootBoundary: 'viewport',
                        tether: false,
                        altAxis: true,
                      },
                      fn: (state) => state,
                    },
                  ]}
                  popperPlacement="bottom-start"
                  portalId="datepicker-portal"
                />
                {startDate && (
                  <button
                    onClick={() => setStartDate(null)}
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
                  onChange={(date: Date | null) => date && setEndDate(date)}
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  minDate={startDate || undefined}
                  className={`w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2 text-gray-700 placeholder-gray-400 ${
                    selectedFeeScheduleDate ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={!!selectedFeeScheduleDate}
                  popperClassName="z-[900]" // Adjusted z-index
                  popperModifiers={[
                    {
                      name: 'preventOverflow',
                      options: {
                        rootBoundary: 'viewport',
                        tether: false,
                        altAxis: true,
                      },
                      fn: (state) => state,
                    },
                  ]}
                  popperPlacement="bottom-start"
                  portalId="datepicker-portal"
                />
                {endDate && (
                  <button
                    onClick={() => setEndDate(null)}
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
                onChange={(option) => {
                  setSelectedFeeScheduleDate(option?.value || "");
                  if (option?.value) {
                    setStartDate(null);
                    setEndDate(null);
                  }
                }}
                placeholder="Select Fee Schedule Date"
                isSearchable
                isDisabled={!!startDate || !!endDate}
                className={`react-select-container ${
                  !!startDate || !!endDate ? 'opacity-50' : ''
                }`}
                classNamePrefix="react-select"
                menuPortalTarget={document.body}
                styles={{
                  menuPortal: (base) => ({ ...base, zIndex: 800 }), // Adjusted z-index
                }}
              />
              {selectedFeeScheduleDate && (
                <ClearButton onClick={() => setSelectedFeeScheduleDate("")} />
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
                isDisabled={!selectedState}
                className={`react-select-container ${!selectedState ? 'opacity-50' : ''}`}
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
                isDisabled={!selectedState}
                className={`react-select-container ${!selectedState ? 'opacity-50' : ''}`}
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
                onChange={(option) => setSelectedProviderType(option?.value || '')}
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
        {!loading && !areFiltersApplied && (
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
        {!loading && !areFiltersApplied && (
          <div className="p-6 bg-white rounded-xl shadow-lg text-center">
            <div className="flex justify-center items-center mb-4">
              <FaFilter className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-lg font-medium text-gray-700 mb-2">
              Please select a state to view dashboard data
            </p>
            <p className="text-sm text-gray-500">
              Choose a state to see the dashboard information
            </p>
          </div>
        )}

        {/* Only show the table after Search has been clicked and data is loaded */}
        {!loading && areFiltersApplied && hasSearched && (
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
                  {getVisibleColumns.state_name && (
                    <th
                      className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={(e) => handleSort('state_name', e)}
                    >
                      State
                      <SortIndicator sortKey="state_name" />
                    </th>
                  )}
                  {getVisibleColumns.service_category && (
                    <th
                      className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={(e) => handleSort('service_category', e)}
                    >
                      Service Category
                      <SortIndicator sortKey="service_category" />
                    </th>
                  )}
                  {getVisibleColumns.service_code && (
                    <th
                      className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={(e) => handleSort('service_code', e)}
                    >
                      Service Code
                      <SortIndicator sortKey="service_code" />
                    </th>
                  )}
                  {getVisibleColumns.service_description && (
                    <th
                      className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={(e) => handleSort('service_description', e)}
                    >
                      Service Description
                      <SortIndicator sortKey="service_description" />
                    </th>
                  )}
                  {getVisibleColumns.duration_unit && (
                    <th
                      className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={(e) => handleSort('duration_unit', e)}
                    >
                      Duration Unit
                      <SortIndicator sortKey="duration_unit" />
                    </th>
                  )}
                  {getVisibleColumns.rate && (
                    <th
                      className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={(e) => handleSort('rate', e)}
                    >
                      Rate per Base Unit
                      <SortIndicator sortKey="rate" />
                    </th>
                  )}
                  {getVisibleColumns.rate_effective_date && (
                    <th
                      className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={(e) => handleSort('rate_effective_date', e)}
                    >
                      Effective Date
                      <SortIndicator sortKey="rate_effective_date" />
                    </th>
                  )}
                  {getVisibleColumns.modifier_1 && (
                    <th
                      className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={(e) => handleSort('modifier_1', e)}
                    >
                      Modifier 1
                      <SortIndicator sortKey="modifier_1" />
                    </th>
                  )}
                  {getVisibleColumns.modifier_2 && (
                    <th
                      className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={(e) => handleSort('modifier_2', e)}
                    >
                      Modifier 2
                      <SortIndicator sortKey="modifier_2" />
                    </th>
                  )}
                  {getVisibleColumns.modifier_3 && (
                    <th
                      className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={(e) => handleSort('modifier_3', e)}
                    >
                      Modifier 3
                      <SortIndicator sortKey="modifier_3" />
                    </th>
                  )}
                  {getVisibleColumns.modifier_4 && (
                    <th
                      className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={(e) => handleSort('modifier_4', e)}
                    >
                      Modifier 4
                      <SortIndicator sortKey="modifier_4" />
                    </th>
                  )}
                  {getVisibleColumns.program && (
                    <th
                      className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={(e) => handleSort('program', e)}
                    >
                      Program
                      <SortIndicator sortKey="program" />
                    </th>
                  )}
                  {getVisibleColumns.location_region && (
                    <th
                      className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={(e) => handleSort('location_region', e)}
                    >
                      Location/Region
                      <SortIndicator sortKey="location_region" />
                    </th>
                  )}
                  {getVisibleColumns.provider_type && (
                      <th
                        className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={(e) => handleSort('provider_type', e)}
                      >
                      Provider Type
                        <SortIndicator sortKey="provider_type" />
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    {getVisibleColumns.state_name && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {STATE_ABBREVIATIONS[item.state_name?.toUpperCase() || ""] || item.state_name || '-'}
                        </td>
                    )}
                    {getVisibleColumns.service_category && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {SERVICE_CATEGORY_ABBREVIATIONS[item.service_category?.trim().toUpperCase() || ""] || item.service_category || '-'}
                        </td>
                    )}
                    {getVisibleColumns.service_code && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.service_code || '-'}</td>
                    )}
                    {getVisibleColumns.service_description && (
                      <td
                        className="px-6 py-4 text-sm text-gray-900 max-w-[220px] truncate"
                        title={item.service_description || '-'}
                      >
                        {item.service_description || '-'}
                      </td>
                    )}
                    {getVisibleColumns.duration_unit && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.duration_unit || '-'}</td>
                    )}
                    {getVisibleColumns.rate && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.rate
                          ? (() => {
                              const num = Number(item.rate.replace(/[^0-9.]/g, ""));
                              if (isNaN(num)) return item.rate.startsWith('$') ? item.rate : ('$' + item.rate);
                              return `$${num.toFixed(2)}`;
                            })()
                          : '-'}
                      </td>
                    )}
                    {getVisibleColumns.rate_effective_date && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.rate_effective_date || '-'}</td>
                    )}
                    {getVisibleColumns.modifier_1 && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.modifier_1 ? `${item.modifier_1}${item.modifier_1_details ? ` - ${item.modifier_1_details}` : ''}` : '-'}
                      </td>
                    )}
                    {getVisibleColumns.modifier_2 && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.modifier_2 ? `${item.modifier_2}${item.modifier_2_details ? ` - ${item.modifier_2_details}` : ''}` : '-'}
                      </td>
                    )}
                    {getVisibleColumns.modifier_3 && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.modifier_3 ? `${item.modifier_3}${item.modifier_3_details ? ` - ${item.modifier_3_details}` : ''}` : '-'}
                      </td>
                    )}
                    {getVisibleColumns.modifier_4 && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.modifier_4 ? `${item.modifier_4}${item.modifier_4_details ? ` - ${item.modifier_4_details}` : ''}` : '-'}
                      </td>
                    )}
                    {getVisibleColumns.program && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.program || '-'}</td>
                    )}
                    {getVisibleColumns.location_region && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.location_region || '-'}</td>
                    )}
                    {getVisibleColumns.provider_type && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.provider_type || '-'}</td>
                    )}
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