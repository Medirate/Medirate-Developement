"use client";

import React, { useState, useEffect } from "react";
import Footer from "@/app/components/footer";
import { CreditCard } from "lucide-react"; // Using Lucide icon
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
  const [showForm, setShowForm] = useState(false); // Hide form by default
  const [formSubmitted, setFormSubmitted] = useState(false); // Track form submission
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
  const [formFilled, setFormFilled] = useState(false); // Track if the form is already filled
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false); // Track subscription status
  const [isSubUser, setIsSubUser] = useState(false);
  const [primaryEmail, setPrimaryEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/api/auth/login");
    } else if (isAuthenticated) {
      checkSubscription();
      checkSubUser();
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
        setShowForm(false);
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

  // Don't render anything until the subscription check is complete
  if (isLoading || !isAuthenticated) {
    return null; // or a loading spinner
  }

  // If the user has an active subscription or is a sub-user, show the "Already Subscribed" card
  if (hasActiveSubscription || isSubUser) {
    return (
      <div className="flex flex-col min-h-screen">
        <main className="flex-grow flex flex-col items-center justify-center px-4 pt-16">
          <div className="w-full max-w-4xl mb-8 p-8 bg-white rounded-xl shadow-2xl border border-gray-100">
            <h2 className="text-3xl font-bold mb-6 text-[#012C61] text-center font-lemonMilkRegular">
              You Are Already Subscribed
            </h2>
            <p className="text-lg mb-10 text-gray-600 text-center">
              Thank you for being a valued MediRate subscriber. You can access all features of your subscription from your dashboard.
            </p>
            {isSubUser && (
              <p className="text-lg mb-10 text-gray-600 text-center">
                This is a sub-user account.
              </p>
            )}
            <div className="flex justify-center">
              <a
                href="/dashboard"
                className="bg-[#012C61] text-white px-8 py-3 rounded-lg transition-all duration-300 hover:bg-transparent hover:border hover:border-[#012C61] hover:text-[#012C61]"
              >
                Go to Dashboard
              </a>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Render the form only if it hasn't been filled yet
  if (formFilled || formSubmitted) {
    return (
      <div className="flex flex-col min-h-screen">
        <main className="flex-grow flex flex-col items-center justify-center px-4 pt-16">
          {/* Subscription Details */}
          <div className="w-full max-w-4xl mb-8 p-8 bg-white rounded-xl shadow-2xl border border-gray-100">
            <h2 className="text-3xl font-bold mb-6 text-[#012C61] text-center font-lemonMilkRegular">Subscription Models</h2>
            <p className="text-lg mb-10 text-gray-600 text-center">
              MediRate offers flexible subscription models designed to meet your company's needs:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Annual Subscription Card */}
              <div className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg border border-gray-100 transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
                <h3 className="text-2xl font-bold mb-6 text-[#012C61] font-lemonMilkRegular">Annual Subscription</h3>
                <ul className="space-y-4">
                  <li className="flex items-center">
                    <span className="text-green-600 mr-3">✔</span>
                    <span className="text-gray-700">Three user accounts included</span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-600 mr-3">✔</span>
                    <span className="text-gray-700">Ability to add up to ten users on one subscription <span className="text-sm text-gray-500">(In Development)</span></span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-600 mr-3">✔</span>
                    <span className="text-gray-700">Access to MediRate's comprehensive reimbursement rate database and tracking tools</span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-600 mr-3">✔</span>
                    <span className="text-gray-700">Customizable email alerts for real-time updates on topics and states of your choice <span className="text-sm text-gray-500">(In Development)</span></span>
                  </li>
                </ul>
              </div>

              {/* 3-Month Subscription Card */}
              <div className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg border border-gray-100 transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
                <h3 className="text-2xl font-bold mb-6 text-[#012C61] font-lemonMilkRegular">3-Month Subscription</h3>
                <ul className="space-y-4">
                  <li className="flex items-center">
                    <span className="text-green-600 mr-3">✔</span>
                    <span className="text-gray-700">Designed for users with short-term, project-based needs</span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-600 mr-3">✔</span>
                    <span className="text-gray-700">Two user accounts included</span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-600 mr-3">✔</span>
                    <span className="text-gray-700">Access to MediRate's comprehensive reimbursement rate database and tracking tools</span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-600 mr-3">✔</span>
                    <span className="text-gray-700">Customizable email alerts for real-time updates on topics and states of your choice <span className="text-sm text-gray-500">(In Development)</span></span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Professional Discount Banner */}
          <div className="w-full max-w-4xl mb-8 p-6 bg-gradient-to-r from-blue-700 to-indigo-700 rounded-lg shadow-lg text-white text-center animate-pulse">
            <h2 className="text-2xl font-bold mb-2">✨ Limited Time Offer ✨</h2>
            <p className="text-lg mb-4">
              Use code <span className="font-bold bg-white text-blue-700 px-2 py-1 rounded">MEDICAID20</span> at checkout to get <span className="font-bold">20% off</span> your annual subscription!
            </p>
          </div>

          {/* Pricing Table */}
          <div id="pricing-table" className="w-full max-w-4xl transform scale-110" style={{ transformOrigin: "center" }}>
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
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 pt-16">
        {/* Subscription Details */}
        <div className="w-full max-w-4xl mb-8 p-8 bg-white rounded-xl shadow-2xl border border-gray-100">
          <h2 className="text-3xl font-bold mb-6 text-[#012C61] text-center font-lemonMilkRegular">Subscription Models</h2>
          <p className="text-lg mb-10 text-gray-600 text-center">
            MediRate offers flexible subscription models designed to meet your company's needs:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Annual Subscription Card */}
            <div className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg border border-gray-100 transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
              <h3 className="text-2xl font-bold mb-6 text-[#012C61] font-lemonMilkRegular">Annual Subscription</h3>
              <ul className="space-y-4">
                <li className="flex items-center">
                  <span className="text-green-600 mr-3">✔</span>
                  <span className="text-gray-700">Three user accounts included</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-3">✔</span>
                  <span className="text-gray-700">Ability to add up to ten users on one subscription <span className="text-sm text-gray-500">(In Development)</span></span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-3">✔</span>
                  <span className="text-gray-700">Access to MediRate's comprehensive reimbursement rate database and tracking tools</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-3">✔</span>
                  <span className="text-gray-700">Customizable email alerts for real-time updates on topics and states of your choice <span className="text-sm text-gray-500">(In Development)</span></span>
                </li>
              </ul>
            </div>

            {/* 3-Month Subscription Card */}
            <div className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg border border-gray-100 transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
              <h3 className="text-2xl font-bold mb-6 text-[#012C61] font-lemonMilkRegular">3-Month Subscription</h3>
              <ul className="space-y-4">
                <li className="flex items-center">
                  <span className="text-green-600 mr-3">✔</span>
                  <span className="text-gray-700">Designed for users with short-term, project-based needs</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-3">✔</span>
                  <span className="text-gray-700">Two user accounts included</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-3">✔</span>
                  <span className="text-gray-700">Access to MediRate's comprehensive reimbursement rate database and tracking tools</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-3">✔</span>
                  <span className="text-gray-700">Customizable email alerts for real-time updates on topics and states of your choice <span className="text-sm text-gray-500">(In Development)</span></span>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 flex space-x-4 justify-center">
            <a
              href="https://calendar.app.google/DKoJB2VqwdcX4D6Z9"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#012C61] text-white px-8 py-3 rounded-lg transition-all duration-300 hover:bg-transparent hover:border hover:border-[#012C61] hover:text-[#012C61]"
            >
              Schedule a Demo
            </a>
            <button
              onClick={() => setShowForm(true)}
              className="bg-[#012C61] text-white px-8 py-3 rounded-lg transition-all duration-300 hover:bg-transparent hover:border hover:border-[#012C61] hover:text-[#012C61]"
            >
              Learn More About Pricing
            </button>
          </div>
        </div>

        {/* Form for Learn More */}
        {showForm && (
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

        {/* Terms and Conditions Link */}
        {formSubmitted && (
          <div className="mt-6 text-center">
            <button onClick={toggleModalVisibility} className="text-blue-600 underline">
              Terms and Conditions
            </button>
          </div>
        )}
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
