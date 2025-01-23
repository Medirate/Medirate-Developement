"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/app/components/applayout";
import { Search } from "lucide-react";

// Define the type for a bill
interface Bill {
  id: number;
  state_code: string;
  state_bill_id: string;
  bill_name: string;
  last_action: string;
  sponsor_list: string[] | null;
  bill_progress: number | null;
  link: string;
}

export default function LegislativeUpdates() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [states, setStates] = useState<string[]>([]);
  const [selectedState, setSelectedState] = useState<string>("");

  useEffect(() => {
    fetch("/api/legislative-updates")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch data");
        }
        return response.json();
      })
      .then((data: Bill[]) => {
        const sortedData = data.sort((a, b) =>
          a.state_code.localeCompare(b.state_code)
        );
        setBills(sortedData);

        const uniqueStates = Array.from(
          new Set(sortedData.map((bill) => bill.state_code))
        ).sort();

        setStates(uniqueStates);
      })
      .catch((error) => console.error("Error fetching bills:", error));
  }, []);

  const filteredBills = bills.filter((bill) => {
    const matchesSearch = bill.bill_name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesState = selectedState
      ? bill.state_code === selectedState
      : true;
    return matchesSearch && matchesState;
  });

  return (
    <AppLayout activeTab="legislativeAlerts">
      <h1 className="text-5xl md:text-6xl text-[#012C61] font-lemonMilkRegular uppercase mb-6">
        Legislative Updates
      </h1>

      {/* Filters Section */}
      <div
        className="flex items-center justify-between p-4 rounded-lg mb-6 shadow-lg"
        style={{
          backgroundColor: "#004aad",
          borderRadius: "10px",
        }}
      >
        <div className="flex items-center flex-1 px-4 py-2 bg-[#4682d1] rounded-md">
          <Search size={20} className="text-white mr-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Legislative Updates"
            className="flex-1 bg-transparent border-none placeholder-white text-white focus:outline-none"
          />
        </div>

        <select
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          className="ml-4 px-4 py-2 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          style={{
            backgroundColor: "#4682d1",
            border: "none",
            color: "white",
          }}
        >
          <option value="">All States</option>
          {states.map((state, index) => (
            <option key={index} value={state}>
              {state}
            </option>
          ))}
        </select>
      </div>

      {/* Bills Table */}
      <div className="border rounded-md max-h-[600px] overflow-y-auto bg-gray-50 shadow-lg">
        <table
          className="min-w-full bg-white border-collapse"
          style={{ tableLayout: "fixed" }}
        >
          <thead className="sticky top-0 bg-white shadow">
            <tr className="border-b">
              <th className="text-left p-4 font-semibold text-sm text-[#012C61] border-b">
                State Code
              </th>
              <th className="text-left p-4 font-semibold text-sm text-[#012C61] border-b">
                State Bill ID
              </th>
              <th className="text-left p-4 font-semibold text-sm text-[#012C61] border-b">
                Bill Name
              </th>
              <th className="text-left p-4 font-semibold text-sm text-[#012C61] border-b">
                Last Action
              </th>
              <th
                className="text-left p-4 font-semibold text-sm text-[#012C61] border-b"
                style={{ width: "150px" }}
              >
                Sponsors
              </th>
              <th className="text-left p-4 font-semibold text-sm text-[#012C61] border-b">
                Progress
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredBills.map((bill, index) => (
              <tr key={`${bill.id}-${index}`} className="border-b hover:bg-gray-100">
                <td className="p-4 text-sm text-gray-700 border-b">
                  {bill.state_code}
                </td>
                <td className="p-4 text-sm text-blue-500 border-b">
                  <a
                    href={bill.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {bill.state_bill_id}
                  </a>
                </td>
                <td className="p-4 text-sm text-gray-700 border-b">
                  {bill.bill_name}
                </td>
                <td className="p-4 text-sm text-gray-700 border-b">
                  {bill.last_action}
                </td>
                <td
                  className="p-4 text-sm text-gray-700 border-b"
                  style={{
                    width: "150px",
                    wordWrap: "break-word",
                    whiteSpace: "normal",
                  }}
                >
                  {bill.sponsor_list ? bill.sponsor_list.join(", ") : "Null"}
                </td>
                <td className="p-4 text-sm text-gray-700 border-b">
                  {bill.bill_progress !== null
                    ? `${bill.bill_progress}%`
                    : "Null"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
