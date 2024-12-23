'use client'; // Add this line at the very top of the file

import Link from "next/link";
import Image from "next/image";
import { Facebook, Linkedin } from "lucide-react";
import { useState } from "react";

export default function ContactUs() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    company: "",
    title: "",
    email: "",
    message: "",
  });

  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: "" }); // Clear the error for the field as the user types
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.firstName) newErrors.firstName = "First name is required.";
    if (!formData.lastName) newErrors.lastName = "Last name is required.";
    if (!formData.company) newErrors.company = "Company is required.";
    if (!formData.title) newErrors.title = "Title is required.";
    if (!formData.email) {
      newErrors.email = "Email is required.";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Enter a valid email address.";
    }
    if (!formData.message) newErrors.message = "Message is required.";
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Send the message as an email (using a backend API or SMTP server)
    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...formData, toEmail: "devreddy923@gmail.com" }),
      });

      if (response.ok) {
        alert("Your message has been sent successfully!");
        setFormData({
          firstName: "",
          lastName: "",
          company: "",
          title: "",
          email: "",
          message: "",
        });
      } else {
        alert("Failed to send your message. Please try again later.");
      }
    } catch (error) {
      console.error("Error sending email:", error);
      alert("An error occurred. Please try again later.");
    }
  };

  return (
    <div className="relative flex flex-col min-h-screen">
      {/* Main Content Section with Gradient */}
      <main className="relative flex-grow py-12 px-6 overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 -z-10 reusable-gradient-bg"></div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Side: Heading and Text */}
          <div>
            <h1 className="text-5xl md:text-6xl text-[#012C61] font-lemonMilkRegular uppercase mb-6">
              CONTACT US
            </h1>
            <p className="text-gray-700 leading-relaxed mb-6">
              Submit your questions and/or feedback. A
              customer service representative will follow up with you shortly.
            </p>
            <p className="text-gray-700 leading-relaxed">
              MediRate strives to serve a broad array of Medicaid stakeholders. If
              there’s any information you’d like to see us add to our database,
              including service lines that are not currently captured, please
              share it with us.
            </p>
          </div>

          {/* Right Side: Contact Form */}
          <div>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <input
                    type="text"
                    name="firstName"
                    placeholder="First Name"
                    className={`w-full p-3 border ${
                      errors.firstName ? "border-red-500" : "border-gray-300"
                    } rounded-md focus:outline-none focus:ring-2 ${
                      errors.firstName ? "focus:ring-red-500" : "focus:ring-[#012C61]"
                    }`}
                    value={formData.firstName}
                    onChange={handleInputChange}
                  />
                  {errors.firstName && (
                    <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
                  )}
                </div>
                <div>
                  <input
                    type="text"
                    name="lastName"
                    placeholder="Last Name"
                    className={`w-full p-3 border ${
                      errors.lastName ? "border-red-500" : "border-gray-300"
                    } rounded-md focus:outline-none focus:ring-2 ${
                      errors.lastName ? "focus:ring-red-500" : "focus:ring-[#012C61]"
                    }`}
                    value={formData.lastName}
                    onChange={handleInputChange}
                  />
                  {errors.lastName && (
                    <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <input
                    type="text"
                    name="company"
                    placeholder="Company"
                    className={`w-full p-3 border ${
                      errors.company ? "border-red-500" : "border-gray-300"
                    } rounded-md focus:outline-none focus:ring-2 ${
                      errors.company ? "focus:ring-red-500" : "focus:ring-[#012C61]"
                    }`}
                    value={formData.company}
                    onChange={handleInputChange}
                  />
                  {errors.company && (
                    <p className="text-red-500 text-sm mt-1">{errors.company}</p>
                  )}
                </div>
                <div>
                  <input
                    type="text"
                    name="title"
                    placeholder="Title"
                    className={`w-full p-3 border ${
                      errors.title ? "border-red-500" : "border-gray-300"
                    } rounded-md focus:outline-none focus:ring-2 ${
                      errors.title ? "focus:ring-red-500" : "focus:ring-[#012C61]"
                    }`}
                    value={formData.title}
                    onChange={handleInputChange}
                  />
                  {errors.title && (
                    <p className="text-red-500 text-sm mt-1">{errors.title}</p>
                  )}
                </div>
              </div>
              <div>
                <input
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  className={`w-full p-3 border ${
                    errors.email ? "border-red-500" : "border-gray-300"
                  } rounded-md focus:outline-none focus:ring-2 ${
                    errors.email ? "focus:ring-red-500" : "focus:ring-[#012C61]"
                  }`}
                  value={formData.email}
                  onChange={handleInputChange}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
              </div>
              <div>
                <textarea
                  rows={5}
                  name="message"
                  placeholder="Message"
                  className={`w-full p-3 border ${
                    errors.message ? "border-red-500" : "border-gray-300"
                  } rounded-md focus:outline-none focus:ring-2 ${
                    errors.message ? "focus:ring-red-500" : "focus:ring-[#012C61]"
                  }`}
                  value={formData.message}
                  onChange={handleInputChange}
                ></textarea>
                {errors.message && (
                  <p className="text-red-500 text-sm mt-1">{errors.message}</p>
                )}
              </div>
              <button
                type="submit"
                className="w-full bg-[#012C61] text-white py-3 rounded-md hover:bg-[#011B40] transition-colors"
              >
                Submit
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer Section */}
      <footer className="bg-black py-12 text-center text-white">
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
