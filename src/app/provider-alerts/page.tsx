"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/app/components/applayout";
import { Search } from "lucide-react"; // Importing the magnifying glass icon from Lucide

interface Alert {
  title: string;
  date: string;
  state_name?: string;
  attachment_url?: string;
}

export default function ProviderAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [states, setStates] = useState<string[]>([]);
  const [selectedState, setSelectedState] = useState<string>("");

  useEffect(() => {
    // Fetch Provider Alerts
    fetch("/api/rate-updates")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch data");
        }
        return response.json();
      })
      .then((data: Alert[]) => {
        const sortedData = data.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        setAlerts(sortedData);

        // Extract unique states for the filter and sort them alphabetically
        const uniqueStates: string[] = Array.from(
          new Set(
            sortedData
              .map((alert) => alert.state_name || "")
              .filter((state) => state !== "")
          )
        ).sort((a, b) => a.localeCompare(b));

        setStates(uniqueStates);
      })
      .catch((error) =>
        console.error("Error fetching provider alerts:", error)
      );
  }, []);

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch =
      alert.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesState = selectedState
      ? alert.state_name === selectedState
      : true;
    return matchesSearch && matchesState;
  });

  return (
    <AppLayout activeTab="providerAlerts">
      <h1 className="text-5xl md:text-6xl text-[#012C61] font-lemonMilkRegular uppercase mb-6">
        Provider Alerts
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
            placeholder="Search Provider Alerts"
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

      {/* Alerts List */}
      <div className="border rounded-md max-h-[600px] overflow-y-auto bg-gray-50 shadow-lg">
        {filteredAlerts.map((alert, index) => (
          <div
            key={index}
            className="flex justify-between items-center p-4 border-b last:border-b-0 hover:bg-gray-100 transition duration-300"
          >
            <div className="flex-1 break-words">
              <div className="flex items-center">
                <span className="font-semibold text-lg text-[#012C61]">
                  {alert.title}
                </span>
                {alert.attachment_url && (
                  <a
                    href={alert.attachment_url.split(",")[0].trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline text-sm ml-2"
                  >
                    [Read More]
                  </a>
                )}
              </div>
            </div>
            <div className="text-gray-600 text-sm">
              {new Date(alert.date).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
