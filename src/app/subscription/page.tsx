"use client";

import { useEffect, useState } from "react";
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import { toast, Toaster } from "react-hot-toast";

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

export default function SubscriptionPage() {
  const { user, isAuthenticated } = useKindeBrowserClient();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slots, setSlots] = useState<number>(0);
  const [addedUsers, setAddedUsers] = useState<{ email: string; slot: number }[]>([]);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [isAddingSlot, setIsAddingSlot] = useState(false);

  // ✅ Ensure user is defined before proceeding
  const userEmail = user?.email ?? "";
  const userId = user?.id ?? "";

  useEffect(() => {
    if (!userEmail) return;

    async function syncUserToSupabase() {
      try {
        const response = await fetch("/api/sync-kinde-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: userEmail,
            firstName: user?.given_name || "N/A",
            lastName: user?.family_name || "N/A",
            kindeId: userId,
          }),
        });

        const data = await response.json();
        if (data.error) {
          console.error("❌ Error syncing user:", data.error);
          setError("Failed to sync user to database.");
        } else {
          console.log("✅ User synced successfully:", data);
          fetchSubscription();
        }
      } catch (err) {
        console.error("❌ Sync error:", err);
        setError("Something went wrong.");
      }
    }

    async function fetchSubscription() {
      console.log("🔵 Fetching subscription for:", userEmail);
      try {
        const response = await fetch("/api/stripe/subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: userEmail }),
        });

        const data = await response.json();
        if (data.error) {
          console.error("❌ Subscription Error:", data.error);
          setSubscription(null);
          setError("No active subscription found.");
          // Set default slots if no subscription is found
          setSlots(2);
        } else {
          setSubscription(data);
          // Log the plan and slots
          console.log("Plan:", data.plan);
          const slots = getSlotsForPlan(data.plan);
          console.log("Slots:", slots);
          // Initialize slots based on the subscription plan
          setSlots(slots);
        }
      } catch (err) {
        console.error("❌ Fetch error:", err);
        setError("Failed to load subscription.");
        // Set default slots if an error occurs
        setSlots(2);
      } finally {
        setLoading(false);
      }
    }

    syncUserToSupabase();
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

  const handleAssignUserToSlot = (slotIndex: number) => {
    if (!newUserEmail) return;
    setAddedUsers([...addedUsers, { email: newUserEmail, slot: slotIndex }]);
    setNewUserEmail("");
  };

  const getSlotsForPlan = (plan: string) => {
    if (plan === "Medirate Annual") {
      return 10; // Annual users get 10 slots
    }
    return 2; // Default to 2 slots for all other plans
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

                {/* Add Slot Button */}
                {subscription?.plan === "Medirate Annual" && (
                  <div className="mt-6 relative group">
                    <button
                      onClick={handleAddSlotConfirmation}
                      className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-6 py-3 rounded-lg shadow-lg hover:from-green-700 hover:to-teal-700 transition-all w-full flex items-center justify-center"
                      disabled={isAddingSlot}
                    >
                      {isAddingSlot ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white"></div>
                      ) : (
                        "Add Slot (Prorated)"
                      )}
                    </button>
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-sm px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      Prorated charge based on remaining subscription period.
                    </div>
                  </div>
                )}

                {showConfirmationModal && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full">
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">Confirm Slot Addition</h2>
                      <p className="text-lg text-gray-600 mb-6">
                        Are you sure you want to add a slot? This will incur a prorated charge based on your remaining subscription period.
                      </p>
                      <div className="flex justify-end space-x-4">
                        <button
                          onClick={() => setShowConfirmationModal(false)}
                          className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAddSlotConfirmed}
                          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Slots Section */}
                {slots > 0 && (
                  <div id="slots-section" className="mt-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Available Slots</h3>
                    {[...Array(slots)].map((_, index) => (
                      <div key={index} className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex items-center space-x-3">
                          <input
                            type="email"
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                            placeholder="Assign user email"
                            className="flex-1 px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <button
                            onClick={() => handleAssignUserToSlot(index)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                          >
                            Assign
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {addedUsers.length > 0 && (
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
