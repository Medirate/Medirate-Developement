"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/app/components/applayout";
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";

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
        } else {
          setSubscription(data);
        }
      } catch (err) {
        console.error("❌ Fetch error:", err);
        setError("Failed to load subscription.");
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
      const totalDays = 365;
      const fullPrice = 2000;
      const proratedAmount = (remainingDays / totalDays) * fullPrice;

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

      window.open(data.url, "_blank");
      setSlots(slots + 1);
    } catch (error) {
      alert("Something went wrong with payment.");
      console.error("❌ Payment Error:", error);
    }
  };

  const handleAssignUserToSlot = (slotIndex: number) => {
    if (!newUserEmail) return;
    setAddedUsers([...addedUsers, { email: newUserEmail, slot: slotIndex }]);
    setNewUserEmail("");
  };

  if (!isAuthenticated) {
    return (
      <AppLayout activeTab="subscription">
        <p className="text-red-500 text-center text-lg">
          Please log in to view your subscription.
        </p>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeTab="subscription">
      <h1 className="text-5xl md:text-6xl text-[#012C61] font-lemonMilkRegular uppercase mb-8 text-center">
        Subscription
      </h1>

      <div className="flex justify-center">
        {loading ? (
          <div className="bg-white p-8 rounded-2xl shadow-lg max-w-lg w-full border border-gray-200 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-2xl shadow-lg max-w-lg w-full border border-gray-200">
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
                <div className="mt-6">
                  <button
                    onClick={handleAddSlot}
                    className="bg-green-600 text-white px-4 py-2 rounded-md shadow hover:bg-green-700 transition w-full"
                  >
                    Add Slot (Prorated)
                  </button>
                </div>

                {/* Slots Section */}
                {slots > 0 && (
                  <div className="mt-8">
                    <h3 className="text-xl font-semibold text-gray-900">Available Slots</h3>
                    {[...Array(slots)].map((_, index) => (
                      <div key={index} className="mt-4 flex items-center space-x-3">
                        <input
                          type="email"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          placeholder="Assign user email"
                          className="flex-1 px-4 py-2 border rounded-md"
                        />
                        <button
                          onClick={() => handleAssignUserToSlot(index)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                        >
                          Assign
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-red-500 text-center text-lg">No active subscription found.</p>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
