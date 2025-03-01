"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  User,
  Settings,
  CircleDollarSign,
  ChartNoAxesCombined,
  Megaphone,
  Mail,
  ChartColumnStacked,
  ChartLine,
} from "lucide-react";
import Link from "next/link";

interface SideNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

const SideNav = ({
  activeTab,
  setActiveTab,
  isSidebarCollapsed,
  toggleSidebar,
}: SideNavProps) => {
  const pathname = usePathname();

  // Update the tab mapping
  useEffect(() => {
    const tabMapping: { [key: string]: string } = {
      "/dashboard": "dashboard",
      "/rate-developments": "rateDevelopments",
      "/state-rate-comparison": "stateRateComparison",
      "/profile": "profile",
      "/subscription": "subscription",
      "/settings": "settings",
      "/historical-rates": "historicalRates",
      "/email-preferences": "emailPreferences"
    };

    // Match the exact path or paths that start with the base path
    const activeTab = Object.keys(tabMapping).find(key => 
      pathname === key || pathname.startsWith(`${key}/`)
    );

    if (activeTab && tabMapping[activeTab]) {
      setActiveTab(tabMapping[activeTab]);
    }
  }, [pathname, setActiveTab]);

  return (
    <aside
      className={`transition-all duration-500 ease-in-out shadow-lg ${
        isSidebarCollapsed ? "w-16" : "w-64"
      }`}
      style={{
        backgroundColor: "rgb(1, 44, 97)",
        color: "white",
        position: "fixed", // Keeps it fixed
        top: "5.5rem", // Height of the Navbar
        bottom: "0", // Extend to the bottom of the viewport
        left: 0, // Aligns to the left of the viewport
        height: "calc(100vh - 5.5rem)", // Full height minus navbar
        zIndex: 50, // Ensures it stays above the content
      }}
    >
      {/* Sidebar Toggle Button */}
      <div className="flex justify-end p-4">
        <button
          onClick={toggleSidebar}
          className="p-2 text-white hover:bg-gray-800 rounded-md"
        >
          {isSidebarCollapsed ? <Menu size={20} /> : <X size={20} />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="mt-6">
        <ul className="space-y-2">
          <li className="group">
            <Link
              href="/dashboard"
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center p-4 hover:bg-gray-200/20 transition-colors cursor-pointer ${
                activeTab === "dashboard" ? "bg-gray-200/20" : ""
              }`}
            >
              <div className="flex items-center justify-center w-6 h-6">
                <ChartNoAxesCombined size={20} />
              </div>
              <span
                className={`ml-4 font-semibold transition-opacity duration-300 ease-in-out flex-grow ${
                  isSidebarCollapsed ? "opacity-0 invisible" : "opacity-100 visible"
                }`}
                style={{ whiteSpace: "nowrap" }}
              >
                Dashboard
              </span>
            </Link>
          </li>
          <li className="group">
            <Link
              href="/state-rate-comparison"
              onClick={() => setActiveTab("stateRateComparison")}
              className={`flex items-center p-4 hover:bg-gray-200/20 transition-colors cursor-pointer ${
                activeTab === "stateRateComparison" ? "bg-gray-200/20" : ""
              }`}
            >
              <div className="flex items-center justify-center w-6 h-6">
                <ChartColumnStacked size={20} />
              </div>
              <span
                className={`ml-4 font-semibold transition-opacity duration-300 ease-in-out flex-grow ${
                  isSidebarCollapsed ? "opacity-0 invisible" : "opacity-100 visible"
                }`}
                style={{ whiteSpace: "nowrap" }}
              >
                State Rate Comparison
              </span>
            </Link>
          </li>
          <li className="group">
            <Link
              href="/historical-rates"
              onClick={() => setActiveTab("historicalRates")}
              className={`flex items-center p-4 hover:bg-gray-200/20 transition-colors cursor-pointer ${
                activeTab === "historicalRates" ? "bg-gray-200/20" : ""
              }`}
            >
              <div className="flex items-center justify-center w-6 h-6">
                <ChartLine size={20} />
              </div>
              <span
                className={`ml-4 font-semibold transition-opacity duration-300 ease-in-out flex-grow ${
                  isSidebarCollapsed ? "opacity-0 invisible" : "opacity-100 visible"
                }`}
                style={{ whiteSpace: "nowrap" }}
              >
                Historical Rates
              </span>
            </Link>
          </li>
          {[
            {
              tab: "rateDevelopments",
              icon: <Megaphone size={20} />,
              label: "Rate Developments",
              href: "/rate-developments",
            },
            {
              tab: "profile",
              icon: <User size={20} />,
              label: "Profile",
              href: "/profile",
            },
            {
              tab: "emailPreferences",
              icon: <Mail size={20} />,
              label: "Email Preferences",
              href: "/email-preferences",
            },
            {
              tab: "subscription",
              icon: <CircleDollarSign size={20} />,
              label: "Subscription",
              href: "/subscription",
            },
            {
              tab: "settings",
              icon: <Settings size={20} />,
              label: "Settings",
              href: "/settings",
            },
          ].map(({ tab, icon, label, href }) => (
            <li key={tab} className="group">
              <Link
                href={href}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center p-4 hover:bg-gray-200/20 transition-colors cursor-pointer ${
                  activeTab === tab ? "bg-gray-200/20" : ""
                }`}
              >
                {/* Icon Section */}
                <div className="flex items-center justify-center w-6 h-6">{icon}</div>
                {/* Label Section */}
                <span
                  className={`ml-4 font-semibold transition-opacity duration-300 ease-in-out flex-grow ${
                    isSidebarCollapsed ? "opacity-0 invisible" : "opacity-100 visible"
                  }`}
                  style={{ whiteSpace: "nowrap" }} // Prevents wrapping of text
                >
                  {label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default SideNav;
