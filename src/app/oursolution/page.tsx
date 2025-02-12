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
  Search,
  Check,
} from "lucide-react";

export default function OurSolution() {
  return (
    <div className="text-center">
      {/* Hero Section */}
      <section className="relative w-full h-[400px] md:h-[500px]">
        <Image
          src="/images/our solution screenshot.png"
          alt="People looking at dashboard"
          layout="fill"
          objectFit="cover"
          className="brightness-75"
          priority
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="text-4xl md:text-5xl text-white font-lemonMilkRegular uppercase tracking-wide">
            Our Solution
          </h1>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 px-6 reusable-gradient-bg text-lg">
        <div className="max-w-7xl mx-auto">
          {/* Introductory Content */}
          <div className="text-left ml-4 mb-8">
            <p className="mb-6 leading-relaxed">
              MediRate’s solution is designed to take the mystery out of
              identifying and monitoring fee schedule payment rates for
              Medicaid-reimbursed services.
            </p>
            <p className="leading-relaxed">
              MediRate is a comprehensive, national database of Medicaid
              fee-for-service reimbursement rates for key provider service lines.
              Fee schedule payment rates represent the basis for provider reimbursement
              under Medicaid fee-for-service models and are typically the foundation
              for negotiations with third-party payors such as Medicaid managed care
              organizations (MCOs), prepaid inpatient health plans (PIHPs), accountable
              care organizations (ACOs), managed behavioral health organizations, area
              agencies on aging (AAAs), and others.
            </p>
            <p className="leading-relaxed mt-6">
              MediRate’s services are designed to improve price transparency and help provider organizations:
            </p>
            <ul className="space-y-3 text-left pl-6">
              <li className="flex items-center"><DollarSign className="w-6 h-6 text-[#012C61] mr-4" /> Maximize revenue</li>
              <li className="flex items-center"><FileText className="w-6 h-6 text-[#012C61] mr-4" /> Improve contracting with MCOs, ACOs, PIHPs, and payors</li>
              <li className="flex items-center"><TrendingUp className="w-6 h-6 text-[#012C61] mr-4" /> Inform value-based contracting initiatives</li>
              <li className="flex items-center"><MapPin className="w-6 h-6 text-[#012C61] mr-4" /> Identify expansion markets</li>
              <li className="flex items-center"><ThumbsUp className="w-6 h-6 text-[#012C61] mr-4" /> Support advocacy efforts</li>
              <li className="flex items-center"><Search className="w-6 h-6 text-[#012C61] mr-4" /> Conduct acquisition-related due diligence</li>
            </ul>

            {/* Screenshot and Paragraph Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-8">
              {/* Service Screenshot */}
              <div className="flex justify-center lg:justify-start">
                <Image
                  src="/images/Screenshot Service.png"
                  alt="Service Screenshot"
                  width={600} // Increased by 50%
                  height={450} // Increased by 50%
                  className="rounded-lg shadow-lg"
                />
              </div>
              <div>
                <p className="leading-relaxed">
                  We curate Medicaid fee schedules, provider manuals, provider bulletins, legislative and appropriations’ documents,
                  regulatory actions, and other sources to aggregate fee-for-service payment amounts by CPT/HCPCS billing code across 50 states
                  and the District of Columbia.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-12">
              {/* Historical Screenshot */}
              <div className="flex justify-center lg:justify-start">
                <Image
                  src="/images/Screenshot Historical.png"
                  alt="Historical Screenshot"
                  width={600} // Increased by 50%
                  height={450} // Increased by 50%
                  className="rounded-lg shadow-lg"
                />
              </div>
              <div>
                <p className="leading-relaxed">
                  Subscribers can search for payment rates by service line category, billing code, state, program, and date, track them over time,
                  and compare them to other state payment amounts and national averages.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-12">
              {/* Rate Screenshot */}
              <div className="flex justify-center lg:justify-start">
                <Image
                  src="/images/Screenshot Rate Developements.png"
                  alt="Rate Screenshot"
                  width={600} // Increased by 50%
                  height={450} // Increased by 50%
                  className="rounded-lg shadow-lg"
                />
              </div>
              <div>
                <p className="leading-relaxed">
                  Subscribers can also monitor real-time policy developments related to Medicaid payment rates nationally and on a state-by-state
                  basis in order to stay on top of any potential changes.
                </p>
              </div>
            </div>
          </div>

          {/* Video and Table Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-12 items-start">
            {/* Left: Video Section */}
            <div className="w-full h-full">
              <h2 className="text-lg font-lemonMilkRegular text-[#012C61] mb-4">
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

            {/* Right: Table */}
            <div className="w-full h-full">
              <h3 className="text-lg font-semibold mb-4">
                MediRate tracks reimbursement data for the following service lines
              </h3>
              <table className="w-full border border-gray-300 text-left">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="p-2 font-bold border">Service Line/Provider Type</th>
                    <th className="p-2 font-bold border">MediRate</th>
                    <th className="p-2 font-bold border">Coming Soon</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border">Applied Behavioral Analysis (ABA)</td>
                    <td className="p-2 border flex justify-center"><Check className="text-green-600" /></td>
                    <td className="p-2 border"></td>
                  </tr>
                  <tr>
                    <td className="p-2 border">Personal Care Services (PCS)</td>
                    <td className="p-2 border flex justify-center"><Check className="text-green-600" /></td>
                    <td className="p-2 border"></td>
                  </tr>
                  <tr>
                    <td className="p-2 border">Other Home and Community-Based Services</td>
                    <td className="p-2 border"></td>
                    <td className="p-2 border flex justify-center"><Check className="text-green-600" /></td>
                  </tr>
                  <tr>
                    <td className="p-2 border">Behavioral Health and Substance Use Disorder (SUD) Services</td>
                    <td className="p-2 border"></td>
                    <td className="p-2 border flex justify-center"><Check className="text-green-600" /></td>
                  </tr>
                  <tr>
                    <td className="p-2 border">Services for Individuals Living with Intellectual and Developmental Disabilities</td>
                    <td className="p-2 border"></td>
                    <td className="p-2 border flex justify-center"><Check className="text-green-600" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="mt-12 text-center">
            <a
              href="mailto:contact@medirate.net"
              className="text-[#012C61] hover:underline flex justify-center items-center space-x-2"
            >
              <Mail className="w-6 h-6" />
              <span>Email link to request a demo</span>
            </a>
          </div>
      </section>
      <Footer />
    </div>
  );
}