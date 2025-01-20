"use client";

import React, { useEffect } from "react";
import Footer from "@/app/components/footer";

const SubscriptionPage = () => {
  useEffect(() => {
    // Inject Stripe's pricing table script
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/pricing-table.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script); // Clean up the script on component unmount
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="flex-grow p-4 flex items-center justify-center">
        <div className="w-full max-w-4xl">
          <h1
            className="text-5xl md:text-6xl font-lemonMilkRegular mb-8 text-center uppercase"
            style={{ color: "#012C61" }} // Same dark blue color as "PROVIDER ALERTS"
          >
            Subscription
          </h1>
          <div className="bg-white rounded-lg shadow-md p-8">
            {/* Embed the Pricing Table */}
            <stripe-pricing-table
              pricing-table-id="prctbl_1QhgA9EA5fbmDyeFHEeLwdrJ"
              publishable-key="pk_test_51QhZ80EA5fbmDyeFadp5z5QeaxeFyaUhRpS4nq3rXQh6Zap8nsAKw5D3lalc3ewBtBpecpBzeULgZx7H1jxragFs00IAS0L60o"
            ></stripe-pricing-table>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default SubscriptionPage;
