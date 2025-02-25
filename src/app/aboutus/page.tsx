import Image from "next/image";
import Link from "next/link";
import { Facebook, Linkedin } from "lucide-react";
import Footer from "@/app/components/footer"; // Import the Footer component

export default function AboutUs() {
  return (
    <div className="relative text-left bg-gray-100">
      {/* Hero Section */}
      <section className="relative w-full h-[400px] md:h-[500px] flex items-center justify-center">
        <Image
          src="/images/business-adviser-analyzing-financial-figures-denoting-progress_1418-2907.jpg"
          alt="About Us Banner"
          layout="fill"
          objectFit="cover"
          className="brightness-75"
          priority
        />
        <h1 className="absolute text-5xl md:text-6xl text-white font-lemonMilkRegular uppercase tracking-wide">
          ABOUT US
        </h1>
      </section>

      {/* About Us Content */}
      <section className="relative py-16 px-8 text-left">
        <div className="max-w-4xl mx-auto">
          <p className="text-gray-700 leading-relaxed text-lg mb-8">
            Our team has deep experience and expertise in Medicaid policy setting, program administration, provider operations, and due diligence analysis. MediRate and its advisors bring unique expertise in the areas of:
          </p>
          <ul className="list-disc list-inside text-gray-700 text-left space-y-4">
            <li>Long-term services and supports, including home and community-based services</li>
            <li>Home health and private duty nursing</li>
            <li>Behavioral Health services</li>
            <li>Services for individuals living with addiction</li>
            <li>Services for individuals living with autism</li>
          </ul>
        </div>
      </section>

      {/* Meet Our Team Section */}
      <section className="relative py-16 px-8 text-left">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-lemonMilkRegular text-[#002F6C] uppercase tracking-wide mb-16 text-center">
            Meet Our Team
          </h2>
          
          {/* Founder */}
          <div className="flex flex-col md:flex-row items-center md:space-x-12 mb-16 bg-gray-100 p-8 rounded-lg">
            <Image
              src="/images/greg.png"
              alt="Greg Nersessian"
              width={300}
              height={400}
              className="rounded-lg shadow-lg"
            />
            <div className="text-lg text-left">
              <h4 className="text-xl font-semibold text-[#002F6C] mb-4">Founder</h4>
              <h3 className="text-2xl font-semibold text-[#002F6C] mb-6">Greg Nersessian</h3>
              <p className="text-gray-700 leading-relaxed mb-8">
                Greg Nersessian is President and Founder of MediRate, LLC. Prior to founding MediRate, Greg spent 14 years as a healthcare consultant for Health Management Associates (HMA), the nation's largest consulting firm focused on government-sponsored healthcare programs.
              </p>
              <p className="text-gray-700 leading-relaxed mb-8">
                Greg's work at HMA involved supporting healthcare providers, investors, and other stakeholders in their evaluation of capital allocation opportunities within government-funded businesses. In this role, Greg recognized the key role that reimbursement rate dynamics play in private sector partnerships.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Greg founded MediRate with the goal of improving cost transparency and data comparability across programs. Prior to joining HMA, Greg spent a decade on Wall Street as a sell-side equity research analyst covering the managed care sector. In this role, Greg was known for his groundbreaking research into the Medicaid managed care sector.
              </p>
            </div>
          </div>
          
          {/* Advisors */}
          <h3 className="text-3xl font-lemonMilkRegular text-[#002F6C] uppercase tracking-wide mb-12">Advisors</h3>
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-lg text-gray-700 text-left">
              <h4 className="text-xl font-semibold text-[#002F6C]">Kevin Hancock</h4>
            </div>
            
            <div className="text-lg text-gray-700 text-left">
              <h4 className="text-xl font-semibold text-[#002F6C]">Gina Eckart</h4>
            </div>
            
            <div className="text-lg text-gray-700 text-left">
              <h4 className="text-xl font-semibold text-[#002F6C]">Corey Waller</h4>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <Footer />
    </div>
  );
}
