"use client";

import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import Select from "react-select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import AppLayout from "@/app/components/applayout";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface ServiceData {
  state_name: string;
  service_category: string;
  service_code: string;
  modifier_1?: string;
  modifier_2?: string;
  modifier_3?: string;
  modifier_4?: string;
  rate: string;
  rate_effective_date: string;
  program: string;
  location_region: string;
}

export default function StatePaymentComparison() {
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
  const [startDate, setStartDate] = useState(new Date("2020-01-01"));
  const [endDate, setEndDate] = useState(new Date("2024-12-31"));

  // Unique filter options
  const [serviceCategories, setServiceCategories] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [serviceCodes, setServiceCodes] = useState<string[]>([]);
  const [modifiers1, setModifiers1] = useState<string[]>([]);
  const [modifiers2, setModifiers2] = useState<string[]>([]);
  const [modifiers3, setModifiers3] = useState<string[]>([]);
  const [modifiers4, setModifiers4] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/state-payment-comparison")
      .then((response) => response.json())
      .then((data: ServiceData[]) => {
        setData(data);
        extractFilters(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        setError("Error fetching data");
        setLoading(false);
      });
  }, []);

  // Extract unique filter options
  const extractFilters = (data: ServiceData[]) => {
    setServiceCategories([...new Set(data.map((item) => item.service_category))]);
  };

  // Handle Service Category Selection
  const handleServiceCategoryChange = (category: string) => {
    setSelectedServiceCategory(category);
    setSelectedStates([]);
    setSelectedServiceCode("");
    setSelectedModifier1("");
    setSelectedModifier2("");
    setSelectedModifier3("");
    setSelectedModifier4("");

    const filteredStates = data
      .filter((item) => item.service_category === category)
      .map((item) => item.state_name);
    setStates([...new Set(filteredStates)]);
    setServiceCodes([]);
    setModifiers1([]);
    setModifiers2([]);
    setModifiers3([]);
    setModifiers4([]);
  };

  // Handle State Selection
  const handleStateChange = (states: any) => {
    const selectedStatesArray = states.map((s: any) => s.value);
    setSelectedStates(selectedStatesArray);
    setSelectedServiceCode("");
    setSelectedModifier1("");
    setSelectedModifier2("");
    setSelectedModifier3("");
    setSelectedModifier4("");

    const filteredCodes = data
      .filter((item) => selectedStatesArray.includes(item.state_name) && item.service_category === selectedServiceCategory)
      .map((item) => item.service_code);
    setServiceCodes([...new Set(filteredCodes)]);
    setModifiers1([]);
    setModifiers2([]);
    setModifiers3([]);
    setModifiers4([]);
  };

  // Handle Service Code Selection
  const handleServiceCodeChange = (code: string) => {
    setSelectedServiceCode(code);
    setSelectedModifier1("");
    setSelectedModifier2("");
    setSelectedModifier3("");
    setSelectedModifier4("");

    const filteredData = data.filter(
      (item) =>
        selectedStates.includes(item.state_name) &&
        item.service_category === selectedServiceCategory &&
        item.service_code === code
    );

    setModifiers1([...new Set(filteredData.map((item) => item.modifier_1 ?? "").filter(Boolean))]);
    setModifiers2([...new Set(filteredData.map((item) => item.modifier_2 ?? "").filter(Boolean))]);
    setModifiers3([...new Set(filteredData.map((item) => item.modifier_3 ?? "").filter(Boolean))]);
    setModifiers4([...new Set(filteredData.map((item) => item.modifier_4 ?? "").filter(Boolean))]);
  };

  // ✅ Filter Data Based on Selected Options
  const filteredData = data.filter((item) => {
    const rateDate = new Date(item.rate_effective_date);
    return (
      (!selectedServiceCategory || item.service_category === selectedServiceCategory) &&
      (!selectedStates.length || selectedStates.includes(item.state_name)) &&
      (!selectedServiceCode || item.service_code === selectedServiceCode) &&
      (!selectedModifier1 || item.modifier_1 === selectedModifier1) &&
      (!selectedModifier2 || item.modifier_2 === selectedModifier2) &&
      (!selectedModifier3 || item.modifier_3 === selectedModifier3) &&
      (!selectedModifier4 || item.modifier_4 === selectedModifier4) &&
      rateDate >= startDate && rateDate <= endDate
    );
  });

  // ✅ Process Data for Charts
  const processedData: { [state: string]: number[] } = {};
  filteredData.forEach((item) => {
    const state = item.state_name || "Unknown";
    const rate = parseFloat(item.rate?.replace("$", "")) || 0;

    if (!processedData[state]) processedData[state] = [];
    processedData[state].push(rate);
  });

  // ✅ Prepare Chart Data
  const chartData = {
    labels: Object.keys(processedData),
    datasets: [
      {
        label: "Avg Rate Per Hour",
        data: Object.values(processedData).map((rates) =>
          rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0
        ),
        backgroundColor: "rgba(70, 130, 209, 0.7)",
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
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

  // Add this reset function
  const resetFilters = () => {
    setSelectedServiceCategory("");
    setSelectedStates([]);
    setSelectedServiceCode("");
    setSelectedModifier1("");
    setSelectedModifier2("");
    setSelectedModifier3("");
    setSelectedModifier4("");
    setStartDate(new Date("2020-01-01"));
    setEndDate(new Date("2024-12-31"));
  };

  return (
    <AppLayout activeTab="statePaymentComparison">
      <div className="p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
        {/* Updated heading with Lemon Milk font */}
        <h1 className="text-5xl md:text-6xl text-[#012C61] font-lemonMilkRegular uppercase mb-8 text-center">
          State Rate Comparison
        </h1>

        {/* Date range pickers */}
        <div className="flex justify-center mb-8 space-x-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Start Date</label>
            <DatePicker 
              selected={startDate} 
              onChange={(date: Date | null) => setStartDate(date!)} 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">End Date</label>
            <DatePicker 
              selected={endDate} 
              onChange={(date: Date | null) => setEndDate(date!)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="mb-8 p-6 bg-white rounded-xl shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Service Category Selector - Always visible */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Service Category</label>
              <select 
                value={selectedServiceCategory} 
                onChange={(e) => handleServiceCategoryChange(e.target.value)} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="">Select Service Category</option>
                {serviceCategories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* State Selector - Only appears when service category is selected */}
            {selectedServiceCategory && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">States</label>
                <Select
                  isMulti
                  options={states.map((state) => ({ value: state, label: state }))}
                  onChange={handleStateChange}
                  className="react-select-container"
                  classNamePrefix="react-select"
                  placeholder="Select States"
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: '42px',
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

            {/* Service Code Selector - Only appears when states are selected */}
            {selectedStates.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Service Code</label>
                <select 
                  value={selectedServiceCode} 
                  onChange={(e) => handleServiceCodeChange(e.target.value)} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value="">Select Service Code</option>
                  {serviceCodes.map((code) => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Modifier Selectors - Only appear when previous filters are selected */}
            {selectedServiceCode && modifiers1.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Modifier 1</label>
                <select 
                  value={selectedModifier1} 
                  onChange={(e) => setSelectedModifier1(e.target.value)} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value="">Select Modifier 1</option>
                  {modifiers1.map((mod) => (
                    <option key={mod} value={mod}>{mod}</option>
                  ))}
                </select>
              </div>
            )}

            {selectedServiceCode && selectedModifier1 && modifiers2.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Modifier 2</label>
                <select 
                  value={selectedModifier2} 
                  onChange={(e) => setSelectedModifier2(e.target.value)} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value="">Select Modifier 2</option>
                  {modifiers2.map((mod) => (
                    <option key={mod} value={mod}>{mod}</option>
                  ))}
                </select>
              </div>
            )}

            {selectedServiceCode && selectedModifier1 && selectedModifier2 && modifiers3.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Modifier 3</label>
                <select 
                  value={selectedModifier3} 
                  onChange={(e) => setSelectedModifier3(e.target.value)} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value="">Select Modifier 3</option>
                  {modifiers3.map((mod) => (
                    <option key={mod} value={mod}>{mod}</option>
                  ))}
                </select>
              </div>
            )}

            {selectedServiceCode && selectedModifier1 && selectedModifier2 && selectedModifier3 && modifiers4.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Modifier 4</label>
                <select 
                  value={selectedModifier4} 
                  onChange={(e) => setSelectedModifier4(e.target.value)} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value="">Select Modifier 4</option>
                  {modifiers4.map((mod) => (
                    <option key={mod} value={mod}>{mod}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Reset Button */}
            <div className="flex items-end">
              <button 
                onClick={resetFilters}
                className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 active:scale-95 shadow-md"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {/* Fancier Chart */}
        <div className="mb-8 p-6 bg-white rounded-xl shadow-lg">
          <div className="w-full max-w-4xl mx-auto">
            <Bar 
              data={chartData} 
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    display: true,
                    position: 'top',
                    labels: {
                      color: '#012C61',
                      font: {
                        size: 14
                      }
                    }
                  },
                  tooltip: {
                    backgroundColor: '#012C61',
                    titleFont: {
                      size: 16
                    },
                    bodyFont: {
                      size: 14
                    },
                    padding: 10
                  }
                },
                scales: {
                  x: {
                    grid: {
                      color: '#e5e7eb'
                    },
                    ticks: {
                      color: '#012C61',
                      font: {
                        size: 12
                      }
                    }
                  },
                  y: {
                    grid: {
                      color: '#e5e7eb'
                    },
                    ticks: {
                      color: '#012C61',
                      font: {
                        size: 12
                      }
                    },
                    title: {
                      display: true,
                      text: 'Rate ($ per hour)',
                      color: '#012C61',
                      font: {
                        size: 14
                      }
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="p-6 bg-white rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Filtered Data</h2>
          <div className="overflow-x-auto rounded-lg" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="min-w-full bg-white">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">State</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Service Category</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Service Code</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Program</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Location Region</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 1</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 2</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 3</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 4</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Effective Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.state_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.service_category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.service_code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.program || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.location_region || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.modifier_1 || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.modifier_2 || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.modifier_3 || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.modifier_4 || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.rate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(item.rate_effective_date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
