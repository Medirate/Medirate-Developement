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
  Bell,
  Gavel,
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

  // Dynamically set active tab based on pathname
  useEffect(() => {
    const tabMapping: { [key: string]: string } = {
      "/dashboard": "dashboard",
      "/provider-alerts": "providerAlerts",
      "/legislative-updates": "legislativeAlerts",
      "/profile": "profile",
      "/subscription": "subscription",
      "/settings": "settings",
    };

    if (pathname && tabMapping[pathname]) {
      setActiveTab(tabMapping[pathname]);
    }
  }, [pathname, setActiveTab]);

  return (
    <aside
      className={`transition-all duration-500 ease-in-out shadow-lg ${
        isSidebarCollapsed ? "w-16" : "w-64"
      }`}
      style={{ backgroundColor: "rgb(1, 44, 97)", color: "white" }}
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
          {[
            {
              tab: "dashboard",
              icon: <ChartNoAxesCombined size={20} />,
              label: "Dashboard",
              href: "/dashboard",
            },
            {
              tab: "providerAlerts",
              icon: <Bell size={20} />,
              label: "Provider Alerts",
              href: "/provider-alerts",
            },
            {
              tab: "legislativeAlerts",
              icon: <Gavel size={20} />,
              label: "Legislative Updates",
              href: "/legislative-updates",
            },
            {
              tab: "profile",
              icon: <User size={20} />,
              label: "Profile",
              href: "/profile",
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
