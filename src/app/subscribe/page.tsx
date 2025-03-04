"use client";

import React, { useEffect, useState } from "react";
import Footer from "@/app/components/footer";
import { CreditCard } from "lucide-react"; // Using Lucide icon
import Select from "react-select";

interface ServiceData {
  state_name: string;
  service_category: string;
  service_code: string;
  // ... other fields
}

const StripePricingTableWithFooter = () => {
  const [showTerms, setShowTerms] = useState(false);
  const [data, setData] = useState<ServiceData[]>([]);
  const [serviceCategories, setServiceCategories] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [serviceCodes, setServiceCodes] = useState<string[]>([]);
  const [selectedServiceCategory, setSelectedServiceCategory] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedServiceCode, setSelectedServiceCode] = useState("");
  const [dataExists, setDataExists] = useState<boolean | null>(null);

  useEffect(() => {
    // Dynamically load the Stripe Pricing Table script
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/pricing-table.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script); // Clean up when component unmounts
    };
  }, []);

  useEffect(() => {
    // Fetch data for filters
    fetch("/api/state-payment-comparison")
      .then((response) => response.json())
      .then((data: ServiceData[]) => {
        setData(data);
        setServiceCategories([...new Set(data.map((item) => item.service_category))]);
      });
  }, []);

  const handleServiceCategoryChange = (category: string) => {
    setSelectedServiceCategory(category);
    setSelectedState("");
    setSelectedServiceCode("");
    const filteredStates = data
      .filter((item) => item.service_category === category)
      .map((item) => item.state_name);
    setStates([...new Set(filteredStates)]);
  };

  const handleStateChange = (state: string) => {
    setSelectedState(state);
    setSelectedServiceCode("");
    const filteredCodes = data
      .filter((item) => item.state_name === state && item.service_category === selectedServiceCategory)
      .map((item) => item.service_code);
    setServiceCodes([...new Set(filteredCodes)]);
  };

  const checkDataExists = () => {
    const exists = data.some(
      (item) =>
        item.service_category === selectedServiceCategory &&
        item.state_name === selectedState &&
        item.service_code === selectedServiceCode
    );
    setDataExists(exists);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 pt-16">
        <div className="w-full max-w-4xl transform scale-110" style={{ transformOrigin: "center" }}>
          {React.createElement("stripe-pricing-table", {
            "pricing-table-id": "prctbl_1QhgA9EA5fbmDyeFHEeLwdrJ", // Replace with actual Pricing Table ID
            "publishable-key":
              "pk_test_51QhZ80EA5fbmDyeFadp5z5QeaxeFyaUhRpS4nq3rXQh6Zap8nsAKw5D3lalc3ewBtBpecpBzeULgZx7H1jxragFs00IAS0L60o", // Replace with actual Publishable Key
          })}
        </div>

        {/* Data Check Section */}
        <div className="mt-8 w-full max-w-4xl space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Service Category</label>
              <select
                value={selectedServiceCategory}
                onChange={(e) => handleServiceCategoryChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Select Service Category</option>
                {serviceCategories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">State</label>
              <select
                value={selectedState}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                disabled={!selectedServiceCategory}
              >
                <option value="">Select State</option>
                {states.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Service Code</label>
              <input
                type="text"
                value={selectedServiceCode}
                onChange={(e) => setSelectedServiceCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                disabled={!selectedState}
                placeholder="Enter Service Code"
              />
            </div>
          </div>

          <button
            onClick={checkDataExists}
            disabled={!selectedServiceCode}
            className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
          >
            Check Data Availability
          </button>

          {dataExists !== null && (
            <div className={`mt-4 p-4 rounded-lg ${dataExists ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {dataExists ? "Yes, data exists in the database!" : "No, data does not exist in the database."}
            </div>
          )}
        </div>

        {/* Accepted Payment Methods */}
        <div className="mt-6 p-4 bg-gray-100 rounded-lg shadow-md flex items-center space-x-2">
          <span className="text-lg font-semibold">Accepted Payment Methods:</span>
          <CreditCard className="w-6 h-6 text-blue-600" /> {/* Lucide icon */}
          <span className="text-lg">Card</span>
        </div>

        {/* Terms and Conditions Link */}
        <div className="mt-6 text-center">
          <button onClick={() => setShowTerms(true)} className="text-blue-600 underline">
            Terms and Conditions
          </button>
        </div>
      </main>

      {/* Terms and Conditions Modal */}
      {showTerms && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full">
            <h2 className="text-lg font-semibold mb-4">USE OF THE MEDIRATE SOLUTION IS SUBJECT TO THE FOLLOWING TERMS AND CONDITIONS</h2>
            <p className="text-sm text-gray-700 mb-2">1. CPT® Content is copyrighted by the American Medical Association and CPT is a registered trademark of the AMA.</p>
            <p className="text-sm text-gray-700 mb-2">2. MediRate, as a party to a license agreement with the AMA, is authorized to grant End User a limited, non-exclusive, non-transferable, non-sublicensable license...</p>
            <p className="text-sm text-gray-700 mb-2">3. The provision of updated CPT Content in the MediRate Product(s) is dependent on a continuing contractual relationship between MediRate and the AMA.</p>
            <p className="text-sm text-gray-700 mb-2">4. End User is prohibited from making CPT Content publicly available; creating derivative works (including translating) of the CPT Content...</p>
            <p className="text-sm text-gray-700 mb-2">5. End User expressly acknowledges and agrees to the extent permitted by applicable law, use of the CPT Content is at End User's sole risk...</p>
            <p className="text-sm text-gray-700 mb-2">6. End User is required to keep records and submit reports including information necessary for the calculation of royalties payable to the AMA by MediRate...</p>
            <p className="text-sm text-gray-700 mb-2">7. U.S. Government End Users. CPT is commercial technical data, which was developed exclusively at private expense by the American Medical Association...</p>
            <p className="text-sm text-gray-700 mb-2">8. End User must ensure that anyone with authorized access to the MediRate Product(s) will comply with the provisions of the End User Agreement.</p>
            <p className="text-sm text-gray-700 mb-2">9. AMA shall be named as a third-party beneficiary of the End User Agreement.</p>
            <p className="text-sm text-gray-700 mb-2">10. End User expressly consents to the release of its name to the AMA.</p>
            <p className="text-sm text-gray-700 mb-2">11. The responsibility for the content of any "National Correct Coding Policy" included in this product is with the Centers for Medicare and Medicaid Services...</p>
            <button onClick={() => setShowTerms(false)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default StripePricingTableWithFooter;
