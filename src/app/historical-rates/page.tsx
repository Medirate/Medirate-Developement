"use client";

import { useEffect, useState, useMemo } from "react";
import AppLayout from "@/app/components/applayout";
import { FaSpinner, FaExclamationCircle, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import Select from "react-select";
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

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

export default function HistoricalRates() {
  const [data, setData] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const areFiltersApplied = selectedServiceCategory && selectedState && selectedServiceCode;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/state-payment-comparison");
        if (!response.ok) throw new Error("Failed to fetch data");
        const data = await response.json();
        setData(data);
        extractFilters(data);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const extractFilters = (data: ServiceData[]) => {
    setServiceCategories([...new Set(data.map((item) => item.service_category))]);
  };

  // Get filtered data based on selections
  const filteredData = useMemo(() => {
    if (!areFiltersApplied) return [];
    return data.filter(
      (item) =>
        item.service_category === selectedServiceCategory &&
        item.state_name === selectedState &&
        item.service_code === selectedServiceCode
    );
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
      prev?.rate_effective_date === entry.rate_effective_date
        ? null
        : entry
    );
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

        {/* Filters */}
        {!loading && (
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
        )}

        {/* Data Table */}
        {!loading && !error && areFiltersApplied && (
          <>
            <div className="overflow-x-auto rounded-lg shadow-lg mb-4" style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <table className="min-w-full bg-white">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">State</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Service Category</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Service Code</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Program</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Location/Region</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 1</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 2</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 3</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 4</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Rate per Hour</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Duration Unit</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Effective Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredData.map((item, index) => (
                    <tr 
                      key={index} 
                      className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                        selectedEntry?.state_name === item.state_name &&
                        selectedEntry?.service_code === item.service_code &&
                        selectedEntry?.rate_effective_date === item.rate_effective_date
                          ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => handleRowSelection(item)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            selectedEntry?.state_name === item.state_name &&
                            selectedEntry?.service_code === item.service_code &&
                            selectedEntry?.rate_effective_date === item.rate_effective_date
                              ? 'border-blue-500 bg-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.2)]' 
                              : 'border-gray-300 hover:border-gray-400'
                          }`}>
                            {selectedEntry?.state_name === item.state_name &&
                            selectedEntry?.service_code === item.service_code &&
                            selectedEntry?.rate_effective_date === item.rate_effective_date && (
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.rate}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.rate_per_hour || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.duration_unit || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(item.rate_effective_date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Graph Component */}
        {selectedEntry && (
          <div className="mb-8 p-6 bg-white rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Rate History</h2>
            <div className="w-full h-96">
              <ReactECharts
                option={{
                  tooltip: {
                    trigger: 'axis',
                    formatter: (params: any) => {
                      const data = params[0].data;
                      return `
                        <b>State:</b> ${data.state}<br>
                        <b>Service Code:</b> ${data.serviceCode}<br>
                        <b>Rate:</b> $${data.rate.toFixed(2)}<br>
                        <b>Effective Date:</b> ${data.date}
                      `;
                    }
                  },
                  xAxis: {
                    type: 'category',
                    data: filteredData
                      .filter(item => 
                        item.state_name === selectedEntry.state_name &&
                        item.service_code === selectedEntry.service_code
                      )
                      .sort((a, b) => new Date(a.rate_effective_date).getTime() - new Date(b.rate_effective_date).getTime())
                      .map(entry => entry.rate_effective_date),
                    name: 'Effective Date',
                    nameLocation: 'middle',
                    nameGap: 30,
                    axisLabel: {
                      formatter: (value: string) => {
                        return new Date(value).toLocaleDateString();
                      }
                    }
                  },
                  yAxis: {
                    type: 'value',
                    name: 'Rate ($)',
                    nameLocation: 'middle',
                    nameGap: 30
                  },
                  series: [
                    {
                      data: filteredData
                        .filter(item => 
                          item.state_name === selectedEntry.state_name &&
                          item.service_code === selectedEntry.service_code
                        )
                        .sort((a, b) => new Date(a.rate_effective_date).getTime() - new Date(b.rate_effective_date).getTime())
                        .map(entry => ({
                          value: parseFloat(entry.rate.replace('$', '')),
                          state: entry.state_name,
                          serviceCode: entry.service_code,
                          date: new Date(entry.rate_effective_date).toLocaleDateString()
                        })),
                      type: 'line',
                      smooth: true,
                      itemStyle: {
                        color: '#3b82f6'
                      },
                      areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                          {
                            offset: 0,
                            color: '#3b82f660'
                          },
                          {
                            offset: 1,
                            color: '#3b82f620'
                          }
                        ])
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
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
