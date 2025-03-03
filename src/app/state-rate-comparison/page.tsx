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

export default function StatePaymentComparison() {
  const [data, setData] = useState<ServiceData[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [chartError, setChartError] = useState<string | null>(null);
  const [tableError, setTableError] = useState<string | null>(null);

  // Filters
  const [selectedServiceCategory, setSelectedServiceCategory] = useState("");
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedServiceCode, setSelectedServiceCode] = useState("");

  // Unique filter options
  const [serviceCategories, setServiceCategories] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [serviceCodes, setServiceCodes] = useState<string[]>([]);

  // Add state for selected modifiers
  const [selectedModifiers, setSelectedModifiers] = useState<{[key: string]: string}>({});

  // Check if we should show checkboxes
  const showCheckboxes = selectedServiceCategory && selectedServiceCode && selectedStates.length > 0;

  // Update the areFiltersActive check
  const areAllFiltersApplied = selectedServiceCategory && selectedStates.length > 0 && selectedServiceCode;

  const selectId = useId();

  const [showApplyToAllPrompt, setShowApplyToAllPrompt] = useState(false);
  const [lastSelectedModifier, setLastSelectedModifier] = useState<string | null>(null);

  // Change the state type to handle multiple selections
  const [selectedTableRows, setSelectedTableRows] = useState<{[state: string]: string[]}>({});

  // Add this near other state declarations
  const [showRatePerHour, setShowRatePerHour] = useState(false);

  // Add this state variable near other state declarations
  const [isAllStatesSelected, setIsAllStatesSelected] = useState(false);

  // Add this state variable near other state declarations
  const [globalModifierOrder, setGlobalModifierOrder] = useState<Map<string, number>>(new Map());

  // Add this state variable near other state declarations
  const [globalSelectionOrder, setGlobalSelectionOrder] = useState<Map<string, number>>(new Map());

  // Add this near other state declarations
  const [sortOrder, setSortOrder] = useState<'default' | 'asc' | 'desc'>('default');

  useEffect(() => {
    setInitialLoading(true);
    setFetchError(null);
    fetch("/api/state-payment-comparison")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data: ServiceData[]) => {
        setData(data);
        extractFilters(data);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        setFetchError("Failed to load data. Please try again.");
      })
      .finally(() => setInitialLoading(false));
  }, []);

  // Extract unique filter options
  const extractFilters = (data: ServiceData[]) => {
    setServiceCategories([...new Set(data.map((item) => item.service_category))]);
  };

  // Update filter handlers to remove URL updates
  const handleServiceCategoryChange = (category: string) => {
    setSelectedServiceCategory(category);
    setSelectedStates([]);
    setSelectedServiceCode("");
    setFilterLoading(true);

    // Filter states based on the selected category
    const filteredStates = data
      .filter((item) => item.service_category === category)
      .map((item) => item.state_name);
    
    // Set states and ensure unique values
    setStates([...new Set(filteredStates)]);
    setServiceCodes([]);
    setFilterLoading(false);
  };

  const handleStateChange = (selectedOptions: any) => {
    let selectedStatesArray: string[];
    
    // If "Select All States" is selected
    if (selectedOptions.find((s: any) => s.value === "all")) {
      selectedStatesArray = [...new Set(data
        .filter((item) => item.service_category === selectedServiceCategory)
        .map((item) => item.state_name))];
      setSelectedStates(selectedStatesArray);
      setIsAllStatesSelected(true);
    } else {
      selectedStatesArray = selectedOptions.map((s: any) => s.value);
      setSelectedStates(selectedStatesArray);
      setIsAllStatesSelected(false);
    }
    
    // Reset service code filter and clear the select component value
    setSelectedServiceCode("");
    setFilterLoading(true);

    if (selectedServiceCategory) {
      setTimeout(() => {
        // Get all service codes for the selected states (or all states if "All States" is selected)
        const filteredCodes = data
          .filter((item) => 
            (isAllStatesSelected || selectedStatesArray.includes(item.state_name)) &&
            item.service_category === selectedServiceCategory
          )
          .map((item) => item.service_code);
        setServiceCodes([...new Set(filteredCodes)]);
        setFilterLoading(false);
      }, 0);
    }
  };

  const handleServiceCodeChange = (code: string) => {
    setSelectedServiceCode(code);
    setFilterLoading(true);
    setFilterLoading(false);
  };

  // First, get all unique combinations and their latest rates
  const latestRatesMap = new Map<string, ServiceData>();
  data.forEach((item) => {
    const key = `${item.state_name}|${item.service_category}|${item.service_code}|${item.modifier_1}|${item.modifier_2}|${item.modifier_3}|${item.modifier_4}`;
    const currentDate = new Date(item.rate_effective_date);
    const existing = latestRatesMap.get(key);
    
    if (!existing || currentDate > new Date(existing.rate_effective_date)) {
      latestRatesMap.set(key, item);
    }
  });

  // Convert map to array of latest rates
  const latestRates = Array.from(latestRatesMap.values());

  // Then filter based on selections
  const filteredData = latestRates.filter((item) => {
    return (
      (!selectedServiceCategory || item.service_category === selectedServiceCategory) &&
      (!selectedStates.length || selectedStates.includes(item.state_name)) &&
      (!selectedServiceCode || item.service_code === selectedServiceCode)
    );
  });

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

  // Modify the processedData calculation
  const processedData: { [state: string]: { [modifierKey: string]: number } } = {};

  if (isAllStatesSelected && selectedServiceCode) {
    // Calculate average rates for each state when "Select All States" is chosen
    const stateAverages = new Map<string, number>();
    const stateCounts = new Map<string, number>();

    filteredData.forEach(item => {
      const rate = showRatePerHour 
        ? parseFloat(item.rate_per_hour?.replace("$", "") || "0")
        : parseFloat(item.rate?.replace("$", "") || "0");
      
      if (!stateAverages.has(item.state_name)) {
        stateAverages.set(item.state_name, 0);
        stateCounts.set(item.state_name, 0);
      }
      stateAverages.set(item.state_name, stateAverages.get(item.state_name)! + rate);
      stateCounts.set(item.state_name, stateCounts.get(item.state_name)! + 1);
    });

    // Calculate the average for each state
    stateAverages.forEach((sum, state) => {
      const count = stateCounts.get(state)!;
      processedData[state] = {
        'average': sum / count
      };
    });
  } else {
    // Original logic for individual state selection
    filteredData.forEach(item => {
      const currentModifier = `${item.modifier_1}|${item.modifier_2}|${item.modifier_3}|${item.modifier_4}`;
      const stateSelections = selectedTableRows[item.state_name] || [];
      
      if (stateSelections.includes(currentModifier)) {
        const rate = showRatePerHour 
          ? parseFloat(item.rate_per_hour?.replace("$", "") || "0")
          : parseFloat(item.rate?.replace("$", "") || "0");
        if (!processedData[item.state_name]) {
          processedData[item.state_name] = {};
        }
        processedData[item.state_name][currentModifier] = rate;
      }
    });
  }

  // ✅ Prepare ECharts Data
  const echartOptions = useMemo(() => {
    // Get all unique states
    let states = Object.keys(processedData);

    // Sort states based on the selected order
    if (sortOrder !== 'default') {
      states = states.sort((a, b) => {
        const rateA = processedData[a]['average'] || 0;
        const rateB = processedData[b]['average'] || 0;
        return sortOrder === 'asc' ? rateA - rateB : rateB - rateA;
      });
    }

    // Create series for each modifier combination
    const series: echarts.SeriesOption[] = [];
    
    if (isAllStatesSelected) {
      // Single series for average rates
      series.push({
        name: 'Average Rate',
        type: 'bar',
        barGap: '20%',
        barCategoryGap: '20%',
        data: states.map(state => processedData[state]['average'] || null),
        label: {
          show: false
        },
        itemStyle: {
          color: '#36A2EBB3'
        }
      });
    } else {
      // Get all selected modifier combinations across all states
      const allSelections: { state: string, modifierKey: string }[] = [];
      Object.entries(selectedTableRows).forEach(([state, selections]) => {
        selections.forEach(modifierKey => {
          allSelections.push({ state, modifierKey });
        });
      });

      // Create a series for each selection
      allSelections.forEach(({ state, modifierKey }, index) => {
        series.push({
          name: `${state} - ${modifierKey}`,
          type: 'bar',
          barGap: '0%',
          barCategoryGap: '20%',
          data: states.map(s => s === state ? processedData[state][modifierKey] || null : null),
          label: {
            show: false
          },
          itemStyle: {
            color: `${colorSequence[index % colorSequence.length]}B3`
          }
        });
      });
    }

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'item', // Changed to 'item' for individual bar hover
        axisPointer: {
          type: 'shadow'
        },
        formatter: (params: any) => {
          if (isAllStatesSelected) {
            // For "All States" selection
            const state = params.name;
            const rate = params.value;
            return `State: ${state}<br>Average Rate: $${rate?.toFixed(2) || '0.00'}`;
          } else {
            // For individual state selection
            const state = params.name;
            const seriesName = params.seriesName;
            const modifierKey = seriesName.split(' - ')[1];
            const rate = params.value;

            // Find the corresponding data item
            const item = filteredData.find(d => 
              d.state_name === state && 
              `${d.modifier_1}|${d.modifier_2}|${d.modifier_3}|${d.modifier_4}` === modifierKey
            );

            if (!item) {
              return `State: ${state}<br>Rate: $${rate?.toFixed(2) || '0.00'}`;
            }

            // Build modifier details
            const modifierDetails = [
              item.modifier_1 ? `${item.modifier_1} - ${item.modifier_1_details || 'No details'}` : null,
              item.modifier_2 ? `${item.modifier_2} - ${item.modifier_2_details || 'No details'}` : null,
              item.modifier_3 ? `${item.modifier_3} - ${item.modifier_3_details || 'No details'}` : null,
              item.modifier_4 ? `${item.modifier_4} - ${item.modifier_4_details || 'No details'}` : null
            ].filter(Boolean).join('<br>');

            // Additional details
            const additionalDetails = [
              `<b>Rate:</b> $${rate?.toFixed(2) || '0.00'}`,
              item.service_code ? `<b>Service Code:</b> ${item.service_code}` : null,
              item.program ? `<b>Program:</b> ${item.program}` : null,
              item.location_region ? `<b>Location Region:</b> ${item.location_region}` : null
            ].filter(Boolean).join('<br>');

            return [
              `<b>State:</b> ${state}`,
              modifierDetails ? `<b>Modifier Details:</b><br>${modifierDetails}` : '',
              additionalDetails
            ].filter(Boolean).join('<br>');
          }
        }
      },
      xAxis: {
        type: 'category',
        data: states,
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
        bottom: isAllStatesSelected ? '10%' : '15%', // More space for "All States" chart
        top: '5%'
      },
      toolbox: {
        show: true,
        feature: {
          saveAsImage: {
            show: true,
            title: 'Save as Image',
            backgroundColor: 'transparent'
          }
        }
      }
    };

    return option;
  }, [processedData, filteredData, isAllStatesSelected, showRatePerHour, selectedTableRows, sortOrder]);

  // Update chart options to include modifier selection in tooltip
  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const state = context.label;
            const rate = context.raw;
            const selectedModifierKey = selectedModifiers[state];
            const modifiers = selectedModifierKey?.split('|').filter(mod => mod && mod !== 'null') || [];
            
            return [
              `Rate: $${rate.toFixed(2)}`,
              `Modifiers: ${modifiers.length > 0 ? modifiers.join(', ') : 'None'}`
            ];
          }
        }
      }
    },
    scales: {
      x: {
        ticks: { maxRotation: 45, minRotation: 45, font: { size: 10 } },
      },
      y: {
        beginAtZero: true,
        title: { display: true, text: "Rate ($ per hour)" },
      },
    },
  };

  // Reset all filters
  const resetFilters = () => {
    setSelectedServiceCategory("");
    setSelectedStates([]);
    setSelectedServiceCode("");
    setServiceCodes([]);
  };

  // Calculate comparison metrics
  const rates = Object.values(processedData)
    .flatMap(rates => Object.values(rates))
    .filter(rate => rate > 0);

  const maxRate = Math.max(...rates);
  const minRate = Math.min(...rates);
  const avgRate = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;

  // Calculate national average
  const nationalAverage = useMemo(() => {
    if (!selectedServiceCategory || !selectedServiceCode) return 0;

    const rates = data
      .filter(item => 
        item.service_category === selectedServiceCategory &&
        item.service_code === selectedServiceCode
      )
      .map(item => 
        parseFloat(
          (showRatePerHour ? item.rate_per_hour : item.rate)?.replace("$", "") || "0"
        )
      )
      .filter(rate => rate > 0);

    if (rates.length === 0) return 0;

    const sum = rates.reduce((sum, rate) => sum + rate, 0);
    return (sum / rates.length).toFixed(2);
  }, [data, selectedServiceCategory, selectedServiceCode, showRatePerHour]);

  // Update ChartWithErrorBoundary component
  const ChartWithErrorBoundary = () => {
    try {
      return (
        <ReactECharts
          option={echartOptions}
          style={{ 
            height: isAllStatesSelected ? '500px' : '400px', // Taller for "All States"
            width: '100%' 
          }}
          onEvents={{
            click: (params: any) => {
              if (params.componentType === 'series') {
                const state = params.name;
                const rate = params.value;
                alert(`State: ${state}\nRate: $${rate.toFixed(2)}`);
              }
            }
          }}
        />
      );
    } catch (error) {
      setChartError("Failed to render chart. Please check your data.");
      return null;
    }
  };

  // Add error display component
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

  // Update the handleTableRowSelection function to track global selection order
  const handleTableRowSelection = (state: string, modifierKey: string) => {
    setSelectedTableRows(prev => {
      const currentSelections = prev[state] || [];
      const newSelections = currentSelections.includes(modifierKey)
        ? currentSelections.filter(key => key !== modifierKey)
        : [...currentSelections, modifierKey];
      
      // Update global selection order
      if (!currentSelections.includes(modifierKey)) {
        setGlobalSelectionOrder(prevOrder => {
          const newOrder = new Map(prevOrder);
          newOrder.set(`${state}|${modifierKey}`, prevOrder.size);
          return newOrder;
        });
      }

      return {
        ...prev,
        [state]: newSelections
      };
    });
  };

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
        <div className="flex flex-col items-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-5xl md:text-6xl text-[#012C61] font-lemonMilkRegular uppercase mb-3 sm:mb-4 text-center">
            State Rate Comparison
          </h1>
          <button
            onClick={resetFilters}
            className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base bg-[#012C61] text-white rounded-lg hover:bg-blue-800 transition-colors"
          >
            Reset All Filters
          </button>
        </div>

        {/* Loading State */}
        {initialLoading && (
          <div className="flex justify-center items-center h-64">
            <FaSpinner className="animate-spin h-12 w-12 text-blue-500" />
            <p className="ml-4 text-gray-600">Loading data...</p>
          </div>
        )}

        {!initialLoading && (
          <>
            {/* Filters */}
            <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-white rounded-xl shadow-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                {/* Service Category Selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Service Line</label>
                  <select 
                    value={selectedServiceCategory} 
                    onChange={(e) => handleServiceCategoryChange(e.target.value)} 
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  >
                    <option value="">Select Service Line</option>
                    {serviceCategories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                {/* State Selector */}
                {selectedServiceCategory && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">States</label>
                    <Select
                      isMulti
                      options={[
                        { value: "all", label: "Select All States" },
                        ...states.map((state) => ({ 
                          value: state, 
                          label: state 
                        }))
                      ]}
                      value={isAllStatesSelected 
                        ? [{ value: "all", label: "All States" }]
                        : selectedStates.map(state => ({
                            value: state,
                            label: state
                          }))
                      }
                      onChange={(selectedOptions) => {
                        handleStateChange(selectedOptions || []);
                      }}
                      className="react-select-container"
                      classNamePrefix="react-select"
                      placeholder="Select States"
                      styles={{
                        control: (base) => ({
                          ...base,
                          minHeight: '38px',
                          borderRadius: '0.5rem',
                          borderColor: '#d1d5db',
                          '&:hover': {
                            borderColor: '#3b82f6'
                          }
                        })
                      }}
                    />
                  </div>
                )}

                {/* Service Code Selector */}
                {selectedServiceCategory && (selectedStates.length > 0 || isAllStatesSelected) && serviceCodes.length > 0 ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Service Code</label>
                    <Select
                      instanceId="service-code-select"
                      options={serviceCodes.map(code => ({ value: code, label: code }))}
                      value={selectedServiceCode ? { value: selectedServiceCode, label: selectedServiceCode } : null}
                      onChange={(selectedOption) => handleServiceCodeChange(selectedOption?.value || '')}
                      placeholder="Select Service Code"
                      isSearchable
                      className="react-select-container"
                      classNamePrefix="react-select"
                      styles={{
                        control: (base) => ({
                          ...base,
                          minHeight: '38px',
                          borderRadius: '0.5rem',
                          borderColor: '#d1d5db',
                          '&:hover': {
                            borderColor: '#3b82f6'
                          }
                        })
                      }}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Service Code</label>
                    <div className="text-gray-400 text-sm">
                      {selectedServiceCategory ? "Select states to see available service codes" : "Select a service line first"}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Comparison Metrics */}
            {areAllFiltersApplied && (
              <div className="mb-8 p-6 bg-white rounded-xl shadow-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-lg">
                    <FaChartLine className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-sm text-gray-500">National Average Rate</p>
                      <p className="text-xl font-semibold text-gray-800">${nationalAverage}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 p-4 bg-green-50 rounded-lg">
                    <FaArrowUp className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-sm text-gray-500">Highest Rate of Selected States</p>
                      <p className="text-xl font-semibold text-gray-800">${rates.length > 0 ? Math.max(...rates).toFixed(2) : '0.00'}</p>
                    </div>
                  </div>
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

            {/* Chart Section - Only show when selections are made */}
            {areAllFiltersApplied && (isAllStatesSelected || Object.values(selectedTableRows).some(selections => selections.length > 0)) && (
              <>
                {isAllStatesSelected && (
                  <div className="mb-6 p-6 bg-blue-50 rounded-xl shadow-lg">
                    <div className="flex items-center space-x-4">
                      <FaChartLine className="h-6 w-6 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          You've selected all states. The chart below displays the average rate for the selected service code across each state.
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          This provides a comprehensive view of the average rates across all available states for your selected service.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-white rounded-xl shadow-lg">
                  {/* Toggle Switch */}
                  <div className="flex justify-center items-center mb-4 space-x-4">
                    <div className="flex items-center space-x-4 bg-gray-100 p-2 rounded-full">
                      <span className={`text-sm font-medium ${!showRatePerHour ? 'text-blue-600' : 'text-gray-500'}`}>
                        Base Rate
                      </span>
                      <button
                        onClick={() => setShowRatePerHour(!showRatePerHour)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          showRatePerHour ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            showRatePerHour ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className={`text-sm font-medium ${showRatePerHour ? 'text-blue-600' : 'text-gray'}`}>
                        Rate Per Hour
                      </span>
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
                        <option value="asc">Low to High</option>
                        <option value="desc">High to Low</option>
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
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Prompt to select data when no selections are made */}
            {areAllFiltersApplied && !isAllStatesSelected && Object.values(selectedTableRows).every(selections => selections.length === 0) && (
              <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-white rounded-xl shadow-lg text-center">
                <div className="flex justify-center items-center mb-2 sm:mb-3">
                  <FaChartBar className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
                </div>
                <p className="text-sm sm:text-base text-gray-600 font-medium">
                  Select data from the tables below to generate the rate comparison visualization
                </p>
              </div>
            )}

            {/* Data Table - Show when filters are active */}
            {areAllFiltersApplied && !isAllStatesSelected && (
              <>
                {Object.entries(groupedByState).map(([state, stateData]) => {
                  const selectedModifierKeys = selectedTableRows[state] || [];
                  
                  return (
                    <div key={state} className="mb-8 p-6 bg-white rounded-xl shadow-lg">
                      <h2 className="text-xl font-semibold mb-4 text-gray-800">{state} Data</h2>
                      {tableLoading ? (
                        <div className="flex justify-center items-center h-32">
                          <FaSpinner className="animate-spin h-8 w-8 text-blue-500" />
                          <p className="ml-4 text-gray-600">Loading table data...</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-lg" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                          <table className="min-w-full bg-white">
                            <thead className="bg-gray-50 sticky top-0">
                              <tr>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Select</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Service Category</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Service Code</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Program</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Location Region</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 1</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 2</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 3</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 4</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Rate per Hour</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Effective Date</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {stateData.map((item, index) => {
                                const currentModifierKey = `${item.modifier_1}|${item.modifier_2}|${item.modifier_3}|${item.modifier_4}`;
                                const isSelected = selectedModifierKeys.includes(currentModifierKey);
                                
                                return (
                                  <tr 
                                    key={index} 
                                    onClick={() => handleTableRowSelection(state, currentModifierKey)}
                                    className={`${
                                      selectedTableRows[state]?.includes(currentModifierKey)
                                        ? 'bg-blue-50 cursor-pointer'
                                        : 'hover:bg-gray-50 cursor-pointer'
                                    } transition-colors`}
                                  >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="flex items-center">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                          selectedTableRows[state]?.includes(currentModifierKey)
                                            ? 'border-blue-500 bg-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.2)]' 
                                            : 'border-gray-300 hover:border-gray-400'
                                        }`}>
                                          {selectedTableRows[state]?.includes(currentModifierKey) && (
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
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.service_category}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.service_code}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.program || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.location_region || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {item.modifier_1 ? `${item.modifier_1} - ${item.modifier_1_details || 'No details'}` : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {item.modifier_2 ? `${item.modifier_2} - ${item.modifier_2_details || 'No details'}` : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {item.modifier_3 ? `${item.modifier_3} - ${item.modifier_3_details || 'No details'}` : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {item.modifier_4 ? `${item.modifier_4} - ${item.modifier_4_details || 'No details'}` : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.rate}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {item.rate_per_hour || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(item.rate_effective_date).toLocaleDateString()}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}