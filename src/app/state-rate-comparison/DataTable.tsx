import { useMemo, useState } from 'react';
import { FilterSet, ServiceData } from './types';

interface DataTableProps {
  filterSets: FilterSet[];
  latestRates: ServiceData[];
  selectedProgram: string;
  selectedLocationRegion: string;
  selectedModifier: string;
  selectedServiceDescription: string;
  selectedProviderType: string;
  selectedTableRows: { [state: string]: string[] };
  isAllStatesSelected: boolean;
  onRowSelection: (state: string, item: ServiceData) => void;
  formatText: (text: string | null | undefined) => string;
  selectedEntries: { [state: string]: ServiceData[] };
}

const ITEMS_PER_PAGE = 25;

export const DataTable = ({
  filterSets,
  latestRates,
  selectedProgram,
  selectedLocationRegion,
  selectedModifier,
  selectedServiceDescription,
  selectedProviderType,
  selectedTableRows,
  isAllStatesSelected,
  onRowSelection,
  formatText,
  selectedEntries
}: DataTableProps) => {
  // Track current page for each filter set
  const [currentPages, setCurrentPages] = useState<{ [filterIndex: number]: number }>({});

  const handlePageChange = (filterIndex: number, page: number) => {
    setCurrentPages(prev => ({ ...prev, [filterIndex]: page }));
  };

  const tableContent = useMemo(() => {
    if (isAllStatesSelected) return null;
    
    return filterSets.map((filterSet, filterIndex) => {
      const grouped: { [key: string]: ServiceData[] } = {};
      latestRates.forEach(item => {
        if (
          item.service_category === filterSet.serviceCategory &&
          filterSet.states.includes(item.state_name?.trim().toUpperCase()) &&
          item.service_code === filterSet.serviceCode &&
          (!selectedProgram || item.program === selectedProgram) &&
          (!selectedLocationRegion || item.location_region === selectedLocationRegion) &&
          (!selectedModifier || [item.modifier_1, item.modifier_2, item.modifier_3, item.modifier_4].includes(selectedModifier)) &&
          (!selectedServiceDescription || item.service_description === selectedServiceDescription) &&
          (!selectedProviderType || item.provider_type === selectedProviderType)
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

      return (
        <div key={filterIndex} className="mb-8 overflow-hidden rounded-lg shadow-lg">
          {Object.keys(groupedByState).length > 0 && (
            <div className="bg-[#012C61] text-white px-6 py-3 flex items-center">
              <div className="bg-white text-[#012C61] rounded-full w-6 h-6 flex items-center justify-center font-bold">
                {filterSet.number}
              </div>
            </div>
          )}
          {Object.entries(groupedByState).map(([state, items]) => (
            <div key={state} className="mb-8">
              <div className="font-lemonMilkRegular text-lg text-[#012C61] mb-2 mt-4">{state}</div>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="min-w-full bg-white">
                  <thead className="bg-white sticky top-0 z-10 shadow">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider"></th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">State</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Service Category</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Service Code</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Service Description</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Program</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Region</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 1</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 2</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 3</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Modifier 4</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Effective Date</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Provider Type</th>
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
                          className={`group relative transition-all duration-200 ease-in-out cursor-pointer ${
                            isSelected 
                              ? 'bg-blue-50 shadow-[0_0_0_1px_rgba(59,130,246,0.2)]' 
                              : 'hover:bg-gray-50 hover:shadow-[0_2px_4px_rgba(0,0,0,0.05)] hover:scale-[1.01] hover:z-10'
                          }`}
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {STATE_ABBREVIATIONS[item.state_name?.toUpperCase() || ""] || item.state_name || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {SERVICE_CATEGORY_ABBREVIATIONS[item.service_category?.trim().toUpperCase() || ""] || item.service_category || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatText(item.service_code)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-[220px]">
                            <div className="relative group">
                              <span className="truncate block group-hover:text-blue-600 transition-colors duration-200" title={item.service_description || '-'}>
                                {item.service_description && item.service_description.length > 30
                                  ? item.service_description.slice(0, 30) + '...'
                                  : item.service_description || '-'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatText(item.program)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatText(item.location_region)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatText(item.modifier_1)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatText(item.modifier_2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatText(item.modifier_3)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatText(item.modifier_4)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.rate}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(item.rate_effective_date).toLocaleDateString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatText(item.provider_type)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center py-4">
              <button
                onClick={() => handlePageChange(filterIndex, Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 mx-1 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
              >
                Previous
              </button>
              {/* Page numbers with ellipsis */}
              {(() => {
                const maxVisible = 5;
                let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                let end = Math.min(totalPages, start + maxVisible - 1);
                if (end - start + 1 < maxVisible) {
                  start = Math.max(1, end - maxVisible + 1);
                }
                const pages = [];
                if (start > 1) {
                  pages.push(
                    <button
                      key={1}
                      onClick={() => handlePageChange(filterIndex, 1)}
                      className={`px-3 py-1 mx-1 rounded-full ${currentPage === 1 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >1</button>
                  );
                  if (start > 2) pages.push(<span key="start-ellipsis" className="mx-1 text-gray-400">...</span>);
                }
                for (let page = start; page <= end; page++) {
                  pages.push(
                    <button
                      key={page}
                      onClick={() => handlePageChange(filterIndex, page)}
                      className={`px-3 py-1 mx-1 rounded-full ${currentPage === page ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >{page}</button>
                  );
                }
                if (end < totalPages) {
                  if (end < totalPages - 1) pages.push(<span key="end-ellipsis" className="mx-1 text-gray-400">...</span>);
                  pages.push(
                    <button
                      key={totalPages}
                      onClick={() => handlePageChange(filterIndex, totalPages)}
                      className={`px-3 py-1 mx-1 rounded-full ${currentPage === totalPages ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >{totalPages}</button>
                  );
                }
                return pages;
              })()}
              <button
                onClick={() => handlePageChange(filterIndex, Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 mx-1 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      );
    });
  }, [
    filterSets,
    latestRates,
    selectedProgram,
    selectedLocationRegion,
    selectedModifier,
    selectedServiceDescription,
    selectedProviderType,
    selectedEntries,
    isAllStatesSelected,
    onRowSelection,
    formatText,
    currentPages
  ]);

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