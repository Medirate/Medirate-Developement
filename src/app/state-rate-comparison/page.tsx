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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

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

  const [needsModifierSelection, setNeedsModifierSelection] = useState<string[]>([]);
  const [currentSelectionState, setCurrentSelectionState] = useState<string>("");
  const [showModifierModal, setShowModifierModal] = useState(false);

  // Update the areFiltersActive check
  const areAllFiltersApplied = selectedServiceCategory && selectedStates.length > 0 && selectedServiceCode;

  const selectId = useId();

  const [showApplyToAllPrompt, setShowApplyToAllPrompt] = useState(false);
  const [lastSelectedModifier, setLastSelectedModifier] = useState<string | null>(null);

  // Add state for selected table rows
  const [selectedTableRows, setSelectedTableRows] = useState<{[state: string]: string}>({});

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

    const filteredStates = data
      .filter((item) => item.service_category === category)
      .map((item) => item.state_name);
    setStates([...new Set(filteredStates)]);
    setServiceCodes([]);
    setFilterLoading(false);
  };

  const handleStateChange = (states: any) => {
    let selectedStatesArray: string[];
    
    // If "Select All States" is selected, choose all available states
    if (states.find((s: any) => s.value === "all")) {
      selectedStatesArray = [...new Set(data
        .filter((item) => item.service_category === selectedServiceCategory)
        .map((item) => item.state_name))];
      setSelectedStates(selectedStatesArray);
    } else {
      selectedStatesArray = states.map((s: any) => s.value);
      setSelectedStates(selectedStatesArray);
    }
    
    // Reset service code filter and clear the select component value
    setSelectedServiceCode("");
    setServiceCodes([]); // Clear the available service codes
    setFilterLoading(true);

    if (selectedServiceCategory) {
      setTimeout(() => {
        const filteredCodes = data
          .filter((item) => selectedStatesArray.includes(item.state_name) && 
            item.service_category === selectedServiceCategory)
          .map((item) => item.service_code);
        setServiceCodes([...new Set(filteredCodes)]);
        setFilterLoading(false);
      }, 0);
    }
  };

  const handleServiceCodeChange = (code: string) => {
    setSelectedServiceCode(code);
    setFilterLoading(true);

    // Check which states have multiple modifier combinations
    const statesWithConflicts = new Set<string>();
    data.forEach(item => {
      if (item.service_code === code && selectedStates.includes(item.state_name)) {
        statesWithConflicts.add(item.state_name);
      }
    });

    if (statesWithConflicts.size > 0) {
      setNeedsModifierSelection(Array.from(statesWithConflicts));
      setCurrentSelectionState(Array.from(statesWithConflicts)[0]);
      setShowModifierModal(true);
    }
    setFilterLoading(false);
  };

  // Handle modifier selection for a state
  const handleModifierSelection = (state: string, selectedItem: ServiceData) => {
    const modifierKey = `${selectedItem.modifier_1}|${selectedItem.modifier_2}|${selectedItem.modifier_3}|${selectedItem.modifier_4}`;
    setSelectedModifiers(prev => ({
      ...prev,
      [state]: modifierKey
    }));
    
    // Set the initial selected table row
    setSelectedTableRows(prev => ({
      ...prev,
      [state]: modifierKey
    }));

    // Move to the next state if there are more to select
    const remainingStates = needsModifierSelection.filter(s => s !== state);
    if (remainingStates.length > 0) {
      setNeedsModifierSelection(remainingStates);
      setCurrentSelectionState(remainingStates[0]);
    } else {
      setShowModifierModal(false);
    }
  };

  // Handle table row selection
  const handleTableRowSelection = (state: string, modifierKey: string) => {
    setSelectedTableRows(prev => ({
      ...prev,
      [state]: modifierKey
    }));
    setSelectedModifiers(prev => ({
      ...prev,
      [state]: modifierKey
    }));
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

  // Update processedData to use table row selections
  const processedData: { [state: string]: number[] } = {};
  filteredData.forEach(item => {
    const selectedModifier = selectedTableRows[item.state_name];
    const currentModifier = `${item.modifier_1}|${item.modifier_2}|${item.modifier_3}|${item.modifier_4}`;
    
    if (!selectedModifier || selectedModifier === currentModifier) {
      const rate = parseFloat(item.rate?.replace("$", "")) || 0;
      processedData[item.state_name] = [rate];
    }
  });

  // ✅ Prepare Chart Data
  const chartData = {
    labels: Object.keys(processedData),
    datasets: [
      {
        label: "Rate",
        data: Object.values(processedData).map(rates => rates[0]),
        backgroundColor: "rgba(70, 130, 209, 0.7)",
      },
    ],
  };

  // Update chart options to include modifier selection in tooltip
  const options = {
    responsive: true,
    onClick: (event: any, elements: any) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const state = chartData.labels[index];
        const rate = chartData.datasets[0].data[index];
        alert(`State: ${state}\nRate: $${rate.toFixed(2)}`);
      }
    },
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
  const rates = Object.values(processedData).map(rates => rates[0]);
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
      .map(item => parseFloat(item.rate?.replace("$", "") || "0"))
      .filter(rate => rate > 0); // Exclude invalid rates

    if (rates.length === 0) return 0;

    const sum = rates.reduce((sum, rate) => sum + rate, 0);
    return (sum / rates.length).toFixed(2);
  }, [data, selectedServiceCategory, selectedServiceCode]);

  // Add error boundary for chart
  const ChartWithErrorBoundary = () => {
    try {
      return <Bar data={chartData} options={options} />;
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

        {/* Updated heading with Lemon Milk font */}
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
                        ...states.map((state) => ({ value: state, label: state }))
                      ]}
                      onChange={handleStateChange}
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
                {selectedServiceCategory && selectedStates.length > 0 && serviceCodes.length > 0 ? (
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
                    <div className="text-gray-400 text-sm">Select states to see available service codes</div>
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
                      <p className="text-sm text-gray-500">Highest Rate</p>
                      <p className="text-xl font-semibold text-gray-800">${maxRate.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 p-4 bg-red-50 rounded-lg">
                    <FaArrowDown className="h-8 w-8 text-red-500" />
                    <div>
                      <p className="text-sm text-gray-500">Lowest Rate</p>
                      <p className="text-xl font-semibold text-gray-800">${minRate.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Chart Section */}
            {areAllFiltersApplied ? (
              <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-white rounded-xl shadow-lg">
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
            ) : (
              <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-white rounded-xl shadow-lg text-center">
                <div className="flex justify-center items-center mb-2 sm:mb-3">
                  <FaFilter className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 mr-2" />
                  <FaChartBar className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
                </div>
                <p className="text-sm sm:text-base text-gray-600 font-medium">
                  Apply all filters to generate the rate comparison visualization
                </p>
                <p className="text-xs sm:text-sm text-gray-400 mt-1 sm:mt-2">
                  Select a service category, states, and service code to begin
                </p>
              </div>
            )}

            {/* Data Table - Only show when filters are active and no modifier selection is needed */}
            {areAllFiltersApplied && !showModifierModal && (
              <>
                {Object.entries(groupedByState).map(([state, stateData]) => {
                  const selectedModifierKey = selectedTableRows[state];
                  
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
                                const isSelected = selectedModifierKey === currentModifierKey;
                                
                                return (
                                  <tr 
                                    key={index} 
                                    onClick={() => handleTableRowSelection(state, currentModifierKey)}
                                    className={`${
                                      isSelected 
                                        ? 'bg-blue-50 cursor-pointer'
                                        : 'hover:bg-gray-50 cursor-pointer'
                                    } transition-colors`}
                                  >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="flex items-center">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                          isSelected 
                                            ? 'border-blue-500 bg-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.2)]' 
                                            : 'border-gray-300 hover:border-gray-400'
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

      {/* Modifier Selection Modal */}
      <Modal isOpen={showModifierModal} onClose={() => setShowModifierModal(false)} width="max-w-[60vw]">
        <div className="p-6 w-full">
          <h2 className="text-xl font-semibold mb-4">Select Modifier Combination for {currentSelectionState}</h2>
          <div className="overflow-x-auto rounded-lg" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <table className="min-w-full bg-white">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Select</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 1</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 2</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 3</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 4</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredData
                  .filter(item => item.state_name === currentSelectionState)
                  .map((item, index) => {
                    const currentModifierKey = `${item.modifier_1}|${item.modifier_2}|${item.modifier_3}|${item.modifier_4}`;
                    const isSelected = selectedModifiers[currentSelectionState] === currentModifierKey;
                    
                    return (
                      <tr 
                        key={index} 
                        onClick={() => handleModifierSelection(item.state_name, item)}
                        className={`${
                          isSelected 
                            ? 'bg-blue-50 cursor-pointer' 
                            : 'hover:bg-gray-50 cursor-pointer'
                        } transition-colors`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              isSelected
                                ? 'border-blue-500 bg-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.2)]' 
                                : 'border-gray-300 hover:border-gray-400'
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
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            {needsModifierSelection.length > 1 && (
              <p>After selecting for {currentSelectionState}, you'll be prompted to select for {needsModifierSelection.length - 1} more state(s).</p>
            )}
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}