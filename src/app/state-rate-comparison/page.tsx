"use client";

import { useEffect, useState, useMemo, useId } from "react";
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
import { createClient } from "@supabase/supabase-js";

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

// Initialize Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function StatePaymentComparison() {
  // Call all hooks at the top, unconditionally
  const { data, loading: dataLoading, error: dataError } = useData();
  const router = useRouter();

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
  const [serviceCategories, setServiceCategories] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [serviceCodes, setServiceCodes] = useState<string[]>([]);
  const [programs, setPrograms] = useState<string[]>([]);
  const [locationRegions, setLocationRegions] = useState<string[]>([]);
  const [modifiers, setModifiers] = useState<{ value: string; label: string; details?: string }[]>([]);
  const [serviceDescriptions, setServiceDescriptions] = useState<string[]>([]);
  const [selectedModifiers, setSelectedModifiers] = useState<{[key: string]: string}>({});
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
  const [selectedProviderType, setSelectedProviderType] = useState("");
  const [providerTypes, setProviderTypes] = useState<string[]>([]);

  // Supabase check (after hooks)
  if (!supabase) {
    console.error("Supabase client not initialized.");
    return <div>Error: Supabase client not initialized.</div>;
  }

  // Early return for data errors
  if (dataError) {
    console.error("Error fetching data:", dataError);
    return <div>Error: Failed to fetch data.</div>;
  }

  if (!data || data.length === 0) {
    console.error("No data found.");
    return <div>No data available.</div>;
  }

  // Add logging to see if data is being fetched
  useEffect(() => {
    console.log("Data loading state:", dataLoading);
    console.log("Data error:", dataError);
    console.log("Data:", data);
  }, [dataLoading, dataError, data]);

  // Add logging to see if filters are being extracted
  useEffect(() => {
    if (data.length > 0) {
      console.log("Data loaded, extracting filters:", data);
      extractFilters(data);
    }
  }, [data]);

  // Extract unique filter options
  const extractFilters = (data: ServiceData[]) => {
    const categories = data
      .map((item) => item.service_category?.trim())
      .filter((category): category is string => !!category);
    setServiceCategories([...new Set(categories)].map(category => category || '').sort((a, b) => a.localeCompare(b)));

    const states = data
      .map((item) => item.state_name?.trim().toUpperCase())
      .filter((state): state is string => !!state);
    setStates([...new Set(states)].map(state => state || '').sort((a, b) => a.localeCompare(b)));

    // Get programs
    const programs = data
      .map((item) => item.program?.trim())
      .filter((program): program is string => !!program);
    setPrograms([...new Set(programs)].map(program => program || '').sort((a, b) => a.localeCompare(b)));

    // Get location regions
    const locationRegions = data
      .map((item) => item.location_region?.trim())
      .filter((region): region is string => !!region);
    setLocationRegions([...new Set(locationRegions)].map(region => region || '').sort((a, b) => a.localeCompare(b)));

    // Get modifiers
    const allModifiers = data.flatMap((item) => [
      item.modifier_1 ? { value: item.modifier_1, details: item.modifier_1_details } : null,
      item.modifier_2 ? { value: item.modifier_2, details: item.modifier_2_details } : null,
      item.modifier_3 ? { value: item.modifier_3, details: item.modifier_3_details } : null,
      item.modifier_4 ? { value: item.modifier_4, details: item.modifier_4_details } : null
    ]).filter(Boolean);

    setModifiers([...new Set(allModifiers.map(mod => mod?.value).filter(Boolean))].map(value => {
      const mod = allModifiers.find(mod => mod?.value === value);
      return { value: value as string, label: value as string, details: mod?.details || '' };
    }));

    // Get service descriptions
    const descriptions = data.map(item => item.service_description).filter(desc => desc);
    setServiceDescriptions([...new Set(descriptions)].filter((desc): desc is string => !!desc).sort((a, b) => a.localeCompare(b)));

    // Get provider types
    const types = data
      .map((item) => item.provider_type?.trim())
      .filter((type): type is string => !!type);
    setProviderTypes([...new Set(types)].sort((a, b) => a.localeCompare(b)));
  };

  // Update filter handlers to remove URL updates
  const handleServiceCategoryChange = (index: number, category: string) => {
    const newFilters = [...filterSets];
    newFilters[index] = {
      ...newFilters[index],
      serviceCategory: category,
      states: [],
      serviceCode: "",
      serviceCodeOptions: [],
      stateOptions: []
    };
    setFilterSets(newFilters);

    // Reset all dependent filter options
    setPrograms([]);
    setLocationRegions([]);
    setModifiers([]);
    setProviderTypes([]);
    setServiceDescriptions([]);

    // Filter data based on selected category - make it case insensitive and trim whitespace
    const filteredData = data.filter(item => {
      const itemCategory = item.service_category?.trim().toUpperCase();
      const selectedCategory = category.trim().toUpperCase();
      return itemCategory === selectedCategory;
    });
    newFilters[index].stateOptions = [...new Set(filteredData.map(item => item.state_name?.trim().toUpperCase()).filter((v): v is string => !!v))].sort().map(state => ({ value: state, label: state }));
    newFilters[index].serviceCodeOptions = [...new Set(filteredData.map(item => item.service_code?.trim()).filter((v): v is string => !!v))].sort();
    setFilterSets(newFilters);
    setPrograms([...new Set(filteredData.map(item => item.program?.trim()).filter((v): v is string => !!v))].sort());
    setLocationRegions([...new Set(filteredData.map(item => item.location_region?.trim()).filter((v): v is string => !!v))].sort());
    setProviderTypes([...new Set(filteredData.map(item => item.provider_type?.trim()).filter((v): v is string => !!v))].sort());
    setServiceDescriptions([...new Set(filteredData.map(item => item.service_description?.trim()).filter((v): v is string => !!v))].sort());
    const allModifiers = filteredData.flatMap(item => [item.modifier_1, item.modifier_2, item.modifier_3, item.modifier_4].filter((v): v is string => !!v));
    setModifiers([...new Set(allModifiers)].map(value => ({ value, label: value })));
  };

  const handleStateChange = (index: number, option: { value: string; label: string } | null) => {
    const newFilters = [...filterSets];
    newFilters[index] = {
      ...newFilters[index],
      states: option ? [option.value] : [],
      serviceCode: "",
      serviceCodeOptions: []
    };
    setFilterSets(newFilters);

    setPrograms([]);
    setLocationRegions([]);
    setModifiers([]);
    setProviderTypes([]);
    setServiceDescriptions([]);

    if (option && newFilters[index].serviceCategory) {
      if (option.value === "ALL_STATES") {
        // All States selected: show all service codes for the selected category
        const allCodes = data
          .filter(item => item.service_category?.trim().toUpperCase() === newFilters[index].serviceCategory.trim().toUpperCase())
          .map(item => item.service_code?.trim())
          .filter((v): v is string => !!v);
        newFilters[index].serviceCodeOptions = [...new Set(allCodes)].sort();
        setFilterSets(newFilters);
        setPrograms([...new Set(data.filter(item => item.service_category?.trim().toUpperCase() === newFilters[index].serviceCategory.trim().toUpperCase()).map(item => item.program?.trim()).filter((v): v is string => !!v))].sort());
        setLocationRegions([...new Set(data.filter(item => item.service_category?.trim().toUpperCase() === newFilters[index].serviceCategory.trim().toUpperCase()).map(item => item.location_region?.trim()).filter((v): v is string => !!v))].sort());
        setProviderTypes([...new Set(data.filter(item => item.service_category?.trim().toUpperCase() === newFilters[index].serviceCategory.trim().toUpperCase()).map(item => item.provider_type?.trim()).filter((v): v is string => !!v))].sort());
        setServiceDescriptions([...new Set(data.filter(item => item.service_category?.trim().toUpperCase() === newFilters[index].serviceCategory.trim().toUpperCase()).map(item => item.service_description?.trim()).filter((v): v is string => !!v))].sort());
        const allModifiers = data.filter(item => item.service_category?.trim().toUpperCase() === newFilters[index].serviceCategory.trim().toUpperCase()).flatMap(item => [item.modifier_1, item.modifier_2, item.modifier_3, item.modifier_4].filter((v): v is string => !!v));
        setModifiers([...new Set(allModifiers)].map(value => ({ value, label: value })));
        return;
      }
      // ...existing logic for single state selection...
      const stateFilteredData = data.filter(item => {
        const itemCategory = item.service_category?.trim().toUpperCase();
        const selectedCategory = newFilters[index].serviceCategory.trim().toUpperCase();
        const itemState = item.state_name?.trim().toUpperCase();
        const selectedState = option.value.trim().toUpperCase();
        return itemCategory === selectedCategory && itemState === selectedState;
      });
      newFilters[index].serviceCodeOptions = [...new Set(stateFilteredData.map(item => item.service_code?.trim()).filter((v): v is string => !!v))].sort();
      setFilterSets(newFilters);
      setPrograms([...new Set(stateFilteredData.map(item => item.program?.trim()).filter((v): v is string => !!v))].sort());
      setLocationRegions([...new Set(stateFilteredData.map(item => item.location_region?.trim()).filter((v): v is string => !!v))].sort());
      setProviderTypes([...new Set(stateFilteredData.map(item => item.provider_type?.trim()).filter((v): v is string => !!v))].sort());
      setServiceDescriptions([...new Set(stateFilteredData.map(item => item.service_description?.trim()).filter((v): v is string => !!v))].sort());
      const allModifiers = stateFilteredData.flatMap(item => [item.modifier_1, item.modifier_2, item.modifier_3, item.modifier_4].filter((v): v is string => !!v));
      setModifiers([...new Set(allModifiers)].map(value => ({ value, label: value })));
    }
  };

  const handleServiceCodeChange = (index: number, code: string) => {
    const newFilters = [...filterSets];
    newFilters[index] = {
      ...newFilters[index],
      serviceCode: code
    };
    setFilterSets(newFilters);

    setPrograms([]);
    setLocationRegions([]);
    setModifiers([]);
    setProviderTypes([]);
    setServiceDescriptions([]);

    const filterSet = newFilters[index];
    const codeFilteredData = data.filter(item => {
      const itemCategory = item.service_category?.trim().toUpperCase();
      const selectedCategory = filterSet.serviceCategory.trim().toUpperCase();
      const itemState = item.state_name?.trim().toUpperCase();
      const selectedState = filterSet.states[0]?.trim().toUpperCase();
      const itemCode = item.service_code?.trim();
      const selectedCode = code.trim();
      return itemCategory === selectedCategory && itemState === selectedState && itemCode === selectedCode;
    });
    setPrograms([...new Set(codeFilteredData.map(item => item.program?.trim()).filter((v): v is string => !!v))].sort());
    setLocationRegions([...new Set(codeFilteredData.map(item => item.location_region?.trim()).filter((v): v is string => !!v))].sort());
    setProviderTypes([...new Set(codeFilteredData.map(item => item.provider_type?.trim()).filter((v): v is string => !!v))].sort());
    setServiceDescriptions([...new Set(codeFilteredData.map(item => item.service_description?.trim()).filter((v): v is string => !!v))].sort());
    const allModifiers = codeFilteredData.flatMap(item => [item.modifier_1, item.modifier_2, item.modifier_3, item.modifier_4].filter((v): v is string => !!v));
    setModifiers([...new Set(allModifiers)].map(value => ({ value, label: value })));
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

  // Update the latestRatesMap creation to include program and location_region
  const latestRatesMap = new Map<string, ServiceData>();
  data.forEach((item) => {
    // Include program and location_region in the key
    const key = `${item.state_name}|${item.service_category}|${item.service_code}|${item.modifier_1}|${item.modifier_2}|${item.modifier_3}|${item.modifier_4}|${item.program}|${item.location_region}`;
    const currentDate = new Date(item.rate_effective_date);
    const existing = latestRatesMap.get(key);
    
    if (!existing || currentDate > new Date(existing.rate_effective_date)) {
      latestRatesMap.set(key, item);
    }
  });

  // Convert map to array of latest rates
  const latestRates = Array.from(latestRatesMap.values());

  // Then filter based on selections
  const filteredData = useMemo(() => {
    return latestRates.filter((item) => {
      return filterSets.some(filterSet => (
        (!filterSet.serviceCategory || item.service_category?.trim().toUpperCase() === filterSet.serviceCategory.trim().toUpperCase()) &&
        (!filterSet.states.length || filterSet.states.map(s => s.trim().toUpperCase()).includes(item.state_name?.trim().toUpperCase())) &&
        (!filterSet.serviceCode || item.service_code?.trim() === filterSet.serviceCode.trim()) &&
        (!selectedProgram || item.program?.trim() === selectedProgram.trim()) &&
        (!selectedLocationRegion || item.location_region?.trim() === selectedLocationRegion.trim()) &&
        (!selectedModifier || [item.modifier_1, item.modifier_2, item.modifier_3, item.modifier_4].includes(selectedModifier)) &&
        (!selectedServiceDescription || item.service_description?.trim() === selectedServiceDescription.trim()) &&
        (!selectedProviderType || item.provider_type?.trim() === selectedProviderType.trim())
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
  const echartOptions = useMemo<echarts.EChartsOption>(() => {
    let statesList = Object.keys(processedData);
    const series: echarts.SeriesOption[] = [];

    if (isAllStatesSelected) {
      // Create an array of state-rate pairs for sorting
      let sortedData = statesList.map(state => ({
        state,
        rate: processedData[state] && processedData[state]['average'] ? processedData[state]['average'] : null
      }));

      // Sort the data if needed
      if (sortOrder !== 'default') {
        sortedData.sort((a, b) => 
          sortOrder === 'asc' ? (a.rate ?? 0) - (b.rate ?? 0) : (b.rate ?? 0) - (a.rate ?? 0)
        );
      }

      // Update statesList to match the sorted order
      statesList = sortedData.map(item => item.state);
      
      // Create a bar for each state's average rate using sorted data
      series.push({
        name: 'Average Rate',
        type: 'bar',
        barGap: '20%',
        barCategoryGap: '20%',
        data: sortedData.map(item => item.rate !== undefined && item.rate !== null ? item.rate : null),
        label: {
          show: true,
          position: 'insideTop',
          rotate: 45,
          formatter: (params: any) => {
            const value = params.value;
            return value ? `$${value.toFixed(2)}` : '-';
          },
          color: '#374151',
          fontSize: 12,
          fontWeight: 'bold',
          textShadowBlur: 2,
          textShadowColor: 'rgba(255,255,255,0.5)'
        },
        itemStyle: {
          color: '#36A2EBB3'
        }
      });
    } else {
      // For manual state selection, create sorted array of selections
      const allSelections: Array<{ state: string, modifierKey: string, rate: number }> = [];
      
      Object.entries(selectedTableRows).forEach(([state, selections]) => {
        selections.forEach(modifierKey => {
          let rate = 0;
          if (processedData[state] && typeof processedData[state][modifierKey] === 'number' && !isNaN(processedData[state][modifierKey])) {
            rate = processedData[state][modifierKey];
          }
          allSelections.push({ state, modifierKey, rate });
        });
      });

      // Sort selections if needed
      if (sortOrder !== 'default') {
        allSelections.sort((a, b) => sortOrder === 'asc' ? a.rate - b.rate : b.rate - a.rate);
        // Update statesList to match the sorted order
        statesList = Array.from(new Set(allSelections.map(item => item.state)));
      }

      allSelections.forEach(({ state, modifierKey, rate }, index) => {
        series.push({
          name: `${state} - ${modifierKey}`,
          type: 'bar',
          barGap: '0%',
          barCategoryGap: '20%',
          data: statesList.map(s => s === state ? rate : null),
          label: {
            show: true,
            position: 'top',
            formatter: (params: any) => {
              const value = params.value;
              return value ? `$${value.toFixed(2)}` : '-';
            },
            color: '#374151',
            fontSize: 12,
            fontWeight: 'bold',
            textShadowBlur: 2,
            textShadowColor: 'rgba(255,255,255,0.5)'
          },
          itemStyle: {
            color: `${colorSequence[index % colorSequence.length]}B3`
          }
        });
      });
    }

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'item',
        axisPointer: {
          type: 'shadow'
        },
        formatter: (params: any) => {
          if (isAllStatesSelected) {
            const state = params.name;
            const rate = params.value;
            return `State: ${state}<br>Average ${showRatePerHour ? 'Hourly' : 'Base'} Rate: $${rate?.toFixed(2) || '0.00'}`;
          } else {
            const state = params.name;
            const seriesName = params.seriesName;
            const modifierKey = seriesName.split(' - ')[1];
            const rate = params.value;

            // Use robust key generation for lookup
            const item = filteredData.find(d => 
              d.state_name === state && 
              [d.modifier_1?.trim().toUpperCase() || '', d.modifier_2?.trim().toUpperCase() || '', d.modifier_3?.trim().toUpperCase() || '', d.modifier_4?.trim().toUpperCase() || '', d.program?.trim().toUpperCase() || '', d.location_region?.trim().toUpperCase() || ''].join('|') === modifierKey
            );

            if (!item) {
              console.warn('No item found for key:', modifierKey, 'in state:', state);
              return `State: ${state}<br>${showRatePerHour ? 'Hourly' : 'Base'} Rate: $${rate?.toFixed(2) || '0.00'}`;
            }

            // Collect modifiers that exist
            const modifiers = [
              item.modifier_1 ? `${item.modifier_1}${item.modifier_1_details ? ` - ${item.modifier_1_details}` : ''}` : null,
              item.modifier_2 ? `${item.modifier_2}${item.modifier_2_details ? ` - ${item.modifier_2_details}` : ''}` : null,
              item.modifier_3 ? `${item.modifier_3}${item.modifier_3_details ? ` - ${item.modifier_3_details}` : ''}` : null,
              item.modifier_4 ? `${item.modifier_4}${item.modifier_4_details ? ` - ${item.modifier_4_details}` : ''}` : null
            ].filter(Boolean);

            const additionalDetails = [
              `<b>${showRatePerHour ? 'Hourly' : 'Base'} Rate:</b> $${rate?.toFixed(2) || '0.00'}`,
              item.service_code ? `<b>Service Code:</b> ${item.service_code}` : null,
              item.program ? `<b>Program:</b> ${item.program}` : null,
              item.location_region ? `<b>Location Region:</b> ${item.location_region}` : null,
              item.rate_per_hour ? `<b>Rate Per Hour:</b> $${item.rate_per_hour}` : null,
              item.rate_effective_date ? `<b>Effective Date:</b> ${new Date(item.rate_effective_date).toLocaleDateString()}` : null,
              item.duration_unit ? `<b>Duration Unit:</b> ${item.duration_unit}` : null
            ].filter(Boolean).join('<br>');
            
            return [
              `<b>State:</b> ${state}`,
              modifiers.length > 0 ? `<b>Modifiers:</b><br>${modifiers.join('<br>')}` : '<b>Modifiers:</b> None',
              additionalDetails
            ].filter(Boolean).join('<br>');
          }
        }
      },
      xAxis: {
        type: 'category',
        data: statesList,
        axisLabel: {
          rotate: 45,
          fontSize: 10
        },
        axisTick: {
          show: false
        }
      },
      yAxis: {
        type: 'value',
        name: showRatePerHour ? 'Rate ($ per hour)' : 'Rate ($ per base unit)',
        nameLocation: 'middle',
        nameGap: 30
      },
      series,
      grid: {
        containLabel: true,
        left: '3%',
        right: '3%',
        bottom: isAllStatesSelected ? '10%' : '15%',
        top: '5%'
      },
      toolbox: {
        show: false,
      },
      on: {
        click: (params: any) => {
          console.log("Chart clicked:", params);
          if (isAllStatesSelected && params.componentType === 'series') {
            const state = params.name;
            const stateData = filteredData.filter(item => item.state_name === state);
            if (!stateData || stateData.length === 0) {
              console.warn('No stateData found for state:', state);
              return;
            }
            const sum = stateData.reduce((acc, item) => {
              if (!item) return acc;
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
                : parseFloat((parseFloat(item.rate?.replace("$", "") || "0").toFixed(2)));
              return acc + rate;
            }, 0);
            const average = sum / stateData.length;
            setSelectedStateDetails({
              state,
              average,
              entries: stateData
            });
          }
        }
      }
    };

    // Debug logging for chart data
    console.log('processedData:', processedData);
    console.log('selectedTableRows:', selectedTableRows);
    console.log('series:', series);

    return option;
  }, [processedData, filteredData, isAllStatesSelected, showRatePerHour, selectedTableRows, sortOrder]);

  const ChartWithErrorBoundary = () => {
    try {
      return (
        <ReactECharts
          option={echartOptions}
          style={{ 
            height: isAllStatesSelected ? '500px' : '400px',
            width: '100%' 
          }}
          onEvents={{
            click: (params: any) => {
              console.log("Chart clicked:", params);
              if (isAllStatesSelected && params.componentType === 'series') {
                const state = params.name;
                const stateData = filteredData.filter(item => item.state_name === state);
                if (!stateData || stateData.length === 0) {
                  console.warn('No stateData found for state:', state);
                  return;
                }
                const sum = stateData.reduce((acc, item) => {
                  if (!item) return acc;
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
                    : parseFloat((parseFloat(item.rate?.replace("$", "") || "0").toFixed(2)));
                  return acc + rate;
                }, 0);
                const average = sum / stateData.length;
                setSelectedStateDetails({
                  state,
                  average,
                  entries: stateData
                });
              }
            }
          }}
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
  };

  // Calculate comparison metrics
  const rates = useMemo(() => {
    return Object.values(processedData)
      .flatMap(rates => Object.values(rates))
      .filter(rate => rate > 0);
  }, [processedData]);

  const maxRate = useMemo(() => Math.max(...rates), [rates]);
  const minRate = useMemo(() => Math.min(...rates), [rates]);
  const avgRate = useMemo(() => rates.reduce((sum, rate) => sum + rate, 0) / rates.length, [rates]);

  // Calculate national average
  const nationalAverage = useMemo(() => {
    if (!selectedServiceCategory || !selectedServiceCode) return 0;

    const rates = data
      .filter(item => 
        item.service_category === selectedServiceCategory &&
        item.service_code === selectedServiceCode
      )
      .map(item => 
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
      .filter(rate => rate > 0);

    if (rates.length === 0) return 0;

    const sum = rates.reduce((sum, rate) => sum + rate, 0);
    return (sum / rates.length).toFixed(2);
  }, [data, selectedServiceCategory, selectedServiceCode, showRatePerHour]);

  const handleTableRowSelection = (state: string, item: ServiceData) => {
    const currentModifierKey = [
      item.modifier_1?.trim().toUpperCase() || '',
      item.modifier_2?.trim().toUpperCase() || '',
      item.modifier_3?.trim().toUpperCase() || '',
      item.modifier_4?.trim().toUpperCase() || '',
      item.program?.trim().toUpperCase() || '',
      item.location_region?.trim().toUpperCase() || ''
    ].join('|');
    const stateKey = item.state_name?.trim().toUpperCase();
    setSelectedTableRows(prev => {
      const stateSelections = prev[stateKey] || [];
      const newSelections = stateSelections.includes(currentModifierKey)
        ? stateSelections.filter(key => key !== currentModifierKey)
        : [...stateSelections, currentModifierKey];
      return {
        ...prev,
        [stateKey]: newSelections
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

  // Create a utility function to format text
  const formatText = (text: string | null | undefined) => {
    return text ? text.toUpperCase() : '-';
  };

  // Add this function to your component
  const handleSort = (key: string, event: React.MouseEvent) => {
    event.preventDefault();
    setSortConfig(prev => {
      const existingSort = prev.find(sort => sort.key === key);
      if (existingSort) {
        return prev.filter(sort => sort.key !== key);
      }
      return [...prev, { key, direction: 'asc' }];
    });
  };

  // Also add this state near your other state declarations
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }[]>([]);

  // Add this component to your file
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

  // Add a function to delete a filter set by its index
  const deleteFilterSet = (index: number) => {
    const newFilterSets = [...filterSets];
    newFilterSets.splice(index, 1); // Remove the filter set at the specified index
    setFilterSets(newFilterSets);
  };

  const fetchComments = async (serviceCategory: string, states: string[]) => {
    try {
      const commentsPromises = states.map(async (state) => {
        const response = await fetch(`/api/comments_table?serviceCategory=${encodeURIComponent(serviceCategory)}&state=${encodeURIComponent(state)}`);
        const data = await response.json();
        return { state, comment: data.length > 0 ? data[0].comment : null };
      });

      const commentsResults = await Promise.all(commentsPromises);
      setComments(commentsResults.filter((c) => c.comment !== null));
    } catch (error) {
      console.error("Error fetching comments:", error);
      setComments([]);
    }
  };

  // Update the useEffect to fetch comments for all states
  useEffect(() => {
    console.log("Selected Service Category:", selectedServiceCategory); // Log selectedServiceCategory
    console.log("Selected States:", selectedState); // Log selectedState

    if (selectedServiceCategory && selectedState.length > 0) {
      console.log("Triggering fetchComments for:", { selectedServiceCategory, selectedState }); // Log when fetchComments is triggered
      fetchComments(selectedServiceCategory, [selectedState]);
    } else {
      console.log("Skipping fetchComments - missing required parameters"); // Log if parameters are missing
      setComments([]);
    }
  }, [selectedServiceCategory, selectedState]);

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
        {dataLoading && (
          <div className="flex justify-center items-center h-64">
            <FaSpinner className="animate-spin h-12 w-12 text-blue-500" />
            <p className="ml-4 text-gray-600">Loading data...</p>
          </div>
        )}

        {!dataLoading && (
          <>
            {/* Filters */}
            <div className="mb-6 sm:mb-8">
              {filterSets.map((filterSet, index) => (
                <div key={index} className="p-4 sm:p-6 bg-white rounded-xl shadow-lg mb-4 relative">
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
                        options={serviceCategories
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
                            ...filterSet.stateOptions
                          ]}
                          value={
                            filterSet.states.length === filterSet.stateOptions.length && index === 0
                              ? { value: "ALL_STATES", label: "All States" }
                              : filterSet.states.length > 0
                                ? { value: filterSet.states[0], label: filterSet.states[0] }
                                : null
                          }
                          onChange={(option) => handleStateChange(index, option)}
                          placeholder="Select State"
                          isSearchable
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
                          options={filterSet.serviceCodeOptions.map((code) => ({ value: code, label: code }))}
                          value={filterSet.serviceCode ? { value: filterSet.serviceCode, label: filterSet.serviceCode } : null}
                          onChange={(option) => handleServiceCodeChange(index, option?.value || "")}
                          placeholder="Select Service Code"
                          isSearchable
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
                          options={programs.map(program => ({ value: program, label: program }))}
                          value={selectedProgram ? { value: selectedProgram, label: selectedProgram } : null}
                          onChange={(option) => setSelectedProgram(option?.value || "")}
                          placeholder="Select Program"
                          isSearchable
                          isDisabled={programs.length === 0}
                          className={`react-select-container ${programs.length === 0 ? 'opacity-50' : ''}`}
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
                          options={locationRegions.map(region => ({ value: region, label: region }))}
                          value={selectedLocationRegion ? { value: selectedLocationRegion, label: selectedLocationRegion } : null}
                          onChange={(option) => setSelectedLocationRegion(option?.value || "")}
                          placeholder="Select Location/Region"
                          isSearchable
                          isDisabled={locationRegions.length === 0}
                          className={`react-select-container ${locationRegions.length === 0 ? 'opacity-50' : ''}`}
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
                          options={modifiers}
                          value={selectedModifier ? { value: selectedModifier, label: selectedModifier } : null}
                          onChange={(option) => setSelectedModifier(option?.value || "")}
                          placeholder="Select Modifier"
                          isSearchable
                          isDisabled={modifiers.length === 0}
                          className={`react-select-container ${modifiers.length === 0 ? 'opacity-50' : ''}`}
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
                          options={providerTypes.map(type => ({ value: type, label: type }))}
                          value={selectedProviderType ? { value: selectedProviderType, label: selectedProviderType } : null}
                          onChange={(option) => setSelectedProviderType(option?.value || "")}
                          placeholder="Select Provider Type"
                          isSearchable
                          isDisabled={providerTypes.length === 0}
                          className={`react-select-container ${providerTypes.length === 0 ? 'opacity-50' : ''}`}
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
            {useMemo(() => {
              return filterSets.every(filterSet => 
                filterSet.serviceCategory && 
                filterSet.states.length > 0 && 
                filterSet.serviceCode
              );
            }, [filterSets]) && (
              <div className="mb-8 p-6 bg-white rounded-xl shadow-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Highest Rate */}
                  <div className="flex items-center space-x-4 p-4 bg-green-100 rounded-lg">
                    <FaArrowUp className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-sm text-gray-500">Highest Rate of Selected States</p>
                      <p className="text-xl font-semibold text-gray-800">${rates.length > 0 ? Math.max(...rates).toFixed(2) : '0.00'}</p>
                    </div>
                  </div>

                  {/* Lowest Rate */}
                  <div className="flex items-center space-x-4 p-4 bg-red-50 rounded-lg">
                    <FaArrowDown className="h-8 w-8 text-red-500" />
                    <div>
                      <p className="text-sm text-gray-500">Lowest Rate of Selected States</p>
                      <p className="text-xl font-semibold text-gray-800">${rates.length > 0 ? Math.min(...rates).toFixed(2) : '0.00'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Graph Component */}
            {useMemo(() => {
              return filterSets.every(filterSet => 
                filterSet.serviceCategory && 
                filterSet.states.length > 0 && 
                filterSet.serviceCode
              );
            }, [filterSets]) && (isAllStatesSelected || Object.values(selectedTableRows).some(selections => selections.length > 0)) && (
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

                {isAllStatesSelected && (
                  <div className="mb-6 p-6 bg-blue-50 rounded-xl shadow-lg">
                    <div className="flex items-center space-x-4">
                      <FaChartLine className="h-6 w-6 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          You've selected all states. The chart below displays the <strong>unweighted average rate</strong> for the selected service code across each state.
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          <strong>Note:</strong> The rates displayed are the current rates as of the latest available data. Rates are subject to change based on updates from state programs.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-white rounded-xl shadow-lg">
                  {/* Toggle and Sort Section */}
                  <div className="flex justify-center items-center mb-4 space-x-4">
                    {/* Toggle Switch */}
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

                    {/* Sorting Dropdown */}
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700">Sort:</label>
                      <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value as 'default' | 'asc' | 'desc')}
                        className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      >
                        <option value="default">Default</option>
                        <option value="desc">High to Low</option>
                        <option value="asc">Low to High</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="w-full mx-auto">
                    {chartLoading ? (
                      <div className="flex justify-center items-center h-48 sm:h-64">
                        <FaSpinner className="animate-spin h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
                        <p className="ml-3 sm:ml-4 text-sm sm:text-base text-gray-600">Generating chart...</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <div className="min-w-[500px] sm:min-w-0">
                          <ChartWithErrorBoundary />
                          <CalculationDetails />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Prompt to select data when no selections are made */}
            {useMemo(() => {
              return filterSets.every(filterSet => 
                filterSet.serviceCategory && 
                filterSet.states.length > 0 && 
                filterSet.serviceCode
              );
            }, [filterSets]) && !isAllStatesSelected && Object.values(selectedTableRows).every(selections => selections.length === 0) && (
              <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-white rounded-xl shadow-lg text-center">
                <div className="flex justify-center items-center mb-2 sm:mb-3">
                  <FaChartBar className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
                </div>
                <p className="text-sm sm:text-base text-gray-600 font-medium">
                  Select data from the tables below to generate the rate comparison visualization
                </p>
              </div>
            )}

            {/* Data Table - Show when filters are active and "All States" is not selected */}
            {useMemo(() => {
              return filterSets.map((filterSet, filterIndex) => {
                // Add a heading for each filter set
                const filterSetHeading = (
                  <h3 className="text-lg font-bold text-blue-900 mb-2">
                    Results for Filter Set #{filterIndex + 1}
                  </h3>
                );
                // Filter the groupedByState for this filter set
                if (!filterSet.serviceCategory || filterSet.states.length === 0 || !filterSet.serviceCode) return null;
                const relevantStates = filterSet.states;
                return relevantStates.map((state, stateIdx) => {
                  const stateData = groupedByState[state] || [];
                  const selectedModifierKeys = selectedTableRows[state] || [];
                  if (stateData.length === 0) return null;
                  return (
                    <div key={filterIndex + '-' + state} className="mb-8 p-6 bg-white rounded-xl shadow-lg">
                      {stateIdx === 0 && filterSetHeading}
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-800">{state}</h2>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              // Select all rows for this state
                              const allModifierKeys = stateData.map(item => 
                                [
                                  item.modifier_1?.trim().toUpperCase() || '',
                                  item.modifier_2?.trim().toUpperCase() || '',
                                  item.modifier_3?.trim().toUpperCase() || '',
                                  item.modifier_4?.trim().toUpperCase() || '',
                                  item.program?.trim().toUpperCase() || '',
                                  item.location_region?.trim().toUpperCase() || ''
                                ].join('|')
                              );
                              setSelectedTableRows(prev => ({
                                ...prev,
                                [state]: allModifierKeys
                              }));
                            }}
                            className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-1"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span>Select All</span>
                          </button>
                          <button
                            onClick={() => {
                              // Deselect all rows for this state
                              setSelectedTableRows(prev => ({
                                ...prev,
                                [state]: []
                              }));
                            }}
                            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-1"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            <span>Deselect All</span>
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mb-4">
                        <strong>Note:</strong> The rates displayed are the current rates as of the latest available data. Rates are subject to change based on updates from state programs.
                      </p>
                      {stateData.length > 0 && (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Select
                                </th>
                                {getVisibleColumns.service_category && (
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service Category</th>
                                )}
                                {getVisibleColumns.service_code && (
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service Code</th>
                                )}
                                {getVisibleColumns.service_description && (
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service Description</th>
                                )}
                                {getVisibleColumns.program && (
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Program</th>
                                )}
                                {getVisibleColumns.location_region && (
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location Region</th>
                                )}
                                {getVisibleColumns.modifier_1 && (
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modifier 1</th>
                                )}
                                {getVisibleColumns.modifier_2 && (
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modifier 2</th>
                                )}
                                {getVisibleColumns.modifier_3 && (
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modifier 3</th>
                                )}
                                {getVisibleColumns.modifier_4 && (
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modifier 4</th>
                                )}
                                {getVisibleColumns.duration_unit && (
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration Unit</th>
                                )}
                                {getVisibleColumns.rate && (
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                                )}
                                {getVisibleColumns.rate_per_hour && (
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hourly Equivalent Rate</th>
                                )}
                                {/* Add Provider Type Column */}
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider Type</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {stateData.map((item, index) => {
                                const currentModifierKey = [
                                  item.modifier_1?.trim().toUpperCase() || '',
                                  item.modifier_2?.trim().toUpperCase() || '',
                                  item.modifier_3?.trim().toUpperCase() || '',
                                  item.modifier_4?.trim().toUpperCase() || '',
                                  item.program?.trim().toUpperCase() || '',
                                  item.location_region?.trim().toUpperCase() || ''
                                ].join('|');
                                const isSelected = selectedModifierKeys.includes(currentModifierKey);

                                return (
                                  <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="flex items-center space-x-2">
                                        {isSelected && (
                                          <button
                                    onClick={() => handleTableRowSelection(state, item)}
                                            className="text-gray-400 hover:text-red-500 transition-colors"
                                            title="Deselect"
                                  >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleTableRowSelection(state, item)}
                                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                            isSelected 
                                              ? 'bg-blue-500 border-blue-500 text-white' 
                                              : 'border-gray-300 hover:border-blue-500'
                                          }`}
                                        >
                                          {isSelected && (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                          )}
                                        </button>
                                      </div>
                                    </td>
                                    {getVisibleColumns.service_category && (
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {formatText(item.service_category)}
                                      </td>
                                    )}
                                    {getVisibleColumns.service_code && (
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {formatText(item.service_code)}
                                      </td>
                                    )}
                                    {getVisibleColumns.service_description && (
                                      <td 
                                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 truncate"
                                        title={item.service_description || ''}
                                      >
                                        {formatText(item.service_description)}
                                      </td>
                                    )}
                                    {getVisibleColumns.program && (
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {formatText(item.program)}
                                      </td>
                                    )}
                                    {getVisibleColumns.location_region && (
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {formatText(item.location_region)}
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
                                    {getVisibleColumns.duration_unit && (
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {formatText(item.duration_unit)}
                                      </td>
                                    )}
                                    {getVisibleColumns.rate && (
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {formatText(item.rate)}
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
                                          return 'N/A'; // Simplified for non-convertible units
                                        })()}
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
                    </div>
                  );
                });
              });
            }, [filterSets, groupedByState, selectedTableRows, getVisibleColumns, handleTableRowSelection, formatText])}
          </>
        )}
      </div>
    </AppLayout>
  );
}