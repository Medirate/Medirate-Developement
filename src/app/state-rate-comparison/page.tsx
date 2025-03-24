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
  const { data, loading, error } = useData();
  const [filterLoading, setFilterLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
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

  // Add this near other state declarations
  const [selectedStateDetails, setSelectedStateDetails] = useState<{
    state: string;
    average: number;
    entries: ServiceData[];
  } | null>(null);

  // Add this near other state declarations
  const [selectedEntry, setSelectedEntry] = useState<ServiceData | null>(null);

  // Add this useEffect to extract filters when data is loaded
  useEffect(() => {
    if (data.length > 0) {
      console.log("Data loaded:", data);
      extractFilters(data);
    }
  }, [data]);

  // Extract unique filter options
  const extractFilters = (data: ServiceData[]) => {
    const categories = data
      .map((item) => item.service_category?.trim()) // Trim whitespace
      .filter(category => category); // Remove empty strings
    setServiceCategories([...new Set(categories)]);
  };

  // Update filter handlers to remove URL updates
  const handleServiceCategoryChange = (category: string) => {
    setSelectedServiceCategory(category);
    setSelectedStates([]);
    setSelectedServiceCode("");
    setSelectedEntry(null);
    setFilterLoading(true);

    const filteredStates = data
      .filter((item) => item.service_category === category)
      .map((item) => item.state_name);
    
    setStates([...new Set(filteredStates)]);
    setServiceCodes([]);
    setFilterLoading(false);
  };

  const handleStateChange = (options: readonly { value: string; label: string }[]) => {
    const selectedStatesArray = options.map(option => option.value);
    setSelectedStates(selectedStatesArray);
    setIsAllStatesSelected(false);
    
    setSelectedServiceCode("");
    setSelectedEntry(null);
    setFilterLoading(true);

    if (selectedServiceCategory) {
      setTimeout(() => {
        const filteredCodes = data
          .filter((item) => 
            selectedStatesArray.includes(item.state_name) &&
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
    setSelectedEntry(null);
    setSelectedTableRows({});
    setFilterLoading(true);
    setFilterLoading(false);
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

  // Update the processedData calculation to include program and location_region
  const processedData: { [state: string]: { [modifierKey: string]: number } } = {};

  if (isAllStatesSelected && selectedServiceCode) {
    // Calculate average rates for each state when "Select All States" is chosen
    const stateAverages = new Map<string, number>();
    const stateCounts = new Map<string, number>();

    filteredData.forEach(item => {
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
      
      console.log(`State: ${item.state_name}, Rate: ${rate}, Program: ${item.program}, Region: ${item.location_region}`);

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
      const average = sum / count;
      console.log(`State: ${state}, Sum: ${sum}, Count: ${count}, Average: ${average}`);
      processedData[state] = {
        'average': average
      };
    });
  } else {
    // Original logic for individual state selection
    filteredData.forEach(item => {
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
      
      // Include program and location_region in the modifier key
      const currentModifier = `${item.modifier_1}|${item.modifier_2}|${item.modifier_3}|${item.modifier_4}|${item.program}|${item.location_region}`;
      const stateSelections = selectedTableRows[item.state_name] || [];
      
      if (stateSelections.includes(currentModifier)) {
        if (!processedData[item.state_name]) {
          processedData[item.state_name] = {};
        }
        processedData[item.state_name][currentModifier] = rate;
      }
    });
  }

  // ✅ Prepare ECharts Data
  const echartOptions = useMemo(() => {
    let states = Object.keys(processedData);
    let series: echarts.SeriesOption[] = [];

    if (isAllStatesSelected) {
      // Existing logic for "All States" selection
      if (sortOrder !== 'default') {
        states = states.sort((a, b) => {
          const rateA = processedData[a]['average'] || 0;
          const rateB = processedData[b]['average'] || 0;
          return sortOrder === 'asc' ? rateA - rateB : rateB - rateA;
        });
      }

      series.push({
        name: 'Average Rate',
        type: 'bar',
        barGap: '20%',
        barCategoryGap: '20%',
        data: states.map(state => processedData[state]['average'] || null),
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
      // New logic for manual state selection with sorting
      const allSelections: { state: string, modifierKey: string, rate: number }[] = [];
      
      // Collect all selected modifier combinations with their rates
      Object.entries(selectedTableRows).forEach(([state, selections]) => {
        selections.forEach(modifierKey => {
          const rate = processedData[state][modifierKey] || 0;
          allSelections.push({ state, modifierKey, rate });
        });
      });

      // Sort the selections based on the selected order
      if (sortOrder !== 'default') {
        allSelections.sort((a, b) => 
          sortOrder === 'asc' ? a.rate - b.rate : b.rate - a.rate
        );
      }

      // Create a series for each selection
      allSelections.forEach(({ state, modifierKey, rate }, index) => {
        series.push({
          name: `${state} - ${modifierKey}`,
          type: 'bar',
          barGap: '0%',
          barCategoryGap: '20%',
          data: states.map(s => s === state ? rate : null),
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

      // Update the states array to reflect the sorted order
      states = [...new Set(allSelections.map(s => s.state))];
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

            const item = filteredData.find(d => 
              d.state_name === state && 
              `${d.modifier_1}|${d.modifier_2}|${d.modifier_3}|${d.modifier_4}|${d.program}|${d.location_region}` === modifierKey
            );

            if (!item) {
              return `State: ${state}<br>${showRatePerHour ? 'Hourly' : 'Base'} Rate: $${rate?.toFixed(2) || '0.00'}`;
            }

            // Collect modifiers that exist
            const modifiers = [
              item.modifier_1 ? `${item.modifier_1} - ${item.modifier_1_details || ''}` : null,
              item.modifier_2 ? `${item.modifier_2} - ${item.modifier_2_details || ''}` : null,
              item.modifier_3 ? `${item.modifier_3} - ${item.modifier_3_details || ''}` : null,
              item.modifier_4 ? `${item.modifier_4} - ${item.modifier_4_details || ''}` : null
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
            const sum = stateData.reduce((acc, item) => {
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
              console.log(`Rate for ${item.program} - ${item.location_region}:`, rate);
              return acc + rate;
            }, 0);
            const average = sum / stateData.length;
            console.log("Sum:", sum, "Average:", average);

            console.log("State:", state);
            console.log("Sum:", sum);
            console.log("Entries:", stateData);

            console.log("Filtered Data for State:", state, stateData);

            setSelectedStateDetails({
              state,
              average,
              entries: stateData
            });
          }
        }
      }
    };

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
                const sum = stateData.reduce((acc, item) => {
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
                  console.log(`Rate for ${item.program} - ${item.location_region}:`, rate);
                  return acc + rate;
                }, 0);
                const average = sum / stateData.length;
                console.log("Sum:", sum, "Average:", average);

                console.log("State:", state);
                console.log("Sum:", sum);
                console.log("Entries:", stateData);

                console.log("Filtered Data for State:", state, stateData);

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
      setChartError("Failed to render chart. Please check your data.");
      return null;
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
    setSelectedServiceCategory("");
    setSelectedStates([]);
    setSelectedServiceCode("");
    setSelectedEntry(null);
    setServiceCodes([]);
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
    const currentModifierKey = `${item.modifier_1}|${item.modifier_2}|${item.modifier_3}|${item.modifier_4}|${item.program}|${item.location_region}`;
    
    setSelectedTableRows(prev => {
      const stateSelections = prev[state] || [];
      const newSelections = stateSelections.includes(currentModifierKey)
        ? stateSelections.filter(key => key !== currentModifierKey)
        : [...stateSelections, currentModifierKey];
      
      return {
        ...prev,
        [state]: newSelections
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
                      {entry.modifier_1 ? (entry.modifier_1_details ? `${entry.modifier_1} - ${entry.modifier_1_details}` : entry.modifier_1) : '-'}
                    </td>
                    <td className="px-4 py-2">
                      {entry.modifier_2 ? (entry.modifier_2_details ? `${entry.modifier_2} - ${entry.modifier_2_details}` : entry.modifier_2) : '-'}
                    </td>
                    <td className="px-4 py-2">
                      {entry.modifier_3 ? (entry.modifier_3_details ? `${entry.modifier_3} - ${entry.modifier_3_details}` : entry.modifier_3) : '-'}
                    </td>
                    <td className="px-4 py-2">
                      {entry.modifier_4 ? (entry.modifier_4_details ? `${entry.modifier_4} - ${entry.modifier_4_details}` : entry.modifier_4) : '-'}
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

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

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
        {loading && (
          <div className="flex justify-center items-center h-64">
            <FaSpinner className="animate-spin h-12 w-12 text-blue-500" />
            <p className="ml-4 text-gray-600">Loading data...</p>
          </div>
        )}

        {!loading && (
          <>
            {/* Filters */}
            <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-white rounded-xl shadow-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                {/* Service Category Selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Service Line</label>
                  <Select
                    options={serviceCategories
                      .filter(category => {
                        const trimmedCategory = category.trim();
                        return trimmedCategory && 
                               !['HCBS', 'IDD', 'SERVICE CATEGORY'].includes(trimmedCategory);
                      })
                      .map(category => ({ value: category, label: category }))}
                    value={selectedServiceCategory ? { value: selectedServiceCategory, label: selectedServiceCategory } : null}
                    onChange={(option) => handleServiceCategoryChange(option?.value || "")}
                    placeholder="Select Service Line"
                    isSearchable
                    className="react-select-container"
                    classNamePrefix="react-select"
                  />
                </div>

                {/* State Selector */}
                {selectedServiceCategory ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">State</label>
                    <Select
                      options={states.map(state => ({ value: state, label: state }))}
                      value={selectedStates.map(state => ({ value: state, label: state }))}
                      onChange={(options) => handleStateChange(options || [])}
                      placeholder="Select State"
                      isSearchable
                      isMulti
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
                {selectedServiceCategory && selectedStates.length > 0 ? (
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
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Service Code</label>
                    <div className="text-gray-400 text-sm">
                      {selectedServiceCategory ? "Select a state to see available service codes" : "Select a service line first"}
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
                      <h2 className="text-xl font-semibold mb-4 text-gray-800">{state}</h2>
                      <p className="text-sm text-gray-500 mb-4">
                        <strong>Note:</strong> The rates displayed are the current rates as of the latest available data. Rates are subject to change based on updates from state programs.
                      </p>
                      {tableLoading ? (
                        <div className="flex justify-center items-center h-32">
                          <FaSpinner className="animate-spin h-8 w-8 text-blue-500" />
                          <p className="ml-4 text-gray-600">Loading table data...</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-lg" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                          <table className="min-w-full bg-white" style={{ tableLayout: 'fixed' }}>
                            <colgroup>
                              <col style={{ width: '50px' }} /><col style={{ width: '150px' }} /><col style={{ width: '100px' }} /><col style={{ width: '200px' }} /><col style={{ width: '120px' }} /><col style={{ width: '150px' }} /><col style={{ width: '150px' }} /><col style={{ width: '150px' }} /><col style={{ width: '100px' }} /><col style={{ width: '100px' }} /><col style={{ width: '100px' }} /><col style={{ width: '120px' }} />
                            </colgroup>
                            <thead className="bg-gray-50 sticky top-0">
                              <tr>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Select</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Service Category</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Service Code</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Service Description</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Program</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Location Region</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 1</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 2</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 3</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 4</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Duration Unit</th>
                                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Hourly Equivalent Rate</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {stateData.map((item, index) => {
                                const currentModifierKey = `${item.modifier_1}|${item.modifier_2}|${item.modifier_3}|${item.modifier_4}|${item.program}|${item.location_region}`;
                                const isSelected = selectedModifierKeys.includes(currentModifierKey);
                                
                                const rateValue = parseFloat(item.rate.replace('$', '') || '0');
                                const durationUnit = item.duration_unit?.toUpperCase();
                                const hourlyRate = durationUnit === '15 MINUTES' ? rateValue * 4 : rateValue;

                                return (
                                  <tr 
                                    key={index} 
                                    onClick={() => handleTableRowSelection(state, item)}
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
                                    <td 
                                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 truncate"
                                      title={item.service_description || ''}
                                    >
                                      {item.service_description || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.program || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.location_region || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {item.modifier_1 ? (item.modifier_1_details ? `${item.modifier_1} - ${item.modifier_1_details}` : item.modifier_1) : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {item.modifier_2 ? (item.modifier_2_details ? `${item.modifier_2} - ${item.modifier_2_details}` : item.modifier_2) : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {item.modifier_3 ? (item.modifier_3_details ? `${item.modifier_3} - ${item.modifier_3_details}` : item.modifier_3) : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {item.modifier_4 ? (item.modifier_4_details ? `${item.modifier_4} - ${item.modifier_4_details}` : item.modifier_4) : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {item.rate || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {item.duration_unit || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {durationUnit === '15 MINUTES' || durationUnit === 'PER HOUR' ? `$${hourlyRate.toFixed(2)}` : 'N/A'}
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
                })}
              </>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
