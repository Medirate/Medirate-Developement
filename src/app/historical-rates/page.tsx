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

export default function HistoricalRates() {
  const { data, loading, error } = useData();

  useEffect(() => {
    if (data.length > 0) {
      extractFilters(data);
    }
  }, [data]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  // Filters
  const [selectedServiceCategory, setSelectedServiceCategory] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedServiceCode, setSelectedServiceCode] = useState("");

  // Unique filter options
  const [serviceCategories, setServiceCategories] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [serviceCodes, setServiceCodes] = useState<string[]>([]);

  // Update the selected entry state to handle single selection
  const [selectedEntry, setSelectedEntry] = useState<ServiceData | null>(null);

  // Add this state near other state declarations
  const [showRatePerHour, setShowRatePerHour] = useState(false);

  const areFiltersApplied = selectedServiceCategory && selectedState && selectedServiceCode;

  const extractFilters = (data: ServiceData[]) => {
    setServiceCategories([...new Set(data.map((item) => item.service_category))]);
  };

  // Get filtered data based on selections
  const filteredData = useMemo(() => {
    if (!areFiltersApplied) return [];
    
    // Create a map to track unique combinations
    const uniqueMap = new Map<string, ServiceData>();

    data.forEach(item => {
      if (
        item.service_category === selectedServiceCategory &&
        item.state_name === selectedState &&
        item.service_code === selectedServiceCode
      ) {
        const key = `${item.service_code}|${item.program}|${item.location_region}|${item.modifier_1}|${item.modifier_2}|${item.modifier_3}|${item.modifier_4}`;
        
        // Only keep the latest entry for each unique combination
        const existing = uniqueMap.get(key);
        if (!existing || new Date(item.rate_effective_date) > new Date(existing.rate_effective_date)) {
          uniqueMap.set(key, item);
        }
      }
    });

    return Array.from(uniqueMap.values());
  }, [data, selectedServiceCategory, selectedState, selectedServiceCode]);

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

  const handleServiceCategoryChange = (category: string) => {
    setSelectedServiceCategory(category);
    setSelectedState("");
    setSelectedServiceCode("");

    // Get states and service codes for the selected category
    const filteredStates = data
      .filter((item) => item.service_category === category)
      .map((item) => item.state_name);
    setStates([...new Set(filteredStates)]);

    const filteredCodes = data
      .filter((item) => item.service_category === category)
      .map((item) => item.service_code);
    setServiceCodes([...new Set(filteredCodes)]);
  };

  const handleStateChange = (state: string) => {
    setSelectedState(state);
    setSelectedServiceCode("");

    // Get service codes for the selected state and category
    if (selectedServiceCategory) {
      const filteredCodes = data
        .filter(
          (item) =>
            item.service_category === selectedServiceCategory &&
            item.state_name === state
        )
        .map((item) => item.service_code);
      setServiceCodes([...new Set(filteredCodes)]);
    }
  };

  const handleServiceCodeChange = (code: string) => {
    setSelectedServiceCode(code);
  };

  const resetFilters = () => {
    setSelectedServiceCategory("");
    setSelectedState("");
    setSelectedServiceCode("");
    setServiceCodes([]);
    setStates([]);
  };

  // Update the row selection handler
  const handleRowSelection = (entry: ServiceData) => {
    setSelectedEntry(prev => 
      prev?.state_name === entry.state_name &&
      prev?.service_code === entry.service_code &&
      prev?.program === entry.program &&
      prev?.location_region === entry.location_region &&
      prev?.modifier_1 === entry.modifier_1 &&
      prev?.modifier_2 === entry.modifier_2 &&
      prev?.modifier_3 === entry.modifier_3 &&
      prev?.modifier_4 === entry.modifier_4
        ? null
        : entry
    );
  };

  const getGraphData = () => {
    if (!selectedEntry) return { xAxis: [], series: [] };

    // Get all entries for the selected combination
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

    // Sort by date
    const sortedEntries = allEntries.sort((a, b) => 
      new Date(a.rate_effective_date).getTime() - new Date(b.rate_effective_date).getTime()
    );

    // Add current date as the last point
    const currentDate = new Date();
    const lastEntry = sortedEntries[sortedEntries.length - 1];
    const extendedEntries = [
      ...sortedEntries,
      {
        ...lastEntry,
        rate_effective_date: currentDate.toISOString().split('T')[0]
      }
    ];

    // Format dates as mm/dd/yyyy
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    };

    return {
      xAxis: extendedEntries.map(entry => formatDate(entry.rate_effective_date)),
      series: extendedEntries.map(entry => ({
        value: showRatePerHour 
          ? parseFloat(entry.rate_per_hour?.replace('$', '') || '0')
          : parseFloat(entry.rate.replace('$', '') || '0'),
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
      }))
    };
  };

  return (
    <AppLayout activeTab="historicalRates">
      <div className="p-4 sm:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
        {/* Error Message */}
        <ErrorMessage error={error} />

        {/* Heading */}
        <div className="flex flex-col items-start mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-5xl md:text-6xl text-[#012C61] font-lemonMilkRegular uppercase mb-3 sm:mb-4">
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
                  <select
                    value={selectedServiceCategory}
                    onChange={(e) => handleServiceCategoryChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  >
                    <option value="">Select Service Line</option>
                    {serviceCategories
                      .filter(category => !['HCBS', 'IDD'].includes(category))
                      .map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                  </select>
                </div>

                {/* State Selector */}
                {selectedServiceCategory && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">State</label>
                    <select
                      value={selectedState}
                      onChange={(e) => handleStateChange(e.target.value)}
                      className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <option value="">Select State</option>
                      {states.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Service Code Selector */}
                {selectedServiceCategory && selectedState && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Service Code</label>
                    <select
                      value={selectedServiceCode}
                      onChange={(e) => handleServiceCodeChange(e.target.value)}
                      className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <option value="">Select Service Code</option>
                      {serviceCodes.map((code) => (
                        <option key={code} value={code}>
                          {code}
                        </option>
                      ))}
                    </select>
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
                      Rate Per Hour
                    </button>
                  </div>
                </div>

                <div className="w-full h-80">
                  {filteredData.length > 0 ? (
                    <ReactECharts
                      option={{
                        tooltip: {
                          trigger: 'axis',
                          formatter: (params: any) => {
                            const data = params[0].data;
                            const rate = data.value ? `$${data.value.toFixed(2)}` : '-';
                            
                            const modifiers = [
                              data.modifier1 ? `${data.modifier1} - ${data.modifier1Details || 'No details'}` : null,
                              data.modifier2 ? `${data.modifier2} - ${data.modifier2Details || 'No details'}` : null,
                              data.modifier3 ? `${data.modifier3} - ${data.modifier3Details || 'No details'}` : null,
                              data.modifier4 ? `${data.modifier4} - ${data.modifier4Details || 'No details'}` : null
                            ].filter(Boolean).join('<br>');

                            return `
                              <b>State:</b> ${data.state || '-'}<br>
                              <b>Service Code:</b> ${data.serviceCode || '-'}<br>
                              <b>Program:</b> ${data.program || '-'}<br>
                              <b>Location/Region:</b> ${data.locationRegion || '-'}<br>
                              <b>${showRatePerHour ? 'Rate Per Hour' : 'Rate Per Base Unit'}:</b> ${rate}<br>
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
                          name: showRatePerHour ? 'Rate Per Hour ($)' : 'Rate Per Base Unit ($)',
                          nameLocation: 'middle',
                          nameGap: 30
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
                                return `$${params.value.toFixed(2)}`;
                              },
                              fontSize: 12,
                              color: '#374151'
                            }
                          }
                        ],
                        grid: {
                          containLabel: true,
                          left: '3%',
                          right: '3%',
                          bottom: '10%',
                          top: '10%'
                        }
                      }}
                      style={{ height: '100%', width: '100%' }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-500">No data available</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Data Table */}
            {areFiltersApplied && (
              <div className="overflow-x-auto rounded-lg shadow-lg">
                <table className="min-w-full bg-white">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider"></th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">State</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Service Category</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Service Code</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Program</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Location/Region</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 1</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 2</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 3</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 4</th>
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.state_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.service_category}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.service_code}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.program}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.location_region}</td>
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
