"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import AppLayout from "@/app/components/applayout";
import { FaSpinner, FaExclamationCircle, FaChevronDown } from 'react-icons/fa';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useData, ServiceData } from "@/context/DataContext";

// Update the useClickOutside hook to use HTMLDivElement
const useClickOutside = (ref: React.RefObject<HTMLDivElement | null>, callback: () => void) => {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref, callback]);
};

export default function Dashboard() {
  // Always call hooks at the top level
  const { data, loading, error } = useData();

  // Filter states
  const [selectedServiceCategory, setSelectedServiceCategory] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedServiceCode, setSelectedServiceCode] = useState("");
  const [selectedServiceDescription, setSelectedServiceDescription] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedLocationRegion, setSelectedLocationRegion] = useState("");
  const [selectedModifier, setSelectedModifier] = useState("");
  const [startDate, setStartDate] = useState(new Date(2000, 0, 1));
  const [endDate, setEndDate] = useState(new Date());

  // Visibility states for dropdowns
  const [showServiceCategoryDropdown, setShowServiceCategoryDropdown] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showServiceCodeDropdown, setShowServiceCodeDropdown] = useState(false);
  const [showServiceDescriptionDropdown, setShowServiceDescriptionDropdown] = useState(false);
  const [showProgramDropdown, setShowProgramDropdown] = useState(false);
  const [showLocationRegionDropdown, setShowLocationRegionDropdown] = useState(false);
  const [showModifierDropdown, setShowModifierDropdown] = useState(false);

  // Unique filter options
  const [serviceCategories, setServiceCategories] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [serviceCodes, setServiceCodes] = useState<string[]>([]);
  const [serviceDescriptions, setServiceDescriptions] = useState<string[]>([]);
  const [programs, setPrograms] = useState<string[]>([]);
  const [locationRegions, setLocationRegions] = useState<string[]>([]);
  const [modifiers, setModifiers] = useState<{ value: string; label: string }[]>([]);

  // Calculate dynamic height based on window size
  const [visibleRows, setVisibleRows] = useState(5); // Default to a minimum number of rows

  // Add refs for each dropdown
  const serviceCategoryRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<HTMLDivElement>(null);
  const serviceCodeRef = useRef<HTMLDivElement>(null);
  const serviceDescriptionRef = useRef<HTMLDivElement>(null);
  const programRef = useRef<HTMLDivElement>(null);
  const locationRegionRef = useRef<HTMLDivElement>(null);
  const modifierRef = useRef<HTMLDivElement>(null);

  // Use the click-outside hook for each dropdown
  useClickOutside(serviceCategoryRef, () => setShowServiceCategoryDropdown(false));
  useClickOutside(stateRef, () => setShowStateDropdown(false));
  useClickOutside(serviceCodeRef, () => setShowServiceCodeDropdown(false));
  useClickOutside(serviceDescriptionRef, () => setShowServiceDescriptionDropdown(false));
  useClickOutside(programRef, () => setShowProgramDropdown(false));
  useClickOutside(locationRegionRef, () => setShowLocationRegionDropdown(false));
  useClickOutside(modifierRef, () => setShowModifierDropdown(false));

  const filteredData = useMemo(() => {
    return data.filter(item => {
      // Date filter
      const effectiveDate = new Date(item.rate_effective_date);
      if (effectiveDate < startDate || effectiveDate > endDate) return false;

      // Service Category filter
      if (selectedServiceCategory && item.service_category !== selectedServiceCategory) return false;

      // State filter
      if (selectedState && item.state_name !== selectedState) return false;

      // Service Code filter
      if (selectedServiceCode && item.service_code !== selectedServiceCode) return false;

      // Program filter
      if (selectedProgram && item.program !== selectedProgram) return false;

      // Location/Region filter
      if (selectedLocationRegion && item.location_region !== selectedLocationRegion) return false;

      // Modifier filter (check all modifier columns)
      if (selectedModifier) {
        // Extract just the modifier code from the selected value
        const selectedModifierCode = selectedModifier.split(' - ')[0];
        
        const hasModifier = 
          (item.modifier_1 && item.modifier_1.split(' - ')[0] === selectedModifierCode) ||
          (item.modifier_2 && item.modifier_2.split(' - ')[0] === selectedModifierCode) ||
          (item.modifier_3 && item.modifier_3.split(' - ')[0] === selectedModifierCode) ||
          (item.modifier_4 && item.modifier_4.split(' - ')[0] === selectedModifierCode);
        if (!hasModifier) return false;
      }

      return true;
    });
  }, [
    data,
    startDate,
    endDate,
    selectedServiceCategory,
    selectedState,
    selectedServiceCode,
    selectedProgram,
    selectedLocationRegion,
    selectedModifier
  ]);

  // Add sorting state at the top of the component
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Add sorting function
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      let valueA, valueB;

      switch (sortConfig.key) {
        case 'rate':
        case 'rate_per_hour':
          valueA = parseFloat(a[sortConfig.key] || '0');
          valueB = parseFloat(b[sortConfig.key] || '0');
          break;
        case 'rate_effective_date':
          valueA = new Date(a[sortConfig.key]);
          valueB = new Date(b[sortConfig.key]);
          break;
        default:
          valueA = a[sortConfig.key] || '';
          valueB = b[sortConfig.key] || '';
      }

      if (valueA < valueB) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Add sort handler
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Add sort indicator component
  const SortIndicator = ({ sortKey }: { sortKey: string }) => {
    if (!sortConfig || sortConfig.key !== sortKey) return null;
    return (
      <span className="ml-1">
        {sortConfig.direction === 'asc' ? '▲' : '▼'}
      </span>
    );
  };

  useEffect(() => {
    const calculateTableHeight = () => {
      const windowHeight = window.innerHeight;
      const headerHeight = 200; // Approximate height of header and other elements
      const rowHeight = 50; // Approximate height of each row
      const maxRows = Math.floor((windowHeight - headerHeight) / rowHeight);
      
      setVisibleRows(maxRows); // Show all rows that fit
    };

    calculateTableHeight(); // Initial calculation

    const handleResize = () => {
      calculateTableHeight();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (data.length > 0) {
      extractFilters(data);
    }
  }, [selectedServiceCategory, selectedState, selectedServiceCode, data]);

  useEffect(() => {
    console.log('Total data:', data.length);
    console.log('Filtered data:', filteredData.length);
  }, [data, filteredData]);

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

  const extractFilters = (data: ServiceData[]) => {
    let filteredData = data;
    
    // Apply all active filters
    if (selectedServiceCategory) {
      filteredData = filteredData.filter(item => item.service_category === selectedServiceCategory);
    }
    if (selectedState) {
      filteredData = filteredData.filter(item => item.state_name === selectedState);
    }
    if (selectedServiceCode) {
      filteredData = filteredData.filter(item => item.service_code === selectedServiceCode);
    }
    
    // Update all filter options based on the filtered data
    setServiceCategories([...new Set(data.map(item => item.service_category))]);
    setStates([...new Set(data.map(item => item.state_name))]);
    
    // Sort service codes: numbers first (ascending), then letters (alphabetical)
    const sortedServiceCodes = [...new Set(filteredData.map(item => item.service_code))].sort((a, b) => {
      const isANumber = !isNaN(Number(a));
      const isBNumber = !isNaN(Number(b));
      
      if (isANumber && isBNumber) {
        return Number(a) - Number(b); // Sort numbers in ascending order
      } else if (isANumber) {
        return -1; // Numbers come before letters
      } else if (isBNumber) {
        return 1; // Letters come after numbers
      } else {
        return a.localeCompare(b); // Sort letters alphabetically
      }
    });
    setServiceCodes(sortedServiceCodes);
    
    setServiceDescriptions([...new Set(filteredData.map(item => item.service_description || ''))]);
    setPrograms([...new Set(filteredData.map(item => item.program || ''))]);
    setLocationRegions([...new Set(filteredData.map(item => item.location_region || ''))]);
    
    const allModifiers = filteredData.flatMap(item => [
      item.modifier_1 ? `${item.modifier_1} - ${item.modifier_1_details || 'No details'}` : null,
      item.modifier_2 ? `${item.modifier_2} - ${item.modifier_2_details || 'No details'}` : null,
      item.modifier_3 ? `${item.modifier_3} - ${item.modifier_3_details || 'No details'}` : null,
      item.modifier_4 ? `${item.modifier_4} - ${item.modifier_4_details || 'No details'}` : null
    ]).filter(Boolean);
    setModifiers([...new Set(allModifiers)].map(modifier => ({
      value: modifier || '',
      label: modifier || ''
    })));
  };

  const toggleDropdown = (dropdownSetter: React.Dispatch<React.SetStateAction<boolean>>, otherSetters: React.Dispatch<React.SetStateAction<boolean>>[]) => {
    // Close all other dropdowns
    otherSetters.forEach(setter => setter(false));
    // Toggle the current dropdown
    dropdownSetter(prev => !prev);
  };

  const handleServiceCategoryChange = (category: string) => {
    setSelectedServiceCategory(category);
    setSelectedState("");
    setSelectedServiceCode("");
    setSelectedProgram("");
    setSelectedLocationRegion("");
    setSelectedModifier("");

    // Filter data based on selected category
    const filteredData = data.filter(item => item.service_category === category);
    
    // Update all filter options based on filtered data
    setStates([...new Set(filteredData.map(item => item.state_name))]);
    setServiceCodes([...new Set(filteredData.map(item => item.service_code))]);
    setPrograms([...new Set(filteredData.map(item => item.program || ''))]);
    setLocationRegions([...new Set(filteredData.map(item => item.location_region || ''))]);
    
    // Update modifiers
    const allModifiers = filteredData.flatMap(item => [
      item.modifier_1 ? `${item.modifier_1} - ${item.modifier_1_details || 'No details'}` : null,
      item.modifier_2 ? `${item.modifier_2} - ${item.modifier_2_details || 'No details'}` : null,
      item.modifier_3 ? `${item.modifier_3} - ${item.modifier_3_details || 'No details'}` : null,
      item.modifier_4 ? `${item.modifier_4} - ${item.modifier_4_details || 'No details'}` : null
    ]).filter(Boolean);
    setModifiers([...new Set(allModifiers)].map(modifier => ({
      value: modifier || '',
      label: modifier || ''
    })));
  };

  const handleStateChange = (state: string) => {
    setSelectedState(state);
    setSelectedServiceCode("");
    setSelectedProgram("");
    setSelectedLocationRegion("");
    setSelectedModifier("");

    // Filter data based on selected state
    const filteredData = data.filter(item => item.state_name === state);
    
    // Update filter options based on the selected state
    setServiceCodes([...new Set(filteredData.map(item => item.service_code))]);
    setPrograms([...new Set(filteredData.map(item => item.program || ''))]);
    setLocationRegions([...new Set(filteredData.map(item => item.location_region || ''))]);
    
    // Update modifiers
    const allModifiers = filteredData.flatMap(item => [
      item.modifier_1 ? `${item.modifier_1} - ${item.modifier_1_details || 'No details'}` : null,
      item.modifier_2 ? `${item.modifier_2} - ${item.modifier_2_details || 'No details'}` : null,
      item.modifier_3 ? `${item.modifier_3} - ${item.modifier_3_details || 'No details'}` : null,
      item.modifier_4 ? `${item.modifier_4} - ${item.modifier_4_details || 'No details'}` : null
    ]).filter(Boolean);
    setModifiers([...new Set(allModifiers)].map(modifier => ({
      value: modifier || '',
      label: modifier || ''
    })));
  };

  const handleServiceCodeChange = (code: string) => {
    setSelectedServiceCode(code);
    setSelectedProgram("");
    setSelectedLocationRegion("");
    setSelectedModifier("");

    // Filter data based on previous selections
    const filteredData = data.filter(item => 
      item.service_category === selectedServiceCategory &&
      item.state_name === selectedState &&
      item.service_code === code
    );
    
    // Update filter options
    setPrograms([...new Set(filteredData.map(item => item.program || ''))]);
    setLocationRegions([...new Set(filteredData.map(item => item.location_region || ''))]);
    
    // Update modifiers
    const allModifiers = filteredData.flatMap(item => [
      item.modifier_1 ? `${item.modifier_1} - ${item.modifier_1_details || 'No details'}` : null,
      item.modifier_2 ? `${item.modifier_2} - ${item.modifier_2_details || 'No details'}` : null,
      item.modifier_3 ? `${item.modifier_3} - ${item.modifier_3_details || 'No details'}` : null,
      item.modifier_4 ? `${item.modifier_4} - ${item.modifier_4_details || 'No details'}` : null
    ]).filter(Boolean);
    setModifiers([...new Set(allModifiers)].map(modifier => ({
      value: modifier || '',
      label: modifier || ''
    })));
  };

  const ClearButton = ({ onClick }: { onClick: () => void }) => (
    <button
      onClick={onClick}
      className="text-xs text-blue-500 hover:underline mt-1"
    >
      Clear
    </button>
  );

  // Add a resetFilters function
  const resetFilters = () => {
    setSelectedServiceCategory("");
    setSelectedState("");
    setSelectedServiceCode("");
    setSelectedServiceDescription("");
    setSelectedProgram("");
    setSelectedLocationRegion("");
    setSelectedModifier("");
    setServiceCodes([]);
    setStates([]);
    setPrograms([]);
    setLocationRegions([]);
    setModifiers([]);
  };

  // Update the dropdown selection logic
  const handleDropdownSelection = (setter: React.Dispatch<React.SetStateAction<string>>, value: string, type: string) => {
    setter(value);
    
    // Call the appropriate handler based on the filter type
    switch (type) {
      case 'serviceCategory':
        handleServiceCategoryChange(value);
        break;
      case 'state':
        handleStateChange(value);
        break;
      case 'serviceCode':
        handleServiceCodeChange(value);
        break;
      case 'program':
        // Add program-specific logic if needed
        break;
      case 'locationRegion':
        // Add location/region-specific logic if needed
        break;
      case 'modifier':
        // Add modifier-specific logic if needed
        break;
      default:
        break;
    }
    
    // Close all dropdowns
    setShowServiceCategoryDropdown(false);
    setShowStateDropdown(false);
    setShowServiceCodeDropdown(false);
    setShowServiceDescriptionDropdown(false);
    setShowProgramDropdown(false);
    setShowLocationRegionDropdown(false);
    setShowModifierDropdown(false);
  };

  return (
    <AppLayout activeTab="dashboard">
      <div className="p-4 sm:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
        {/* Error Message */}
        <ErrorMessage error={error} />

        {/* Heading and Date Range */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-5xl md:text-6xl text-[#012C61] font-lemonMilkRegular uppercase mb-3 sm:mb-0">
            Dashboard
          </h1>
          {/* Date Range Filter */}
          <div className="flex space-x-4">
            <div className="relative">
              <label className="block text-sm font-medium text-[#012C61] mb-2">Start Date</label>
              <DatePicker
                selected={startDate}
                onChange={(date: Date | null) => date && setStartDate(date)}
                selectsStart
                startDate={startDate}
                endDate={endDate}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2 text-gray-700 placeholder-gray-400"
              />
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-[#012C61] mb-2">End Date</label>
              <DatePicker
                selected={endDate}
                onChange={(date: Date | null) => date && setEndDate(date)}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2 text-gray-700 placeholder-gray-400"
              />
            </div>
          </div>
        </div>
        <button
          onClick={resetFilters}
          className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base bg-[#012C61] text-white rounded-lg hover:bg-blue-800 transition-colors mt-4 sm:mt-0 mb-4"
        >
          Reset All Filters
        </button>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Service Category */}
          <div className="relative p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow" ref={serviceCategoryRef}>
            <input
              type="text"
              value={selectedServiceCategory || ''}
              onChange={(e) => setSelectedServiceCategory(e.target.value)}
              placeholder="Search Service Category..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2 text-gray-700 placeholder-gray-400 bg-white"
            />
            <button
              onClick={() => toggleDropdown(setShowServiceCategoryDropdown, [
                setShowStateDropdown,
                setShowServiceCodeDropdown,
                setShowServiceDescriptionDropdown,
                setShowProgramDropdown,
                setShowLocationRegionDropdown,
                setShowModifierDropdown
              ])}
              className="absolute right-5 top-1/3 transform -translate-y-1/3 text-gray-500 hover:text-gray-700"
            >
              <FaChevronDown />
            </button>
            {showServiceCategoryDropdown && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {serviceCategories
                  .filter(category => !['HCBS', 'IDD'].includes(category))
                  .filter((category) =>
                    (category || '').toLowerCase().includes((selectedServiceCategory || '').toLowerCase())
                  )
                  .map((category) => (
                    <div
                      key={category}
                      onMouseDown={() => handleDropdownSelection(setSelectedServiceCategory, category, 'serviceCategory')}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#004aad]"
                    >
                      {category}
                    </div>
                  ))}
              </div>
            )}
            <ClearButton onClick={() => setSelectedServiceCategory("")} />
          </div>

          {/* State */}
          <div className="relative p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow" ref={stateRef}>
            <input
              type="text"
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              placeholder="Search State..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2 text-gray-700 placeholder-gray-400 bg-white"
            />
            <button
              onClick={() => toggleDropdown(setShowStateDropdown, [
                setShowServiceCategoryDropdown,
                setShowServiceCodeDropdown,
                setShowServiceDescriptionDropdown,
                setShowProgramDropdown,
                setShowLocationRegionDropdown,
                setShowModifierDropdown
              ])}
              className="absolute right-5 top-1/3 transform -translate-y-1/3 text-gray-500 hover:text-gray-700"
            >
              <FaChevronDown />
            </button>
            {showStateDropdown && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {states
                  .filter((state) =>
                    (state || '').toLowerCase().includes((selectedState || '').toLowerCase())
                  )
                  .map((state) => (
                    <div
                      key={state}
                      onMouseDown={() => handleDropdownSelection(setSelectedState, state, 'state')}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                    >
                      {state}
                    </div>
                  ))}
              </div>
            )}
            <ClearButton onClick={() => setSelectedState("")} />
          </div>

          {/* Service Code */}
          <div className="relative p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow" ref={serviceCodeRef}>
            <input
              type="text"
              value={selectedServiceCode}
              onChange={(e) => setSelectedServiceCode(e.target.value)}
              placeholder="Search Service Code..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2 text-gray-700 placeholder-gray-400 bg-white"
            />
            <button
              onClick={() => toggleDropdown(setShowServiceCodeDropdown, [
                setShowServiceCategoryDropdown,
                setShowStateDropdown,
                setShowServiceDescriptionDropdown,
                setShowProgramDropdown,
                setShowLocationRegionDropdown,
                setShowModifierDropdown
              ])}
              className="absolute right-5 top-1/3 transform -translate-y-1/3 text-gray-500 hover:text-gray-700"
            >
              <FaChevronDown />
            </button>
            {showServiceCodeDropdown && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {serviceCodes
                  .filter((code) =>
                    (code || '').toLowerCase().includes((selectedServiceCode || '').toLowerCase())
                  )
                  .map((code) => (
                    <div
                      key={code}
                      onMouseDown={() => handleDropdownSelection(setSelectedServiceCode, code, 'serviceCode')}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                    >
                      {code}
                    </div>
                  ))}
              </div>
            )}
            <ClearButton onClick={() => setSelectedServiceCode("")} />
          </div>

          {/* Modifier */}
          <div className="relative p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow" ref={modifierRef}>
            <input
              type="text"
              value={selectedModifier}
              onChange={(e) => setSelectedModifier(e.target.value)}
              placeholder="Search Modifier..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2 text-gray-700 placeholder-gray-400 bg-white"
            />
            <button
              onClick={() => toggleDropdown(setShowModifierDropdown, [
                setShowServiceCategoryDropdown,
                setShowStateDropdown,
                setShowServiceCodeDropdown,
                setShowServiceDescriptionDropdown,
                setShowProgramDropdown,
                setShowLocationRegionDropdown
              ])}
              className="absolute right-5 top-1/3 transform -translate-y-1/3 text-gray-500 hover:text-gray-700"
            >
              <FaChevronDown />
            </button>
            {showModifierDropdown && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {modifiers
                  .filter((modifier) =>
                    (modifier.label || '').toLowerCase().includes((selectedModifier || '').toLowerCase())
                  )
                  .map((modifier) => (
                    <div
                      key={modifier.value}
                      onMouseDown={() => handleDropdownSelection(setSelectedModifier, modifier.value, 'modifier')}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                    >
                      {modifier.label}
                    </div>
                  ))}
              </div>
            )}
            <ClearButton onClick={() => setSelectedModifier("")} />
          </div>

          {/* Service Description */}
          <div className="relative p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow col-span-2" ref={serviceDescriptionRef}>
            <input
              type="text"
              value={selectedServiceDescription}
              onChange={(e) => setSelectedServiceDescription(e.target.value)}
              placeholder="Search Service Description..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2 text-gray-700 placeholder-gray-400 bg-white"
            />
            <button
              onClick={() => toggleDropdown(setShowServiceDescriptionDropdown, [
                setShowServiceCategoryDropdown,
                setShowStateDropdown,
                setShowServiceCodeDropdown,
                setShowProgramDropdown,
                setShowLocationRegionDropdown,
                setShowModifierDropdown
              ])}
              className="absolute right-5 top-1/3 transform -translate-y-1/3 text-gray-500 hover:text-gray-700"
            >
              <FaChevronDown />
            </button>
            {showServiceDescriptionDropdown && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {serviceDescriptions
                  .filter((description) =>
                    (description || '').toLowerCase().includes((selectedServiceDescription || '').toLowerCase())
                  )
                  .map((description) => (
                    <div
                      key={description}
                      onMouseDown={() => handleDropdownSelection(setSelectedServiceDescription, description, 'serviceDescription')}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                    >
                      {description}
                    </div>
                  ))}
              </div>
            )}
            <ClearButton onClick={() => setSelectedServiceDescription("")} />
          </div>

          {/* Program */}
          <div className="relative p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow" ref={programRef}>
            <input
              type="text"
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              placeholder="Search Program..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2 text-gray-700 placeholder-gray-400 bg-white"
            />
            <button
              onClick={() => toggleDropdown(setShowProgramDropdown, [
                setShowServiceCategoryDropdown,
                setShowStateDropdown,
                setShowServiceCodeDropdown,
                setShowServiceDescriptionDropdown,
                setShowLocationRegionDropdown,
                setShowModifierDropdown
              ])}
              className="absolute right-5 top-1/3 transform -translate-y-1/3 text-gray-500 hover:text-gray-700"
            >
              <FaChevronDown />
            </button>
            {showProgramDropdown && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {programs
                  .filter((program) =>
                    (program || '').toLowerCase().includes((selectedProgram || '').toLowerCase())
                  )
                  .map((program) => (
                    <div
                      key={program}
                      onMouseDown={() => handleDropdownSelection(setSelectedProgram, program, 'program')}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                    >
                      {program}
                    </div>
                  ))}
              </div>
            )}
            <ClearButton onClick={() => setSelectedProgram("")} />
          </div>

          {/* Location/Region */}
          <div className="relative p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow" ref={locationRegionRef}>
            <input
              type="text"
              value={selectedLocationRegion}
              onChange={(e) => setSelectedLocationRegion(e.target.value)}
              placeholder="Search Location/Region..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2 text-gray-700 placeholder-gray-400 bg-white"
            />
            <button
              onClick={() => toggleDropdown(setShowLocationRegionDropdown, [
                setShowServiceCategoryDropdown,
                setShowStateDropdown,
                setShowServiceCodeDropdown,
                setShowServiceDescriptionDropdown,
                setShowProgramDropdown,
                setShowModifierDropdown
              ])}
              className="absolute right-5 top-1/3 transform -translate-y-1/3 text-gray-500 hover:text-gray-700"
            >
              <FaChevronDown />
            </button>
            {showLocationRegionDropdown && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {locationRegions
                  .filter((region) =>
                    (region || '').toLowerCase().includes((selectedLocationRegion || '').toLowerCase())
                  )
                  .map((region) => (
                    <div
                      key={region}
                      onMouseDown={() => handleDropdownSelection(setSelectedLocationRegion, region, 'locationRegion')}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                    >
                      {region}
                    </div>
                  ))}
              </div>
            )}
            <ClearButton onClick={() => setSelectedLocationRegion("")} />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center h-64">
            <FaSpinner className="animate-spin h-12 w-12 text-blue-500" />
            <p className="ml-4 text-gray-600">Loading data...</p>
        </div>
      )}

        {/* Data Table */}
        {!loading && (
          <div 
            className="rounded-lg shadow-lg bg-white"
            style={{ 
              maxHeight: '70vh', 
              overflow: 'auto',
              position: 'relative'
            }}
          >
            <table className="min-w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('state_name')}
                  >
                    State <SortIndicator sortKey="state_name" />
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('service_category')}
                  >
                    Service Category <SortIndicator sortKey="service_category" />
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('service_code')}
                  >
                    Service Code <SortIndicator sortKey="service_code" />
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('service_description')}
                  >
                    Service Description <SortIndicator sortKey="service_description" />
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('rate')}
                  >
                    Rate per Base Unit <SortIndicator sortKey="rate" />
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('rate_per_hour')}
                  >
                    Rate per Hour <SortIndicator sortKey="rate_per_hour" />
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('rate_effective_date')}
                  >
                    Effective Date <SortIndicator sortKey="rate_effective_date" />
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('program')}
                  >
                    Program <SortIndicator sortKey="program" />
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('location_region')}
                  >
                    Location/Region <SortIndicator sortKey="location_region" />
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 1</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 2</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 3</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 4</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Duration Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.state_name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.service_category || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.service_code || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.service_description || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.rate || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.rate_per_hour || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.rate_effective_date ? new Date(item.rate_effective_date).toLocaleDateString() : '-'}
                    </td>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.duration_unit || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      )}
      </div>

      {/* Custom CSS for select dropdowns */}
      <style jsx>{`
        select {
          appearance: none;
          background-color: white;
          background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%233b82f6%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
          background-repeat: no-repeat;
          background-position: right 0.75rem center;
          background-size: 0.75rem;
        }
        select:focus {
          outline: none;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
        }
      `}</style>
    </AppLayout>
  );
}
