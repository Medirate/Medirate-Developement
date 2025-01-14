"use client";

import AppLayout from "@/app/components/applayout";

export default function Subscription() {
  return (
    <AppLayout activeTab="subscription">
      <h1 className="text-5xl md:text-6xl text-[#012C61] font-lemonMilkRegular uppercase mb-6">
        Subscription
      </h1>
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-xl mx-auto text-center">
        <p className="text-gray-700 text-lg">
          Subscription details and management will be available here soon.
        </p>
      </div>
    </AppLayout>
  );
}
