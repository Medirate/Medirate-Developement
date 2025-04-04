"use client";

import React, { useState, useEffect } from "react";
import Footer from "@/app/components/footer";
import { CreditCard } from "lucide-react"; // Using Lucide icon
import SubscriptionTermsModal from '@/app/components/SubscriptionTermsModal';
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import { useRouter } from "next/navigation";

const StripePricingTableWithFooter = () => {
  const [showTerms, setShowTerms] = useState(false);
  const { isAuthenticated, isLoading } = useKindeBrowserClient();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/api/auth/login");
    }
  }, [isAuthenticated, isLoading, router]);

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

  const toggleModalVisibility = () => {
    setShowTerms(!showTerms); // Toggle modal visibility
  };

  if (isLoading || !isAuthenticated) {
    return null; // or a loading spinner
  }

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

        {/* Accepted Payment Methods */}
        <div className="mt-6 p-4 bg-gray-100 rounded-lg shadow-md flex items-center space-x-2">
          <span className="text-lg font-semibold">Accepted Payment Methods:</span>
          <CreditCard className="w-6 h-6 text-blue-600" /> {/* Lucide icon */}
          <span className="text-lg">Card</span>
        </div>

        {/* Terms and Conditions Link */}
        <div className="mt-6 text-center">
          <button onClick={toggleModalVisibility} className="text-blue-600 underline">
            Terms and Conditions
          </button>
        </div>
      </main>

      {/* Subscription Terms and Conditions Modal */}
      <SubscriptionTermsModal 
        isOpen={showTerms} 
        onClose={() => setShowTerms(false)} 
      />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default StripePricingTableWithFooter;
