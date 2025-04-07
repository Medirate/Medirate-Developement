"use client";

import { useEffect, useState, useMemo, useRef, useId } from "react";
import AppLayout from "@/app/components/applayout";
import { FaSpinner, FaExclamationCircle, FaChevronDown, FaFilter } from 'react-icons/fa';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useData, ServiceData } from "@/context/DataContext";
import CodeDefinitionsIcon from '@/app/components/CodeDefinitionsIcon';
import Select from 'react-select';
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import { useRouter } from "next/navigation";

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

export default function Dashboard() {
  const { isAuthenticated, isLoading, user } = useKindeBrowserClient();
  const router = useRouter();
  const [isSubscriptionCheckComplete, setIsSubscriptionCheckComplete] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/api/auth/login");
    } else if (isAuthenticated) {
      checkSubscription();
    }
  }, [isAuthenticated, isLoading, router]);

  const checkSubscription = async () => {
    const userEmail = user?.email ?? "";
    if (!userEmail) return;

    try {
      const response = await fetch("/api/stripe/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      });

      const data = await response.json();
      if (data.error || !data.status || data.status !== "active") {
        router.push("/subscribe");
      } else {
        setIsSubscriptionCheckComplete(true); // Mark check as complete
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
      router.push("/subscribe");
    }
  };

  // Always call hooks at the top level
  const { data, loading, error } = useData();

  // Filter states
  const [selectedServiceCategory, setSelectedServiceCategory] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedServiceCode, setSelectedServiceCode] = useState("");
  const [selectedServiceDescription, setSelectedServiceDescription] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedLocationRegion, setSelectedLocationRegion] = useState("");
  const [selectedModifier, setSelectedModifier] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

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

  const areFiltersApplied = selectedState;

  // Add new state for selected year
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // Add a state to track the current step
  const [filterStep, setFilterStep] = useState(1);

  // Add Fee Schedule Dates Dropdown
  const [selectedFeeScheduleDate, setSelectedFeeScheduleDate] = useState("");
  const [feeScheduleDates, setFeeScheduleDates] = useState<string[]>([]);

  // Move the parseDate function here, before filteredData
  const parseDate = (dateString: string | null) => {
    if (!dateString) return null; // Skip null or undefined dates

    if (!isNaN(Number(dateString))) {
      const serialDate = Number(dateString);
      const date = new Date(Date.UTC(1900, 0, serialDate - 1)); // Convert serial date to Date object
      if (isNaN(date.getTime())) {
        console.error("Invalid serial date:", dateString);
        return null; // Skip invalid serial dates
      }
      return date;
    }

    const dateParts = dateString.split('/');
    if (dateParts.length !== 3) {
      console.error("Invalid date format:", dateString);
      return null; // Skip invalid date formats
    }

    const month = parseInt(dateParts[0], 10) - 1; // Months are 0-based in JavaScript
    const day = parseInt(dateParts[1], 10);
    const year = parseInt(dateParts[2], 10);

    if (isNaN(month) || isNaN(day) || isNaN(year)) {
      console.error("Invalid date parts:", dateString);
      return null; // Skip invalid date parts
    }

    const date = new Date(Date.UTC(year, month, day));
    if (isNaN(date.getTime())) {
      console.error("Invalid date:", dateString);
      return null; // Skip invalid dates
    }

    return date;
  };

  // Now the filteredData useMemo hook can safely use parseDate
  const filteredData = useMemo(() => {
    if (!areFiltersApplied) return [];
    
    return data.filter(item => {
                          const parsedDate = parseDate(item.rate_effective_date);
      if (!parsedDate) return false; // Skip items with invalid dates

      if (selectedFeeScheduleDate) {
        const itemDate = parsedDate.toISOString().split('T')[0];
        const selectedDate = selectedFeeScheduleDate;
        if (itemDate !== selectedDate) return false;
      } else {
        if ((startDate && parsedDate < startDate) || (endDate && parsedDate > endDate)) return false;
      }

      if (selectedYear) {
        if (parsedDate.getFullYear() !== selectedYear) return false;
      }

      if (item.state_name !== selectedState) return false;

      if (selectedServiceCategory && item.service_category !== selectedServiceCategory) return false;
      if (selectedServiceCode && item.service_code !== selectedServiceCode) return false;
      if (selectedProgram && item.program !== selectedProgram) return false;
      if (selectedLocationRegion && item.location_region !== selectedLocationRegion) return false;
      if (selectedModifier) {
        const selectedModifierCode = selectedModifier.split(' - ')[0];
        const hasModifier = 
          (item.modifier_1 && item.modifier_1.split(' - ')[0] === selectedModifierCode) ||
          (item.modifier_2 && item.modifier_2.split(' - ')[0] === selectedModifierCode) ||
          (item.modifier_3 && item.modifier_3.split(' - ')[0] === selectedModifierCode) ||
          (item.modifier_4 && item.modifier_4.split(' - ')[0] === selectedModifierCode);
        if (!hasModifier) return false;
      }

      return true;
    });
  }, [
    data,
    startDate,
    endDate,
    selectedYear,
    selectedState,
    selectedServiceCategory,
    selectedServiceCode,
    selectedProgram,
    selectedLocationRegion,
    selectedModifier,
    selectedFeeScheduleDate
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
      extractFilters(data);
    }
  }, [data]);

  useEffect(() => {
    console.log('Total data:', data.length);
    console.log('Filtered data:', filteredData.length);
  }, [data, filteredData]);

  const ErrorMessage = ({ error }: { error: string }) => {
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
    setServiceCategories([...new Set(categories)].sort((a, b) => a.localeCompare(b)));

    // Get states
    const states = data
      .map((item) => item.state_name?.trim().toUpperCase())
      .filter((state): state is string => !!state);
    setStates([...new Set(states)].sort((a, b) => a.localeCompare(b)));
  };

  const toggleDropdown = (dropdownSetter: React.Dispatch<React.SetStateAction<boolean>>, otherSetters: React.Dispatch<React.SetStateAction<boolean>>[]) => {
    // Close all other dropdowns
    otherSetters.forEach(setter => setter(false));
    // Toggle the current dropdown
    dropdownSetter(prev => !prev);
  };

  const handleServiceCategoryChange = (category: string) => {
    setSelectedServiceCategory(category);
    setSelectedState("");
    setSelectedServiceCode("");
    setSelectedServiceDescription("");
    setSelectedProgram("");
    setSelectedLocationRegion("");
    setSelectedModifier("");
    setFilterStep(2);

    // Filter data based on selected category
    const filteredData = data.filter(item => item.service_category === category);
    
    // Update all filter options based on filtered data
    setStates([...new Set(filteredData
      .map(item => item.state_name?.toUpperCase())
      .filter((state): state is string => !!state)
    )].sort((a, b) => a.localeCompare(b)));
    setServiceCodes([]);
    setServiceDescriptions([]);
    setPrograms([]);
    setLocationRegions([]);
    setModifiers([]);
  };

  const handleStateChange = (state: string) => {
    setSelectedState(state.toUpperCase());
    setSelectedServiceCode("");
    setSelectedServiceDescription("");
    setSelectedProgram("");
    setSelectedLocationRegion("");
    setSelectedModifier("");
    setFilterStep(3);

    if (selectedServiceCategory) {
      const filteredData = data.filter(item => 
        item.state_name?.toUpperCase() === state.toUpperCase() &&
        item.service_category === selectedServiceCategory
      );
      
      setServiceCodes([...new Set(filteredData
        .map(item => item.service_code)
        .filter((code): code is string => !!code)
      )].sort((a, b) => a.localeCompare(b)));
      setServiceDescriptions([...new Set(filteredData
        .map(item => item.service_description)
        .filter((desc): desc is string => !!desc)
      )].sort((a, b) => a.localeCompare(b)));
      
      // Don't set programs, locationRegions, or modifiers yet
      setPrograms([]);
      setLocationRegions([]);
      setModifiers([]);
    }
  };

  const handleServiceCodeChange = (code: string) => {
    setSelectedServiceCode(code);
    // Don't clear service description anymore
    setFilterStep(4); // Move to next step

    // Now we can populate the additional filters
    const filteredData = data.filter(item => 
      item.service_category === selectedServiceCategory &&
      item.state_name === selectedState &&
      item.service_code === code
    );
    
    setPrograms([...new Set(filteredData.map(item => item.program || ''))]);
    setLocationRegions([...new Set(filteredData.map(item => item.location_region || ''))]);
    
    const allModifiers = filteredData.flatMap(item => [
      item.modifier_1 ? `${item.modifier_1}${item.modifier_1_details ? ` - ${item.modifier_1_details}` : ''}` : null,
      item.modifier_2 ? `${item.modifier_2}${item.modifier_2_details ? ` - ${item.modifier_2_details}` : ''}` : null,
      item.modifier_3 ? `${item.modifier_3}${item.modifier_3_details ? ` - ${item.modifier_3_details}` : ''}` : null,
      item.modifier_4 ? `${item.modifier_4}${item.modifier_4_details ? ` - ${item.modifier_4_details}` : ''}` : null
    ]).filter(Boolean);
    setModifiers([...new Set(allModifiers)].map(modifier => ({
      value: modifier || '',
      label: modifier || ''
    })));
  };

  const handleServiceDescriptionChange = (desc: string) => {
    setSelectedServiceDescription(desc);
    // Don't clear service code anymore
    setFilterStep(4); // Move to next step

    // Now we can populate the additional filters
    const filteredData = data.filter(item => 
      item.service_category === selectedServiceCategory &&
      item.state_name === selectedState &&
      item.service_description === desc
    );
    
    setPrograms([...new Set(filteredData.map(item => item.program || ''))]);
    setLocationRegions([...new Set(filteredData.map(item => item.location_region || ''))]);
    
    const allModifiers = filteredData.flatMap(item => [
      item.modifier_1 ? `${item.modifier_1}${item.modifier_1_details ? ` - ${item.modifier_1_details}` : ''}` : null,
      item.modifier_2 ? `${item.modifier_2}${item.modifier_2_details ? ` - ${item.modifier_2_details}` : ''}` : null,
      item.modifier_3 ? `${item.modifier_3}${item.modifier_3_details ? ` - ${item.modifier_3_details}` : ''}` : null,
      item.modifier_4 ? `${item.modifier_4}${item.modifier_4_details ? ` - ${item.modifier_4_details}` : ''}` : null
    ]).filter(Boolean);
    setModifiers([...new Set(allModifiers)].map(modifier => ({
      value: modifier || '',
      label: modifier || ''
    })));
  };

  const ClearButton = ({ onClick }: { onClick: () => void }) => (
    <button
      onClick={onClick}
      className="text-xs text-blue-500 hover:underline mt-1"
    >
      Clear
    </button>
  );

  // Update the resetFilters function to reset the filter step
  const resetFilters = () => {
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
    setFilterStep(1); // Reset to the first step
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
        // Add program-specific logic if needed
        break;
      case 'locationRegion':
        // Add location/region-specific logic if needed
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

  // Update the getVisibleColumns function
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
        
        Object.keys(columns).forEach((key) => {
          const columnKey = key as keyof typeof columns;
          if (item[columnKey] && item[columnKey] !== '-') {
            columns[columnKey] = true;
          }
        });
      });
    }

    return columns;
  }, [filteredData]);

  // Create a utility function to format text
  const formatText = (text: string | null | undefined) => {
    return text ? text.toUpperCase() : '-';
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
      console.log("Raw rate_effective_date values:", data.map(item => item.rate_effective_date));
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

    console.log("Extracted Fee Schedule Dates:", filteredDates); // Log the extracted dates
    setFeeScheduleDates([...new Set(filteredDates)].sort((a, b) => a.localeCompare(b)));
  };

  useEffect(() => {
    if (data.length > 0) {
      extractFeeScheduleDates(data);
    }
  }, [data, selectedServiceCategory, selectedState, selectedServiceCode, selectedServiceDescription]);

  // Update the Date Range fields to disable them when a Fee Schedule Date is selected
  const isDateRangeDisabled = !!selectedFeeScheduleDate;

  // Don't render anything until the subscription check is complete
  if (isLoading || !isAuthenticated || !isSubscriptionCheckComplete) {
    return (
      <div className="flex justify-center items-center h-screen">
        <FaSpinner className="animate-spin h-12 w-12 text-blue-500" />
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  return (
    <AppLayout activeTab="dashboard">
      <CodeDefinitionsIcon />
      <div className="p-4 sm:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
        {/* Error Message */}
        <ErrorMessage error={error} />

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
                options={serviceCategories
                  .filter(category => {
                    const trimmedCategory = category.trim();
                    return trimmedCategory && 
                           !['HCBS', 'IDD', 'SERVICE CATEGORY'].includes(trimmedCategory);
                  })
                  .map(category => ({ value: category, label: category }))}
                value={selectedServiceCategory ? { value: selectedServiceCategory, label: selectedServiceCategory } : null}
                onChange={(option) => handleServiceCategoryChange(option?.value || "")}
                placeholder="Select Service Line"
                isSearchable
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
                options={serviceCodes.map(code => ({ value: code, label: code }))}
                value={selectedServiceCode ? { value: selectedServiceCode, label: selectedServiceCode } : null}
                onChange={(option) => {
                  setSelectedServiceCode(option?.value || "");
                  setSelectedServiceDescription("");
                  if (option?.value) {
                    handleServiceCodeChange(option.value);
                  }
                }}
                placeholder="Select Service Code"
                isSearchable
                isDisabled={!selectedState}
                className={`react-select-container ${!selectedState ? 'opacity-50' : ''}`}
                classNamePrefix="react-select"
              />
              {selectedServiceCode && (
                <ClearButton onClick={() => {
                  setSelectedServiceCode("");
                  handleServiceCodeChange("");
                }} />
              )}
            </div>

            {/* Service Description Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Service Description</label>
              <Select
                instanceId={serviceDescriptionId}
                options={serviceDescriptions.map(desc => ({ value: desc, label: desc }))}
                value={selectedServiceDescription ? { value: selectedServiceDescription, label: selectedServiceDescription } : null}
                onChange={(option) => {
                  setSelectedServiceDescription(option?.value || "");
                  setSelectedServiceCode("");
                  if (option?.value) {
                    handleServiceDescriptionChange(option.value);
                  }
                }}
                placeholder="Select Service Description"
                isSearchable
                isDisabled={!selectedState}
                className={`react-select-container ${!selectedState ? 'opacity-50' : ''}`}
                classNamePrefix="react-select"
              />
              {selectedServiceDescription && (
                <ClearButton onClick={() => {
                  setSelectedServiceDescription("");
                  handleServiceDescriptionChange("");
                }} />
              )}
            </div>

            {/* Program Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Program</label>
              <Select
                instanceId={programId}
                options={programs.map(program => ({ value: program, label: program }))}
                value={selectedProgram ? { value: selectedProgram, label: selectedProgram } : null}
                onChange={(option) => setSelectedProgram(option?.value || "")}
                placeholder="Select Program"
                isSearchable
                isDisabled={!selectedServiceCode && !selectedServiceDescription}
                className={`react-select-container ${!selectedServiceCode && !selectedServiceDescription ? 'opacity-50' : ''}`}
                classNamePrefix="react-select"
              />
              {selectedProgram && (
                <ClearButton onClick={() => setSelectedProgram("")} />
              )}
            </div>

            {/* Location/Region Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Location/Region</label>
              <Select
                instanceId={locationRegionId}
                options={locationRegions.map(region => ({ value: region, label: region }))}
                value={selectedLocationRegion ? { value: selectedLocationRegion, label: selectedLocationRegion } : null}
                onChange={(option) => setSelectedLocationRegion(option?.value || "")}
                placeholder="Select Location/Region"
                isSearchable
                isDisabled={!selectedServiceCode && !selectedServiceDescription}
                className={`react-select-container ${!selectedServiceCode && !selectedServiceDescription ? 'opacity-50' : ''}`}
                classNamePrefix="react-select"
              />
              {selectedLocationRegion && (
                <ClearButton onClick={() => setSelectedLocationRegion("")} />
              )}
            </div>

            {/* Modifier Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Modifier</label>
              <Select
                instanceId={modifierId}
                options={modifiers}
                value={selectedModifier ? { value: selectedModifier, label: selectedModifier } : null}
                onChange={(option) => setSelectedModifier(option?.value || "")}
                placeholder="Select Modifier"
                isSearchable
                isDisabled={!selectedServiceCode && !selectedServiceDescription}
                className={`react-select-container ${!selectedServiceCode && !selectedServiceDescription ? 'opacity-50' : ''}`}
                classNamePrefix="react-select"
              />
              {selectedModifier && (
                <ClearButton onClick={() => setSelectedModifier("")} />
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
          <div className="flex justify-center items-center h-64">
            <FaSpinner className="animate-spin h-12 w-12 text-blue-500" />
            <p className="ml-4 text-gray-600">Loading data...</p>
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

        {/* Data Table */}
        {!loading && areFiltersApplied && (
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
                  {getVisibleColumns.rate_per_hour && (
                    <th
                      className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={(e) => handleSort('rate_per_hour', e)}
                    >
                      Hourly Equivalent Rate
                      <SortIndicator sortKey="rate_per_hour" />
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    {getVisibleColumns.state_name && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatText(item.state_name)}</td>
                    )}
                    {getVisibleColumns.service_category && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatText(item.service_category)}</td>
                    )}
                    {getVisibleColumns.service_code && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatText(item.service_code)}</td>
                    )}
                    {getVisibleColumns.service_description && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.service_description || '-'}</td>
                    )}
                    {getVisibleColumns.duration_unit && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.duration_unit || '-'}</td>
                    )}
                    {getVisibleColumns.rate && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.rate || '-'}</td>
                    )}
                    {getVisibleColumns.rate_per_hour && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(() => {
                          const rateStr = (item.rate || '').replace('$', '');
                          const rate = parseFloat(rateStr);
                          const durationUnit = item.duration_unit?.toUpperCase();
                          
                          if (isNaN(rate)) return '-';
                          
                          if (durationUnit === '15 MINUTES') {
                            return `$${(rate * 4).toFixed(2)}`;
                          } else if (durationUnit === '30 MINUTES') {
                            return `$${(rate * 2).toFixed(2)}`;
                          } else if (durationUnit === 'PER HOUR') {
                            return `$${rate.toFixed(2)}`;
                          }
                          return 'N/A';
                        })()}
                      </td>
                    )}
                    {getVisibleColumns.rate_effective_date && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.rate_effective_date ? (() => {
                          const parsedDate = parseDate(item.rate_effective_date);
                          if (!parsedDate) return '-'; // Handle null case
                          const month = String(parsedDate.getUTCMonth() + 1).padStart(2, '0');
                          const day = String(parsedDate.getUTCDate()).padStart(2, '0');
                          const year = parsedDate.getUTCFullYear();
                          return `${month}/${day}/${year}`; // Format as mm/dd/yyyy
                        })() : '-'}
                      </td>
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.program}</td>
                    )}
                    {getVisibleColumns.location_region && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatText(item.location_region)}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

            {/* Sorting Instructions - Show below table when filters are applied */}
            <div className="bg-blue-50 p-4 rounded-lg mt-4 border border-blue-200">
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
          </>
        )}
      </div>

      {/* Custom CSS for select dropdowns */}
      <style jsx>{`
        select {
          appearance: none;
          background-color: white;
          background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%233b82f6%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
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
    </AppLayout>
  );
}
