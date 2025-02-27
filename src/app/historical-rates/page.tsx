"use client";

import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import Select from "react-select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from "chart.js";
import AppLayout from "@/app/components/applayout";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

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
  base_unit: string;
  rate_per_hour?: string;
}

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
      .then((response) => {
        if (!response.ok) throw new Error("Network response was not ok");
        return response.json();
      })
      .then((data: ServiceData[]) => {
        setData(data);
        extractFilters(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        setError("Error fetching data. Please try again later.");
        setLoading(false);
      });
  }, []);

  // Extract unique filter options
  const extractFilters = (data: ServiceData[]) => {
    setServiceCategories([...new Set(data.map((item) => item.service_category))]);
    setStates([...new Set(data.map((item) => item.state_name))]);
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

  // Reset Filters
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

  // Filter Data Based on Selected Options
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

  // Process data for charts
  const processData = (data: ServiceData[], rateType: 'base' | 'hour') => {
    // Sort data by rate_effective_date
    const sortedData = data.sort((a, b) => new Date(a.rate_effective_date).getTime() - new Date(b.rate_effective_date).getTime());

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

    return {
      labels,
      datasets: [{
        label: rateType === 'base' ? 'Rate per Base Unit' : 'Rate per Hour',
        data: rates,
        borderColor: rateType === 'base' ? 'rgb(70, 130, 209)' : 'rgb(255, 99, 132)',
        backgroundColor: rateType === 'base' ? 'rgba(70, 130, 209, 0.5)' : 'rgba(255, 99, 132, 0.5)',
      }]
    };
  };

  const baseUnitData = processData(filteredData, 'base');
  const hourlyData = processData(filteredData, 'hour');

  return (
    <AppLayout activeTab="historicalRates">
      <div className="p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
        <h1 className="text-5xl md:text-6xl text-[#012C61] font-lemonMilkRegular uppercase mb-8 text-center">
          Historical Rates
        </h1>

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
            {/* Service Category Selector */}
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

            {/* State Selector */}
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
                />
              </div>
            )}

            {/* Service Code Selector */}
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

            {/* Modifier Selectors */}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-6 bg-white rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Rate per Base Unit</h2>
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
          </div>

          <div className="p-6 bg-white rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Rate per Hour</h2>
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
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
