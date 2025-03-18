"use client";

import { FaExclamationCircle } from 'react-icons/fa';

interface DataTableProps {
  columns: string[];
  data: any[];
  selectedRows: string[];
  onRowSelect: (id: string) => void;
}

export default function DataTable({ columns, data, selectedRows, onRowSelect }: DataTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg" style={{ maxHeight: '400px', overflowY: 'auto' }}>
      <table className="min-w-full bg-white" style={{ tableLayout: 'fixed' }}>
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            {columns.map((column) => (
              <th 
                key={column}
                className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.map((item) => (
            <tr 
              key={item.id}
              onClick={() => onRowSelect(item.id)}
              className={`${
                selectedRows.includes(item.id)
                  ? 'bg-blue-50 cursor-pointer'
                  : 'hover:bg-gray-50 cursor-pointer'
              } transition-colors`}
            >
              {columns.map((column) => (
                <td 
                  key={column}
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 truncate"
                  title={item[column] || ''}
                >
                  {item[column] || '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 