"use client";

import { useState, useEffect } from "react";
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import Link from "next/link";
import Image from "next/image";
import md5 from "md5";
import {
  Facebook,
  Linkedin,
  User,
  Settings,
  Menu,
  X,
  Camera,
  CircleDollarSign,
  ChartNoAxesCombined,
} from "lucide-react";

export default function Dashboard() {
  const { getUser, isAuthenticated } = useKindeBrowserClient();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    company: "",
    title: "",
    email: "",
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  useEffect(() => {
    if (isAuthenticated) {
      const userData = getUser();
      setUser(userData);
      setProfileData({
        firstName: userData?.given_name || "",
        lastName: userData?.family_name || "",
        company: userData?.company || "",
        title: userData?.title || "",
        email: userData?.email || "",
      });
    }
  }, [isAuthenticated]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleProfileSave = () => {
    alert("Profile changes saved successfully!");
  };

  const getProfilePicture = () => {
    if (user?.picture) return user.picture;
    if (user?.email)
      return `https://www.gravatar.com/avatar/${md5(user.email)}?d=retro`;
    return "/default-avatar.png";
  };

  return (
    <div className="gradient-wrapper relative min-h-screen flex flex-col">
      {/* Gradient Background */}
      <div className="reusable-gradient-bg absolute inset-0 z-[-1]"></div>

      <div className="flex flex-grow">
        {/* Sidebar */}
        <aside
          className={`bg-[#012C61] text-white transition-all duration-500 ease-in-out shadow-lg ${
            isSidebarCollapsed ? "w-16" : "w-64"
          }`}
        >
          <div className="flex justify-end p-4">
            <button
              onClick={toggleSidebar}
              className="p-2 text-white hover:bg-gray-800 rounded-md"
            >
              {isSidebarCollapsed ? <Menu size={20} /> : <X size={20} />}
            </button>
          </div>
          <nav className="mt-6">
            <ul className="space-y-2">
              {[
                { tab: "dashboard", icon: <ChartNoAxesCombined size={20} />, label: "Dashboard" },
                { tab: "profile", icon: <User size={20} />, label: "Profile" },
                { tab: "subscription", icon: <CircleDollarSign size={20} />, label: "Subscription" },
                { tab: "settings", icon: <Settings size={20} />, label: "Settings" },
              ].map(({ tab, icon, label }) => (
                <li
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center p-4 hover:bg-gray-200/20 cursor-pointer ${
                    activeTab === tab ? "bg-gray-200/20" : ""
                  }`}
                >
                  <div className="flex items-center justify-center w-6 h-6">{icon}</div>
                  <span
                    className={`ml-4 font-semibold transition-opacity duration-300 ease-in-out ${
                      isSidebarCollapsed ? "opacity-0 invisible" : "opacity-100 visible"
                    }`}
                  >
                    {label}
                  </span>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-grow container mx-auto px-4 py-6">
          {activeTab === "dashboard" && (
            <div>
              <h1 className="text-5xl md:text-6xl text-[#012C61] font-lemonMilkRegular uppercase mb-6">
                MediRate Dashboard
              </h1>
              <h2 className="text-lg font-semibold mb-4">
                Embedded Looker Studio Report
              </h2>
              <div className="w-full aspect-video rounded-lg overflow-hidden shadow-lg border">
                <iframe
                  src="https://lookerstudio.google.com/embed/reporting/931ee9fd-8338-4de4-8304-0419f5e4dbfd/page/zRnXE"
                  title="Looker Studio Report"
                  width="100%"
                  height="100%"
                  allowFullScreen
                  frameBorder="0"
                ></iframe>
              </div>
            </div>
          )}

          {activeTab === "profile" && (
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold mb-6">Your Profile</h2>
              <div className="flex flex-col space-y-6">
                <div className="flex items-center justify-center">
                  <div className="relative w-24 h-24">
                    {user?.picture ? (
                      <Image
                        src={user.picture}
                        alt="Profile Picture"
                        layout="fill"
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-3xl font-bold text-gray-700">
                        {user?.email?.charAt(0).toUpperCase() || "?"}
                      </div>
                    )}
                    <label
                      htmlFor="profile-picture"
                      className="absolute bottom-0 right-0 bg-gray-700 text-white p-2 rounded-full cursor-pointer"
                    >
                      <Camera size={20} />
                    </label>
                    <input
                      type="file"
                      id="profile-picture"
                      className="hidden"
                      accept="image/*"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      First Name
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={profileData.firstName}
                      onChange={handleProfileChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-lg p-3"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={profileData.lastName}
                      onChange={handleProfileChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-lg p-3"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Company
                    </label>
                    <input
                      type="text"
                      name="company"
                      value={profileData.company}
                      onChange={handleProfileChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-lg p-3"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Title
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={profileData.title}
                      onChange={handleProfileChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-lg p-3"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={profileData.email}
                      onChange={handleProfileChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-lg p-3"
                      disabled
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    onClick={handleProfileSave}
                    className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "subscription" && (
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold mb-6">Subscription</h2>
              <p>Subscription details and plans will go here.</p>
            </div>
          )}

          {activeTab === "settings" && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Settings</h2>
              <p>Settings content goes here.</p>
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-black py-12 text-center text-white mt-auto">
        <div className="flex flex-col items-center">
          <Image
            src="/top-black.png"
            alt="Medirate Logo"
            width={100}
            height={50}
          />
          <div className="mt-4 flex space-x-6">
            <Link href="https://facebook.com" target="_blank" rel="noreferrer">
              <Facebook className="w-8 h-8 text-white hover:text-blue-600 transition-colors" />
            </Link>
            <Link
              href="https://linkedin.com"
              target="_blank"
              rel="noreferrer"
            >
              <Linkedin className="w-8 h-8 text-white hover:text-blue-400 transition-colors" />
            </Link>
          </div>
          <p className="mt-6 max-w-2xl text-gray-300 text-sm">
            Praesent sit amet nulla a libero luctus dictum eu vitae risus.
            Nullam efficitur at lorem vitae tristique. Nunc malesuada accumsan
            convallis. Praesent eros sem, imperdiet ac ante vitae, ultricies
            fringilla justo.
          </p>
        </div>
      </footer>
    </div>
  );
}