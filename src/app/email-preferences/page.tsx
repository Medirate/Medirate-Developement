"use client";

import { useState, useEffect } from "react";
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import { motion } from "framer-motion";
import { MoonLoader } from "react-spinners";
import { supabase } from "@/lib/supabase";

// ✅ Full list of U.S. states
const STATES = [
  "ALABAMA", "ALASKA", "ARIZONA", "ARKANSAS", "CALIFORNIA", "COLORADO",
  "CONNECTICUT", "DELAWARE", "FLORIDA", "GEORGIA", "HAWAII", "IDAHO",
  "ILLINOIS", "INDIANA", "IOWA", "KANSAS", "KENTUCKY", "LOUISIANA",
  "MAINE", "MARYLAND", "MASSACHUSETTS", "MICHIGAN", "MINNESOTA",
  "MISSISSIPPI", "MISSOURI", "MONTANA", "NEBRASKA", "NEVADA",
  "NEW HAMPSHIRE", "NEW JERSEY", "NEW MEXICO", "NEW YORK",
  "NORTH CAROLINA", "NORTH DAKOTA", "OHIO", "OKLAHOMA", "OREGON",
  "PENNSYLVANIA", "RHODE ISLAND", "SOUTH CAROLINA", "SOUTH DAKOTA",
  "TENNESSEE", "TEXAS", "UTAH", "VERMONT", "VIRGINIA", "WASHINGTON",
  "WEST VIRGINIA", "WISCONSIN", "WYOMING",
  "DISTRICT OF COLUMBIA", "PUERTO RICO", "GUAM", "AMERICAN SAMOA", "U.S. VIRGIN ISLANDS", "NORTHERN MARIANA ISLANDS"
];

export default function EmailPreferences() {
  const { user } = useKindeBrowserClient();
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [preferenceId, setPreferenceId] = useState<number | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase.from("service_category_list").select("categories");
      if (!error && data) {
        setCategories(data.map((cat: { categories: string }) => cat.categories));
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (user?.email) {
      fetchPreferences(user.email);
    }
  }, [user]);

  const fetchPreferences = async (email: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_email_preferences")
        .select("id, preferences")
        .eq("user_email", email)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("❌ Error fetching preferences:", error);
      } else if (data) {
        setPreferenceId(data.id);
        setSelectedStates(data.preferences?.states || []);
        setSelectedCategories(data.preferences?.categories || []);
      } else {
        const { data: newRecord, error: insertError } = await supabase
          .from("user_email_preferences")
          .insert({ user_email: email, preferences: { states: [], categories: [] } })
          .select("id")
          .single();

        if (!insertError) setPreferenceId(newRecord.id);
      }
    } catch (err) {
      console.error("❌ Unexpected error fetching preferences:", err);
      alert("Failed to load preferences. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.email || preferenceId === null) return;
    setLoading(true);
    try {
      const updatedPreferences = { states: selectedStates, categories: selectedCategories };
      const { error } = await supabase
        .from("user_email_preferences")
        .update({ preferences: updatedPreferences })
        .eq("id", preferenceId);

      if (error) {
        console.error("❌ Error saving preferences:", error);
        alert("Failed to save preferences.");
      } else {
        alert("✅ Preferences saved successfully!");
      }
    } catch (err) {
      console.error("❌ Unexpected error saving preferences:", err);
      alert("Failed to save preferences. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectAllStates = () => {
    setSelectedStates(STATES);
  };

  const deselectAllStates = () => {
    setSelectedStates([]);
  };

  const selectAllCategories = () => {
    setSelectedCategories(categories);
  };

  const deselectAllCategories = () => {
    setSelectedCategories([]);
  };

  return (
    <>
              <h1 className="text-3xl md:text-4xl text-[#012C61] font-lemonMilkRegular uppercase mb-8 text-center">
        Email Alerts
      </h1>
      <div className="max-w-7xl mx-auto relative">
        <p className="text-gray-600 mb-6 text-center text-lg">
          Stay informed of Medicaid provider rate developments by selecting States and Categories for regular email alerts.
        </p>

        {user?.email && (
          <motion.p
            className="text-center text-lg font-semibold text-gray-700 mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Logged in as: <span className="text-[#012C61]">{user.email}</span>
          </motion.p>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-48">
            <MoonLoader color="#012C61" size={40} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
              <div className="px-6 py-5">
                <h2 className="text-2xl font-semibold text-[#012C61] mb-4 border-b pb-2">Select States</h2>
                <button onClick={selectAllStates} className="bg-[#012C61] text-white px-4 py-2 rounded-md mb-4 hover:bg-[#023d85]">Select All</button>
                <button onClick={deselectAllStates} className="bg-gray-300 text-black px-4 py-2 rounded-md mb-4 ml-2 hover:bg-gray-400">Deselect All</button>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {STATES.map(state => (
                    <label
                      key={state}
                      className="flex items-center space-x-3 py-2 px-3 rounded-lg hover:bg-blue-50 transition-colors duration-200 cursor-pointer"
                      style={{ minWidth: '200px' }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedStates.includes(state)}
                        onChange={() => setSelectedStates(prev =>
                          prev.includes(state) ? prev.filter(s => s !== state) : [...prev, state]
                        )}
                        className="form-checkbox h-5 w-5 text-[#012C61] rounded border-gray-300 focus:ring-[#012C61]/50"
                      />
                      <span className="text-gray-700 text-sm flex-1">{state}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
              <div className="px-6 py-5">
                <h2 className="text-2xl font-semibold text-[#012C61] mb-4 border-b pb-2">Select Categories</h2>
                <button onClick={selectAllCategories} className="bg-[#012C61] text-white px-4 py-2 rounded-md mb-4 hover:bg-[#023d85]">Select All</button>
                <button onClick={deselectAllCategories} className="bg-gray-300 text-black px-4 py-2 rounded-md mb-4 ml-2 hover:bg-gray-400">Deselect All</button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Array.from(new Set(categories)).map(category => (
                    <label
                      key={category}
                      className="flex items-center space-x-3 py-2 px-3 rounded-lg hover:bg-blue-50 transition-colors duration-200 cursor-pointer"
                      style={{ minWidth: '200px' }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category)}
                        onChange={() => setSelectedCategories(prev =>
                          prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
                        )}
                        className="form-checkbox h-5 w-5 text-[#012C61] rounded border-gray-300 focus:ring-[#012C61]/50"
                      />
                      <span className="text-gray-700 text-sm flex-1">{category}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <motion.button
            onClick={handleSave}
            className="bg-[#012C61] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#023d85] transition-transform transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Alerts"}
          </motion.button>
        </div>
      </div>
    </>
  );
}
