"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import AppLayout from "@/app/components/applayout";
import { FaSpinner, FaExclamationCircle, FaChevronLeft, FaChevronRight, FaFilter, FaChartLine } from 'react-icons/fa';
import Select from "react-select";
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import { useRouter } from "next/navigation";
import type { Dispatch, SetStateAction } from 'react';
import { gunzipSync, strFromU8 } from "fflate";
import { supabase } from "@/lib/supabase";

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
  rate_effective_date: string;
  program: string;
  location_region: string;
  rate_per_hour?: string;
  duration_unit?: string;
  service_description?: string;
  provider_type?: string;
}

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Add this custom filter function before the HistoricalRates component
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

// Move extractFilters above the component definition to avoid linter error
function extractFilters(
  data: ServiceData[],
  setServiceCategories: Dispatch<SetStateAction<string[]>>,
  setStates: Dispatch<SetStateAction<string[]>>,
  setPrograms: Dispatch<SetStateAction<string[]>>,
  setLocationRegions: Dispatch<SetStateAction<string[]>>,
  setModifiers: Dispatch<SetStateAction<{ value: string; label: string; details?: string }[]>>,
  setProviderTypes: Dispatch<SetStateAction<string[]>>
) {
  const categories = data
    .map((item) => item.service_category?.trim())
    .filter((category): category is string => Boolean(category));
  setServiceCategories([...new Set(categories)].sort((a, b) => a.localeCompare(b)));

  const states = data
    .map((item) => item.state_name?.trim().toUpperCase())
    .filter((state): state is string => Boolean(state));
  setStates([...new Set(states)].sort((a, b) => a.localeCompare(b)));

  const programs = data
    .map((item) => item.program?.trim())
    .filter((program): program is string => Boolean(program));
  setPrograms([...new Set(programs)].sort((a, b) => a.localeCompare(b)));

  const locationRegions = data
    .map((item) => item.location_region?.trim())
    .filter((region): region is string => Boolean(region));
  setLocationRegions([...new Set(locationRegions)].sort((a, b) => a.localeCompare(b)));

  const allModifiers = data.flatMap(item => [
    item.modifier_1 ? { value: item.modifier_1, details: item.modifier_1_details } : null,
    item.modifier_2 ? { value: item.modifier_2, details: item.modifier_2_details } : null,
    item.modifier_3 ? { value: item.modifier_3, details: item.modifier_3_details } : null,
    item.modifier_4 ? { value: item.modifier_4, details: item.modifier_4_details } : null
  ]).filter(Boolean);
  setModifiers([...new Set(allModifiers.map(mod => mod?.value).filter(Boolean))].map(value => {
    const mod = allModifiers.find(mod => mod?.value === value);
    return { value: value as string, label: value as string, details: mod?.details || '' };
  }));

  const types = data
    .map((item) => item.provider_type?.trim())
    .filter((type): type is string => Boolean(type));
  setProviderTypes([...new Set(types)].sort((a, b) => a.localeCompare(b)));
}

// Define ErrorMessage component at the top level
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

// Update the CustomTooltip component for better formatting
const CustomTooltip = ({ content, children }: { content: string; children: React.ReactNode }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [showOnRight, setShowOnRight] = useState(true);

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsVisible(true);
    setTimeout(() => {
      if (tooltipRef.current && e.currentTarget) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        // Always show on the right of the cell
        let x = rect.right + 12;
        let y = rect.top;
        // Only clamp if it would go off the window on the left
        if (x < 0) x = 0;
        if (y + tooltipRect.height > window.innerHeight) y = window.innerHeight - tooltipRect.height - 10;
        if (y < 10) y = 10;
        setPosition({ x, y });
        setShowOnRight(true); // Always right
      }
    }, 0);
  };

  const handleMouseLeave = () => setIsVisible(false);

  return (
    <div
      className="relative inline-block w-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-[9999] px-4 py-2 text-sm text-gray-700 bg-white rounded-lg shadow-lg border border-gray-100 max-w-xl whitespace-pre-line break-words"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            opacity: 1,
            pointerEvents: 'none'
          }}
        >
          <div className="relative">
            {/* Always use left-side arrow */}
            <div className="absolute top-3 left-[-8px] w-4 h-4 bg-white border-t border-l border-gray-100 rotate-45"></div>
            <div className="relative z-10 bg-white rounded-lg whitespace-normal break-words">
              {content}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Add PaginationControls component before the main component
const PaginationControls = ({ 
  currentPage, 
  setCurrentPage, 
  totalCount, 
  itemsPerPage 
}: { 
  currentPage: number; 
  setCurrentPage: (page: number) => void; 
  totalCount: number; 
  itemsPerPage: number; 
}) => {
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const maxVisiblePages = 5;
  const halfVisible = Math.floor(maxVisiblePages / 2);
  
  let startPage = Math.max(1, currentPage - halfVisible);
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  const pages = [];
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
      <div className="flex justify-between flex-1 sm:hidden">
        <button
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="relative inline-flex items-center px-4 py-2 ml-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
            <span className="font-medium">
              {Math.min(currentPage * itemsPerPage, totalCount)}
            </span>{" "}
            of <span className="font-medium">{totalCount}</span> results
          </p>
        </div>
        <div>
          <nav className="inline-flex -space-x-px rounded-md shadow-sm isolate" aria-label="Pagination">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">First</span>
              <FaChevronLeft className="h-5 w-5" />
              <FaChevronLeft className="h-5 w-5 -ml-2" />
            </button>
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Previous</span>
              <FaChevronLeft className="h-5 w-5" />
            </button>
            
            {startPage > 1 && (
              <>
                <button
                  onClick={() => setCurrentPage(1)}
                  className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                >
                  1
                </button>
                {startPage > 2 && (
                  <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                    ...
                  </span>
                )}
              </>
            )}

            {pages.map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                  currentPage === page
                    ? "z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    : "text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                }`}
              >
                {page}
              </button>
            ))}

            {endPage < totalPages && (
              <>
                {endPage < totalPages - 1 && (
                  <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                    ...
                  </span>
                )}
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                >
                  {totalPages}
                </button>
              </>
            )}

            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Next</span>
              <FaChevronRight className="h-5 w-5" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Last</span>
              <FaChevronRight className="h-5 w-5" />
              <FaChevronRight className="h-5 w-5 -ml-2" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

// Utility to parse MM/DD/YYYY date strings
function parseDateString(dateStr: string): Date {
  const [month, day, year] = dateStr.split(/[/-]/).map(Number);
  return new Date(year, month - 1, day);
}

// Add a helper for formatting currency
function formatCurrency(value: string | number | undefined): string {
  if (typeof value === 'number') {
    return `$${value.toFixed(2)}`;
  }
  if (typeof value === 'string') {
    const num = parseFloat(value.replace(/[^0-9.\-]/g, ''));
    if (isNaN(num)) return value;
    return `$${num.toFixed(2)}`;
  }
  return '-';
}

// Add abbreviations mappings (copy from dashboard)
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

// Add this helper function similar to dashboard
const getDropdownOptions = (options: string[], isMandatory: boolean = false, filterKey?: keyof Selections, selections?: Selections, filterOptionsData?: any): { value: string; label: string }[] => {
  const uniqueOptions = [...new Set(options)].filter(Boolean).sort((a, b) => a.localeCompare(b));
  const dropdownOptions = uniqueOptions.map(option => ({
    value: option,
    label: option
  }));
  
  // For secondary filters, check if there are actually blank entries before adding "-" option
  if (!isMandatory && filterKey && selections && filterOptionsData && ['program', 'location_region', 'provider_type', 'modifier_1'].includes(filterKey as string)) {
    const hasBlankEntries = hasBlankEntriesForFilter(filterKey, selections, filterOptionsData);
    if (hasBlankEntries && filterKey !== 'duration_unit') {
      dropdownOptions.unshift({ value: "-", label: "-" });
    }
  } else if (!isMandatory) {
    // For other filters, use the original logic
    dropdownOptions.unshift({ value: "-", label: "-" });
  }
  
  return dropdownOptions;
};

// Add helper to get available options for each filter based on current selections
function getAvailableOptionsForFilter(filterKey: keyof Selections, selections: Selections, filterOptionsData: any): string[] {
  if (!filterOptionsData || !filterOptionsData.combinations) return [];
  
  // For all other filters, ensure that if a fee_schedule_date is selected, we only consider combos where the date is present in the array (or matches the string)
  return Array.from(new Set(
    filterOptionsData.combinations
      .filter((combo: any) => {
        // Now check all other selections except the current filterKey
        return Object.entries(selections).every(([key, value]) => {
          if (key === filterKey) return true;
          if (!value) return true;
          
          // Handle multi-select values (arrays) vs single values (strings)
          if (Array.isArray(value)) {
            return value.includes(combo[key]);
          } else {
            return combo[key] === value;
          }
        });
      })
      .map((c: any) => c[filterKey])
      .filter((val: any): val is string => Boolean(val))
  )).sort() as string[];
}

// Helper function to check if there are blank entries for a secondary filter
const hasBlankEntriesForFilter = (filterKey: keyof Selections, selections: Selections, filterOptionsData: any): boolean => {
  if (!filterOptionsData || !filterOptionsData.combinations) return false;
  
  // Build filter conditions based on current selections (same as getAvailableOptionsForFilter)
  const filteredCombinations = filterOptionsData.combinations.filter((combo: any) => {
    // Check all other selections except the current filterKey
    return Object.entries(selections).every(([key, value]) => {
      if (key === filterKey) return true;
      if (!value) return true;
      
      const comboValue = combo[key];
      if (typeof comboValue !== 'string') return true; // Skip non-string fields
      
      // Handle multi-select values (arrays) vs single values (strings)
      if (Array.isArray(value)) {
        return value.includes(String(comboValue));
      } else {
        return comboValue === value;
      }
    });
  });
  
  // Check if there are any entries where the specified field is blank/empty
  return filteredCombinations.some((combo: any) => {
    const fieldValue = combo[filterKey];
    return !fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '');
  });
};

// Add Selections type and state for unified filter management
// --- NEW: Types for client-side filtering ---
interface Combination {
  [key: string]: string;
}

type Selections = {
  [key: string]: string | null;
};
// --- END NEW ---

// Add this helper near the top (after imports)
function formatDate(dateString: string | undefined): string {
  if (!dateString) return '-';
  
  // Handle both YYYY-MM-DD and MM/DD/YYYY formats
  let year: number, month: number, day: number;
  
  if (dateString.includes('/')) {
    // MM/DD/YYYY format
    const [monthStr, dayStr, yearStr] = dateString.split('/');
    month = parseInt(monthStr, 10);
    day = parseInt(dayStr, 10);
    year = parseInt(yearStr, 10);
  } else if (dateString.includes('-')) {
    // YYYY-MM-DD format
    const [yearStr, monthStr, dayStr] = dateString.split('-');
    year = parseInt(yearStr, 10);
    month = parseInt(monthStr, 10);
    day = parseInt(dayStr, 10);
  } else {
    // Fallback for unexpected formats - use timezone-safe parsing
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
  }
  
  // Validate the parsed values
  if (isNaN(year) || isNaN(month) || isNaN(day) || 
      month < 1 || month > 12 || day < 1 || day > 31) {
    return dateString; // Return original if invalid
  }
  
  // Return in MM/DD/YYYY format
  return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
}

export default function HistoricalRates() {
  const { isAuthenticated, isLoading, user } = useKindeBrowserClient();
  const router = useRouter();
  
  // Add proper data state management
  const [data, setData] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Add proper refreshData function
  const refreshData = async (filters: Record<string, string> = {}): Promise<{ data: ServiceData[]; totalCount: number; currentPage: number; itemsPerPage: number } | null> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const url = `/api/state-payment-comparison?${params.toString()}`;
      const response = await fetch(url);
      const result = await response.json();
      if (result && Array.isArray(result.data)) {
        setData(result.data);
        setHasSearched(true);
        return result;
      } else {
        setError('Invalid data format received');
        return null;
      }
    } catch (err) {
      setError('Failed to fetch data. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Add proper refreshFilters function (placeholder for now)
  const refreshFilters = async () => {
    // This can be implemented later if needed for filter options
  };

  const [isSubscriptionCheckComplete, setIsSubscriptionCheckComplete] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/api/auth/login");
    } else if (isAuthenticated) {
      checkSubscriptionAndSubUser();
    }
  }, [isAuthenticated, isLoading, router]);

  // Add pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const itemsPerPage: number = 50;

  // Keep only the states that are still needed
  const [selectedEntry, setSelectedEntry] = useState<ServiceData | null>(null);
  const [showRatePerHour, setShowRatePerHour] = useState(false);
  const [comment, setComment] = useState<string | null>(null);
  const [filterStep, setFilterStep] = useState(1);
  const [shouldExtractFilters, setShouldExtractFilters] = useState(false);
  const [filterOptionsData, setFilterOptionsData] = useState<any>(null);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [dataQualityWarning, setDataQualityWarning] = useState<string | null>(null);

  // Replace individual filter states with selections state
  const [selections, setSelections] = useState<Selections>({
    service_category: null,
    state_name: null,
    service_code: null,
    service_description: null,
    program: null,
    location_region: null,
    provider_type: null,
    duration_unit: null,
    modifier_1: null,
  });

  // Update areFiltersApplied to use selections state
  const areFiltersApplied = selections.service_category && selections.state_name && (selections.service_code || selections.service_description);

  // Generic handler to update selections state
  const handleSelectionChange = (field: keyof Selections, value: string | null) => {
    const newSelections: Selections = { ...selections, [field]: value };
    // Reset dependent filters if needed (simple version)
    const dependencyChain: (keyof Selections)[] = [
      'service_category', 'state_name', 'service_code',
      'service_description', 'program', 'location_region',
      'provider_type', 'duration_unit', 'modifier_1'
    ];
    const changedIndex = dependencyChain.indexOf(field);
    if (changedIndex !== -1) {
      for (let i = changedIndex + 1; i < dependencyChain.length; i++) {
        newSelections[dependencyChain[i]] = null;
      }
    }
    setSelections(newSelections);
    setCurrentPage(1); // Reset to first page when filter changes
    
    // Clear selected entry and search state when filters change
    setSelectedEntry(null);
    setHasSearched(false);
    setData([]);
  };

  const filteredData = useMemo(() => {
    // Only show data after a search has been performed
    if (!hasSearched || !selections.service_category || !selections.state_name || (!selections.service_code && !selections.service_description)) return [];

    console.log('🏁 TABLE DATA SOURCE (filteredData) - Starting with raw data:', data.length, 'entries');

    // First get all matching entries
    const allMatchingEntries = data.filter(item => {
      if (selections.service_category && item.service_category !== selections.service_category) return false;
      if (selections.state_name && item.state_name !== selections.state_name) return false;
      if (selections.service_code && item.service_code !== selections.service_code) return false;
      if (selections.service_description && item.service_description !== selections.service_description) return false;
      if (selections.program && selections.program !== "-" && item.program !== selections.program) return false;
      if (selections.location_region && selections.location_region !== "-" && item.location_region !== selections.location_region) return false;
      if (selections.modifier_1 && selections.modifier_1 !== "-") {
        const selectedModifierCode = selections.modifier_1.split(' - ')[0];
        const hasModifier = 
          (item.modifier_1 && item.modifier_1.split(' - ')[0] === selectedModifierCode) ||
          (item.modifier_2 && item.modifier_2.split(' - ')[0] === selectedModifierCode) ||
          (item.modifier_3 && item.modifier_3.split(' - ')[0] === selectedModifierCode) ||
          (item.modifier_4 && item.modifier_4.split(' - ')[0] === selectedModifierCode);
        if (!hasModifier) return false;
      }
      if (selections.provider_type && selections.provider_type !== "-") {
        if (item.provider_type !== selections.provider_type) return false;
      }
      if (selections.duration_unit && selections.duration_unit !== "-") {
        if (item.duration_unit !== selections.duration_unit) return false;
      }

      // Handle "-" selections (empty/null values)
      if (selections.program === "-" && item.program) return false;
      if (selections.location_region === "-" && item.location_region) return false;
      if (selections.provider_type === "-" && item.provider_type) return false;
      if (selections.duration_unit === "-" && item.duration_unit) return false;
      if (selections.modifier_1 === "-") {
        const hasAnyModifier = item.modifier_1 || item.modifier_2 || item.modifier_3 || item.modifier_4;
        if (hasAnyModifier) return false;
      }

      return true;
    });

    console.log('🏁 TABLE DATA - After filtering:', allMatchingEntries.length, 'entries');
    console.log('🏁 TABLE DATA - Sample filtered entries:', allMatchingEntries.slice(0, 3).map(e => ({ 
      rate: e.rate, 
      date: e.rate_effective_date,
      service_code: e.service_code,
      program: e.program 
    })));

    // Group entries by all fields except rate_effective_date and rate
    const groupedEntries = allMatchingEntries.reduce((acc, entry) => {
      const key = JSON.stringify({
        state_name: entry.state_name,
        service_category: entry.service_category,
        service_code: entry.service_code,
        service_description: entry.service_description,
        program: entry.program,
        location_region: entry.location_region,
        modifier_1: entry.modifier_1,
        modifier_1_details: entry.modifier_1_details,
        modifier_2: entry.modifier_2,
        modifier_2_details: entry.modifier_2_details,
        modifier_3: entry.modifier_3,
        modifier_3_details: entry.modifier_3_details,
        modifier_4: entry.modifier_4,
        modifier_4_details: entry.modifier_4_details,
        duration_unit: entry.duration_unit,
        provider_type: entry.provider_type
      });
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(entry);
      return acc;
    }, {} as Record<string, ServiceData[]>);

    console.log('🏁 TABLE DATA - Number of groups:', Object.keys(groupedEntries).length);

    // For each group, get the entry with the latest rate_effective_date
    const latestEntries = Object.values(groupedEntries).map(entries => {
      return entries.reduce((latest, current) => {
        const latestDate = parseDateString(latest.rate_effective_date);
        const currentDate = parseDateString(current.rate_effective_date);
        return currentDate > latestDate ? current : latest;
      });
    });

    console.log('🏁 TABLE DATA - Final table data:', latestEntries.length, 'entries');
    console.log('🏁 TABLE DATA - Final entries:', latestEntries.map(e => ({ 
      rate: e.rate, 
      date: e.rate_effective_date,
      service_code: e.service_code,
      program: e.program 
    })));

    return latestEntries;
  }, [
    hasSearched,
    data,
    selections.service_category,
    selections.state_name,
    selections.service_code,
    selections.service_description,
    selections.program,
    selections.location_region,
    selections.modifier_1,
    selections.provider_type,
    selections.duration_unit
  ]);

  useEffect(() => {
    // Filtered data processing
  }, [filteredData]);

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
      rate_effective_date: false
    };

    // Only process columns if we have data and are not loading
    if (filteredData.length > 0 && !loading) {
      filteredData.forEach(item => {
        Object.keys(columns).forEach(key => {
          if (item[key as keyof ServiceData] && item[key as keyof ServiceData] !== '-') {
            columns[key as keyof typeof columns] = true;
          }
        });
      });
      
      // Ensure essential columns are always visible if we have data
      if (filteredData.length > 0) {
        columns.state_name = true;
        columns.service_category = true;
        columns.service_code = true;
        columns.rate = true;
        columns.rate_effective_date = true;
      }
    }

    return columns;
  }, [filteredData, loading]);

  // Now fetchComment is after all useState hooks
  const fetchComment = async (serviceCategory: string, state: string) => {
    const { data: commentData, error } = await supabase
      .from("comments")
      .select("comment")
      .eq("service_category", serviceCategory)
      .eq("state", state)
      .single();

    if (error) {
      setComment(null);
    } else {
      setComment(commentData?.comment || null);
    }
  };

  // Define checkSubscriptionAndSubUser before using it
  const checkSubscriptionAndSubUser = async () => {
    const userEmail = user?.email ?? "";
    const kindeUserId = user?.id ?? "";
    if (!userEmail || !kindeUserId) return;

    try {
      // Check if the user is a sub-user
      const { data: subUserData, error: subUserError } = await supabase
        .from("subscription_users")
        .select("sub_users")
        .contains("sub_users", JSON.stringify([userEmail]));

      if (subUserError) {
        return;
      }

      if (subUserData && subUserData.length > 0) {
        // Check if the user already exists in the User table
        const { data: existingUser, error: fetchError } = await supabase
          .from("User")
          .select("Email")
          .eq("Email", userEmail)
          .single();

        if (fetchError && fetchError.code !== "PGRST116") { // Ignore "no rows found" error
          return;
        }

        if (existingUser) {
          // User exists, update their role to "sub-user"
          const { error: updateError } = await supabase
            .from("User")
            .update({ Role: "sub-user", UpdatedAt: new Date().toISOString() })
            .eq("Email", userEmail);

          if (updateError) {
            // Error handling
          }
        } else {
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
            // Error handling
          }
        }

        // Allow sub-user to access the dashboard
        setIsSubscriptionCheckComplete(true);
        return;
      }

      // If not a sub-user, check for an active subscription
      const response = await fetch("/api/stripe/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      });

      const data = await response.json();
      if (data.error || !data.status || data.status !== "active") {
        router.push("/subscribe");
      } else {
        setIsSubscriptionCheckComplete(true);
      }
    } catch (error) {
      router.push("/subscribe");
    }
  };

  // Add periodic authentication check for long-running sessions
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkAuthStatus = async () => {
      try {
        const response = await fetch('/api/auth-check');
        if (response.status === 401) {
          router.push("/api/auth/login");
        }
      } catch (error) {
        // Error handling
      }
    };

    const authCheckInterval = setInterval(checkAuthStatus, 5 * 60 * 1000);

    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated) {
        checkAuthStatus();
        
        if (hasSearched && !authError && areFiltersApplied) {
          // Refresh data if needed
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(authCheckInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, router, hasSearched, authError, areFiltersApplied]);

  // Now the useEffect can safely use checkSubscriptionAndSubUser
  useEffect(() => {
    checkSubscriptionAndSubUser();
  }, [router]);

  // Move all useEffect hooks here, before any conditional returns
  useEffect(() => {
    if (shouldExtractFilters) {
      setShouldExtractFilters(false);
    }
  }, [shouldExtractFilters]);

  useEffect(() => {
    if (selections.service_category && selections.state_name) {
      fetchComment(selections.service_category, selections.state_name);
    } else {
      setComment(null);
    }
  }, [selections.service_category, selections.state_name]);

  // Comment out problematic useEffect blocks for now
  /*
  useEffect(() => {
    const descriptions = filteredData.map(item => item.service_description).filter((desc): desc is string => !!desc);
    setServiceDescriptions([...new Set(descriptions)].sort((a, b) => a.localeCompare(b)));

    const programs = filteredData.map(item => item.program).filter((program): program is string => !!program);
    setPrograms([...new Set(programs)].sort((a, b) => a.localeCompare(b)));

    const locationRegions = filteredData.map(item => item.location_region).filter((region): region is string => !!region);
    setLocationRegions([...new Set(locationRegions)].sort((a, b) => a.localeCompare(b)));

    const allModifiers = filteredData.flatMap(item => [
      item.modifier_1 ? { value: item.modifier_1, details: item.modifier_1_details } : null,
      item.modifier_2 ? { value: item.modifier_2, details: item.modifier_2_details } : null,
      item.modifier_3 ? { value: item.modifier_3, details: item.modifier_3_details } : null,
      item.modifier_4 ? { value: item.modifier_4, details: item.modifier_4_details } : null
    ]).filter(Boolean);

    setModifiers([...new Set(allModifiers.map(mod => mod?.value).filter(Boolean))].map(value => {
      const mod = allModifiers.find(mod => mod?.value === value);
      return { value: value as string, label: value as string, details: mod?.details || '' };
    }));
  }, [filteredData]);

  // Preload filter options from context (like dashboard)
  useEffect(() => {
    if (filterOptions?.serviceCategories) {
      setServiceCategories(filterOptions.serviceCategories);
    }
    if (filterOptions?.states) {
      setStates(filterOptions.states);
    }
    // Add other filters as needed
  }, [filterOptions]);
  */

  // Debug: Log filterOptions and selected filters
  useEffect(() => {
    // Filter data processing
  }, [filterOptionsData, selections.service_category, selections.state_name]);

  // Remove duplicate useEffect hooks that call refreshData
  // The pagination useEffect below handles all data fetching

  // Add handleServiceCategoryChange above where it is used
  const handleServiceCategoryChange = async (category: string) => {
    handleSelectionChange('service_category', category);
  };

  // Update handleStateChange to use pagination
  const handleStateChange = async (state: string) => {
    handleSelectionChange('state_name', state);
  };

  // Update handleServiceCodeChange to use pagination
  const handleServiceCodeChange = async (code: string) => {
    handleSelectionChange('service_code', code);
  };

  // Update handleServiceDescriptionChange to use pagination
  const handleServiceDescriptionChange = async (desc: string) => {
    handleSelectionChange('service_description', desc);
  };

  // Add useEffect for pagination
  useEffect(() => {
    if (areFiltersApplied) {
      const filters: Record<string, string> = {};
      if (selections.service_category) filters.service_category = selections.service_category;
      if (selections.state_name) filters.state_name = selections.state_name;
      if (selections.service_code) filters.service_code = selections.service_code;
      if (selections.service_description) filters.service_description = selections.service_description;
      if (selections.program) filters.program = selections.program;
      if (selections.location_region) filters.location_region = selections.location_region;
      if (selections.provider_type) filters.provider_type = selections.provider_type;
      if (selections.duration_unit) filters.duration_unit = selections.duration_unit;
      if (selections.modifier_1) filters.modifier_1 = selections.modifier_1;
      filters.page = String(currentPage);
      filters.itemsPerPage = String(itemsPerPage);
      
      refreshData(filters).then(result => {
        if (result) {
          setTotalCount(result.totalCount);
        }
      });
    }
  }, [currentPage, areFiltersApplied, selections, itemsPerPage]);

  // Update useEffect for service category and state changes
  useEffect(() => {
    if (selections.service_category && selections.state_name) {
      const filters: Record<string, string> = {
        service_category: selections.service_category,
        state_name: selections.state_name,
        page: '1',
        itemsPerPage: String(itemsPerPage)
      };
      refreshData(filters);
    }
  }, [selections.service_category, selections.state_name, itemsPerPage]);

  // Update resetFilters to use selections state
  const resetFilters = async () => {
    setSelections({
      service_category: null,
      state_name: null,
      service_code: null,
      service_description: null,
      program: null,
      location_region: null,
      provider_type: null,
      duration_unit: null,
      modifier_1: null,
    });
    setSelectedEntry(null);
    setCurrentPage(1);
    setTotalCount(0);
    setData([]);
    setError(null);
    setLocalError(null);
    setAuthError(null);
    setHasSearched(false);
    setComment(null);
    if (typeof refreshFilters === 'function') {
      await refreshFilters();
    }
  };

  const formatText = (text: string | undefined) => text || '-';

  // Helper function to format rates with 2 decimal points
  const formatRate = (rate: string | undefined) => {
    if (!rate) return '-';
    // Remove any existing $ and parse as number
    const numericRate = parseFloat(rate.replace(/[^0-9.-]/g, ''));
    if (isNaN(numericRate)) return rate; // Return original if not a valid number
    return `$${numericRate.toFixed(2)}`;
  };

  const getGraphData = useMemo(() => {
    if (!selectedEntry) return { xAxis: [], series: [] };

    console.log('📊 CHART - Generating chart for:', selectedEntry.service_description, 'Rate:', selectedEntry.rate);

    const entries = data.filter((item: ServiceData) => 
      item.state_name === selectedEntry.state_name &&
      item.service_category === selectedEntry.service_category &&
      item.service_code === selectedEntry.service_code &&
      item.service_description === selectedEntry.service_description &&
      item.program === selectedEntry.program &&
      item.location_region === selectedEntry.location_region &&
      item.modifier_1 === selectedEntry.modifier_1 &&
      item.modifier_1_details === selectedEntry.modifier_1_details &&
      item.modifier_2 === selectedEntry.modifier_2 &&
      item.modifier_2_details === selectedEntry.modifier_2_details &&
      item.modifier_3 === selectedEntry.modifier_3 &&
      item.modifier_3_details === selectedEntry.modifier_3_details &&
      item.modifier_4 === selectedEntry.modifier_4 &&
      item.modifier_4_details === selectedEntry.modifier_4_details &&
      item.duration_unit === selectedEntry.duration_unit &&
      item.provider_type === selectedEntry.provider_type
    ).sort((a, b) => parseDateString(a.rate_effective_date).getTime() - parseDateString(b.rate_effective_date).getTime());

    console.log('📊 CHART - Selected Entry for filtering:', {
      service_description: selectedEntry.service_description,
      rate: selectedEntry.rate,
      date: selectedEntry.rate_effective_date,
      program: selectedEntry.program,
      location_region: selectedEntry.location_region,
      modifier_1: selectedEntry.modifier_1,
      provider_type: selectedEntry.provider_type,
      duration_unit: selectedEntry.duration_unit
    });

    console.log('📊 CHART - Found', entries.length, 'matching entries (before deduplication)');
    
    // Group entries by date to detect and resolve duplicates
    const entriesByDate = entries.reduce((acc, entry) => {
      const date = entry.rate_effective_date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(entry);
      return acc;
    }, {} as Record<string, ServiceData[]>);

    // Detect duplicates and choose the highest rate for each date
    const deduplicatedEntries: ServiceData[] = [];
    let hasDuplicates = false;
    
    Object.entries(entriesByDate).forEach(([date, dateEntries]) => {
      if (dateEntries.length > 1) {
        hasDuplicates = true;
        console.log(`⚠️ DUPLICATE DETECTED for date ${date}:`, dateEntries.map(e => `$${e.rate}`).join(', '));
        // Choose the entry with the highest rate
        const highestRateEntry = dateEntries.reduce((highest, current) => {
          const highestRate = parseFloat(highest.rate.replace('$', ''));
          const currentRate = parseFloat(current.rate.replace('$', ''));
          return currentRate > highestRate ? current : highest;
        });
        deduplicatedEntries.push(highestRateEntry);
        console.log(`✅ Using highest rate: $${highestRateEntry.rate} for ${date}`);
      } else {
        deduplicatedEntries.push(dateEntries[0]);
      }
    });

    // Sort the deduplicated entries by date
    const finalEntries = deduplicatedEntries.sort((a, b) => 
      parseDateString(a.rate_effective_date).getTime() - parseDateString(b.rate_effective_date).getTime()
    );

    console.log('📊 CHART - After deduplication:', finalEntries.length, 'entries');
    if (hasDuplicates) {
      console.log('⚠️ Data quality issue detected: Multiple rates found for the same date. Using highest rate for each date.');
      setDataQualityWarning('Data quality issue detected: Multiple rates found for the same effective date. Chart shows the highest rate for each date.');
    } else {
      setDataQualityWarning(null);
    }

    let xAxis = finalEntries.map(entry => entry.rate_effective_date);
    let series = finalEntries.map(entry => {
      const rateValue = typeof entry.rate === 'string' ? parseFloat(entry.rate.replace('$', '')) : 0;
      const durationUnit = entry.duration_unit?.toUpperCase();
      let value = rateValue;
      let displayValue: string | null = null;

      if (showRatePerHour) {
        if (durationUnit === '15 MINUTES') {
          value = rateValue * 4;
        } else if (durationUnit === '30 MINUTES') {
          value = rateValue * 2;
        } else if (durationUnit !== 'PER HOUR') {
          displayValue = 'N/A';
        }
      }

      return {
        value: displayValue ? null : value,
        displayValue,
        state: entry.state_name,
        serviceCode: entry.service_code,
        program: entry.program,
        locationRegion: entry.location_region,
        durationUnit: entry.duration_unit,
        date: entry.rate_effective_date,
        modifier1: entry.modifier_1,
        modifier1Details: entry.modifier_1_details,
        modifier2: entry.modifier_2,
        modifier2Details: entry.modifier_2_details,
        modifier3: entry.modifier_3,
        modifier3Details: entry.modifier_3_details,
        modifier4: entry.modifier_4,
        modifier4Details: entry.modifier_4_details
      };
    });

    // Add a point for today if latest date is not today (ignore time)
    if (series.length > 0) {
      const latestDate = parseDateString(xAxis[xAxis.length - 1]);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
      // Only add if the latest date string is not today's string (MM/DD/YYYY)
      if (formatDate(xAxis[xAxis.length - 1]) !== todayStr) {
        xAxis = [...xAxis, todayStr];
        const last = series[series.length - 1];
        series = [...series, { ...last, date: todayStr }];
      }
    }

    return { xAxis, series };
  }, [selectedEntry, data, showRatePerHour]);

  // Derived loading state for service code options
  const serviceCodeOptionsLoading =
    loading ||
    (!!selections.service_category && !!selections.state_name && (!filterOptionsData || !filterOptionsData.combinations || filterOptionsData.combinations.length === 0));

  // Use filteredData as tableData to ensure consistency
  const tableData = filteredData;

  // Add this handler near other filter handlers
  const handleProviderTypeChange = async (providerType: string) => {
    handleSelectionChange('provider_type', providerType);
  };

  useEffect(() => {
    async function loadUltraFilterOptions() {
      try {
        setIsLoadingFilters(true);
        setLocalError(null);
        const res = await fetch("/filter_options.json.gz");
        if (!res.ok) throw new Error(`Failed to fetch filter options: ${res.status} ${res.statusText}`);
        const gzipped = new Uint8Array(await res.arrayBuffer());
        const decompressed = gunzipSync(gzipped);
        const jsonStr = strFromU8(decompressed);
        const data = JSON.parse(jsonStr);
        // Handle new columnar format with mappings
        if (data.m && data.v && data.c) {
          const { m: mappings, v: values, c: columns } = data;
          const numRows: number = values[0].length;
          const combinations: any[] = [];
          for (let i = 0; i < numRows; i++) {
            const combo: Record<string, string> = {};
            columns.forEach((col: string, colIndex: number) => {
              const intValue = values[colIndex][i];
              combo[col] = intValue === -1 ? '' : mappings[col][intValue];
            });
            combinations.push(combo);
          }
          // Extract unique values for each filter
          const filters: Record<string, string[]> = {};
          columns.forEach((col: string) => {
            const uniqueValues = [...new Set(combinations.map((c: any) => c[col]).filter((v: string) => v))];
            filters[col as string] = uniqueValues.sort();
          });
          setFilterOptionsData({ filters, combinations });
        } else {
          setFilterOptionsData(data);
        }
      } catch (err) {
        setLocalError(`Could not load filter options: ${err instanceof Error ? err.message : 'Unknown error'}. Please try refreshing the page.`);
      } finally {
        setIsLoadingFilters(false);
      }
    }
    loadUltraFilterOptions();
  }, []);

  // Don't render anything until the subscription check is complete
  if (isLoading || !isSubscriptionCheckComplete) {
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

  // Add available options variables like dashboard
  const availableServiceCategories = getAvailableOptionsForFilter('service_category', selections, filterOptionsData) as string[];
  const availableStates = getAvailableOptionsForFilter('state_name', selections, filterOptionsData) as string[];
  const availableServiceCodes = getAvailableOptionsForFilter('service_code', selections, filterOptionsData) as string[];
  const availableServiceDescriptions = getAvailableOptionsForFilter('service_description', selections, filterOptionsData) as string[];
  const availablePrograms = getAvailableOptionsForFilter('program', selections, filterOptionsData) as string[];
  const availableLocationRegions = getAvailableOptionsForFilter('location_region', selections, filterOptionsData) as string[];
  const availableProviderTypes = getAvailableOptionsForFilter('provider_type', selections, filterOptionsData) as string[];
  const availableDurationUnits = getAvailableOptionsForFilter('duration_unit', selections, filterOptionsData) as string[];
  const availableModifiers = getAvailableOptionsForFilter('modifier_1', selections, filterOptionsData) as string[];

  return (
    <AppLayout activeTab="historicalRates">
      <div className="p-4 sm:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
        <ErrorMessage error={error} />
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

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-5xl md:text-6xl text-[#012C61] font-lemonMilkRegular uppercase mb-3 sm:mb-0">
            Rate History
          </h1>
        </div>

          <button
            onClick={resetFilters}
          className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base bg-[#012C61] text-white rounded-lg hover:bg-blue-800 transition-colors mb-4"
          >
            Reset All Filters
          </button>

          <div className="space-y-8">
            <div className="p-4 sm:p-6 bg-white rounded-xl shadow-lg">
              {isLoadingFilters && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                    <p className="text-blue-700">
                      Loading filter options... This may take a moment for large datasets.
                    </p>
                  </div>
                </div>
              )}
              {!isLoadingFilters && filterOptionsData && (
                <>
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>Instructions:</strong> Select filters below. All filters are interconnected and update dynamically.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                    {/* Service Line */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Service Line</label>
                      <Select
                        instanceId="service_category_select"
                        options={availableServiceCategories.map((o: string) => ({ value: o, label: o }))}
                        value={selections.service_category ? { value: selections.service_category, label: selections.service_category } : null}
                        onChange={option => handleSelectionChange('service_category', option?.value || null)}
                        placeholder="Select Service Line"
                        isClearable
                        className="react-select-container"
                        classNamePrefix="react-select"
                      />
                      {selections.service_category && (
                        <button onClick={() => handleSelectionChange('service_category', null)} className="text-xs text-blue-500 hover:underline mt-1">Clear</button>
                      )}
                    </div>
                    {/* State */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">State</label>
                      <Select
                        instanceId="state_name_select"
                        options={availableStates.map((o: string) => ({ value: o, label: o }))}
                        value={selections.state_name ? { value: selections.state_name, label: selections.state_name } : null}
                        onChange={option => handleSelectionChange('state_name', option?.value || null)}
                        placeholder="Select State"
                        isClearable
                        isDisabled={!selections.service_category || availableStates.length === 0}
                        className="react-select-container"
                        classNamePrefix="react-select"
                      />
                      {selections.state_name && (
                        <button onClick={() => handleSelectionChange('state_name', null)} className="text-xs text-blue-500 hover:underline mt-1">Clear</button>
                      )}
                    </div>
                    {/* Service Code */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Service Code</label>
                      <Select
                        instanceId="service_code_select"
                        options={availableServiceCodes.map((o: string) => ({ value: o, label: o }))}
                        value={selections.service_code ? { value: selections.service_code, label: selections.service_code } : null}
                        onChange={option => handleSelectionChange('service_code', option?.value || null)}
                        placeholder="Select Service Code"
                        isClearable
                        isDisabled={!selections.service_category || !selections.state_name || availableServiceCodes.length === 0}
                        className="react-select-container"
                        classNamePrefix="react-select"
                      />
                      {selections.service_code && (
                        <button onClick={() => handleSelectionChange('service_code', null)} className="text-xs text-blue-500 hover:underline mt-1">Clear</button>
                      )}
                    </div>
                    {/* Service Description */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Service Description</label>
                      <Select
                        instanceId="service_description_select"
                        options={availableServiceDescriptions.map((o: string) => ({ value: o, label: o }))}
                        value={selections.service_description ? { value: selections.service_description, label: selections.service_description } : null}
                        onChange={option => handleSelectionChange('service_description', option?.value || null)}
                        placeholder="Select Service Description"
                        isClearable
                        isDisabled={!selections.service_category || !selections.state_name || availableServiceDescriptions.length === 0}
                        className="react-select-container"
                        classNamePrefix="react-select"
                      />
                      {selections.service_description && (
                        <button onClick={() => handleSelectionChange('service_description', null)} className="text-xs text-blue-500 hover:underline mt-1">Clear</button>
                      )}
                    </div>
                    {/* Program */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Program</label>
                      <Select
                        instanceId="program_select"
                        options={getDropdownOptions(availablePrograms, false)}
                        value={selections.program ? selections.program.split(',').map(p => ({ value: p.trim(), label: p.trim() })) : null}
                        onChange={(options) => handleSelectionChange('program', options ? options.map(opt => opt.value).join(',') : null)}
                        placeholder="Select Program"
                        isMulti
                        isClearable
                        isDisabled={!selections.service_category || !selections.state_name || availablePrograms.length === 0}
                        className="react-select-container"
                        classNamePrefix="react-select"
                      />
                      {selections.program && (
                        <button onClick={() => handleSelectionChange('program', null)} className="text-xs text-blue-500 hover:underline mt-1">Clear</button>
                      )}
                    </div>
                    {/* Location/Region */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Location/Region</label>
                      <Select
                        instanceId="location_region_select"
                        options={getDropdownOptions(availableLocationRegions, false)}
                        value={selections.location_region ? selections.location_region.split(',').map(l => ({ value: l.trim(), label: l.trim() })) : null}
                        onChange={(options) => handleSelectionChange('location_region', options ? options.map(opt => opt.value).join(',') : null)}
                        placeholder="Select Location/Region"
                        isMulti
                        isClearable
                        isDisabled={!selections.service_category || !selections.state_name || availableLocationRegions.length === 0}
                        className="react-select-container"
                        classNamePrefix="react-select"
                      />
                      {selections.location_region && (
                        <button onClick={() => handleSelectionChange('location_region', null)} className="text-xs text-blue-500 hover:underline mt-1">Clear</button>
                      )}
                    </div>
                    {/* Provider Type */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Provider Type</label>
                      <Select
                        instanceId="provider_type_select"
                        options={getDropdownOptions(availableProviderTypes, false)}
                        value={selections.provider_type ? selections.provider_type.split(',').map(p => ({ value: p.trim(), label: p.trim() })) : null}
                        onChange={(options) => handleSelectionChange('provider_type', options ? options.map(opt => opt.value).join(',') : null)}
                        placeholder="Select Provider Type"
                        isMulti
                        isClearable
                        isDisabled={!selections.service_category || !selections.state_name || availableProviderTypes.length === 0}
                        className="react-select-container"
                        classNamePrefix="react-select"
                      />
                      {selections.provider_type && (
                        <button onClick={() => handleSelectionChange('provider_type', null)} className="text-xs text-blue-500 hover:underline mt-1">Clear</button>
                      )}
                    </div>
                    {/* Duration Unit */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Duration Unit</label>
                      <Select
                        instanceId="duration_unit_select"
                        options={getDropdownOptions(availableDurationUnits, false)}
                        value={selections.duration_unit ? selections.duration_unit.split(',').map(d => ({ value: d.trim(), label: d.trim() })) : null}
                        onChange={(options) => handleSelectionChange('duration_unit', options ? options.map(opt => opt.value).join(',') : null)}
                        placeholder="Select Duration Unit"
                        isMulti
                        isClearable
                        isDisabled={!selections.service_category || !selections.state_name || availableDurationUnits.length === 0}
                        className="react-select-container"
                        classNamePrefix="react-select"
                      />
                      {selections.duration_unit && (
                        <button onClick={() => handleSelectionChange('duration_unit', null)} className="text-xs text-blue-500 hover:underline mt-1">Clear</button>
                      )}
                    </div>
                    {/* Modifier */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Modifier</label>
                      <Select
                        instanceId="modifier_1_select"
                        options={[{ value: '-', label: '-' }, ...availableModifiers.map((o: string) => {
                          const def =
                            filterOptionsData?.combinations?.find((c: any) => c.modifier_1 === o)?.modifier_1_details ||
                            filterOptionsData?.combinations?.find((c: any) => c.modifier_2 === o)?.modifier_2_details ||
                            filterOptionsData?.combinations?.find((c: any) => c.modifier_3 === o)?.modifier_3_details ||
                            filterOptionsData?.combinations?.find((c: any) => c.modifier_4 === o)?.modifier_4_details;
                          return { value: o, label: def ? `${o} - ${def}` : o };
                        })]}
                        value={selections.modifier_1 ? selections.modifier_1.split(',').map(m => {
                          const mod = availableModifiers.find(opt => opt === m.trim());
                          if (mod) {
                            const def =
                              filterOptionsData?.combinations?.find((c: any) => c.modifier_1 === mod)?.modifier_1_details ||
                              filterOptionsData?.combinations?.find((c: any) => c.modifier_2 === mod)?.modifier_2_details ||
                              filterOptionsData?.combinations?.find((c: any) => c.modifier_3 === mod)?.modifier_3_details ||
                              filterOptionsData?.combinations?.find((c: any) => c.modifier_4 === mod)?.modifier_4_details;
                            return { value: mod, label: def ? `${mod} - ${def}` : mod };
                          }
                          return { value: m.trim(), label: m.trim() };
                        }) : null}
                        onChange={(options) => handleSelectionChange('modifier_1', options ? options.map(opt => opt.value).join(',') : null)}
                        placeholder="Select Modifier"
                        isMulti
                        isClearable
                        isDisabled={!selections.service_category || !selections.state_name || availableModifiers.length === 0}
                        className="react-select-container"
                        classNamePrefix="react-select"
                      />
                      {selections.modifier_1 && (
                        <button onClick={() => handleSelectionChange('modifier_1', null)} className="text-xs text-blue-500 hover:underline mt-1">Clear</button>
                      )}
                    </div>
                  </div>
                  {/* Search Button */}
                  <div className="mt-6 flex items-center justify-end space-x-4">
                    <button 
                      onClick={async () => {
                        if (areFiltersApplied) {
                          setHasSearched(true);
                          const filters: Record<string, string> = {};
                          if (selections.service_category) filters.service_category = selections.service_category;
                          if (selections.state_name) filters.state_name = selections.state_name;
                          if (selections.service_code) filters.service_code = selections.service_code;
                          if (selections.service_description) filters.service_description = selections.service_description;
                          if (selections.program) filters.program = selections.program;
                          if (selections.location_region) filters.location_region = selections.location_region;
                          if (selections.provider_type) filters.provider_type = selections.provider_type;
                          if (selections.duration_unit) filters.duration_unit = selections.duration_unit;
                          if (selections.modifier_1) filters.modifier_1 = selections.modifier_1;
                          filters.page = String(currentPage);
                          filters.itemsPerPage = String(itemsPerPage);
                          await refreshData(filters);
                        }
                      }}
                      disabled={!areFiltersApplied || loading} 
                      className="px-6 py-2 text-sm bg-[#012C61] text-white rounded-lg hover:bg-blue-800 disabled:bg-gray-400 transition-colors"
                    >
                      {loading ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                </>
              )}
            </div>

            {!hasSearched && (
              <div className="p-6 bg-white rounded-xl shadow-lg text-center">
                <div className="flex justify-center items-center mb-4">
                  <FaFilter className="h-8 w-8 text-blue-500" />
                </div>
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Please select filters and click Search to view historical rates
                </p>
                <p className="text-sm text-gray-500">
                  Choose a service line, state, and service code or service description, then click Search to see available rate history
                </p>
              </div>
            )}

            {selectedEntry && (
              <>
                {comment && (
                  <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
                    <p className="text-sm text-blue-700">
                      <strong>Comment:</strong> {comment}
                    </p>
                  </div>
                )}

                <div className="p-6 bg-white rounded-xl shadow-lg">
                  <h2 className="text-xl font-semibold mb-4 text-gray-800">Rate History</h2>
                  
                  {/* Helpful explanation */}
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>📊 Chart Explanation:</strong> This chart shows how the rate for <strong>"{selectedEntry.service_description}"</strong> has changed over time. 
                      Each point represents a different effective date when the rate was updated.
                    </p>
                  </div>
                  
                  <div className="w-full h-80">
                    <ReactECharts
                      option={{
                        tooltip: {
                          trigger: 'axis',
                          formatter: (params: any) => {
                            const data = params[0].data;
                            if (data.displayValue) {
                              return data.displayValue;
                            }
                            const rate = data.value ? `$${data.value.toFixed(2)}` : '-';
                            
                            const modifiers = [
                              data.modifier1 ? `${data.modifier1}${data.modifier1Details ? ` - ${data.modifier1Details}` : ''}` : null,
                              data.modifier2 ? `${data.modifier2}${data.modifier2Details ? ` - ${data.modifier2Details}` : ''}` : null,
                              data.modifier3 ? `${data.modifier3}${data.modifier3Details ? ` - ${data.modifier3Details}` : ''}` : null,
                              data.modifier4 ? `${data.modifier4}${data.modifier4Details ? ` - ${data.modifier4Details}` : ''}` : null
                            ].filter(Boolean).join('<br>');

                            return `
                              <b>State:</b> ${data.state || '-'}<br>
                              <b>Service Code:</b> ${data.serviceCode || '-'}<br>
                              <b>Program:</b> ${data.program || '-'}<br>
                              <b>Location/Region:</b> ${data.locationRegion || '-'}<br>
                              <b>${showRatePerHour ? 'Hourly Equivalent Rate' : 'Rate Per Base Unit'}:</b> ${rate}<br>
                              <b>Duration Unit:</b> ${data.durationUnit || '-'}<br>
                              <b>Effective Date:</b> ${formatDate(data.date) || '-'}<br>
                              ${modifiers ? `<b>Modifiers:</b><br>${modifiers}` : ''}
                            `;
                          }
                        },
                        xAxis: {
                          type: 'category',
                          data: getGraphData.xAxis,
                          name: 'Effective Date',
                          nameLocation: 'middle',
                          nameGap: 30,
                          axisLabel: {
                            formatter: (value: string) => formatDate(value)
                          }
                        },
                        yAxis: {
                          type: 'value',
                          name: showRatePerHour ? 'Hourly Equivalent Rate ($)' : 'Rate Per Base Unit ($)',
                          nameLocation: 'middle',
                          nameGap: 40,
                          scale: true,
                          min: (value: { min: number }) => value.min * 0.95,
                          max: (value: { max: number }) => value.max * 1.05,
                          axisLabel: {
                            formatter: (value: number) => value.toFixed(2)
                          }
                        },
                        series: [
                          {
                            data: getGraphData.series,
                            type: 'line',
                            smooth: false,
                            itemStyle: {
                              color: showRatePerHour ? '#ef4444' : '#3b82f6'
                            },
                            label: {
                              show: true,
                              position: 'top',
                              formatter: (params: any) => {
                                if (params.data.displayValue) {
                                  return params.data.displayValue;
                                }
                                return `$${params.value.toFixed(2)}`;
                              },
                              fontSize: 12,
                              color: '#374151'
                            }
                          }
                        ],
                        graphic: getGraphData.series.some(data => data.displayValue) ? [
                          {
                            type: 'text',
                            left: 'center',
                            top: 'middle',
                            style: {
                              text: `Hourly equivalent rates not available as the duration unit is "${getGraphData.series.find(data => data.displayValue)?.durationUnit || 'Unknown'}"`,
                              fontSize: 16,
                              fontWeight: 'bold',
                              fill: '#666'
                            }
                          }
                        ] : [],
                        grid: {
                          containLabel: true,
                          left: '10%',
                          right: '3%',
                          bottom: '10%',
                          top: '10%'
                        }
                      }}
                      style={{ height: '100%', width: '100%' }}
                      notMerge={true}
                      showLoading={filteredData.length === 0}
                      loadingOption={{
                        text: 'No data available',
                        color: '#3b82f6',
                        textColor: '#374151',
                        maskColor: 'rgba(255, 255, 255, 0.8)',
                        zlevel: 0
                      }}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Loading state when filters are applied but data is loading */}
            {areFiltersApplied && loading && (
              <div className="p-6 bg-white rounded-xl shadow-lg text-center">
                <div className="flex justify-center items-center mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Loading table data...
                </p>
                <p className="text-sm text-gray-500">
                  Please wait while we fetch and process your data.
                </p>
              </div>
            )}

            {areFiltersApplied && !loading && filteredData.length > 0 && (
              <div className="overflow-hidden rounded-lg shadow-lg">
                <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider"></th>
                      {getVisibleColumns.state_name && (
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">State</th>
                      )}
                      {getVisibleColumns.service_category && (
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Service Category</th>
                      )}
                      {getVisibleColumns.service_code && (
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Service Code</th>
                      )}
                      {getVisibleColumns.service_description && (
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Service Description</th>
                      )}
                      {getVisibleColumns.rate && (
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Rate per Base Unit</th>
                      )}
                      {getVisibleColumns.duration_unit && (
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Duration Unit</th>
                      )}
                      {getVisibleColumns.rate_effective_date && (
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Effective Date</th>
                      )}
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Provider Type</th>
                      {getVisibleColumns.modifier_1 && (
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 1</th>
                      )}
                      {getVisibleColumns.modifier_2 && (
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 2</th>
                      )}
                      {getVisibleColumns.modifier_3 && (
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 3</th>
                      )}
                      {getVisibleColumns.modifier_4 && (
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 4</th>
                      )}
                      {getVisibleColumns.program && (
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Program</th>
                      )}
                      {getVisibleColumns.location_region && (
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Location/Region</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                      {tableData.map((item, index) => {
                        const entry = item as ServiceData;
                        const isSelected =
                          selectedEntry &&
                          selectedEntry.state_name === entry.state_name &&
                          selectedEntry.service_category === entry.service_category &&
                          selectedEntry.service_code === entry.service_code &&
                          selectedEntry.service_description === entry.service_description &&
                          selectedEntry.program === entry.program &&
                          selectedEntry.location_region === entry.location_region &&
                          selectedEntry.modifier_1 === entry.modifier_1 &&
                          selectedEntry.modifier_1_details === entry.modifier_1_details &&
                          selectedEntry.modifier_2 === entry.modifier_2 &&
                          selectedEntry.modifier_2_details === entry.modifier_2_details &&
                          selectedEntry.modifier_3 === entry.modifier_3 &&
                          selectedEntry.modifier_3_details === entry.modifier_3_details &&
                          selectedEntry.modifier_4 === entry.modifier_4 &&
                          selectedEntry.modifier_4_details === entry.modifier_4_details &&
                          selectedEntry.duration_unit === entry.duration_unit &&
                          selectedEntry.provider_type === entry.provider_type &&
                          selectedEntry.rate_effective_date === entry.rate_effective_date;

                        const rateValue = typeof entry.rate === 'string' ? parseFloat(entry.rate.replace('$', '')) : 0;
                        const durationUnit = entry.duration_unit?.toUpperCase();
                      const hourlyRate = durationUnit === '15 MINUTES' ? rateValue * 4 : rateValue;

                      return (
                        <tr 
                          key={index} 
                          className={`group relative transition-all duration-200 ease-in-out cursor-pointer ${
                            isSelected 
                              ? 'bg-blue-50 shadow-[0_0_0_1px_rgba(59,130,246,0.2)]' 
                              : 'hover:bg-gray-50 hover:shadow-[0_2px_4px_rgba(0,0,0,0.05)] hover:scale-[1.01] hover:z-10'
                          }`}
                          onClick={() => setSelectedEntry(entry)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                                isSelected 
                                  ? 'border-blue-500 bg-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.2)]' 
                                  : 'border-gray-300 group-hover:border-blue-300 group-hover:shadow-[0_0_0_2px_rgba(59,130,246,0.1)]'
                              }`}>
                                {isSelected && (
                                  <svg 
                                    className="w-3 h-3 text-white transition-transform duration-200" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                  >
                                    <path 
                                      strokeLinecap="round" 
                                      strokeLinejoin="round" 
                                      strokeWidth={2} 
                                      d="M5 13l4 4L19 7" 
                                    />
                                  </svg>
                                )}
                              </div>
                              {isSelected && (
                                <button
                                  onClick={e => { e.stopPropagation(); setSelectedEntry(null); }}
                                  className="ml-2 text-gray-400 hover:text-red-500 transition-colors duration-200"
                                  title="Deselect"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                          {getVisibleColumns.state_name && (
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {STATE_ABBREVIATIONS[entry.state_name?.toUpperCase() || ""] || entry.state_name || '-'}
                              </td>
                          )}
                          {getVisibleColumns.service_category && (
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {SERVICE_CATEGORY_ABBREVIATIONS[entry.service_category?.trim().toUpperCase() || ""] || entry.service_category || '-'}
                              </td>
                          )}
                          {getVisibleColumns.service_code && (
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatText(entry.service_code)}</td>
                          )}
                          {getVisibleColumns.service_description && (
                            <td className="px-6 py-4 text-sm text-gray-900 max-w-[220px] truncate" title={entry.service_description || '-'}>{entry.service_description || '-'}</td>
                          )}
                          {getVisibleColumns.rate && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatRate(entry.rate)}
                            </td>
                          )}
                          {getVisibleColumns.duration_unit && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {entry.duration_unit || '-'}
                            </td>
                          )}
                          {getVisibleColumns.rate_effective_date && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatDate(entry.rate_effective_date)}
                            </td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatText(entry.provider_type)}
                          </td>
                          {getVisibleColumns.modifier_1 && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {entry.modifier_1 ? `${entry.modifier_1}${entry.modifier_1_details ? ` - ${entry.modifier_1_details}` : ''}` : '-'}
                            </td>
                          )}
                          {getVisibleColumns.modifier_2 && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {entry.modifier_2 ? `${entry.modifier_2}${entry.modifier_2_details ? ` - ${entry.modifier_2_details}` : ''}` : '-'}
                            </td>
                          )}
                          {getVisibleColumns.modifier_3 && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {entry.modifier_3 ? `${entry.modifier_3}${entry.modifier_3_details ? ` - ${entry.modifier_3_details}` : ''}` : '-'}
                            </td>
                          )}
                          {getVisibleColumns.modifier_4 && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {entry.modifier_4 ? `${entry.modifier_4}${entry.modifier_4_details ? ` - ${entry.modifier_4_details}` : ''}` : '-'}
                            </td>
                          )}
                          {getVisibleColumns.program && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {entry.program}
                            </td>
                          )}
                          {getVisibleColumns.location_region && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatText(entry.location_region)}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
                {totalCount > 0 && (
                  <PaginationControls 
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                    totalCount={totalCount}
                    itemsPerPage={itemsPerPage}
                  />
                )}
              </div>
            )}

            {areFiltersApplied && !selectedEntry && (
              <div className="p-6 bg-white rounded-xl shadow-lg text-center">
                <div className="flex justify-center items-center mb-4">
                  <FaChartLine className="h-8 w-8 text-blue-500" />
                </div>
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Select a rate entry to view its historical data
                </p>
                <p className="text-sm text-gray-500">
                  Click on any row in the table above to see the rate history graph
                </p>
              </div>
            )}
          </div>
      </div>
    </AppLayout>
  );
}