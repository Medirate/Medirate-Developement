"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/app/components/applayout";

export default function LegislativeUpdates() {
  const [alerts, setAlerts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [states, setStates] = useState<string[]>([]);
  const [selectedState, setSelectedState] = useState("");

  useEffect(() => {
    // Fetch Provider Alerts (same API as provider alerts)
    fetch("/api/rate-updates")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch data");
        }
        return response.json();
      })
      .then((data) => {
        // Sort alerts by date (latest first)
        const sortedData = data.sort(
          (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        setAlerts(sortedData);

        // Extract unique states for the filter
        const uniqueStates = Array.from(
          new Set(sortedData.map((alert: any) => alert.state_name).filter(Boolean))
        );
        setStates(uniqueStates);
      })
      .catch((error) => console.error("Error fetching legislative updates:", error));
  }, []);

  // Filter alerts based on search query and selected state
  const filteredAlerts = alerts.filter((alert: any) => {
    const matchesSearch =
      alert.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesState = selectedState
      ? alert.state_name === selectedState
      : true;
    return matchesSearch && matchesState;
  });

  return (
    <AppLayout activeTab="legislativeAlerts">
      <h1 className="text-5xl md:text-6xl text-[#012C61] font-lemonMilkRegular uppercase mb-6">
        Legislative Updates
      </h1>

      {/* Filters Section */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search Legislative Updates"
          className="w-full px-4 py-2 border rounded-md"
        />
        <select
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          className="w-full px-4 py-2 border rounded-md"
        >
          <option value="">All States</option>
          {states.map((state, index) => (
            <option key={index} value={state}>
              {state}
            </option>
          ))}
        </select>
      </div>

      {/* Alerts List with Scroll */}
      <div className="border rounded-md max-h-[600px] overflow-y-auto bg-gray-50 shadow-lg">
        {filteredAlerts.map((alert: any, index: number) => (
          <div
            key={index}
            className="flex justify-between items-center p-4 border-b last:border-b-0 hover:bg-gray-100 transition duration-300"
          >
            {/* Title and Read More */}
            <div className="flex-1 break-words">
              <div className="flex items-center">
                <span className="font-semibold text-lg text-[#012C61]">
                  {alert.title}
                </span>
                {alert.attachment_url && (
                  <a
                    href={alert.attachment_url.split(",")[0].trim()} // Use the first URL from attachment_url
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline text-sm ml-2"
                  >
                    [Read More]
                  </a>
                )}
              </div>
            </div>
            {/* Date */}
            <div className="text-gray-600 text-sm">
              {new Date(alert.date).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
