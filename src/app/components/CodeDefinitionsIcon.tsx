"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import Modal from './modal';
import { FaInfoCircle, FaSearch, FaTimes } from 'react-icons/fa';

interface CodeDefinition {
  category: string;
  state_name_cpt_codes: string;
  service_code: string;
  service_description: string;
}

export default function CodeDefinitionsIcon() {
  const [isOpen, setIsOpen] = useState(false);
  const [topPosition, setTopPosition] = useState('4rem');
  const [showTooltip, setShowTooltip] = useState(true);
  const [data, setData] = useState<CodeDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navbarRef = useRef<HTMLElement | null>(null);

  // Filtered data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    
    const lowerCaseSearch = searchTerm.toLowerCase();
    return data.filter(item => {
      const code = item.service_code?.toLowerCase() || '';
      const description = item.service_description?.toLowerCase() || '';
      return code.includes(lowerCaseSearch) || description.includes(lowerCaseSearch);
    });
  }, [data, searchTerm]);

  useEffect(() => {
    // Find the navbar element
    navbarRef.current = document.querySelector('nav');
    
    const updatePosition = () => {
      if (navbarRef.current) {
        const navbarHeight = navbarRef.current.offsetHeight;
        setTopPosition(`${navbarHeight + 16}px`);
      }
    };

    // Initial position update
    updatePosition();

    // Update position on window resize
    window.addEventListener('resize', updatePosition);

    // Cleanup
    return () => {
      window.removeEventListener('resize', updatePosition);
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/code-definations');
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const result = await response.json();
      
      // Ensure the data is an array
      if (Array.isArray(result)) {
        setData(result);
      } else {
        throw new Error('Invalid data format received from API');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load code definitions. Please try again later.');
      setData([]); // Reset data to empty array
    } finally {
      setLoading(false);
    }
  };

  const handleIconInteraction = () => {
    setShowTooltip(false);
    if (!isOpen) {
      fetchData();
    }
  };

  return (
    <>
      <div 
        className="fixed right-4"
        style={{ 
          top: topPosition,
          zIndex: 1000 // Higher than footer
        }}
      >
        {/* Tooltip */}
        {showTooltip && (
          <div className="relative mb-2">
            <div className="absolute right-16 bg-white p-3 rounded-lg shadow-lg border border-gray-200 animate-fade-in">
              <div className="text-sm text-gray-700">
                Click here to view code definitions
              </div>
              {/* Arrow pointing right */}
              <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white transform rotate-45 border-t border-r border-gray-200" />
            </div>
          </div>
        )}
        
        {/* Icon Button */}
        <button
          onClick={() => {
            setIsOpen(true);
            handleIconInteraction();
          }}
          onMouseEnter={handleIconInteraction}
          className="p-3 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors"
          aria-label="Open code definitions"
        >
          <FaInfoCircle className="h-8 w-8" />
        </button>
      </div>

      <Modal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        width="max-w-4xl"
        className="z-[1001]" // Higher than the icon
      >
        <div className="p-6 flex flex-col h-[80vh]">
          {/* Centered Heading */}
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-[#012C61] uppercase font-lemonMilkRegular">
              Code Definitions
            </h2>
          </div>
          
          {/* Search Bar */}
          <div className="mb-4 relative">
            <input
              type="text"
              placeholder="Search by code or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Clear search"
              >
                <FaTimes className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : error ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700">{error}</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-700">No matching code definitions found</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      State Name (CPT Codes)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Service Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Service Description
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.state_name_cpt_codes}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.service_code}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.service_description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
} 