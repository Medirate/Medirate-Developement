"use client";

import { useState } from "react";
import AppLayout from "@/app/components/applayout";

// ✅ Full list of U.S. states (alphabetical order)
const STATES = [
  "ALABAMA", "ALASKA", "ARIZONA", "ARKANSAS", "CALIFORNIA", "COLORADO",
  "CONNECTICUT", "DELAWARE", "FLORIDA", "GEORGIA", "HAWAII", "IDAHO",
  "ILLINOIS", "INDIANA", "IOWA", "KANSAS", "KENTUCKY", "LOUISIANA",
  "MAINE", "MARYLAND", "MASSACHUSETTS", "MICHIGAN", "MINNESOTA",
  "MISSISSIPPI", "MISSOURI", "MONTANA", "NEBRASKA", "NEVADA",
  "NEW HAMPSHIRE", "NEW JERSEY", "NEW MEXICO", "NEW YORK",
  "NORTH CAROLINA", "NORTH DAKOTA", "OHIO", "OKLAHOMA", "OREGON",
  "PENNSYLVANIA", "RHODE ISLAND", "SOUTH CAROLINA", "SOUTH DAKOTA",
  "TENNESSEE", "TEXAS", "UTAH", "VERMONT", "VIRGINIA", "WASHINGTON",
  "WEST VIRGINIA", "WISCONSIN", "WYOMING"
];

// ✅ Full list of topical areas/categories (alphabetical order)
const CATEGORIES = [
  "340B", "AMBULANCE/MEDICAL TRANSPORTATION", "AMBULATORY SURGERY CENTER",
  "ANESTHESIA", "BEHAVIORAL HEALTH AND/OR SUBSTANCE USE DISORDER TREATMENT",
  "BRAIN INJURY", "COMMUNITY HEALTH WORKERS", "DENTAL",
  "DIAGNOSTIC IMAGING", "DURABLE MEDICAL EQUIPMENT (DME)", "FAMILY PLANNING",
  "FQHC/RHC", "GENERAL MEDICAID", "HOME AND COMMUNITY BASED SERVICES",
  "HOME HEALTH", "HOSPICE", "HOSPITAL", "INTELLECTUAL AND DEVELOPMENTAL DISABILITY (IDD) SERVICES",
  "LABORATORY", "MANAGED CARE", "MATERNAL HEALTH", "MEDICAL SUPPLIES",
  "NURSE", "NURSING FACILITY", "NUTRITION", "PHARMACY", "PHYSICIAN",
  "PHYSICIAN ADMINISTERED DRUGS", "PRESCRIBED PEDIATRIC EXTENDED CARE (PPEC)",
  "PRESCRIPTION DRUGS", "PRIVATE DUTY NURSING", "SOCIAL SERVICES",
  "TELEMEDICINE & REMOTE PATIENT MONITORING (RPM)", "THERAPY: OT, PT, ST",
  "VISION"
];

export default function EmailPreferences() {
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // ✅ Handle state selection toggle
  const handleStateChange = (state: string) => {
    setSelectedStates(prev =>
      prev.includes(state) ? prev.filter(s => s !== state) : [...prev, state]
    );
  };

  // ✅ Handle category selection toggle
  const handleCategoryChange = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  // ✅ Select/Deselect all states
  const toggleSelectAllStates = () => {
    setSelectedStates(selectedStates.length === STATES.length ? [] : [...STATES]);
  };

  // ✅ Select/Deselect all categories
  const toggleSelectAllCategories = () => {
    setSelectedCategories(selectedCategories.length === CATEGORIES.length ? [] : [...CATEGORIES]);
  };

  // Define the handleSave function
  const handleSave = () => {
    // Implement your save logic here
    console.log("Preferences saved:", selectedStates, selectedCategories);
  };

  return (
    <AppLayout activeTab="emailPreferences">
      <div className="max-w-[1400px] mx-auto p-6">
        <h1 className="text-5xl md:text-6xl font-lemonMilkRegular text-[#012C61] mb-8 text-center uppercase">
          EMAIL PREFERENCES
        </h1>
        <p className="text-gray-600 mb-8 text-center">
          Stay informed of Medicaid provider rate developments by selecting States and Categories for regular email updates.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* States Selection */}
          <div className="bg-white shadow-lg rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-[#012C61]">Select States</h2>
              <button 
                onClick={toggleSelectAllStates} 
                className="text-[#012C61] text-sm font-semibold hover:underline px-4 py-2 border border-[#012C61] rounded-lg transition-colors hover:bg-[#012C61] hover:text-white"
              >
                {selectedStates.length === STATES.length ? "Deselect All" : "Select All"}
              </button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {STATES.map(state => (
                <label key={state} className="flex items-center group p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                  <div className="w-full flex items-center">
                    <input 
                      type="checkbox" 
                      checked={selectedStates.includes(state)}
                      onChange={() => handleStateChange(state)}
                      className="h-5 w-5 text-[#012C61] focus:ring-[#012C61] rounded-md border-gray-300 flex-shrink-0"
                    />
                    <span className="ml-3 text-gray-800 text-sm font-medium group-hover:text-[#012C61]">{state}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Categories Selection */}
          <div className="bg-white shadow-lg rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-[#012C61]">Select Categories</h2>
              <button 
                onClick={toggleSelectAllCategories} 
                className="text-[#012C61] text-sm font-semibold hover:underline px-4 py-2 border border-[#012C61] rounded-lg transition-colors hover:bg-[#012C61] hover:text-white"
              >
                {selectedCategories.length === CATEGORIES.length ? "Deselect All" : "Select All"}
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {CATEGORIES.map(category => (
                <label key={category} className="flex items-center group p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                  <div className="w-full flex items-center">
                    <input 
                      type="checkbox" 
                      checked={selectedCategories.includes(category)}
                      onChange={() => handleCategoryChange(category)}
                      className="h-5 w-5 text-[#012C61] focus:ring-[#012C61] rounded-md border-gray-300 flex-shrink-0"
                    />
                    <span className="ml-3 text-gray-800 text-sm font-medium group-hover:text-[#012C61]">{category}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <button 
            onClick={handleSave}
            className="bg-[#012C61] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#023d85] transition-colors"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
