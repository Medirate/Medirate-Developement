"use client";

import Image from "next/image";
import Footer from "@/app/components/footer";
import {
  Cross,
  DollarSign,
  FileText,
  TrendingUp,
  MapPin,
  ThumbsUp,
  Briefcase,
  Mail,
} from "lucide-react";

export default function OurSolution() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative w-full h-[400px] md:h-[500px]">
        <Image
          src="/images/people-looking-at-dashboard.jpg"
          alt="People looking at dashboard"
          layout="fill"
          objectFit="cover"
          className="brightness-75"
          priority
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="text-5xl md:text-6xl text-white font-lemonMilkRegular uppercase tracking-wide">
            Our Solution
          </h1>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 px-6 reusable-gradient-bg">
        <div className="max-w-7xl mx-auto">
          {/* Introductory Content */}
          <div className="text-center mb-8">
            <p className="text-lg mb-6 leading-relaxed">
              MediRate’s solution is designed to take the mystery out of
              identifying and monitoring fee schedule payment rates for
              Medicaid-reimbursed services.
            </p>
            <p className="leading-relaxed">
              MediRate is a comprehensive, national database of Medicaid
              fee-for-service reimbursement rates for key provider service
              lines. We curate Medicaid fee schedules, provider manuals,
              provider bulletins, legislative and appropriations documents,
              regulatory actions, and other sources to aggregate
              fee-for-service payment amounts by CPT/HCPCS billing code across
              all 50 states and the District of Columbia.
            </p>
            <ul className="mt-6 space-y-3">
              <li className="flex items-center justify-center">
                <Cross className="w-6 h-6 text-[#012C61] mr-2" />
                <span>Personal care services</span>
              </li>
              <li className="flex items-center justify-center">
                <Cross className="w-6 h-6 text-[#012C61] mr-2" />
                <span>Autism/applied behavioral analysis (ABA)</span>
              </li>
            </ul>
            <p className="leading-relaxed mt-6">
              Subscribers can search for payment rates by service line category,
              billing code, state, program, and date, track them over time, and
              compare them to other state payment amounts and national
              averages.
            </p>
          </div>

          {/* Video and Points Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-12">
            {/* Left: Video Section */}
            <div>
              <h2 className="text-m font-lemonMilkRegular text-[#012C61] mb-4">
                Learn more about how MediRate can help your business succeed
                with a video presentation:
              </h2>
              <div className="aspect-video">
                <iframe
                  className="w-full h-full rounded-lg shadow-lg"
                  src="https://www.youtube.com/embed/jPQlEpInwTE"
                  title="MediRate Video Presentation"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>

            {/* Right: Additional Points */}
            <div className="flex flex-col justify-center">
              <p className="text-lg font-semibold mb-4">
                MediRate’s services are designed to improve price transparency
                and help provider organizations:
              </p>
              <ul className="space-y-4">
                <li className="flex items-center">
                  <DollarSign className="w-6 h-6 text-[#012C61] mr-2" />
                  <span>Maximize revenue</span>
                </li>
                <li className="flex items-center">
                  <FileText className="w-6 h-6 text-[#012C61] mr-2" />
                  <span>Improve contracting with MCOs</span>
                </li>
                <li className="flex items-center">
                  <TrendingUp className="w-6 h-6 text-[#012C61] mr-2" />
                  <span>Inform value-based contracting initiatives</span>
                </li>
                <li className="flex items-center">
                  <MapPin className="w-6 h-6 text-[#012C61] mr-2" />
                  <span>Identify expansion markets</span>
                </li>
                <li className="flex items-center">
                  <ThumbsUp className="w-6 h-6 text-[#012C61] mr-2" />
                  <span>Support advocacy efforts</span>
                </li>
                <li className="flex items-center">
                  <Briefcase className="w-6 h-6 text-[#012C61] mr-2" />
                  <span>Diligence potential acquisition opportunities</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Email Demo Link */}
          <div className="mt-12 text-center">
            <a
              href="mailto:info@medirate.com"
              className="text-[#012C61] hover:underline flex justify-center items-center space-x-2"
            >
              <Mail className="w-6 h-6" />
              <span>Email link to request a demo</span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
