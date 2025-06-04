"use client";

import { useEffect, useState, useMemo } from "react";
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

export default function HistoricalRates() {
  const { data, loading, error } = useData();
  const router = useRouter();
  const { user } = useKindeBrowserClient();

  // State hooks
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

  // Move useMemo declarations to the top
  const areFiltersApplied = selectedServiceCategory && selectedState && selectedServiceCode;

  const filteredData = useMemo(() => {
    if (!selectedServiceCategory || !selectedState || !selectedServiceCode) return [];

    // First get all matching entries
    const allMatchingEntries = data.filter(item => {
      if (selectedServiceCategory && item.service_category !== selectedServiceCategory) return false;
      if (selectedState && item.state_name !== selectedState) return false;
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
      if (selectedProviderType && item.provider_type !== selectedProviderType) return false;

      return true;
    });

    // Group entries by all fields except rate_effective_date
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
        rate: entry.rate,
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
        const latestDate = new Date(latest.rate_effective_date);
        const currentDate = new Date(current.rate_effective_date);
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
    selectedProviderType
  ]);

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

  // Move extractFilters inside the component
  const extractFilters = (data: ServiceData[]) => {
    const categories = data
      .map((item) => item.service_category?.trim())
      .filter(category => category);
    setServiceCategories([...new Set(categories)].sort((a, b) => a.localeCompare(b)));

    const states = data
      .map((item) => item.state_name?.trim().toUpperCase())
      .filter(state => state);
    setStates([...new Set(states)].sort((a, b) => a.localeCompare(b)));

    // Get programs
    const programs = data
      .map((item) => item.program?.trim())
      .filter((program): program is string => !!program);
    setPrograms([...new Set(programs)].sort((a, b) => a.localeCompare(b)));

    // Get location regions
    const locationRegions = data
      .map((item) => item.location_region?.trim())
      .filter((region): region is string => !!region);
    setLocationRegions([...new Set(locationRegions)].sort((a, b) => a.localeCompare(b)));

    // Get modifiers
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

    // Get provider types
    const types = data
      .map((item) => item.provider_type?.trim())
      .filter((type): type is string => !!type);
    setProviderTypes([...new Set(types)].sort((a, b) => a.localeCompare(b)));
  };

  // Now the useEffect can safely call extractFilters
  useEffect(() => {
    if (data.length > 0) {
      extractFilters(data);
    }
  }, [data]);

  useEffect(() => {
    checkSubscriptionAndSubUser();
  }, [router]);

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

  const fetchComment = async (serviceCategory: string, state: string) => {
    try {
      const response = await fetch(`/api/comments_table?serviceCategory=${encodeURIComponent(serviceCategory)}&state=${encodeURIComponent(state)}`);
      const data = await response.json();
      if (data.length > 0) {
        setComment(data[0].comment);
      } else {
        setComment(null);
      }
    } catch (error) {
      console.error("Error fetching comment:", error);
      setComment(null);
    }
  };

  useEffect(() => {
    if (selectedServiceCategory && selectedState) {
      fetchComment(selectedServiceCategory, selectedState);
    } else {
      setComment(null);
    }
  }, [selectedServiceCategory, selectedState]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

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

  const resetFilters = () => {
    setSelectedServiceCategory("");
    setSelectedState("");
    setSelectedServiceCode("");
    setServiceCodes([]);
    setStates([]);
    setSelectedEntry(null);
  };

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

    // Reset all dependent filter options
    setStates([]);
    setServiceCodes([]);
    setServiceDescriptions([]);
    setPrograms([]);
    setLocationRegions([]);
    setModifiers([]);
    setProviderTypes([]);

    // Filter data based on selected category
    const filteredData = data.filter(item => item.service_category === category);
    setStates([...new Set(filteredData.map(item => item.state_name).filter((v): v is string => !!v))].sort());
    setServiceCodes([...new Set(filteredData.map(item => item.service_code).filter((v): v is string => !!v))].sort());
    setServiceDescriptions([...new Set(filteredData.map(item => item.service_description).filter((v): v is string => !!v))].sort());
    setPrograms([...new Set(filteredData.map(item => item.program).filter((v): v is string => !!v))].sort());
    setLocationRegions([...new Set(filteredData.map(item => item.location_region).filter((v): v is string => !!v))].sort());
    setProviderTypes([...new Set(filteredData.map(item => item.provider_type).filter((v): v is string => !!v))].sort());
    // Modifiers
    const allModifiers = filteredData.flatMap(item => [item.modifier_1, item.modifier_2, item.modifier_3, item.modifier_4].filter((v): v is string => !!v));
    setModifiers([...new Set(allModifiers)].map(value => ({ value, label: value })));
  };

  const handleStateChange = (state: string) => {
    setSelectedState(state);
    setSelectedServiceCode("");
    setSelectedServiceDescription("");
    setSelectedProgram("");
    setSelectedLocationRegion("");
    setSelectedModifier("");
    setSelectedProviderType("");
    setFilterStep(3);

    setServiceCodes([]);
    setServiceDescriptions([]);
    setPrograms([]);
    setLocationRegions([]);
    setModifiers([]);
    setProviderTypes([]);

    const filteredData = data.filter(item => item.service_category === selectedServiceCategory && item.state_name === state);
    setServiceCodes([...new Set(filteredData.map(item => item.service_code).filter((v): v is string => !!v))].sort());
    setServiceDescriptions([...new Set(filteredData.map(item => item.service_description).filter((v): v is string => !!v))].sort());
    setPrograms([...new Set(filteredData.map(item => item.program).filter((v): v is string => !!v))].sort());
    setLocationRegions([...new Set(filteredData.map(item => item.location_region).filter((v): v is string => !!v))].sort());
    setProviderTypes([...new Set(filteredData.map(item => item.provider_type).filter((v): v is string => !!v))].sort());
    const allModifiers = filteredData.flatMap(item => [item.modifier_1, item.modifier_2, item.modifier_3, item.modifier_4].filter((v): v is string => !!v));
    setModifiers([...new Set(allModifiers)].map(value => ({ value, label: value })));
  };

  const handleServiceCodeChange = (code: string) => {
    setSelectedServiceCode(code);
    setSelectedServiceDescription("");
    setSelectedProgram("");
    setSelectedLocationRegion("");
    setSelectedModifier("");
    setSelectedProviderType("");
    setFilterStep(4);

    setServiceCodes([]);
    setPrograms([]);
    setLocationRegions([]);
    setModifiers([]);
    setProviderTypes([]);

    const filteredData = data.filter(item => item.service_category === selectedServiceCategory && item.state_name === selectedState && item.service_code === code);
    setServiceCodes([...new Set(filteredData.map(item => item.service_code).filter((v): v is string => !!v))].sort());
    setServiceDescriptions([...new Set(filteredData.map(item => item.service_description).filter((v): v is string => !!v))].sort());
    setPrograms([...new Set(filteredData.map(item => item.program).filter((v): v is string => !!v))].sort());
    setLocationRegions([...new Set(filteredData.map(item => item.location_region).filter((v): v is string => !!v))].sort());
    setProviderTypes([...new Set(filteredData.map(item => item.provider_type).filter((v): v is string => !!v))].sort());
    const allModifiers = filteredData.flatMap(item => [item.modifier_1, item.modifier_2, item.modifier_3, item.modifier_4].filter((v): v is string => !!v));
    setModifiers([...new Set(allModifiers)].map(value => ({ value, label: value })));
  };

  const handleServiceDescriptionChange = (desc: string) => {
    setSelectedServiceDescription(desc);
    setSelectedServiceCode("");
    setSelectedProgram("");
    setSelectedLocationRegion("");
    setSelectedModifier("");
    setSelectedProviderType("");
    setFilterStep(4);

    setServiceCodes([]);
    setPrograms([]);
    setLocationRegions([]);
    setModifiers([]);
    setProviderTypes([]);

    const filteredData = data.filter(item => item.service_category === selectedServiceCategory && item.state_name === selectedState && item.service_description === desc);
    setServiceCodes([...new Set(filteredData.map(item => item.service_code).filter((v): v is string => !!v))].sort());
    setPrograms([...new Set(filteredData.map(item => item.program).filter((v): v is string => !!v))].sort());
    setLocationRegions([...new Set(filteredData.map(item => item.location_region).filter((v): v is string => !!v))].sort());
    setProviderTypes([...new Set(filteredData.map(item => item.provider_type).filter((v): v is string => !!v))].sort());
    const allModifiers = filteredData.flatMap(item => [item.modifier_1, item.modifier_2, item.modifier_3, item.modifier_4].filter((v): v is string => !!v));
    setModifiers([...new Set(allModifiers)].map(value => ({ value, label: value })));
  };

  const getGraphData = () => {
    if (!selectedEntry) return { xAxis: [], series: [] };

    const allEntries = data.filter(item => 
      item.state_name === selectedEntry.state_name &&
      item.service_code === selectedEntry.service_code &&
      item.program === selectedEntry.program &&
      item.location_region === selectedEntry.location_region &&
      item.modifier_1 === selectedEntry.modifier_1 &&
      item.modifier_2 === selectedEntry.modifier_2 &&
      item.modifier_3 === selectedEntry.modifier_3 &&
      item.modifier_4 === selectedEntry.modifier_4
    );

    const sortedEntries = allEntries.sort((a, b) => 
      new Date(a.rate_effective_date).getTime() - new Date(b.rate_effective_date).getTime()
    );

    const currentDate = new Date();
    const lastEntry = sortedEntries[sortedEntries.length - 1];
    const extendedEntries = [
      ...sortedEntries,
      {
        ...lastEntry,
        rate_effective_date: currentDate.toISOString().split('T')[0]
      }
    ];

    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    };

    return {
      xAxis: extendedEntries.map(entry => formatDate(entry.rate_effective_date)),
      series: extendedEntries.map(entry => {
        let rateValue = parseFloat(entry.rate.replace('$', '') || '0');
        const durationUnit = entry.duration_unit?.toUpperCase();

        if (showRatePerHour) {
          if (durationUnit === '15 MINUTES') {
            rateValue *= 4;
          } else if (durationUnit === '30 MINUTES') {
            rateValue *= 2;
          } else if (durationUnit !== 'PER HOUR') {
            return {
              value: null,
              displayValue: 'N/A', // Simplified for non-convertible units
              state: entry.state_name,
              serviceCode: entry.service_code,
              program: entry.program,
              locationRegion: entry.location_region,
              modifier1: entry.modifier_1,
              modifier1Details: entry.modifier_1_details,
              modifier2: entry.modifier_2,
              modifier2Details: entry.modifier_2_details,
              modifier3: entry.modifier_3,
              modifier3Details: entry.modifier_3_details,
              modifier4: entry.modifier_4,
              modifier4Details: entry.modifier_4_details,
              durationUnit: entry.duration_unit,
              date: formatDate(entry.rate_effective_date)
            };
          }
        }

        return {
          value: showRatePerHour ? rateValue : parseFloat(entry.rate.replace('$', '') || '0'),
          state: entry.state_name,
          serviceCode: entry.service_code,
          program: entry.program,
          locationRegion: entry.location_region,
          modifier1: entry.modifier_1,
          modifier1Details: entry.modifier_1_details,
          modifier2: entry.modifier_2,
          modifier2Details: entry.modifier_2_details,
          modifier3: entry.modifier_3,
          modifier3Details: entry.modifier_3_details,
          modifier4: entry.modifier_4,
          modifier4Details: entry.modifier_4_details,
          durationUnit: entry.duration_unit,
          date: formatDate(entry.rate_effective_date)
        };
      })
    };
  };

  // Create a utility function to format text
  const formatText = (text: string | null | undefined) => {
    return text ? text.toUpperCase() : '-';
  };

  // Dynamically populate filter options based on filteredData
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

  return (
    <AppLayout activeTab="historicalRates">
      <div className="p-4 sm:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
        {/* Error Message */}
        <ErrorMessage error={error} />

        {/* Heading */}
        <div className="flex flex-col items-start mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-5xl md:text-6xl text-[#012C61] font-lemonMilkRegular uppercase mb-3 sm:mb-4">
            Rate History
          </h1>
          <button
            onClick={resetFilters}
            className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base bg-[#012C61] text-white rounded-lg hover:bg-blue-800 transition-colors"
          >
            Reset All Filters
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center h-64">
            <FaSpinner className="animate-spin h-12 w-12 text-blue-500" />
            <p className="ml-4 text-gray-600">Loading data...</p>
          </div>
        )}

        {/* Main Content */}
        {!loading && (
          <div className="space-y-8">
            {/* Filters */}
            <div className="p-4 sm:p-6 bg-white rounded-xl shadow-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                {/* Service Category Selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Service Line</label>
                  <Select
                    options={serviceCategories.map(category => ({ value: category, label: category }))}
                    value={selectedServiceCategory ? { value: selectedServiceCategory, label: selectedServiceCategory } : null}
                    onChange={(option) => handleServiceCategoryChange(option?.value || "")}
                    placeholder="Select Service Line"
                    isSearchable
                    className="react-select-container"
                    classNamePrefix="react-select"
                  />
                  {selectedServiceCategory && (
                    <button onClick={() => setSelectedServiceCategory("")} className="text-xs text-blue-500 hover:underline mt-1">Clear</button>
                  )}
                </div>

                {/* State Selector */}
                {selectedServiceCategory ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">State</label>
                    <Select
                      options={states.map(state => ({ value: state, label: state }))}
                      value={selectedState ? { value: selectedState, label: selectedState } : null}
                      onChange={(option) => handleStateChange(option?.value || "")}
                      placeholder="Select State"
                      isSearchable
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

                {/* Service Code Selector */}
                {selectedServiceCategory && selectedState ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Service Code</label>
                    <Select
                      options={serviceCodes.map(code => ({ value: code, label: code }))}
                      value={selectedServiceCode ? { value: selectedServiceCode, label: selectedServiceCode } : null}
                      onChange={(option) => handleServiceCodeChange(option?.value || "")}
                      placeholder="Select Service Code"
                      isSearchable
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

                {/* Program Selector */}
                {selectedServiceCategory && selectedState && selectedServiceCode && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Program</label>
                    <Select
                      options={programs.map((program) => ({ value: program, label: program }))}
                      value={selectedProgram ? { value: selectedProgram, label: selectedProgram } : null}
                      onChange={(option) => setSelectedProgram(option?.value || "")}
                      placeholder="Select Program"
                      isSearchable
                      className="react-select-container"
                      classNamePrefix="react-select"
                    />
                  </div>
                )}

                {/* Location/Region Selector */}
                {selectedServiceCategory && selectedState && selectedServiceCode && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Location/Region</label>
                    <Select
                      options={locationRegions.map((region) => ({ value: region, label: region }))}
                      value={selectedLocationRegion ? { value: selectedLocationRegion, label: selectedLocationRegion } : null}
                      onChange={(option) => setSelectedLocationRegion(option?.value || "")}
                      placeholder="Select Location/Region"
                      isSearchable
                      className="react-select-container"
                      classNamePrefix="react-select"
                    />
                  </div>
                )}

                {/* Modifier Selector */}
                {selectedServiceCategory && selectedState && selectedServiceCode && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Modifier</label>
                    <Select
                      options={modifiers.map((modifier) => ({
                        value: modifier.value,
                        label: `${modifier.value} - ${modifier.details || ''}`
                      }))}
                      value={selectedModifier ? { value: selectedModifier, label: selectedModifier } : null}
                      onChange={(option) => setSelectedModifier(option?.value || "")}
                      placeholder="Select Modifier"
                      isSearchable
                      className="react-select-container"
                      classNamePrefix="react-select"
                    />
                    {selectedModifier && (
                      <button onClick={() => setSelectedModifier("")} className="text-xs text-blue-500 hover:underline mt-1">Clear</button>
                    )}
                  </div>
                )}

                {/* Service Description Selector */}
                {selectedServiceCategory && selectedState && selectedServiceCode && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Service Description</label>
                    <Select
                      options={serviceDescriptions.map(desc => ({ value: desc, label: desc }))}
                      value={selectedServiceDescription ? { value: selectedServiceDescription, label: selectedServiceDescription } : null}
                      onChange={(option) => handleServiceDescriptionChange(option?.value || "")}
                      placeholder="Select Service Description"
                      isSearchable
                      className="react-select-container"
                      classNamePrefix="react-select"
                    />
                    {selectedServiceDescription && (
                      <button onClick={() => setSelectedServiceDescription("")} className="text-xs text-blue-500 hover:underline mt-1">Clear</button>
                    )}
                  </div>
                )}

                {/* Provider Type Selector */}
                {selectedServiceCategory && selectedState && selectedServiceCode && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Provider Type</label>
                    <Select
                      options={providerTypes.map(type => ({ value: type, label: type }))}
                      value={selectedProviderType ? { value: selectedProviderType, label: selectedProviderType } : null}
                      onChange={(option) => setSelectedProviderType(option?.value || "")}
                      placeholder="Select Provider Type"
                      isSearchable
                      isDisabled={!selectedServiceCode && !selectedServiceDescription}
                      className={`react-select-container ${!selectedServiceCode && !selectedServiceDescription ? 'opacity-50' : ''}`}
                      classNamePrefix="react-select"
                    />
                    {selectedProviderType && (
                      <button onClick={() => setSelectedProviderType("")} className="text-xs text-blue-500 hover:underline mt-1">Clear</button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Empty State Message */}
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

            {/* Graph Component */}
            {selectedEntry && areFiltersApplied && (
              <>
                {/* Display the comment above the graph */}
                {comment && (
                  <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
                    <p className="text-sm text-blue-700">
                      <strong>Comment:</strong> {comment}
                    </p>
                  </div>
                )}

                <div className="p-6 bg-white rounded-xl shadow-lg">
                  <h2 className="text-xl font-semibold mb-4 text-gray-800">Rate History</h2>
                  
                  {/* Toggle Switch */}
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

            {/* Data Table */}
            {areFiltersApplied && (
              <div className="overflow-x-auto rounded-lg shadow-lg">
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
                      {getVisibleColumns.rate_per_hour && (
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Hourly Equivalent Rate</th>
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
                      {/* Add Provider Type Column */}
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Provider Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredData.map((item, index) => {
                      const isSelected = selectedEntry?.state_name === item.state_name &&
                        selectedEntry?.service_code === item.service_code &&
                        selectedEntry?.program === item.program &&
                        selectedEntry?.location_region === item.location_region &&
                        selectedEntry?.modifier_1 === item.modifier_1 &&
                        selectedEntry?.modifier_2 === item.modifier_2 &&
                        selectedEntry?.modifier_3 === item.modifier_3 &&
                        selectedEntry?.modifier_4 === item.modifier_4;

                      const rateValue = parseFloat(item.rate.replace('$', '') || '0');
                      const durationUnit = item.duration_unit?.toUpperCase();
                      const hourlyRate = durationUnit === '15 MINUTES' ? rateValue * 4 : rateValue;

                      return (
                        <tr 
                          key={index} 
                          className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                            isSelected ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => setSelectedEntry(item)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                isSelected ? 'border-blue-500 bg-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.2)]' : 'border-gray-300 hover:border-gray-400'
                              }`}>
                                {isSelected && (
                                  <svg 
                                    className="w-3 h-3 text-white" 
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
                            </div>
                          </td>
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
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.duration_unit || '-'}
                            </td>
                          )}
                          {getVisibleColumns.rate && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.rate || '-'}
                            </td>
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
                          {getVisibleColumns.rate_effective_date && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.rate_effective_date ? new Date(item.rate_effective_date).toLocaleDateString() : '-'}
                            </td>
                          )}
                          {getVisibleColumns.program && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.program}
                            </td>
                          )}
                          {getVisibleColumns.location_region && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatText(item.location_region)}
                            </td>
                          )}
                          {/* Add Provider Type Column */}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatText(item.provider_type)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Selection Prompt */}
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
        )}
      </div>
    </AppLayout>
  );
}