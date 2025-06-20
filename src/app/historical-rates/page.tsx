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
import { useData } from "@/context/DataContext";
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Dispatch, SetStateAction } from 'react';

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

// Initialize Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
const getDropdownOptions = (options: string[], isMandatory: boolean = false): { value: string; label: string }[] => {
  const uniqueOptions = [...new Set(options)].filter(Boolean).sort((a, b) => a.localeCompare(b));
  const dropdownOptions = uniqueOptions.map(option => ({
    value: option,
    label: option
  }));
  
  // Add "-" option for non-mandatory filters
  if (!isMandatory) {
    dropdownOptions.unshift({ value: "-", label: "-" });
  }
  
  return dropdownOptions;
};

export default function HistoricalRates() {
  const { isAuthenticated, isLoading, user } = useKindeBrowserClient();
  const { data, loading, error, filterOptions, refreshData, refreshFilters } = useData();
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

  // Add state to track authentication errors specifically
  const [authError, setAuthError] = useState<string | null>(null);

  // Add pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const itemsPerPage: number = 50;

  const [selectedServiceCategory, setSelectedServiceCategory] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedServiceCode, setSelectedServiceCode] = useState("");
  const [serviceCategories, setServiceCategories] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [serviceCodes, setServiceCodes] = useState<string[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<ServiceData | null>(null);
  const [showRatePerHour, setShowRatePerHour] = useState(false);
  const [isSubscriptionCheckComplete, setIsSubscriptionCheckComplete] = useState(false);
  const [comment, setComment] = useState<string | null>(null);
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedLocationRegion, setSelectedLocationRegion] = useState("");
  const [selectedModifier, setSelectedModifier] = useState("");
  const [programs, setPrograms] = useState<string[]>([]);
  const [locationRegions, setLocationRegions] = useState<string[]>([]);
  const [modifiers, setModifiers] = useState<{ value: string; label: string; details?: string }[]>([]);
  const [serviceDescriptions, setServiceDescriptions] = useState<string[]>([]);
  const [selectedServiceDescription, setSelectedServiceDescription] = useState("");
  const [selectedProviderType, setSelectedProviderType] = useState("");
  const [providerTypes, setProviderTypes] = useState<string[]>([]);
  const [filterStep, setFilterStep] = useState(1);
  const [shouldExtractFilters, setShouldExtractFilters] = useState(false);

  // Update areFiltersApplied to include pagination
  const areFiltersApplied = selectedServiceCategory && selectedState && selectedServiceCode;

  const filteredData = useMemo(() => {
    if (!selectedServiceCategory || !selectedState || !selectedServiceCode) return [];

    // First get all matching entries
    const allMatchingEntries = data.filter(item => {
      if (selectedServiceCategory && item.service_category !== selectedServiceCategory) return false;
      if (selectedState && item.state_name !== selectedState) return false;
      if (selectedServiceCode && item.service_code !== selectedServiceCode) return false;
      if (selectedProgram && selectedProgram !== "-" && item.program !== selectedProgram) return false;
      if (selectedLocationRegion && selectedLocationRegion !== "-" && item.location_region !== selectedLocationRegion) return false;
      if (selectedModifier && selectedModifier !== "-") {
        const selectedModifierCode = selectedModifier.split(' - ')[0];
        const hasModifier = 
          (item.modifier_1 && item.modifier_1.split(' - ')[0] === selectedModifierCode) ||
          (item.modifier_2 && item.modifier_2.split(' - ')[0] === selectedModifierCode) ||
          (item.modifier_3 && item.modifier_3.split(' - ')[0] === selectedModifierCode) ||
          (item.modifier_4 && item.modifier_4.split(' - ')[0] === selectedModifierCode);
        if (!hasModifier) return false;
      }
      if (selectedProviderType && selectedProviderType !== "-") {
        if (item.provider_type !== selectedProviderType) return false;
      }
      if (selectedServiceDescription && selectedServiceDescription !== "-" && item.service_description !== selectedServiceDescription) return false;

      // Handle "-" selections (empty/null values)
      if (selectedProgram === "-" && item.program) return false;
      if (selectedLocationRegion === "-" && item.location_region) return false;
      if (selectedProviderType === "-" && item.provider_type) return false;
      if (selectedServiceDescription === "-" && item.service_description) return false;
      if (selectedModifier === "-") {
        const hasAnyModifier = item.modifier_1 || item.modifier_2 || item.modifier_3 || item.modifier_4;
        if (hasAnyModifier) return false;
      }

      return true;
    });

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

    // For each group, get the entry with the latest rate_effective_date
    const latestEntries = Object.values(groupedEntries).map(entries => {
      return entries.reduce((latest, current) => {
        const latestDate = parseDateString(latest.rate_effective_date);
        const currentDate = parseDateString(current.rate_effective_date);
        return currentDate > latestDate ? current : latest;
      });
    });

    console.log('Final filteredData for table:', latestEntries.length, latestEntries.slice(0, 3));
    return latestEntries;
  }, [
    data,
    selectedServiceCategory,
    selectedState,
    selectedServiceCode,
    selectedProgram,
    selectedLocationRegion,
    selectedModifier,
    selectedProviderType,
    selectedServiceDescription
  ]);

  useEffect(() => {
    if (filteredData.length > 0) {
      console.log('Sample filteredData:', filteredData.slice(0, 5));
    }
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

    if (filteredData.length > 0) {
      filteredData.forEach(item => {
        Object.keys(columns).forEach(key => {
          if (item[key as keyof ServiceData] && item[key as keyof ServiceData] !== '-') {
            columns[key as keyof typeof columns] = true;
          }
        });
      });
    }

    return columns;
  }, [filteredData]);

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
        console.error("❌ Error checking sub-user:", subUserError);
        console.error("Full error object:", JSON.stringify(subUserError, null, 2));
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
          console.error("❌ Error fetching user:", fetchError);
          return;
        }

        if (existingUser) {
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
      console.error("Error checking subscription or sub-user:", error);
      router.push("/subscribe");
    }
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
        
        // Refresh data if filters are applied
        if (areFiltersApplied) {
          console.log('🔄 Tab became visible, refreshing data...');
          // Since this page uses the shared DataContext, it will auto-refresh
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(authCheckInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, router, areFiltersApplied]);

  // Now the useEffect can safely use checkSubscriptionAndSubUser
  useEffect(() => {
    checkSubscriptionAndSubUser();
  }, [router]);

  // Move all useEffect hooks here, before any conditional returns
  useEffect(() => {
      if (data.length > 0) {
      extractFilters(
        data,
        setServiceCategories,
        setStates,
        setPrograms,
        setLocationRegions,
        setModifiers,
        setProviderTypes
      );
    }
  }, [data]);

  useEffect(() => {
    if (selectedServiceCategory && selectedState) {
      fetchComment(selectedServiceCategory, selectedState);
    } else {
      setComment(null);
    }
  }, [selectedServiceCategory, selectedState]);

  useEffect(() => {
    if (shouldExtractFilters) {
      extractFilters(
        data,
        setServiceCategories,
        setStates,
        setPrograms,
        setLocationRegions,
        setModifiers,
        setProviderTypes
      );
      setShouldExtractFilters(false);
    }
  }, [shouldExtractFilters, data]);

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

  // Debug: Log filterOptions and selected filters
  useEffect(() => {
    console.log('filterOptions.serviceCodes:', filterOptions?.serviceCodes);
    console.log('selectedServiceCategory:', selectedServiceCategory, 'selectedState:', selectedState);
  }, [filterOptions, selectedServiceCategory, selectedState]);

  useEffect(() => {
    if (selectedServiceCategory && selectedState) {
      refreshData({
        serviceCategory: selectedServiceCategory,
        state: selectedState
      });
    }
  }, [selectedServiceCategory, selectedState, refreshData]);

  // Populate Service Codes when Service Line and State are selected
  useEffect(() => {
    if (selectedServiceCategory && selectedState) {
      refreshData({
        serviceCategory: selectedServiceCategory,
        state: selectedState
      });
    }
  }, [selectedServiceCategory, selectedState, refreshData]);

  // Add handleServiceCategoryChange above where it is used
  const handleServiceCategoryChange = async (category: string) => {
    setSelectedServiceCategory(category);
    setSelectedState("");
    setSelectedServiceCode("");
    setSelectedServiceDescription("");
    setSelectedProgram("");
    setSelectedLocationRegion("");
    setSelectedModifier("");
    setSelectedProviderType("");
    setStates([]);
    setServiceCodes([]);
    setPrograms([]);
    setLocationRegions([]);
    setModifiers([]);
    setProviderTypes([]);
    if (typeof refreshFilters === 'function') {
      await refreshFilters(category);
    }
  };

  // Update handleStateChange to use pagination
  const handleStateChange = async (state: string) => {
    setSelectedState(state);
    setSelectedServiceCode("");
    setSelectedServiceDescription("");
    setSelectedProgram("");
    setSelectedLocationRegion("");
    setSelectedModifier("");
    setSelectedProviderType("");
    setServiceCodes([]);
    setPrograms([]);
    setLocationRegions([]);
    setModifiers([]);
    setProviderTypes([]);
    setCurrentPage(1); // Reset to first page when filter changes
    if (typeof refreshFilters === 'function') {
      await refreshFilters(selectedServiceCategory, state);
    }
  };

  // Update handleServiceCodeChange to use pagination
  const handleServiceCodeChange = async (code: string) => {
    const matchingItem = data.find(item => item.service_code?.trim() === code.trim());
    const matchingDescription = matchingItem?.service_description?.trim() || '';
    setSelectedServiceCode(code);
    setSelectedServiceDescription(matchingDescription);
    setSelectedProgram("");
    setSelectedLocationRegion("");
    setSelectedModifier("");
    setSelectedProviderType("");
    setPrograms([]);
    setLocationRegions([]);
    setModifiers([]);
    setProviderTypes([]);
    setCurrentPage(1); // Reset to first page when filter changes
    if (typeof refreshData === 'function') {
      const result = await refreshData({
        serviceCategory: selectedServiceCategory,
        state: selectedState,
        serviceCode: code,
        page: "1",
        itemsPerPage: String(itemsPerPage)
      });
      if (result) {
        setTotalCount(result.totalCount);
      }
    }
  };

  // Update handleServiceDescriptionChange to use pagination
  const handleServiceDescriptionChange = async (desc: string) => {
    setSelectedServiceDescription(desc);
    setSelectedProviderType("");
    setCurrentPage(1); // Reset to first page when filter changes
    if (typeof refreshData === 'function') {
      const result = await refreshData({
        serviceCategory: selectedServiceCategory,
        state: selectedState,
        serviceCode: selectedServiceCode,
        serviceDescription: desc,
        page: "1",
        itemsPerPage: String(itemsPerPage)
      });
      if (result) {
        setTotalCount(result.totalCount);
      }
    }
  };

  // Add useEffect for pagination
  useEffect(() => {
    if (areFiltersApplied) {
      refreshData({
        serviceCategory: selectedServiceCategory,
        state: selectedState,
        serviceCode: selectedServiceCode,
        page: String(currentPage),
        itemsPerPage: String(itemsPerPage)
      }).then(result => {
        if (result) {
          setTotalCount(result.totalCount);
        }
      });
    }
  }, [currentPage, areFiltersApplied, selectedServiceCategory, selectedState, selectedServiceCode]);

  // Update resetFilters to reset pagination
  const resetFilters = async () => {
    setSelectedServiceCategory("");
    setSelectedState("");
    setSelectedServiceCode("");
    setSelectedServiceDescription("");
    setSelectedProgram("");
    setSelectedLocationRegion("");
    setSelectedModifier("");
    setSelectedProviderType("");
    setSelectedEntry(null);
    setStates([]);
    setPrograms([]);
    setLocationRegions([]);
    setModifiers([]);
    setProviderTypes([]);
    setCurrentPage(1);
    setTotalCount(0);
    if (typeof refreshFilters === 'function') {
      await refreshFilters();
    }
  };

  const formatText = (text: string | undefined) => text || '-';

  const getGraphData = () => {
    if (!selectedEntry) return { xAxis: [], series: [] };

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

    let xAxis = entries.map(entry => entry.rate_effective_date);
    let series = entries.map(entry => {
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

    // Add a point for today if latest date < today
    if (series.length > 0) {
      const latestDate = parseDateString(xAxis[xAxis.length - 1]);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      // Only add if latestDate is before today (not the same day)
      if (latestDate < today) {
        const todayStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
        xAxis = [...xAxis, todayStr];
        const last = series[series.length - 1];
        series = [...series, { ...last, date: todayStr }];
      }
    }

    return { xAxis, series };
  };

  // Derived loading state for service code options
  const serviceCodeOptionsLoading =
    loading ||
    (!!selectedServiceCategory && !!selectedState && (!filterOptions.serviceCodes || filterOptions.serviceCodes.length === 0));

  // Replace the tableData logic with grouping by all fields except rate_effective_date and rate
  const tableData = useMemo(() => {
    if (!selectedServiceCategory || !selectedState || !selectedServiceCode) return [];

    // Group by all fields except rate_effective_date and rate
    const grouped: { [key: string]: ServiceData } = {};
    data.forEach(item => {
      const key = JSON.stringify({
        state_name: item.state_name,
        service_category: item.service_category,
        service_code: item.service_code,
        service_description: item.service_description,
        program: item.program,
        location_region: item.location_region,
        modifier_1: item.modifier_1,
        modifier_1_details: item.modifier_1_details,
        modifier_2: item.modifier_2,
        modifier_2_details: item.modifier_2_details,
        modifier_3: item.modifier_3,
        modifier_3_details: item.modifier_3_details,
        modifier_4: item.modifier_4,
        modifier_4_details: item.modifier_4_details,
        duration_unit: item.duration_unit,
        provider_type: item.provider_type
      });
      if (!grouped[key] || parseDateString(item.rate_effective_date) > parseDateString(grouped[key].rate_effective_date)) {
        grouped[key] = item;
      }
    });
    // Return all latest entries for each unique combination
    return Object.values(grouped) as ServiceData[];
  }, [data, selectedServiceCategory, selectedState, selectedServiceCode, selectedProgram, selectedLocationRegion, selectedModifier, selectedProviderType]);

  // Add this handler near other filter handlers
  const handleProviderTypeChange = async (providerType: string) => {
    setSelectedProviderType(providerType);
    setCurrentPage(1);
    if (typeof refreshData === 'function') {
      await refreshData({
        serviceCategory: selectedServiceCategory,
        state: selectedState,
        serviceCode: selectedServiceCode,
        serviceDescription: selectedServiceDescription,
        program: selectedProgram,
        locationRegion: selectedLocationRegion,
        modifier: selectedModifier,
        providerType: providerType,
        page: "1",
        itemsPerPage: String(itemsPerPage)
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
            Historical Rates
          </h1>
          <div className="flex flex-col items-end">
            <div className="flex items-center space-x-2 mb-4">
              <label className="text-sm font-medium text-[#012C61]">Show Rate Per Hour</label>
              <input
                type="checkbox"
                checked={showRatePerHour}
                onChange={(e) => setShowRatePerHour(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
            </div>
          </div>
        </div>

          <button
            onClick={resetFilters}
          className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base bg-[#012C61] text-white rounded-lg hover:bg-blue-800 transition-colors mb-4"
          >
            Reset All Filters
          </button>

          <div className="space-y-8">
            <div className="p-4 sm:p-6 bg-white rounded-xl shadow-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Service Line</label>
                  <Select
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
                    <button onClick={() => setSelectedServiceCategory("")} className="text-xs text-blue-500 hover:underline mt-1">Clear</button>
                  )}
                </div>

                {selectedServiceCategory ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">State</label>
                    <Select
                      options={states.map(state => ({ value: state, label: state }))}
                      value={selectedState ? { value: selectedState, label: selectedState } : null}
                      onChange={(option) => handleStateChange(option?.value || "")}
                      placeholder="Select State"
                      isSearchable
                        filterOption={customFilterOption}
                      className="react-select-container"
                      classNamePrefix="react-select"
                    />
                    {selectedState && (
                      <button onClick={() => setSelectedState("")} className="text-xs text-blue-500 hover:underline mt-1">Clear</button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">State</label>
                    <div className="text-gray-400 text-sm">
                      Select a service line first
                    </div>
                  </div>
                )}

                {selectedServiceCategory && selectedState ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Service Code</label>
                    <Select
                      options={filterOptions.serviceCodes?.map(code => ({ value: code, label: code })) || []}
                      value={selectedServiceCode ? { value: selectedServiceCode, label: selectedServiceCode } : null}
                      onChange={(option) => handleServiceCodeChange(option?.value || "")}
                      placeholder={"Select Service Code"}
                      isDisabled={false}
                      isSearchable
                      filterOption={customFilterOption}
                      className="react-select-container"
                      classNamePrefix="react-select"
                    />
                    {selectedServiceCode && (
                      <button onClick={() => setSelectedServiceCode("")} className="text-xs text-blue-500 hover:underline mt-1">Clear</button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Service Code</label>
                    <div className="text-gray-400 text-sm">
                      {selectedServiceCategory ? "Select a state to see available service codes" : "Select a service line first"}
                    </div>
                  </div>
                )}

                {selectedServiceCategory && selectedState && (selectedServiceCode || selectedServiceDescription) && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Modifier</label>
                    <Select
                      options={getDropdownOptions(modifiers.map(m => m.value))}
                      value={selectedModifier ? { value: selectedModifier, label: selectedModifier } : null}
                      onChange={(option) => setSelectedModifier(option?.value || "")}
                      placeholder="Select Modifier"
                      isSearchable
                      filterOption={customFilterOption}
                      isDisabled={!selectedServiceCode && !selectedServiceDescription}
                      className={`react-select-container ${!selectedServiceCode && !selectedServiceDescription ? 'opacity-50' : ''}`}
                      classNamePrefix="react-select"
                    />
                    {selectedModifier && selectedModifier !== "-" && (
                      <button onClick={() => setSelectedModifier("")} className="text-xs text-blue-500 hover:underline mt-1">Clear</button>
                    )}
                  </div>
                )}

                {selectedServiceCategory && selectedState && selectedServiceCode && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Program</label>
                    <Select
                      options={getDropdownOptions(programs)}
                      value={selectedProgram ? { value: selectedProgram, label: selectedProgram } : null}
                      onChange={(option) => setSelectedProgram(option?.value || "")}
                      placeholder="Select Program"
                      isSearchable
                      filterOption={customFilterOption}
                      className="react-select-container"
                      classNamePrefix="react-select"
                    />
                    {selectedProgram && selectedProgram !== "-" && (
                      <button onClick={() => setSelectedProgram("")} className="text-xs text-blue-500 hover:underline mt-1">Clear</button>
                    )}
                  </div>
                )}

                {selectedServiceCategory && selectedState && selectedServiceCode && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Location/Region</label>
                    <Select
                      options={getDropdownOptions(locationRegions)}
                      value={selectedLocationRegion ? { value: selectedLocationRegion, label: selectedLocationRegion } : null}
                      onChange={(option) => setSelectedLocationRegion(option?.value || "")}
                      placeholder="Select Location/Region"
                      isSearchable
                      filterOption={customFilterOption}
                      className="react-select-container"
                      classNamePrefix="react-select"
                    />
                    {selectedLocationRegion && selectedLocationRegion !== "-" && (
                      <button onClick={() => setSelectedLocationRegion("")} className="text-xs text-blue-500 hover:underline mt-1">Clear</button>
                    )}
                  </div>
                )}

                {selectedServiceCategory && selectedState && selectedServiceCode && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Service Description</label>
                    <Select
                      options={getDropdownOptions(serviceDescriptions)}
                      value={selectedServiceDescription ? { value: selectedServiceDescription, label: selectedServiceDescription } : null}
                      onChange={(option) => handleServiceDescriptionChange(option?.value || "")}
                      placeholder="Select Service Description"
                      isSearchable
                      filterOption={customFilterOption}
                      className="react-select-container"
                      classNamePrefix="react-select"
                    />
                    {selectedServiceDescription && selectedServiceDescription !== "-" && (
                      <button onClick={() => setSelectedServiceDescription("")} className="text-xs text-blue-500 hover:underline mt-1">Clear</button>
                    )}
                  </div>
                )}

                {selectedServiceCategory && selectedState && selectedServiceCode && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Provider Type</label>
                    <Select
                      options={getDropdownOptions(providerTypes)}
                      value={selectedProviderType ? { value: selectedProviderType, label: selectedProviderType } : null}
                    onChange={(option) => handleProviderTypeChange(option?.value || "")}
                      placeholder="Select Provider Type"
                      isSearchable
                      filterOption={customFilterOption}
                      className={`react-select-container ${!selectedServiceCode && !selectedServiceDescription ? 'opacity-50' : ''}`}
                      classNamePrefix="react-select"
                    />
                    {selectedProviderType && selectedProviderType !== "-" && (
                      <button onClick={() => setSelectedProviderType("")} className="text-xs text-blue-500 hover:underline mt-1">Clear</button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {!areFiltersApplied && (
              <div className="p-6 bg-white rounded-xl shadow-lg text-center">
                <div className="flex justify-center items-center mb-4">
                  <FaFilter className="h-8 w-8 text-blue-500" />
                </div>
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Please select filters to view historical rates
                </p>
                <p className="text-sm text-gray-500">
                  Choose a service line, state, and service code to see available rate history
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
                  
                  <div className="flex justify-center items-center mb-6">
                    <div className="flex items-center bg-gray-100 p-1 rounded-lg">
                      <button
                        onClick={() => setShowRatePerHour(false)}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                          !showRatePerHour
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        Base Rate
                      </button>
                      <button
                        onClick={() => setShowRatePerHour(true)}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                          showRatePerHour
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        Hourly Equivalent Rate
                      </button>
                    </div>
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
                              <b>Effective Date:</b> ${data.date || '-'}<br>
                              ${modifiers ? `<b>Modifiers:</b><br>${modifiers}` : ''}
                            `;
                          }
                        },
                        xAxis: {
                          type: 'category',
                          data: getGraphData().xAxis,
                          name: 'Effective Date',
                          nameLocation: 'middle',
                          nameGap: 30,
                          axisLabel: {
                            formatter: (value: string) => value
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
                            data: getGraphData().series,
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
                        graphic: getGraphData().series.some(data => data.displayValue) ? [
                          {
                            type: 'text',
                            left: 'center',
                            top: 'middle',
                            style: {
                              text: `Hourly equivalent rates not available as the duration unit is "${getGraphData().series.find(data => data.displayValue)?.durationUnit || 'Unknown'}"`,
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

            {areFiltersApplied && (
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
                      {getVisibleColumns.duration_unit && (
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Duration Unit</th>
                      )}
                      {getVisibleColumns.rate && (
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Rate per Base Unit</th>
                      )}
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
                      {getVisibleColumns.rate_effective_date && (
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Effective Date</th>
                      )}
                      {getVisibleColumns.program && (
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Program</th>
                      )}
                      {getVisibleColumns.location_region && (
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Location/Region</th>
                      )}
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Provider Type</th>
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
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <CustomTooltip content={entry.service_description || '-'}>
                                <div className="max-w-[220px] truncate cursor-pointer group">
                                  <span className="group-hover:text-blue-600 transition-colors duration-200">
                                    {entry.service_description && entry.service_description.length > 30
                                      ? entry.service_description.slice(0, 30) + '...'
                                      : entry.service_description || '-'}
                                  </span>
                                </div>
                              </CustomTooltip>
                            </td>
                          )}
                          {getVisibleColumns.duration_unit && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {entry.duration_unit || '-'}
                            </td>
                          )}
                          {getVisibleColumns.rate && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatCurrency(entry.rate)}
                            </td>
                          )}
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
                          {getVisibleColumns.rate_effective_date && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {entry.rate_effective_date ? new Date(entry.rate_effective_date).toLocaleDateString() : '-'}
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatText(entry.provider_type)}
                          </td>
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