"use client";

import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import Select from "react-select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from "chart.js";
import AppLayout from "@/app/components/applayout";
import { FaChartLine, FaArrowUp, FaArrowDown, FaDollarSign, FaSpinner, FaFilter, FaChartBar, FaExclamationCircle } from 'react-icons/fa';
import Modal from "@/app/components/modal";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

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
  base_unit: string;
  rate_per_hour?: string;
}

// Add this new Modal component at the top of the file, right after the imports
const NewModal = ({ isOpen, onClose, children }: { isOpen: boolean, onClose: () => void, children: React.ReactNode }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg w-[800px] max-w-[90vw] max-h-[90vh] overflow-hidden">
        <div className="p-6">
          {children}
        </div>
        <div className="px-6 py-4 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default function HistoricalRates() {
  const [data, setData] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [selectedServiceCategory, setSelectedServiceCategory] = useState("");
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedServiceCode, setSelectedServiceCode] = useState("");
  const [selectedModifier1, setSelectedModifier1] = useState("");
  const [selectedModifier2, setSelectedModifier2] = useState("");
  const [selectedModifier3, setSelectedModifier3] = useState("");
  const [selectedModifier4, setSelectedModifier4] = useState("");

  // Unique filter options
  const [serviceCategories, setServiceCategories] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [serviceCodes, setServiceCodes] = useState<string[]>([]);
  const [modifiers1, setModifiers1] = useState<string[]>([]);
  const [modifiers2, setModifiers2] = useState<string[]>([]);
  const [modifiers3, setModifiers3] = useState<string[]>([]);
  const [modifiers4, setModifiers4] = useState<string[]>([]);

  // Update loading states
  const [initialLoading, setInitialLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);

  // Add a new state to track if filters are ready
  const [filtersReady, setFiltersReady] = useState(false);

  // Add new state for modal and selected entry
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedModifiers, setSelectedModifiers] = useState<{
    modifier_1?: string;
    modifier_2?: string;
    modifier_3?: string;
    modifier_4?: string;
  } | null>(null);

  // Add a new state for the selected graph entry
  const [selectedGraphEntry, setSelectedGraphEntry] = useState<ServiceData | null>(null);

  useEffect(() => {
    setInitialLoading(true);
    fetch("/api/state-payment-comparison")
      .then((response) => {
        if (!response.ok) throw new Error("Network response was not ok");
        return response.json();
      })
      .then((data: ServiceData[]) => {
        setData(data);
        extractFilters(data);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        setError("Error fetching data. Please try again later.");
      })
      .finally(() => {
        setInitialLoading(false);
        setLoading(false);
      });
  }, []);

  // Extract unique filter options
  const extractFilters = (data: ServiceData[]) => {
    setServiceCategories([...new Set(data.map((item) => item.service_category))]);
    setStates([...new Set(data.map((item) => item.state_name))]);
  };

  // Modify the handleServiceCategoryChange function
  const handleServiceCategoryChange = (category: string) => {
    setSelectedServiceCategory(category);
    setSelectedServiceCode(""); // Reset service code
    setSelectedStates([]); // Reset state
    setSelectedModifier1("");
    setSelectedModifier2("");
    setSelectedModifier3("");
    setSelectedModifier4("");

    // Get service codes for the selected category
    const filteredCodes = data
      .filter((item) => item.service_category === category)
      .map((item) => item.service_code);
    setServiceCodes([...new Set(filteredCodes)]);

    setFiltersReady(false);
  };

  // Modify the handleServiceCodeChange function
  const handleServiceCodeChange = (code: string) => {
    setSelectedServiceCode(code);
    setSelectedStates([]); // Reset state
    setSelectedModifier1("");
    setSelectedModifier2("");
    setSelectedModifier3("");
    setSelectedModifier4("");

    // Get states for the selected service code and category
    const filteredStates = data
      .filter((item) => 
        item.service_category === selectedServiceCategory &&
        item.service_code === code
      )
      .map((item) => item.state_name);
    setStates([...new Set(filteredStates)]);

    // Update filters ready state
    setFiltersReady(!!selectedServiceCategory && !!code && selectedStates.length > 0);
  };

  // Modify the handleStateChange function
  const handleStateChange = (state: any) => {
    const selectedState = state ? [state.value] : [];
    setSelectedStates(selectedState);

    if (selectedServiceCategory && selectedServiceCode && selectedState.length > 0) {
      setIsModalOpen(true);
    }
  };

  // Modify the resetFilters function
  const resetFilters = () => {
    setSelectedServiceCategory("");
    setSelectedStates([]);
    setSelectedServiceCode("");
    setSelectedModifier1("");
    setSelectedModifier2("");
    setSelectedModifier3("");
    setSelectedModifier4("");
    setFiltersReady(false);
  };

  // Update the handleEntrySelection function
  const handleEntrySelection = (entry: ServiceData) => {
    setSelectedModifiers({
      modifier_1: entry.modifier_1,
      modifier_2: entry.modifier_2,
      modifier_3: entry.modifier_3,
      modifier_4: entry.modifier_4
    });
    setSelectedGraphEntry(entry);
    setIsModalOpen(false);
    setFiltersReady(true);
  };

  // Add useEffect to pre-select the first entry when table populates
  useEffect(() => {
    if (filtersReady && selectedModifiers) {
      // Find the first entry that matches the selected modifiers
      const firstEntry = data.find(item => 
        item.modifier_1 === selectedModifiers.modifier_1 &&
        item.modifier_2 === selectedModifiers.modifier_2 &&
        item.modifier_3 === selectedModifiers.modifier_3 &&
        item.modifier_4 === selectedModifiers.modifier_4
      );
      
      if (firstEntry) {
        setSelectedGraphEntry(firstEntry);
      }
    }
  }, [filtersReady, selectedModifiers, data]);

  // Update the filteredData logic
  const filteredData = data.filter((item) => {
    const rateDate = new Date(item.rate_effective_date);
    const matchesModifiers = selectedModifiers ? (
      item.modifier_1 === selectedModifiers.modifier_1 &&
      item.modifier_2 === selectedModifiers.modifier_2 &&
      item.modifier_3 === selectedModifiers.modifier_3 &&
      item.modifier_4 === selectedModifiers.modifier_4
    ) : true;

    return (
      (!selectedServiceCategory || item.service_category === selectedServiceCategory) &&
      (!selectedStates.length || selectedStates.includes(item.state_name)) &&
      (!selectedServiceCode || item.service_code === selectedServiceCode) &&
      matchesModifiers
    );
  });

  // Add a new function to handle graph entry selection
  const handleGraphEntrySelection = (entry: ServiceData) => {
    console.log("Selected entry:", entry);
    setSelectedGraphEntry(entry);
    setSelectedModifiers({
      modifier_1: entry.modifier_1,
      modifier_2: entry.modifier_2,
      modifier_3: entry.modifier_3,
      modifier_4: entry.modifier_4
    });
  };

  // Update the processData function
  const processData = (data: ServiceData[], rateType: 'base' | 'hour') => {
    // Filter data based on selected graph entry's modifiers
    const dataToProcess = selectedGraphEntry ? data.filter(item => 
      item.modifier_1 === selectedGraphEntry.modifier_1 &&
      item.modifier_2 === selectedGraphEntry.modifier_2 &&
      item.modifier_3 === selectedGraphEntry.modifier_3 &&
      item.modifier_4 === selectedGraphEntry.modifier_4
    ) : data;

    // Sort data by rate_effective_date
    const sortedData = dataToProcess.sort((a, b) => new Date(a.rate_effective_date).getTime() - new Date(b.rate_effective_date).getTime());

    const labels = sortedData.map((item) => new Date(item.rate_effective_date).toLocaleDateString());
    const rates = sortedData.map((item) => {
      if (rateType === 'base') {
        return item.rate ? parseFloat(item.rate.replace("$", "")) : 0;
      } else {
        return item.rate_per_hour ? parseFloat(item.rate_per_hour.replace("$", "")) : 0;
      }
    });

    // Add today's date with the latest rate
    if (sortedData.length > 0) {
      const latestRate = rates[rates.length - 1];
      const today = new Date().toLocaleDateString();
      labels.push(today);
      rates.push(latestRate);
    }

    // Create modifier label
    const modifierLabel = selectedGraphEntry ? 
      [selectedGraphEntry.modifier_1, selectedGraphEntry.modifier_2, selectedGraphEntry.modifier_3, selectedGraphEntry.modifier_4]
        .filter(Boolean)
        .join(', ') : 'All Modifiers';

    return {
      labels,
      datasets: [{
        label: `${rateType === 'base' ? 'Rate per Base Unit' : 'Rate per Hour'} (${modifierLabel})`,
        data: rates,
        borderColor: rateType === 'base' ? 'rgb(70, 130, 209)' : 'rgb(255, 99, 132)',
        backgroundColor: rateType === 'base' ? 'rgba(70, 130, 209, 0.5)' : 'rgba(255, 99, 132, 0.5)',
      }]
    };
  };

  const baseUnitData = processData(filteredData, 'base');
  const hourlyData = processData(filteredData, 'hour');

  // Table columns
  const columns = [
    { Header: "State", accessor: "state_name" },
    { Header: "Service Category", accessor: "service_category" },
    { Header: "Service Code", accessor: "service_code" },
    { Header: "Rate", accessor: "rate" },
    { Header: "Rate per Hour", accessor: "rate_per_hour" },
    { Header: "Effective Date", accessor: "rate_effective_date" },
    { Header: "Location/Region", accessor: "location_region" },
  ];

  // Add error message component
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

  // Update the SelectionModal component
  const SelectionModal = () => {
    // Create a map to store unique modifier combinations
    const uniqueEntries = new Map<string, ServiceData>();

    // Filter and process the data
    data.forEach((item) => {
      if (
        item.service_category === selectedServiceCategory &&
        item.service_code === selectedServiceCode &&
        selectedStates.includes(item.state_name)
      ) {
        // Create a key based on the modifiers
        const modifiersKey = [
          item.modifier_1,
          item.modifier_2,
          item.modifier_3,
          item.modifier_4
        ]
          .filter(Boolean)
          .join(',');

        // Only add if we haven't seen this combination before
        if (!uniqueEntries.has(modifiersKey)) {
          uniqueEntries.set(modifiersKey, item);
        }
      }
    });

    // Convert the map values to an array
    const filteredEntries = Array.from(uniqueEntries.values());

    return (
      <NewModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h2 className="text-xl font-semibold mb-4">Select Entry</h2>
        <div className="max-h-[60vh] overflow-y-auto pr-3">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">Select</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modifier 1</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modifier 2</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modifier 3</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modifier 4</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEntries.map((entry, index) => (
                <tr 
                  key={index} 
                  onClick={() => handleEntrySelection(entry)}
                  className={`${
                    selectedGraphEntry === entry 
                      ? 'bg-blue-50 cursor-pointer' 
                      : 'hover:bg-gray-50 cursor-pointer'
                  } transition-colors`}
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        selectedGraphEntry === entry
                          ? 'border-blue-500 bg-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.2)]' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}>
                        {selectedGraphEntry === entry && (
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
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {entry.modifier_1 && `${entry.modifier_1} - ${entry.modifier_1_details}`}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {entry.modifier_2 && `${entry.modifier_2} - ${entry.modifier_2_details}`}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {entry.modifier_3 && `${entry.modifier_3} - ${entry.modifier_3_details}`}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {entry.modifier_4 && `${entry.modifier_4} - ${entry.modifier_4_details}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </NewModal>
    );
  };

  // Update the DataTable component
  const DataTable = () => {
    // Create a map to store unique modifier combinations
    const uniqueEntries = new Map<string, ServiceData>();

    // Filter and process the data
    data.forEach((item) => {
      if (
        item.service_category === selectedServiceCategory &&
        item.service_code === selectedServiceCode &&
        selectedStates.includes(item.state_name)
      ) {
        // Create a key based on the modifiers
        const modifiersKey = [
          item.modifier_1,
          item.modifier_2,
          item.modifier_3,
          item.modifier_4
        ]
          .filter(Boolean)
          .join(',');

        // Only add if we haven't seen this combination before
        if (!uniqueEntries.has(modifiersKey)) {
          uniqueEntries.set(modifiersKey, item);
        }
      }
    });

    // Convert the map values to an array
    const filteredEntries = Array.from(uniqueEntries.values());

    return (
      <div className="p-4 sm:p-6 bg-white rounded-xl shadow-lg mt-6">
        <h2 className="text-xl font-semibold mb-4">Filtered Data</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Select</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service Line</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service Code</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Program</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modifier 1</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modifier 2</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modifier 3</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modifier 4</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEntries.map((entry, index) => (
                <tr 
                  key={index} 
                  onClick={() => handleGraphEntrySelection(entry)}
                  className={`${
                    selectedGraphEntry === entry 
                      ? 'bg-blue-50 cursor-pointer' 
                      : 'hover:bg-gray-50 cursor-pointer'
                  } transition-colors`}
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        selectedGraphEntry === entry
                          ? 'border-blue-500 bg-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.2)]' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}>
                        {selectedGraphEntry === entry && (
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
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{entry.service_category}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{entry.service_code}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{entry.program}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{entry.location_region}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {entry.modifier_1 && `${entry.modifier_1} - ${entry.modifier_1_details}`}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {entry.modifier_2 && `${entry.modifier_2} - ${entry.modifier_2_details}`}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {entry.modifier_3 && `${entry.modifier_3} - ${entry.modifier_3_details}`}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {entry.modifier_4 && `${entry.modifier_4} - ${entry.modifier_4_details}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  useEffect(() => {
    console.log("Selected graph entry changed:", selectedGraphEntry);
    console.log("Filtered data:", filteredData);
  }, [selectedGraphEntry]);

  useEffect(() => {
    console.log("Graph data updated:", { baseUnitData, hourlyData });
  }, [baseUnitData, hourlyData]);

  return (
    <AppLayout activeTab="historicalRates">
      <div className="p-4 sm:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
        {/* Error Message */}
        <ErrorMessage 
          error={error} 
          onRetry={() => window.location.reload()} 
        />

        {/* Heading with Reset Button */}
        <div className="flex flex-col items-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-5xl md:text-6xl text-[#012C61] font-lemonMilkRegular uppercase mb-3 sm:mb-4 text-center">
            Historical Rates
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
                {/* Service Category Selector - Always visible */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Service Category</label>
                  <Select
                    isClearable
                    options={serviceCategories.map(category => ({ value: category, label: category }))}
                    onChange={(selected) => handleServiceCategoryChange(selected?.value || "")}
                    value={selectedServiceCategory ? { value: selectedServiceCategory, label: selectedServiceCategory } : null}
                    className="basic-single-select"
                    classNamePrefix="select"
                    placeholder="Select Service Category"
                    isSearchable={true}
                    menuPlacement="bottom"
                    menuPosition="fixed"
                    maxMenuHeight={200} // Approximately 8 items
                  />
                </div>
                
                {/* Service Code Selector - Only appears when service category is selected */}
                <div className={`space-y-2 transition-opacity duration-200 ${selectedServiceCategory ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  <label className="text-sm font-medium text-gray-700">Service Code</label>
                  <Select
                    isClearable
                    options={serviceCodes.map(code => ({ value: code, label: code }))}
                    onChange={(selected) => handleServiceCodeChange(selected?.value || "")}
                    value={selectedServiceCode ? { value: selectedServiceCode, label: selectedServiceCode } : null}
                    className="basic-single-select"
                    classNamePrefix="select"
                    placeholder="Select Service Code"
                    isSearchable={true}
                    menuPlacement="bottom"
                    menuPosition="fixed"
                    maxMenuHeight={200}
                  />
                </div>

                {/* State Selector - Only appears when service code is selected */}
                <div className={`space-y-2 transition-opacity duration-200 ${selectedServiceCode ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  <label className="text-sm font-medium text-gray-700">State</label>
                  <Select
                    isClearable
                    options={states.map(state => ({ value: state, label: state }))}
                    onChange={handleStateChange}
                    value={selectedStates.length > 0 ? { value: selectedStates[0], label: selectedStates[0] } : null}
                    className="basic-single-select"
                    classNamePrefix="select"
                    placeholder="Select State"
                    isSearchable={true}
                    menuPlacement="bottom"
                    menuPosition="fixed"
                    maxMenuHeight={200}
                  />
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 gap-6 sm:gap-8">
              {filtersReady ? (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                    <div className="p-4 sm:p-6 bg-white rounded-xl shadow-lg">
                      <h2 className="text-xl font-semibold mb-4">
                        Rate per Base Unit {selectedGraphEntry && `(${[selectedGraphEntry.modifier_1, selectedGraphEntry.modifier_2, selectedGraphEntry.modifier_3, selectedGraphEntry.modifier_4].filter(Boolean).join(', ')})`}
                      </h2>
                      {chartLoading ? (
                        <div className="flex justify-center items-center h-48 sm:h-64">
                          <FaSpinner className="animate-spin h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
                          <p className="ml-3 sm:ml-4 text-sm sm:text-base text-gray-600">Generating chart...</p>
                        </div>
                      ) : (
                        <Line data={baseUnitData} options={{
                          responsive: true,
                          scales: {
                            x: {
                              title: {
                                display: true,
                                text: 'Date'
                              }
                            },
                            y: {
                              title: {
                                display: true,
                                text: 'Rate ($ per base unit)'
                              }
                            }
                          }
                        }} />
                      )}
                    </div>

                    <div className="p-4 sm:p-6 bg-white rounded-xl shadow-lg">
                      <h2 className="text-xl font-semibold mb-4">
                        Rate per Hour {selectedGraphEntry && `(${[selectedGraphEntry.modifier_1, selectedGraphEntry.modifier_2, selectedGraphEntry.modifier_3, selectedGraphEntry.modifier_4].filter(Boolean).join(', ')})`}
                      </h2>
                      {chartLoading ? (
                        <div className="flex justify-center items-center h-48 sm:h-64">
                          <FaSpinner className="animate-spin h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
                          <p className="ml-3 sm:ml-4 text-sm sm:text-base text-gray-600">Generating chart...</p>
                        </div>
                      ) : (
                        <Line data={hourlyData} options={{
                          responsive: true,
                          scales: {
                            x: {
                              title: {
                                display: true,
                                text: 'Date'
                              }
                            },
                            y: {
                              title: {
                                display: true,
                                text: 'Rate ($ per hour)'
                              }
                            }
                          }
                        }} />
                      )}
                    </div>
                  </div>
                  <DataTable />
                </>
              ) : (
                <div className="p-8 sm:p-12 bg-white rounded-xl shadow-lg">
                  <div className="text-center">
                    <FaChartLine className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-xl font-semibold text-gray-900">Select Filters to View Data</h3>
                    <p className="mt-2 text-sm text-gray-500 max-w-prose mx-auto">
                      Please select a Service Category, State, and Service Code to generate the historical rate charts. The data will appear here once all required filters are selected.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Selection Modal */}
        <SelectionModal />
      </div>
    </AppLayout>
  );
}