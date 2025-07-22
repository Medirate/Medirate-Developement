import { useMemo, useState } from 'react';
import { FilterSet, ServiceData } from './types';

interface DataTableProps {
  filterSets: FilterSet[];
  latestRates: ServiceData[];
  selectedTableRows: { [state: string]: string[] };
  isAllStatesSelected: boolean;
  onRowSelection: (state: string, item: ServiceData) => void;
  formatText: (text: string | null | undefined) => string;
  selectedEntries: { [state: string]: ServiceData[] };
  hideNumberBadge?: boolean;
  hideStateHeading?: boolean;
  stateColorMap?: { [state: string]: string };
}

const ITEMS_PER_PAGE = 25;

export const DataTable = ({
  filterSets,
  latestRates,
  selectedTableRows,
  isAllStatesSelected,
  onRowSelection,
  formatText,
  selectedEntries,
  hideNumberBadge = false,
  hideStateHeading = false,
  stateColorMap = {}
}: DataTableProps) => {
  // Track current page for each filter set
  const [currentPages, setCurrentPages] = useState<{ [filterIndex: number]: number }>({});

  const handlePageChange = (filterIndex: number, page: number) => {
    setCurrentPages(prev => ({ ...prev, [filterIndex]: page }));
  };

  const tableContent = useMemo(() => {
    return filterSets.map((filterSet, filterIndex) => {
      const grouped: { [key: string]: ServiceData[] } = {};
      latestRates.forEach(item => {
        const categoryMatch = item.service_category === filterSet.serviceCategory;
        const stateMatch = filterSet.states.includes(item.state_name?.trim().toUpperCase());
        
        // Handle multiple service codes (comma-separated)
        let codeMatch = false;
        if (filterSet.serviceCode) {
          if (filterSet.serviceCode.includes(',')) {
            // Handle multiple service codes
            const selectedCodes = filterSet.serviceCode.split(',').map(code => code.trim());
            codeMatch = selectedCodes.includes(item.service_code?.trim() || '');
          } else {
            // Handle single service code
            codeMatch = item.service_code === filterSet.serviceCode;
          }
        } else {
          codeMatch = true; // No service code filter
        }
        
        if (
          categoryMatch &&
          stateMatch &&
          codeMatch &&
          (!filterSet.program || item.program === filterSet.program) &&
          (!filterSet.locationRegion || item.location_region === filterSet.locationRegion) &&
          (!filterSet.modifier || [item.modifier_1, item.modifier_2, item.modifier_3, item.modifier_4].includes(filterSet.modifier)) &&
          (!filterSet.serviceDescription || item.service_description === filterSet.serviceDescription) &&
          (!filterSet.providerType || item.provider_type === filterSet.providerType)
        ) {
          const key = JSON.stringify({
            state_name: item.state_name,
            service_category: item.service_category,
            service_code: item.service_code,
            service_description: item.service_description,
            program: item.program,
            location_region: item.location_region,
            modifier_1: item.modifier_1,
            modifier_1_details: item.modifier_1_details,
            modifier_2: item.modifier_2,
            modifier_2_details: item.modifier_2_details,
            modifier_3: item.modifier_3,
            modifier_3_details: item.modifier_3_details,
            modifier_4: item.modifier_4,
            modifier_4_details: item.modifier_4_details,
            duration_unit: item.duration_unit,
            provider_type: item.provider_type
          });
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(item);
        }
      });
      
      // Only keep the latest entry for each group
      const filteredDataForSet = Object.values(grouped).map(entries => {
        return entries.reduce((latest, current) => {
          const latestDate = new Date(latest.rate_effective_date);
          const currentDate = new Date(current.rate_effective_date);
          return currentDate > latestDate ? current : latest;
        });
      });

      // Pagination logic
      const totalCount = filteredDataForSet.length;
      const currentPage = currentPages[filterIndex] || 1;
      const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
      const endIdx = startIdx + ITEMS_PER_PAGE;
      const paginatedData = filteredDataForSet.slice(startIdx, endIdx);
      const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

      const groupedByState = paginatedData.reduce((acc, item) => {
        const state = item.state_name?.trim();
        if (!state) return acc;
        if (!acc[state]) acc[state] = [];
        acc[state].push(item);
        return acc;
      }, {} as { [key: string]: ServiceData[] });

      // Calculate visible columns for this filter set's data
      const calculateVisibleColumns = (data: ServiceData[]) => {
        const columns: Record<string, boolean> = {
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
          rate_effective_date: false,
          provider_type: false,
        };
        data.forEach(item => {
          Object.keys(columns).forEach(key => {
            if (item[key as keyof ServiceData] && item[key as keyof ServiceData] !== '-') {
              columns[key] = true;
            }
          });
        });
        return columns;
      };

      const visibleColumns = calculateVisibleColumns(paginatedData);

      return (
        <div key={filterIndex} className="mb-8 overflow-hidden rounded-lg shadow-lg" style={
          Object.keys(groupedByState).length === 1 && stateColorMap && stateColorMap[Object.keys(groupedByState)[0]]
            ? { boxShadow: `0 0 0 3px ${stateColorMap[Object.keys(groupedByState)[0]]}55` }
            : { boxShadow: '0 0 0 2px #e5e7eb' }
        }>
          {/* Only show the state heading above the table if there is exactly one state */}
          {!hideStateHeading && Object.keys(groupedByState).length === 1 && (
            <div className="font-lemonMilkRegular text-lg text-[#012C61] mb-2 mt-4">{Object.keys(groupedByState)[0]}</div>
          )}
          {!hideNumberBadge && Object.keys(groupedByState).length > 0 && (
            <div className="bg-[#012C61] text-white px-6 py-3 flex items-center">
              <div className="bg-white text-[#012C61] rounded-full w-6 h-6 flex items-center justify-center font-bold">
                {filterSet.number}
              </div>
            </div>
          )}
          {Object.entries(groupedByState).map(([state, items]) => (
            <div key={state} className="mb-8">
              {/* Only show the state heading above each group if there are multiple states */}
              {!hideStateHeading && Object.keys(groupedByState).length > 1 && (
                <div className="font-lemonMilkRegular text-lg text-[#012C61] mb-2 mt-4">{state}</div>
              )}
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="min-w-full bg-white">
                  <thead className="bg-white sticky top-0 z-10 shadow">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider"></th>
                      {visibleColumns.state_name && (
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">State</th>
                      )}
                      {visibleColumns.service_category && (
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Service Category</th>
                      )}
                      {visibleColumns.service_code && (
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Service Code</th>
                      )}
                      {visibleColumns.service_description && (
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Service Description</th>
                      )}
                      {visibleColumns.rate && (
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                      )}
                      {visibleColumns.duration_unit && (
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Duration Unit</th>
                      )}
                      {visibleColumns.rate_effective_date && (
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Effective Date</th>
                      )}
                      {visibleColumns.provider_type && (
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Provider Type</th>
                      )}
                      {visibleColumns.modifier_1 && (
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 1</th>
                      )}
                      {visibleColumns.modifier_2 && (
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 2</th>
                      )}
                      {visibleColumns.modifier_3 && (
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 3</th>
                      )}
                      {visibleColumns.modifier_4 && (
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 4</th>
                      )}
                      {visibleColumns.program && (
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Program</th>
                      )}
                      {visibleColumns.location_region && (
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Region</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {items.map((item, index) => {
                      const rowKey = getRowKey(item);
                      const selectedArr = selectedEntries[state] || [];
                      const isSelected = selectedArr.some(i => getRowKey(i) === rowKey);
                      return (
                        <tr 
                          key={index} 
                          className={`group cursor-pointer hover:bg-gray-50 transition-colors duration-150 ${
                            isSelected ? 'bg-blue-50' : ''
                          }`}
                          style={{
                            borderLeft: Object.keys(groupedByState).length > 1 && stateColorMap[item.state_name] 
                              ? `4px solid ${stateColorMap[item.state_name]}` 
                              : undefined
                          }}
                          onClick={() => {
                            onRowSelection(item.state_name?.trim(), item);
                          }}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              {isSelected && (
                                <button
                                  onClick={e => { e.stopPropagation(); onRowSelection(item.state_name?.trim(), item); }}
                                  className="mr-1 p-0.5 rounded-full hover:bg-red-100 focus:outline-none"
                                  title="Deselect"
                                  style={{ lineHeight: 0 }}
                                >
                                  <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                                isSelected 
                                  ? 'border-blue-500 bg-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.2)]' 
                                  : 'border-gray-300 group-hover:border-blue-300 group-hover:shadow-[0_0_0_2px_rgba(59,130,246,0.1)]'
                              }`}>
                                {isSelected && (
                                  <svg 
                                    className="w-3 h-3 text-white transition-transform duration-200" 
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
                          {visibleColumns.state_name && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {STATE_ABBREVIATIONS[item.state_name?.toUpperCase() || ""] || item.state_name || '-'}
                            </td>
                          )}
                          {visibleColumns.service_category && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {SERVICE_CATEGORY_ABBREVIATIONS[item.service_category?.trim().toUpperCase() || ""] || item.service_category || '-'}
                            </td>
                          )}
                          {visibleColumns.service_code && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatText(item.service_code)}</td>
                          )}
                          {visibleColumns.service_description && (
                            <td className="px-6 py-4 text-sm text-gray-900 max-w-[220px] truncate" title={item.service_description || '-'}>{item.service_description || '-'}</td>
                          )}
                          {visibleColumns.rate && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatRate(item.rate)}</td>
                          )}
                          {visibleColumns.duration_unit && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatText(item.duration_unit)}</td>
                          )}
                          {visibleColumns.rate_effective_date && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(item.rate_effective_date)}</td>
                          )}
                          {visibleColumns.provider_type && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatText(item.provider_type)}</td>
                          )}
                          {visibleColumns.modifier_1 && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.modifier_1 ? (
                                item.modifier_1_details ? 
                                  `${item.modifier_1} - ${item.modifier_1_details}` : 
                                  item.modifier_1
                              ) : '-'}
                            </td>
                          )}
                          {visibleColumns.modifier_2 && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.modifier_2 ? (
                                item.modifier_2_details ? 
                                  `${item.modifier_2} - ${item.modifier_2_details}` : 
                                  item.modifier_2
                              ) : '-'}
                            </td>
                          )}
                          {visibleColumns.modifier_3 && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.modifier_3 ? (
                                item.modifier_3_details ? 
                                  `${item.modifier_3} - ${item.modifier_3_details}` : 
                                  item.modifier_3
                              ) : '-'}
                            </td>
                          )}
                          {visibleColumns.modifier_4 && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.modifier_4 ? (
                                item.modifier_4_details ? 
                                  `${item.modifier_4} - ${item.modifier_4_details}` : 
                                  item.modifier_4
                              ) : '-'}
                            </td>
                          )}
                          {visibleColumns.program && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatText(item.program)}</td>
                          )}
                          {visibleColumns.location_region && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatText(item.location_region)}</td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Pagination controls for this state */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-4">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(filterIndex, Math.max(currentPage - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => handlePageChange(filterIndex, Math.min(currentPage + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    });
  }, [filterSets, latestRates, selectedEntries, currentPages, onRowSelection, formatText, stateColorMap]);

  return tableContent;
};

// Add abbreviations mappings (copy from historical rates)
const SERVICE_CATEGORY_ABBREVIATIONS: Record<string, string> = {
  "APPLIED BEHAVIOR ANALYSIS": "ABA",
  "APPLIED BEHAVIORAL ANALYSIS (ABA)": "ABA",
  "BEHAVIORAL HEALTH": "BH",
  "BEHAVIORAL HEALTH AND/OR SUBSTANCE USE DISORDER SERVICES": "BH/SUD",
  "HOME AND COMMUNITY BASED SERVICES": "HCBS",
  // Add more as needed
};

const STATE_ABBREVIATIONS: Record<string, string> = {
  "ALABAMA": "AL",
  "ALASKA": "AK",
  "ARIZONA": "AZ",
  "ARKANSAS": "AR",
  "CALIFORNIA": "CA",
  "COLORADO": "CO",
  "CONNECTICUT": "CT",
  "DELAWARE": "DE",
  "FLORIDA": "FL",
  "GEORGIA": "GA",
  "HAWAII": "HI",
  "IDAHO": "ID",
  "ILLINOIS": "IL",
  "INDIANA": "IN",
  "IOWA": "IA",
  "KANSAS": "KS",
  "KENTUCKY": "KY",
  "LOUISIANA": "LA",
  "MAINE": "ME",
  "MARYLAND": "MD",
  "MASSACHUSETTS": "MA",
  "MICHIGAN": "MI",
  "MINNESOTA": "MN",
  "MISSISSIPPI": "MS",
  "MISSOURI": "MO",
  "MONTANA": "MT",
  "NEBRASKA": "NE",
  "NEVADA": "NV",
  "NEW HAMPSHIRE": "NH",
  "NEW JERSEY": "NJ",
  "NEW MEXICO": "NM",
  "NEW YORK": "NY",
  "NORTH CAROLINA": "NC",
  "NORTH DAKOTA": "ND",
  "OHIO": "OH",
  "OKLAHOMA": "OK",
  "OREGON": "OR",
  "PENNSYLVANIA": "PA",
  "RHODE ISLAND": "RI",
  "SOUTH CAROLINA": "SC",
  "SOUTH DAKOTA": "SD",
  "TENNESSEE": "TN",
  "TEXAS": "TX",
  "UTAH": "UT",
  "VERMONT": "VT",
  "VIRGINIA": "VA",
  "WASHINGTON": "WA",
  "WEST VIRGINIA": "WV",
  "WISCONSIN": "WI",
  "WYOMING": "WY",
  // Add more if needed
};

// Generate a stable unique key for a row
function getRowKey(item: ServiceData) {
  return [
    item.state_name,
    item.service_category,
    item.service_code,
    item.service_description,
    item.program,
    item.location_region,
    item.modifier_1,
    item.modifier_1_details,
    item.modifier_2,
    item.modifier_2_details,
    item.modifier_3,
    item.modifier_3_details,
    item.modifier_4,
    item.modifier_4_details,
    item.duration_unit,
    item.provider_type
  ].map(x => x ?? '').join('|');
}

// Helper function to format rates with 2 decimal points
const formatRate = (rate: string | undefined) => {
  if (!rate) return '-';
  // Remove any existing $ and parse as number
  const numericRate = parseFloat(rate.replace(/[^0-9.-]/g, ''));
  if (isNaN(numericRate)) return rate; // Return original if not a valid number
  return `$${numericRate.toFixed(2)}`;
};

// Add a formatDate helper to display dates as MM/DD/YYYY - timezone-safe version
function formatDate(dateString: string | undefined): string {
  if (!dateString) return '-';
  
  // Handle both YYYY-MM-DD and MM/DD/YYYY formats
  let year: number, month: number, day: number;
  
  if (dateString.includes('/')) {
    // MM/DD/YYYY format
    const [monthStr, dayStr, yearStr] = dateString.split('/');
    month = parseInt(monthStr, 10);
    day = parseInt(dayStr, 10);
    year = parseInt(yearStr, 10);
  } else if (dateString.includes('-')) {
    // YYYY-MM-DD format
    const [yearStr, monthStr, dayStr] = dateString.split('-');
    year = parseInt(yearStr, 10);
    month = parseInt(monthStr, 10);
    day = parseInt(dayStr, 10);
  } else {
    // Fallback for unexpected formats - use timezone-safe parsing
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
  }
  
  // Validate the parsed values
  if (isNaN(year) || isNaN(month) || isNaN(day) || 
      month < 1 || month > 12 || day < 1 || day > 31) {
    return dateString; // Return original if invalid
  }
  
  // Return in MM/DD/YYYY format
  return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
} 