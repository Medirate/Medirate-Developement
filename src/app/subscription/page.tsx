"use client";

import { useEffect, useState } from "react";
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import { toast, Toaster } from "react-hot-toast";
import { createClient } from "@supabase/supabase-js";

interface Subscription {
  plan: string;
  amount: number;
  currency: string;
  billingInterval: string;
  status: string;
  startDate: string;
  endDate: string;
  trialEndDate: string | null;
  latestInvoice: string;
  paymentMethod: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SubscriptionPage() {
  const { user, isAuthenticated } = useKindeBrowserClient();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubUser, setIsSubUser] = useState(false);
  const [primaryEmail, setPrimaryEmail] = useState<string | null>(null);
  const [slots, setSlots] = useState<number>(0);
  const [addedUsers, setAddedUsers] = useState<{ email: string; slot: number }[]>([]);
  const [slotEmails, setSlotEmails] = useState<string[]>([]);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [isAddingSlot, setIsAddingSlot] = useState(false);

  // ✅ Ensure user is defined before proceeding
  const userEmail = user?.email ?? "";
  const userId = user?.id ?? "";

  useEffect(() => {
    if (!userEmail) return;

    async function checkSubUser() {
      try {
        // Check if the user is a sub-user
        const { data: subUserData, error: subUserError } = await supabase
          .from("subscription_users")
          .select("sub_users, primary_user")
          .contains("sub_users", JSON.stringify([userEmail]));

        if (subUserError) {
          console.error("❌ Error checking sub-user:", subUserError);
          console.error("Full error object:", JSON.stringify(subUserError, null, 2));
          setError("Failed to check sub-user status.");
          setLoading(false);
          return;
        }

        console.log("Sub-user data:", subUserData); // Log the data returned by Supabase

        if (subUserData && subUserData.length > 0) {
          setIsSubUser(true);
          setPrimaryEmail(subUserData[0].primary_user);
          fetchSubscription(subUserData[0].primary_user);
        } else {
          setIsSubUser(false);
          fetchSubscription(userEmail);
        }
      } catch (err) {
        console.error("❌ Error checking sub-user:", err);
        setError("Something went wrong while checking sub-user status.");
        setLoading(false);
      }
    }

    checkSubUser();
  }, [userEmail]);

  useEffect(() => {
    console.log("Slots State Updated:", slots);
  }, [slots]);

  useEffect(() => {
    if (!userEmail) return;

    const fetchSubUsers = async () => {
      try {
        const response = await fetch("/api/subscription-users", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch sub-users.");
        }

        const data = await response.json();
        const subUsers = data.subUsers || []; // Default to an empty array if subUsers is undefined

        // Map sub-users to the addedUsers state
        setAddedUsers(subUsers.map((email: string, index: number) => ({ email, slot: index })));

        // Initialize slotEmails with the fetched sub-users
        setSlotEmails(subUsers);
      } catch (err) {
        console.error("Error fetching sub-users:", err);
        toast.error("Failed to fetch sub-users.");
      }
    };

    fetchSubUsers();
  }, [userEmail]);

  const getRemainingDays = () => {
    if (!subscription) return 0;
    const endDate = new Date(subscription.endDate);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleAddSlot = async () => {
    try {
      if (!userEmail) {
        alert("User email is missing. Please log in.");
        return;
      }

      const remainingDays = getRemainingDays();
      const totalDays = 365; // Total days in the year

      // Call your backend API to create the Stripe session
      const response = await fetch("/api/stripe/add-slot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          remainingDays,
          totalDays,
        }),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      // Redirect the user to the Stripe Checkout page
      window.location.href = data.url; // Redirects to Stripe Checkout
    } catch (error) {
      alert("Something went wrong with payment.");
      console.error("❌ Payment Error:", error);
    }
  };

  const handleAddSlotConfirmation = () => {
    setShowConfirmationModal(true);
  };

  const handleAddSlotConfirmed = async () => {
    setShowConfirmationModal(false);
    setIsAddingSlot(true);
    try {
      await handleAddSlot();
      toast.success("Slot added successfully!");
    } catch (error) {
      toast.error("Failed to add slot. Please try again.");
    } finally {
      setIsAddingSlot(false);
    }
  };

  const handleAssignUserToSlot = async (slotIndex: number) => {
    const newUserEmail = slotEmails[slotIndex]; // Get the email for the specific slot

    if (!newUserEmail || !userEmail) return;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUserEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    try {
      // Fetch the existing sub-users
      const response = await fetch("/api/subscription-users", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch sub-users.");
      }

      const data = await response.json();
      const subUsers = Array.isArray(data.subUsers) ? data.subUsers : []; // Ensure subUsers is an array

      // Replace the email in the specified slot
      subUsers[slotIndex] = newUserEmail;

      // Update the sub-users in the database
      const updateResponse = await fetch("/api/subscription-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subUsers: subUsers }),
      });

      if (!updateResponse.ok) {
        throw new Error("Failed to update sub-users.");
      }

      // Update the local state
      const updatedAddedUsers = [...addedUsers];
      updatedAddedUsers[slotIndex] = { email: newUserEmail, slot: slotIndex };
      setAddedUsers(updatedAddedUsers);
      toast.success("Sub-user saved successfully!");
    } catch (err) {
      console.error("Unexpected error during sub-user save:", err);
      toast.error("Failed to save sub-user.");
    }
  };

  const getSlotsForPlan = (plan: string) => {
    if (plan === "Medirate Annual") {
      return 9; // Annual users get 9 slots
    } else if (plan === "MediRate 3 Months") {
      return 1; // 3-month users get 1 slot (main slot)
    }
    return 0; // Default to 0 slots for all other plans
  };

  const fetchSubscription = async (email: string) => {
    console.log("🔵 Fetching subscription for:", email);
    try {
      const response = await fetch("/api/stripe/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (data.error) {
        console.error("❌ Subscription Error:", data.error);
        setSubscription(null);
        setError("No active subscription found.");
      } else {
        setSubscription(data);
        console.log("Plan:", data.plan);
      }
    } catch (err) {
      console.error("❌ Fetch error:", err);
      setError("Failed to load subscription.");
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-7xl mx-auto">
        <h1 className="text-5xl md:text-6xl text-[#012C61] font-lemonMilkRegular uppercase mb-8 text-center">
          Subscription
        </h1>
        <p className="text-red-500 text-center text-lg">
          Please log in to view your subscription.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto bg-gradient-to-br from-gray-50 to-blue-50 p-8 rounded-2xl">
      <Toaster position="top-center" />
      <h1 className="text-5xl md:text-6xl text-[#012C61] font-lemonMilkRegular uppercase mb-8 text-center">
        Subscription
      </h1>

      {isSubUser && (
        <div className="bg-blue-50 p-6 rounded-lg mb-8">
          <p className="text-blue-800 text-lg font-semibold">
            This is a sub-user account. Below are the subscription details of the primary account linked to this email.
          </p>
          <p className="text-blue-700 mt-2">
            Primary Account: <strong>{primaryEmail}</strong>
          </p>
        </div>
      )}

      <div className="flex justify-center">
        {loading ? (
          <div className="bg-white p-8 rounded-2xl shadow-lg max-w-lg w-full border border-gray-200 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-2xl shadow-lg max-w-lg w-full border border-gray-100">
            {error ? (
              <p className="text-red-500 text-center text-lg">{error}</p>
            ) : subscription ? (
              <>
                {/* User Information */}
                <div className="mb-6 border-b pb-4">
                  <h2 className="text-2xl font-bold text-gray-900">User Details</h2>
                  <p className="text-lg text-gray-700">
                    <strong>Name:</strong> {user?.given_name || user?.family_name || "N/A"}
                  </p>
                  <p className="text-lg text-gray-700">
                    <strong>Email:</strong> {userEmail}
                  </p>
                </div>

                {/* Subscription Details */}
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">{subscription.plan}</h2>
                  <p className="text-lg text-gray-600 mt-2">
                    Status: <strong className="text-blue-600">{subscription.status}</strong>
                  </p>
                  <p className="text-lg text-gray-600">
                    Amount: <strong className="text-green-600">${subscription.amount} {subscription.currency}</strong> / {subscription.billingInterval}
                  </p>
                </div>

                {/* Dates */}
                <div className="mb-6">
                  <p className="text-lg text-gray-600">
                    Start Date: <strong>{subscription.startDate}</strong>
                  </p>
                  <p className="text-lg text-gray-600">
                    End Date: <strong>{subscription.endDate}</strong>
                  </p>
                </div>

                {/* Payment Details */}
                <div>
                  <p className="text-lg text-gray-600">
                    Payment Method: <strong>{subscription.paymentMethod}</strong>
                  </p>
                  <p className="text-lg text-gray-600">
                    Latest Invoice ID: <strong className="text-gray-900">{subscription.latestInvoice}</strong>
                  </p>
                </div>

                {/* Slots Section */}
                {!isSubUser && slots > 0 && (
                  <div id="slots-section" className="mt-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Available Slots</h3>
                    {[...Array(slots)].map((_, index) => (
                      <div
                        key={index}
                        className={`mt-4 p-4 rounded-lg border ${
                          index < 2
                            ? "bg-gray-50 border-gray-100"
                            : "bg-gray-200 border-gray-300 opacity-50"
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-gray-700">Slot {index + 1}</span>
                          {index < 2 ? (
                            <>
                              <input
                                type="email"
                                value={slotEmails[index] || ""}
                                onChange={(e) => {
                                  const updatedSlotEmails = [...slotEmails];
                                  updatedSlotEmails[index] = e.target.value;
                                  setSlotEmails(updatedSlotEmails);
                                }}
                                placeholder="Assign user email"
                                className="flex-1 px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
                                required
                              />
                              <button
                                onClick={() => handleAssignUserToSlot(index)}
                                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                              >
                                Save
                              </button>
                            </>
                          ) : (
                            <span className="text-sm text-gray-500">Coming Soon</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!isSubUser && addedUsers.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Assigned Users</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Slot</th>
                          </tr>
                        </thead>
                        <tbody>
                          {addedUsers.map((user, index) => (
                            <tr key={index} className="border-b border-gray-200">
                              <td className="px-6 py-4 text-sm text-gray-700">{user.email}</td>
                              <td className="px-6 py-4 text-sm text-gray-700">{user.slot + 1}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-red-500 text-center text-lg">No active subscription found.</p>
            )}
          </div>
        )}
      </div>

      {/* Footer Section */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Need help? <a href="/support" className="text-blue-600 hover:underline">Contact Support</a></p>
        <p>By using this service, you agree to our <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a>.</p>
      </div>
    </div>
  );
}
