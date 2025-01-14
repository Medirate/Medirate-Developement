"use client";

import { useState, useEffect } from "react";
import SideNav from "@/app/components/sidenav";
import Footer from "@/app/components/footer";

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab: string;
}

const AppLayout = ({ children, activeTab }: AppLayoutProps) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    // Retrieve the saved sidebar state from localStorage
    if (typeof window !== "undefined") {
      return JSON.parse(localStorage.getItem("isSidebarCollapsed") || "true");
    }
    return true;
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const newState = !prev;
      // Save the new state to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("isSidebarCollapsed", JSON.stringify(newState));
      }
      return newState;
    });
  };

  useEffect(() => {
    // Sync state with localStorage on mount
    if (typeof window !== "undefined") {
      const savedState = JSON.parse(localStorage.getItem("isSidebarCollapsed") || "true");
      setIsSidebarCollapsed(savedState);
    }
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col">
      <div className="reusable-gradient-bg absolute inset-0 z-[-1]"></div>

      <div className="flex flex-grow">
        {/* Side Navigation */}
        <SideNav
          activeTab={activeTab}
          setActiveTab={() => {}}
          isSidebarCollapsed={isSidebarCollapsed}
          toggleSidebar={toggleSidebar}
        />

        {/* Page Content */}
        <main className="flex-grow container mx-auto px-4 py-6">{children}</main>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default AppLayout;
