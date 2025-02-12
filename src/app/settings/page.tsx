<<<<<<< HEAD
"use client";

import { useState } from "react";
import AppLayout from "@/app/components/applayout";

export default function Settings() {
  const [subscribeToNewsletter, setSubscribeToNewsletter] = useState(false);

  const handleSave = () => {
    const message = subscribeToNewsletter
      ? "You are now subscribed to the weekly newsletter!"
      : "You have unsubscribed from the weekly newsletter!";
    alert(message + " (This is just a placeholder)");
  };

  return (
    <AppLayout activeTab="settings">
      <h1 className="text-5xl md:text-6xl text-[#012C61] font-lemonMilkRegular uppercase mb-8 text-center">
        Settings
      </h1>

      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-[#012C61] mb-4">
          Newsletter Subscription
        </h2>
        <div className="flex items-center space-x-4 mb-6">
          <input
            type="checkbox"
            id="subscribe"
            checked={subscribeToNewsletter}
            onChange={() => setSubscribeToNewsletter(!subscribeToNewsletter)}
            className="w-5 h-5 text-[#012C61] border-gray-300 rounded focus:ring-[#012C61]"
          />
          <label htmlFor="subscribe" className="text-gray-700">
            Subscribe to the weekly newsletter
          </label>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-[#012C61] text-white rounded-lg hover:bg-blue-800"
          >
            Save Changes
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
=======
"use client";

import { useState } from "react";
import AppLayout from "@/app/components/applayout";

export default function Settings() {
  const [subscribeToNewsletter, setSubscribeToNewsletter] = useState(false);

  const handleSave = () => {
    const message = subscribeToNewsletter
      ? "You are now subscribed to the weekly newsletter!"
      : "You have unsubscribed from the weekly newsletter!";
    alert(message + " (This is just a placeholder)");
  };

  return (
    <AppLayout activeTab="settings">
      <h1 className="text-5xl md:text-6xl text-[#012C61] font-lemonMilkRegular uppercase mb-8 text-center">
        Settings
      </h1>

      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-[#012C61] mb-4">
          Newsletter Subscription
        </h2>
        <div className="flex items-center space-x-4 mb-6">
          <input
            type="checkbox"
            id="subscribe"
            checked={subscribeToNewsletter}
            onChange={() => setSubscribeToNewsletter(!subscribeToNewsletter)}
            className="w-5 h-5 text-[#012C61] border-gray-300 rounded focus:ring-[#012C61]"
          />
          <label htmlFor="subscribe" className="text-gray-700">
            Subscribe to the weekly newsletter
          </label>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-[#012C61] text-white rounded-lg hover:bg-blue-800"
          >
            Save Changes
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
>>>>>>> origin/main
