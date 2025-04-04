"use client";

import { LogOut, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { KindeUser } from "@kinde-oss/kinde-auth-nextjs/types";

// ✅ Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const Navbar = () => {
  const { isAuthenticated, isLoading, user } = useKindeBrowserClient();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [userInfo, setUserInfo] = useState<{ name: string; email: string; picture?: string }>({
    name: "User",
    email: "",
    picture: undefined,
  });

  // ✅ Fetch user info from Supabase
  useEffect(() => {
    if (user && user.email) {
      fetchUserFromSupabase(user.email);
    }
  }, [user]);

  // ✅ Sync user to Supabase after login
  useEffect(() => {
    if (isAuthenticated && user?.email) {
      syncUserToSupabase(user.email, user.given_name || "", user.family_name || "", user.id);
    }
  }, [isAuthenticated, user]);

  const fetchUserFromSupabase = async (email: string) => {
    const { data, error } = await supabase
      .from("User")
      .select("FirstName, LastName, Email, Picture")
      .eq("Email", email)
      .single();

    if (error) {
      console.error("❌ Supabase Fetch Error:", error);
    } else {
      setUserInfo({
        name: data.FirstName || data.LastName || "User",
        email: data.Email,
        picture: data.Picture || undefined,
      });
    }
  };

  const syncUserToSupabase = async (email: string, firstName: string, lastName: string, kindeId: string) => {
    try {
      const response = await fetch("/api/sync-kinde-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName, lastName, kindeId }),
      });

      const data = await response.json();
      if (data.error) {
        console.error("❌ Error syncing user:", data.error);
      } else {
        console.log("✅ User synced successfully:", data);
      }
    } catch (err) {
      console.error("❌ Sync error:", err);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const navbarStyle = {
    backgroundColor: "rgb(1, 44, 97)",
    height: "5.5rem",
  };

  const authenticatedPages = [
    "/dashboard",
    "/profile",
    "/settings",
    "/provider-alerts",
    "/subscription",
    "/legislative-updates",
    "/rate-developments",
    "/email-preferences",
    "/state-rate-comparison",
    "/historical-rates",
  ];

  if (isLoading) {
    return (
      <nav className="sticky inset-x-0 top-0 z-[1000] w-full border-b backdrop-blur-lg transition-all" style={navbarStyle}>
        <div className="flex h-[5.5rem] items-center justify-center">
          <span className="text-white">Loading...</span>
        </div>
      </nav>
    );
  }

  if (isAuthenticated && authenticatedPages.includes(pathname)) {
    return (
      <nav className="sticky inset-x-0 top-0 z-[1000] w-full border-b backdrop-blur-lg transition-all" style={navbarStyle}>
        <div className="flex h-[5.5rem] items-center justify-between px-8">
          {/* Wordmark on the Left */}
          <div className="flex-shrink-0 transform -translate-x-4">
            <Link href="/" className="flex items-center">
              <Image src="/top-black-just-word.png" alt="MediRate Wordmark" width={200} height={80} priority />
            </Link>
          </div>

          <div className="flex items-center space-x-6">
            <div className="absolute right-[200px]" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="relative w-10 h-10 rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
              >
                {userInfo.picture ? (
                  <img 
                    src={userInfo.picture} 
                    alt="User Avatar" 
                    className="object-cover w-full h-full" 
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-600 text-sm">
                      {userInfo.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                )}
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg py-4">
                  <div className="px-4 pb-4 border-b">
                    <p className="text-sm font-medium text-gray-900">{userInfo.name}</p>
                    <p className="text-xs text-gray-500">{userInfo.email}</p>
                  </div>
                  <div className="py-2 border-t">
                    <LogoutLink
                      postLogoutRedirectURL="/"
                      className="w-full flex items-center px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
                      onClick={() => {
                        sessionStorage.clear();
                      }}
                    >
                      <LogOut className="w-5 h-5 mr-2" />
                      Sign Out
                    </LogoutLink>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Logo on the Right */}
          <div className="flex-shrink-0 transform -translate-x-4">
            <Image src="/top-black-just-logo.png" alt="MediRate Logo" width={80} height={80} priority />
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="sticky inset-x-0 top-0 z-[1000] w-full border-b backdrop-blur-lg transition-all" style={navbarStyle}>
      <div className="flex h-[5.5rem] items-center justify-between px-8">
        {/* Wordmark on the Left */}
        <div className="flex-shrink-0 transform -translate-x-4">
          <Link href="/" className="flex items-center">
            <Image src="/top-black-just-word.png" alt="MediRate Wordmark" width={200} height={80} priority />
          </Link>
        </div>

        <div className="flex items-center space-x-6">
          <Link href="/oursolution" className="border border-transparent px-4 py-2 rounded-md text-white transition-colors hover:border-white hover:bg-transparent">
            Our Solution
          </Link>
          <Link href="/aboutus" className="border border-transparent px-4 py-2 rounded-md text-white transition-colors hover:border-white hover:bg-transparent">
            About Us
          </Link>
          <Link href="/contactus" className="border border-transparent px-4 py-2 rounded-md text-white transition-colors hover:border-white hover:bg-transparent">
            Contact Us
          </Link>
          <Link href="/subscribe" className="border border-transparent px-4 py-2 rounded-md text-white transition-colors hover:border-white hover:bg-transparent">
            Subscribe
          </Link>

          {isAuthenticated ? (
            <Link href="/dashboard" className="flex items-center border border-white bg-white px-4 py-2 rounded-md text-[#000000] font-semibold transition-colors hover:bg-transparent hover:text-white">
              Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          ) : (
            <Link href="/api/auth/login" className="flex items-center border border-white bg-white px-4 py-2 rounded-md text-[#000000] font-semibold transition-colors hover:bg-transparent hover:text-white">
              Sign In
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          )}
        </div>

        {/* Logo on the Right */}
        <div className="flex-shrink-0 transform -translate-x-4">
          <Image src="/top-black-just-logo.png" alt="MediRate Logo" width={80} height={80} priority />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;