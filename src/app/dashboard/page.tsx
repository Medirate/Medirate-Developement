"use client";

import { useEffect } from "react";
import AppLayout from "@/app/components/applayout";

export default function Dashboard() {
  useEffect(() => {
    // Disable right-click
    const disableRightClick = (event: MouseEvent) => event.preventDefault();
    document.addEventListener("contextmenu", disableRightClick);

    // Disable keyboard shortcuts for inspecting elements
    const disableShortcuts = (event: KeyboardEvent) => {
      if (
        event.ctrlKey && (event.key === "u" || event.key === "U") || // Disable Ctrl+U
        event.key === "F12" || // Disable F12
        (event.ctrlKey && event.shiftKey && event.key === "I") // Disable Ctrl+Shift+I
      ) {
        event.preventDefault();
      }
    };
    document.addEventListener("keydown", disableShortcuts);

    return () => {
      document.removeEventListener("contextmenu", disableRightClick);
      document.removeEventListener("keydown", disableShortcuts);
    };
  }, []);

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
