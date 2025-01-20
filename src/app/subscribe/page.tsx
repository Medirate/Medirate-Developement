"use client";

import React, { useEffect } from "react";
import Footer from "@/app/components/footer";

const StripePricingTableWithFooter = () => {
  useEffect(() => {
    // Dynamically load the Stripe Pricing Table script
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/pricing-table.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script); // Clean up the script when the component unmounts
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center">
        <div
          className="w-full max-w-4xl transform scale-110" // Adjust width and scale
          style={{
            transformOrigin: "center", // Ensure scaling is centered
          }}
        >
          {React.createElement("stripe-pricing-table", {
            "pricing-table-id": "prctbl_1QhgA9EA5fbmDyeFHEeLwdrJ", // Replace with your actual Pricing Table ID
            "publishable-key":
              "pk_test_51QhZ80EA5fbmDyeFadp5z5QeaxeFyaUhRpS4nq3rXQh6Zap8nsAKw5D3lalc3ewBtBpecpBzeULgZx7H1jxragFs00IAS0L60o", // Replace with your actual Publishable Key
          })}
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default StripePricingTableWithFooter;
