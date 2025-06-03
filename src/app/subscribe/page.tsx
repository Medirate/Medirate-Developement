"use client";

import React, { useState, useEffect } from "react";
import Footer from "@/app/components/footer";
import { CreditCard, CheckCircle } from "lucide-react"; // Using Lucide icons
import SubscriptionTermsModal from '@/app/components/SubscriptionTermsModal';
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const StripePricingTableWithFooter = () => {
  const [showTerms, setShowTerms] = useState(false);
  const { isAuthenticated, isLoading, user } = useKindeBrowserClient();
  const router = useRouter();
  const [showStripeTable, setShowStripeTable] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    companyName: "",
    companyType: "",
    providerType: "",
    howDidYouHear: "",
    interest: "",
    demoRequest: "No",
  });
  const [loading, setLoading] = useState(false);
  const [formFilled, setFormFilled] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [isSubUser, setIsSubUser] = useState(false);
  const [primaryEmail, setPrimaryEmail] = useState<string | null>(null);

  // Check subscription status when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user?.email) {
      checkSubscription();
      checkSubUser();
      fetchFormData(user.email);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    // Dynamically load the Stripe Pricing Table script
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/pricing-table.js";
    script.async = true;
    document.body.appendChild(script);

    // Add custom CSS to disable purchase buttons for subscribed users
    if (hasActiveSubscription || isSubUser) {
      const style = document.createElement('style');
      style.textContent = `
        .Button-root[type="submit"] {
          opacity: 0.5;
          pointer-events: none;
          cursor: not-allowed;
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      document.body.removeChild(script);
      // Clean up the style if it was added
      const style = document.head.querySelector('style:last-child');
      if (style) {
        document.head.removeChild(style);
      }
    };
  }, [hasActiveSubscription, isSubUser]);

  // Fetch existing form data when the page loads or when the user's email changes
  useEffect(() => {
    if (user?.email) {
      fetchFormData(user.email);
    }
  }, [user]);

  const fetchFormData = async (email: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("registrationform")
        .select("*")
        .eq("email", email)
        .single();

      if (error && error.code !== "PGRST116") { // PGRST116 is the error code for "no rows found"
        console.error("Error fetching form data:", error);
      } else if (data) {
        // If form data exists, mark the form as filled
        setFormFilled(true);
        setFormData({
          firstName: data.firstname || "",
          lastName: data.lastname || "",
          companyName: data.companyname || "",
          companyType: data.companytype || "",
          providerType: data.providertype || "",
          howDidYouHear: data.howdidyouhear || "",
          interest: data.interest || "",
          demoRequest: data.demorequest || "No",
        });
      } else {
        // If no data is found, mark the form as not filled
        setFormFilled(false);
      }
    } catch (err) {
      console.error("Unexpected error during form data fetch:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleModalVisibility = () => {
    setShowTerms(!showTerms); // Toggle modal visibility
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("registrationform")
        .upsert({
          email: user.email,
          firstname: formData.firstName,
          lastname: formData.lastName,
          companyname: formData.companyName,
          companytype: formData.companyType,
          providertype: formData.providerType,
          howdidyouhear: formData.howDidYouHear,
          interest: formData.interest,
          demorequest: formData.demoRequest,
        });

      if (error) {
        console.error("Error saving form data:", error);
        console.error("Full error object:", JSON.stringify(error, null, 2));
        alert("Failed to save form data. Please try again.");
      } else {
        setFormFilled(true); // Mark the form as filled
        setFormSubmitted(true);
        setShowStripeTable(true);
        alert("✅ Form submitted successfully!");
      }
    } catch (err) {
      console.error("Unexpected error during form submission:", err);
      alert("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const testTableDetection = async () => {
      try {
        const { data, error } = await supabase
          .from("registrationform")
          .select("*")
          .limit(1); // Fetch just one row to test

        if (error) {
          console.error("Error fetching from registrationform table:", error);
        } else {
          console.log("Table detected. Data:", data);
        }
      } catch (err) {
        console.error("Unexpected error during table detection:", err);
      }
    };

    testTableDetection();
  }, []);

  const checkSubscription = async () => {
    const userEmail = user?.email ?? "";
    if (!userEmail) return;

    try {
      const response = await fetch("/api/stripe/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      });

      const data = await response.json();
      if (data.error || !data.status || data.status !== "active") {
        setHasActiveSubscription(false); // No active subscription
      } else {
        setHasActiveSubscription(true); // Active subscription found
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
      setHasActiveSubscription(false); // Assume no active subscription on error
    }
  };

  const checkSubUser = async () => {
    const userEmail = user?.email ?? "";
    if (!userEmail) return;

    try {
      const { data: subUserData, error: subUserError } = await supabase
        .from("subscription_users")
        .select("sub_users, primary_user")
        .contains("sub_users", JSON.stringify([userEmail]));

      if (subUserError) {
        console.error("❌ Error checking sub-user:", subUserError);
      } else if (subUserData && subUserData.length > 0) {
        setIsSubUser(true);
        setPrimaryEmail(subUserData[0].primary_user);
      }
    } catch (err) {
      console.error("❌ Error checking sub-user:", err);
    }
  };

  // Function to handle subscription button click
  const handleSubscribeClick = async () => {
    if (!isAuthenticated) {
      // Redirect to login if not authenticated
      router.push("/api/auth/login");
      return;
    }

    // If authenticated but form not filled, show form
    if (!formFilled) {
      setShowStripeTable(false);
      return;
    }

    // If authenticated and form filled, show Stripe table
    setShowStripeTable(true);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow flex flex-col items-center justify-center px-4 pt-16">
        {/* Subscription Status Banner - Show only for subscribed users */}
        {isAuthenticated && (hasActiveSubscription || isSubUser) && (
          <div className="w-full max-w-4xl mb-8 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-800 font-medium">
                  ✓ You have an active subscription
                </p>
                {isSubUser && (
                  <p className="text-sm text-green-600">
                    This is a sub-user account
                  </p>
                )}
              </div>
              <a
                href="/dashboard"
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors"
              >
                Go to Dashboard
              </a>
            </div>
          </div>
        )}

        {/* Subscription Details - Always Visible */}
        <div className="w-full max-w-4xl mb-8 p-8 bg-white rounded-xl shadow-2xl border border-gray-100">
          <h2 className="text-3xl font-bold mb-6 text-[#012C61] text-center font-lemonMilkRegular">Subscription Models</h2>
          <p className="text-lg mb-10 text-gray-600 text-center">
            MediRate offers a comprehensive subscription plan designed to meet your company's needs:
          </p>
          <div className="max-w-xl mx-auto">
            <div className="p-8 bg-white rounded-2xl shadow-md border border-gray-200 flex flex-col items-center">
              <h3 className="text-2xl font-bold mb-6 text-[#012C61] font-lemonMilkRegular tracking-wide text-center">Professional Plan</h3>
              <ul className="space-y-5 w-full max-w-md">
                {[
                  "Three user accounts included",
                  "Ability to add up to ten users on one subscription (In Development)",
                  "Access to MediRate's comprehensive reimbursement rate database and tracking tools",
                  "Customizable email alerts for real-time updates on topics and states of your choice (In Development)"
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-base text-gray-800">
                    <CheckCircle className="text-blue-600 w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span className="text-left">
                      {feature.includes("(In Development)") ? (
                        <>
                          {feature.replace(" (In Development)", "")}
                          <span className="text-sm text-gray-400"> (In Development)</span>
                        </>
                      ) : feature}
                    </span>
                </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-12 flex space-x-4 justify-center">
            <button
              onClick={handleSubscribeClick}
              className="bg-[#012C61] text-white px-8 py-3 rounded-lg transition-all duration-300 hover:bg-transparent hover:border hover:border-[#012C61] hover:text-[#012C61]"
            >
              Subscribe Now
            </button>
            <a
              href="https://calendar.app.google/q3xeU2244eisFsXC7"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#012C61] text-white px-8 py-3 rounded-lg transition-all duration-300 hover:bg-transparent hover:border hover:border-[#012C61] hover:text-[#012C61]"
            >
              Schedule a Demo
            </a>
          </div>
        </div>

        {/* Professional Discount Banner - Always Visible */}
        <div className="w-full max-w-4xl mb-8 p-6 bg-gradient-to-r from-blue-700 to-indigo-700 rounded-lg shadow-lg text-white text-center animate-pulse">
          <h2 className="text-2xl font-bold mb-2">✨ Limited Time Offer ✨</h2>
          <p className="text-lg mb-4">
            Use code <span className="font-bold bg-white text-blue-700 px-2 py-1 rounded">MEDICAID20</span> at checkout to get <span className="font-bold">20% off</span> your annual subscription!
          </p>
        </div>

        {/* Registration Form - Show only when authenticated but form not filled and not subscribed */}
        {isAuthenticated && !formFilled && !showStripeTable && !hasActiveSubscription && !isSubUser && (
          <div className="w-full max-w-4xl mb-8 p-8 bg-white rounded-xl shadow-2xl border border-gray-100">
            <h2 className="text-3xl font-bold mb-8 text-[#012C61] text-center font-lemonMilkRegular">Please Complete the Form to Proceed</h2>
            <form onSubmit={handleFormSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleFormChange}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#012C61] transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleFormChange}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#012C61] transition-all"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleFormChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#012C61] transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Type</label>
                <select
                  name="companyType"
                  value={formData.companyType}
                  onChange={handleFormChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#012C61] transition-all"
                  required
                >
                  <option value="">Select Company Type</option>
                  <option value="Medicaid provider">Medicaid provider</option>
                  <option value="Healthcare IT">Healthcare IT</option>
                  <option value="Consulting firm">Consulting firm</option>
                  <option value="Law firm">Law firm</option>
                  <option value="Advocacy organization">Advocacy organization</option>
                  <option value="Foundation/research organization">Foundation/research organization</option>
                  <option value="Investment firm/investment advisory">Investment firm/investment advisory</option>
                  <option value="Governmental agency - state">Governmental agency - state</option>
                  <option value="Governmental agency - federal">Governmental agency - federal</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              {formData.companyType === "Medicaid provider" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Provider Type</label>
                  <input
                    type="text"
                    name="providerType"
                    value={formData.providerType}
                    onChange={handleFormChange}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#012C61] transition-all"
                    required
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">How did you hear about MediRate?</label>
                <select
                  name="howDidYouHear"
                  value={formData.howDidYouHear}
                  onChange={handleFormChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#012C61] transition-all"
                  required
                >
                  <option value="">Select how you heard about MediRate</option>
                  <option value="Google Search">Google Search</option>
                  <option value="Social Media">Social Media</option>
                  <option value="Word of Mouth">Word of Mouth</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">What Medicaid rate information are you most interested in searching/tracking?</label>
                <textarea
                  name="interest"
                  value={formData.interest}
                  onChange={handleFormChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#012C61] transition-all"
                  rows={4}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Would you like to set up a demo to learn more about MediRate?</label>
                <select
                  name="demoRequest"
                  value={formData.demoRequest}
                  onChange={handleFormChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#012C61] transition-all"
                  required
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-[#012C61] text-white px-8 py-3 rounded-lg transition-all duration-300 hover:bg-transparent hover:border hover:border-[#012C61] hover:text-[#012C61]"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Stripe Pricing Table - Always visible */}
        <div id="pricing-table" className="w-full max-w-4xl transform scale-110" style={{ transformOrigin: "center" }}>
          {React.createElement("stripe-pricing-table", {
            "pricing-table-id": "prctbl_1QhgA9EA5fbmDyeFHEeLwdrJ",
            "publishable-key": "pk_test_51QhZ80EA5fbmDyeFadp5z5QeaxeFyaUhRpS4nq3rXQh6Zap8nsAKw5D3lalc3ewBtBpecpBzeULgZx7H1jxragFs00IAS0L60o",
          })}
        </div>

        {/* Warning message for subscribed users */}
        {isAuthenticated && (hasActiveSubscription || isSubUser) && (
          <div className="w-full max-w-4xl mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-center text-sm">
              You already have an active subscription. The purchase buttons are disabled.
            </p>
          </div>
        )}

        {/* Accepted Payment Methods - Always visible */}
        <div className="mt-6 p-4 bg-gray-100 rounded-lg shadow-md flex items-center space-x-2">
          <span className="text-lg font-semibold">Accepted Payment Methods:</span>
          <CreditCard className="w-6 h-6 text-blue-600" />
          <span className="text-lg">Card</span>
        </div>

        {/* Terms and Conditions Link - Always Visible */}
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

