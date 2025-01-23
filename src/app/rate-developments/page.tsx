"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/app/components/applayout";
import { Search } from "lucide-react";

// Define the type for the datasets
interface Alert {
  title: string;
  date: string;
  state_name?: string;
  attachment_url?: string;
}

interface Bill {
  id: number;
  state_code: string;
  state_bill_id: string;
  bill_name: string;
  last_action: string;
  sponsor_list: string[] | null;
  bill_progress: string | null;
  link: string;
}

// Map state names to codes
const stateMap: { [key: string]: string } = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
};

// Include reverse mapping for easier access
const reverseStateMap = Object.fromEntries(
  Object.entries(stateMap).map(([key, value]) => [value, key])
);

export default function RateDevelopments() {
  const [providerAlerts, setProviderAlerts] = useState<Alert[]>([]);
  const [legislativeUpdates, setLegislativeUpdates] = useState<Bill[]>([]);

  const [providerSearch, setProviderSearch] = useState<string>("");
  const [legislativeSearch, setLegislativeSearch] = useState<string>("");

  const [selectedState, setSelectedState] = useState<string>("");

  useEffect(() => {
    // Fetch Provider Alerts
    fetch("/api/rate-updates")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch Provider Alerts data");
        }
        return response.json();
      })
      .then((data: Alert[]) => {
        setProviderAlerts(data);
      })
      .catch((error) => console.error("Error fetching provider alerts:", error));

    // Fetch Legislative Updates
    fetch("/api/legislative-updates")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch Legislative Updates data");
        }
        return response.json();
      })
      .then((data: Bill[]) => {
        setLegislativeUpdates(data);
      })
      .catch((error) => console.error("Error fetching legislative updates:", error));
  }, []);

  // Filtered data
  const filteredProviderAlerts = providerAlerts.filter((alert) => {
    const matchesSearch = alert.title
      .toLowerCase()
      .includes(providerSearch.toLowerCase());
    const matchesState = selectedState
      ? alert.state_name === reverseStateMap[selectedState]
      : true;
    return matchesSearch && matchesState;
  });

  const filteredLegislativeUpdates = legislativeUpdates.filter((bill) => {
    const matchesSearch = bill.bill_name
      .toLowerCase()
      .includes(legislativeSearch.toLowerCase());
    const matchesState = selectedState
      ? bill.state_code === selectedState
      : true;
    return matchesSearch && matchesState;
  });

  return (
    <AppLayout activeTab="rateDevelopments">
      <h1 className="text-5xl md:text-6xl text-[#012C61] font-lemonMilkRegular uppercase mb-6">
        Rate Developments
      </h1>

      {/* State Filter and Search Bar */}
      <div
        className="p-4 rounded-lg mb-6 shadow-lg"
        style={{ backgroundColor: "#004aad" }}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center flex-1 px-4 py-2 bg-[#4682d1] rounded-md mr-4">
            <Search size={20} className="text-white mr-2" />
            <input
              type="text"
              value={providerSearch}
              onChange={(e) => setProviderSearch(e.target.value)}
              placeholder="Search Provider Alerts"
              className="flex-1 bg-transparent border-none placeholder-white text-white focus:outline-none"
            />
          </div>
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="px-4 py-2 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            style={{ backgroundColor: "#4682d1", border: "none" }}
          >
            <option value="">All States</option>
            {Object.entries(stateMap).map(([name, code]) => (
              <option key={code} value={code}>
                {`${name} [${code}]`}
              </option>
            ))}
          </select>
          <div className="flex items-center flex-1 px-4 py-2 bg-[#4682d1] rounded-md ml-4">
            <Search size={20} className="text-white mr-2" />
            <input
              type="text"
              value={legislativeSearch}
              onChange={(e) => setLegislativeSearch(e.target.value)}
              placeholder="Search Legislative Updates"
              className="flex-1 bg-transparent border-none placeholder-white text-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Provider Alerts Table */}
        <div>
          <div className="border rounded-md max-h-[600px] overflow-y-auto bg-gray-50 shadow-lg">
            <table className="min-w-full bg-white border-collapse">
              <thead className="sticky top-0 bg-white shadow">
                <tr className="border-b">
                  <th className="text-left p-4 font-semibold text-sm text-[#012C61] border-b">
                    State Name
                  </th>
                  <th className="text-left p-4 font-semibold text-sm text-[#012C61] border-b">
                    Title
                  </th>
                  <th className="text-left p-4 font-semibold text-sm text-[#012C61] border-b">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProviderAlerts.map((alert, index) => (
                  <tr key={index} className="border-b hover:bg-gray-100">
                    <td className="p-4 text-sm text-gray-700 border-b">
                      {alert.state_name || "N/A"}
                    </td>
                    <td className="p-4 text-sm text-gray-700 border-b">
                      {alert.title}
                    </td>
                    <td className="p-4 text-sm text-gray-700 border-b">
                      {new Date(alert.date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legislative Updates Table */}
        <div>
          <div className="border rounded-md max-h-[600px] overflow-y-auto bg-gray-50 shadow-lg">
            <table className="min-w-full bg-white border-collapse">
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
                  <th className="text-left p-4 font-semibold text-sm text-[#012C61] border-b">
                    Sponsors
                  </th>
                  <th className="text-left p-4 font-semibold text-sm text-[#012C61] border-b">
                    Progress
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLegislativeUpdates.map((bill, index) => (
                  <tr key={index} className="border-b hover:bg-gray-100">
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
                    <td className="p-4 text-sm text-gray-700 border-b">
                      {bill.sponsor_list ? bill.sponsor_list.join(", ") : "N/A"}
                    </td>
                    <td className="p-4 text-sm text-gray-700 border-b">
                      {bill.bill_progress || "N/A"}
                    </td>
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
