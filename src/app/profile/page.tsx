"use client";

import { useState } from "react";
import AppLayout from "@/app/components/applayout";
import { Camera, Mail, Phone, User } from "lucide-react";

export default function Profile() {
  const [firstName, setFirstName] = useState("Devarath");
  const [lastName, setLastName] = useState("Bujangari");
  const [email, setEmail] = useState("dev@metasysconsulting.com");
  const [phoneNumber, setPhoneNumber] = useState("+91 12345 67890");

  const handleSave = () => {
    alert("Profile details saved successfully! (This is just a placeholder)");
  };

  const handlePhotoUpload = () => {
    alert("Photo upload feature coming soon! (This is just a placeholder)");
  };

  return (
    <AppLayout activeTab="profile">
      <h1 className="text-5xl md:text-6xl text-[#012C61] font-lemonMilkRegular uppercase mb-8 text-center">
        Profile
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {/* Profile Picture Upload */}
        <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center">
          <h2 className="text-xl font-semibold text-[#012C61] mb-4">
            Your Photo
          </h2>
          <div className="relative w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center mb-4">
            <span className="text-gray-500 text-2xl font-bold">
              {`${firstName.charAt(0)}${lastName.charAt(0)}`}
            </span>
            <button
              onClick={handlePhotoUpload}
              className="absolute bottom-0 right-0 bg-[#012C61] text-white rounded-full p-2 hover:bg-blue-800"
            >
              <Camera className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={handlePhotoUpload}
            className="w-full px-4 py-2 bg-[#012C61] text-white rounded-lg hover:bg-blue-800"
          >
            Click to upload or drag and drop
          </button>
        </div>

        {/* Personal Information */}
        <div className="col-span-2 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-[#012C61] mb-4">
            Personal Information
          </h2>
          <form className="space-y-6">
            {/* First Name */}
            <div className="flex items-center space-x-4">
              <User className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First Name"
                className="flex-grow px-4 py-2 border rounded-md focus:ring-[#012C61] focus:border-[#012C61]"
              />
            </div>
            {/* Last Name */}
            <div className="flex items-center space-x-4">
              <User className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last Name"
                className="flex-grow px-4 py-2 border rounded-md focus:ring-[#012C61] focus:border-[#012C61]"
              />
            </div>
            {/* Phone Number */}
            <div className="flex items-center space-x-4">
              <Phone className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Phone Number"
                className="flex-grow px-4 py-2 border rounded-md focus:ring-[#012C61] focus:border-[#012C61]"
              />
            </div>
            {/* Email */}
            <div className="flex items-center space-x-4">
              <Mail className="w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                readOnly
                className="flex-grow px-4 py-2 border rounded-md bg-gray-100 cursor-not-allowed"
              />
            </div>
            {/* Save Button */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 bg-[#012C61] text-white rounded-lg hover:bg-blue-800"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
