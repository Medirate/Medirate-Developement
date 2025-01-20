"use client";

import AppLayout from "@/app/components/applayout";

export default function Dashboard() {
  return (
    <AppLayout activeTab="dashboard">
      <div className="w-full aspect-video rounded-lg overflow-hidden shadow-lg border">
        <iframe
          title="MediRate_14Jan"
          width="100%"
          height="100%"
          src="https://app.powerbi.com/reportEmbed?reportId=78da698e-c2e0-4113-b58b-b82d860d9531&autoAuth=true&ctid=ea69e699-88e7-447d-b936-54f7c3d698a3"
          frameBorder="0"
          allowFullScreen={true}
        ></iframe>
      </div>
    </AppLayout>
  );
}
