"use client";

import AppLayout from "@/app/components/applayout";

export default function Dashboard() {
  return (
    <AppLayout activeTab="dashboard">
      <div className="w-full aspect-video rounded-lg overflow-hidden shadow-lg border">
        <iframe
          src="https://lookerstudio.google.com/embed/reporting/63c9ff09-019b-4855-a466-4d0116936105/page/zRnXE"
          title="Looker Studio Report"
          width="100%"
          height="100%"
          allowFullScreen
          frameBorder="0"
        ></iframe>
      </div>
    </AppLayout>
  );
}
