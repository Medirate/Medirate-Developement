"use client";

import React, { useEffect, useState } from "react";
import Footer from "@/app/components/footer";
import { CreditCard } from "lucide-react"; // Using Lucide icon

const StripePricingTableWithFooter = () => {
  const [showTerms, setShowTerms] = useState(false);

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

  return (
    <div className="flex flex-col min-h-screen">
      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-4xl transform scale-110" style={{ transformOrigin: "center" }}>
          {React.createElement("stripe-pricing-table", {
            "pricing-table-id": "prctbl_1QhgA9EA5fbmDyeFHEeLwdrJ", // Replace with actual Pricing Table ID
            "publishable-key":
              "pk_test_51QhZ80EA5fbmDyeFadp5z5QeaxeFyaUhRpS4nq3rXQh6Zap8nsAKw5D3lalc3ewBtBpecpBzeULgZx7H1jxragFs00IAS0L60o", // Replace with actual Publishable Key
          })}
        </div>

        {/* Accepted Payment Methods */}
        <div className="mt-6 p-4 bg-gray-100 rounded-lg shadow-md flex items-center space-x-2">
          <span className="text-lg font-semibold">Accepted Payment Methods:</span>
          <CreditCard className="w-6 h-6 text-blue-600" /> {/* Lucide icon */}
          <span className="text-lg">Card</span>
        </div>

        {/* Additional Information Below the Pricing Table */}
        <div className="mt-8 p-6 bg-gray-100 rounded-lg shadow-md w-full max-w-3xl text-center">
          <h3 className="text-lg font-semibold mb-2">Why Choose Our Subscription?</h3>
          <p className="text-sm text-gray-700">
            Our subscription provides comprehensive access to Medicaid reimbursement data,
            allowing you to compare rates across different states and track policy changes in real time.
          </p>
          <p className="text-sm text-gray-700 mt-2">
            Gain insights, maximize revenue, and enhance negotiations with MCOs and other healthcare organizations.
          </p>
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
            <p className="text-sm text-gray-700 mb-2">5. End User expressly acknowledges and agrees to the extent permitted by applicable law, use of the CPT Content is at End User’s sole risk...</p>
            <p className="text-sm text-gray-700 mb-2">6. End User is required to keep records and submit reports including information necessary for the calculation of royalties payable to the AMA by MediRate...</p>
            <p className="text-sm text-gray-700 mb-2">7. U.S. Government End Users. CPT is commercial technical data, which was developed exclusively at private expense by the American Medical Association...</p>
            <p className="text-sm text-gray-700 mb-2">8. End User must ensure that anyone with authorized access to the MediRate Product(s) will comply with the provisions of the End User Agreement.</p>
            <p className="text-sm text-gray-700 mb-2">9. AMA shall be named as a third-party beneficiary of the End User Agreement.</p>
            <p className="text-sm text-gray-700 mb-2">10. End User expressly consents to the release of its name to the AMA.</p>
            <p className="text-sm text-gray-700 mb-2">11. The responsibility for the content of any “National Correct Coding Policy” included in this product is with the Centers for Medicare and Medicaid Services...</p>
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
