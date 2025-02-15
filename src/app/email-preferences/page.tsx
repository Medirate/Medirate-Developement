"use client";

import { useState } from "react";
import AppLayout from "@/app/components/applayout";

export default function EmailPreferences() {
  const [abaPreferences, setAbaPreferences] = useState<string[]>([]);
  const [personalCarePreferences, setPersonalCarePreferences] = useState<string[]>([]);
  const [abaStates, setAbaStates] = useState<string[]>([]);
  const [pcaStates, setPcaStates] = useState<string[]>([]);
  const [isAbaDropdownOpen, setIsAbaDropdownOpen] = useState(false);
  const [isPcaDropdownOpen, setIsPcaDropdownOpen] = useState(false);
  const [isAbaCategoriesOpen, setIsAbaCategoriesOpen] = useState(false);
  const [isPcaCategoriesOpen, setIsPcaCategoriesOpen] = useState(false);

  const handleSave = () => {
    // Save the preferences (placeholder)
    alert("Email preferences saved!");
  };

  const states = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
    "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
    "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
    "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico",
    "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
    "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
    "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
  ];

  const handleStateSelection = (e: React.ChangeEvent<HTMLInputElement>, state: string, currentStates: string[], setStates: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (e.target.checked) {
      setStates([...currentStates, state]);
    } else {
      setStates(currentStates.filter((s) => s !== state));
    }
  };

  return (
    <AppLayout activeTab="emailPreferences">
      <h1 className="text-5xl md:text-6xl text-[#012C61] font-lemonMilkRegular uppercase mb-8 text-center">
        Email Preferences
      </h1>

      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg p-6">
        <div className="grid grid-cols-2 gap-8">
          {/* Applied Behavior Analysis Section */}
          <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold text-[#012C61] mb-4">Applied Behavior Analysis</h2>
            <div className="relative mb-4">
              <button
                className="w-full bg-white p-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-between shadow-sm"
                onClick={() => setIsAbaDropdownOpen(!isAbaDropdownOpen)}
              >
                <span>Select States</span>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transform transition-transform ${isAbaDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              {isAbaDropdownOpen && (
                <div className="absolute z-10 w-full bg-white border rounded shadow mt-1">
                  {states.map((state) => (
                    <label key={state} className="block px-2 py-1">
                      <input
                        type="checkbox"
                        checked={abaStates.includes(state)}
                        onChange={(e) => handleStateSelection(e, state, abaStates, setAbaStates)}
                        className="mr-2"
                      />
                      {state}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="relative mb-4">
              <button
                className="w-full bg-white p-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-between shadow-sm"
                onClick={() => setIsAbaCategoriesOpen(!isAbaCategoriesOpen)}
              >
                <span>Select Categories</span>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transform transition-transform ${isAbaCategoriesOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              {isAbaCategoriesOpen && (
                <div className="absolute z-10 w-full bg-white border rounded shadow mt-1 max-h-60 overflow-y-auto">
                  {["Therapy: OT, PT, ST", "FQHC/RHC", "Home and Community Based Services", "Home Health", "Intellectual and Developmental Disability (IDD) Services", "Prescribed Pediatric Extended Care (PPEC)", "Ambulance/Medical Transportation", "Ambulatory Surgery Center", "Anesthesia", "Behavioral Health and/or Substance Use Disorder Treatment", "Brain Injury", "Community Health Workers", "Dental", "Diagnostic Imaging", "Durable Medical Equipment (DME)", "Family Planning", "Laboratory", "Managed Care", "Maternal Health", "Medical Supplies", "Nurse", "Nursing Facility", "Nutrition", "Pharmacy", "Physician", "Physician Administered Drugs", "Prescription Drugs", "Social Services", "Telemedicine & Remote Patient Monitoring (RPM)", "Vision", "General Medicaid", "340B"].map((category) => (
                  <label key={category} className="block px-2 py-1">
                    <input
                      type="checkbox"
                      checked={abaPreferences.includes(category)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAbaPreferences([...abaPreferences, category]);
                        } else {
                          setAbaPreferences(abaPreferences.filter((pref) => pref !== category));
                        }
                      }}
                      className="mr-2"
                    />
                    {category}
                  </label>
                ))}
                </div>
              )}
            </div>
          </div>

          {/* Personal Care Section */}
          <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold text-[#012C61] mb-4">Personal Care</h2>
            <div className="relative mb-4">
              <button
                className="w-full bg-white p-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-between shadow-sm"
                onClick={() => setIsPcaDropdownOpen(!isPcaDropdownOpen)}
              >
                <span>Select States</span>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transform transition-transform ${isPcaDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              {isPcaDropdownOpen && (
                <div className="absolute z-10 w-full bg-white border rounded shadow mt-1">
                  {states.map((state) => (
                    <label key={state} className="block px-2 py-1">
                      <input
                        type="checkbox"
                        checked={pcaStates.includes(state)}
                        onChange={(e) => handleStateSelection(e, state, pcaStates, setPcaStates)}
                        className="mr-2"
                      />
                      {state}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="relative mb-4">
              <button
                className="w-full bg-white p-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-between shadow-sm"
                onClick={() => setIsPcaCategoriesOpen(!isPcaCategoriesOpen)}
              >
                <span>Select Categories</span>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transform transition-transform ${isPcaCategoriesOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              {isPcaCategoriesOpen && (
                <div className="absolute z-10 w-full bg-white border rounded shadow mt-1 max-h-60 overflow-y-auto">
                  {["Private Duty Nursing", "Home Health", "Hospice", "Hospital", "Nursing Facility", "Prescribed Pediatric Extended Care (PPEC)", "Ambulance/Medical Transportation", "Ambulatory Surgery Center", "Anesthesia", "Behavioral Health and/or Substance Use Disorder Treatment", "Brain Injury", "Community Health Workers", "Dental", "Diagnostic Imaging", "Durable Medical Equipment (DME)", "Family Planning", "Laboratory", "Managed Care", "Maternal Health", "Medical Supplies", "Nurse", "Nutrition", "Pharmacy", "Physician", "Physician Administered Drugs", "Prescription Drugs", "Social Services", "Telemedicine & Remote Patient Monitoring (RPM)", "Vision", "General Medicaid", "340B"].map((category) => (
                  <label key={category} className="block px-2 py-1">
                    <input
                      type="checkbox"
                      checked={personalCarePreferences.includes(category)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setPersonalCarePreferences([...personalCarePreferences, category]);
                        } else {
                          setPersonalCarePreferences(personalCarePreferences.filter((pref) => pref !== category));
                        }
                      }}
                      className="mr-2"
                    />
                    {category}
                  </label>
                ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4 mt-8">
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-[#012C61] text-white rounded-lg hover:bg-blue-800"
          >
            Save Changes
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
