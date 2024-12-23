import { useState } from "react";
import { Home, User, Settings, ChartNoAxesCombined } from "lucide-react";
import Link from "next/link";

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);

  const menuItems = [
    { name: "Dashboard", icon: <ChartNoAxesCombined />, href: "/dashboard" },
    { name: "Profile", icon: <User />, href: "/dashboard/profile" },
    { name: "Settings", icon: <Settings />, href: "/dashboard/settings" },
  ];

  return (
    <div className={`flex`}>
      {/* Sidebar */}
      <aside
        className={`${
          isOpen ? "w-64" : "w-16"
        } bg-[#012C61] text-white h-screen transition-width duration-300 ease-in-out`}
      >
        {/* Toggle Button */}
        <div className="p-4">
          <button onClick={toggleSidebar} className="text-white">
            {isOpen ? "×" : "☰"}
          </button>
        </div>
        {/* Menu Items */}
        <nav className="mt-4">
          <ul>
            {menuItems.map((item, index) => (
              <li
                key={index}
                className="flex items-center p-4 hover:bg-[#05488A] transition-colors"
              >
                <div className="w-6">{item.icon}</div>
                {isOpen && (
                  <Link href={item.href} className="ml-4 font-semibold">
                    {item.name}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      {/* Content */}
      <main className="flex-grow p-6">
        <h1 className="text-3xl font-bold">Welcome to MediRate Dashboard</h1>
      </main>
    </div>
  );
};

export default Sidebar;
