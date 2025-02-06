"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/app/components/applayout";

export default function Dashboard() {
  const [showTerms, setShowTerms] = useState(() => {
    return sessionStorage.getItem("acceptedTerms") !== "true";
  });
  const [acceptedTerms, setAcceptedTerms] = useState(() => {
    return sessionStorage.getItem("acceptedTerms") === "true";
  });

  useEffect(() => {
    // Disable right-click
    const disableRightClick = (event: MouseEvent) => event.preventDefault();
    document.addEventListener("contextmenu", disableRightClick);

    // Disable keyboard shortcuts for inspecting elements
    const disableShortcuts = (event: KeyboardEvent) => {
      if (
        event.ctrlKey && (event.key === "u" || event.key === "U") || // Disable Ctrl+U
        event.key === "F12" || // Disable F12
        (event.ctrlKey && event.shiftKey && event.key === "I") // Disable Ctrl+Shift+I
      ) {
        event.preventDefault();
      }
    };
    document.addEventListener("keydown", disableShortcuts);

    return () => {
      document.removeEventListener("contextmenu", disableRightClick);
      document.removeEventListener("keydown", disableShortcuts);
    };
  }, []);

  const handleAcceptTerms = () => {
    sessionStorage.setItem("acceptedTerms", "true");
    setShowTerms(false);
    setAcceptedTerms(true);
  };

  return (
    <AppLayout activeTab="dashboard">
      {/* Disable interaction when Terms modal is active, including footer */}
      <div className={showTerms ? "pointer-events-none blur-sm" : ""}>
        {/* Dashboard Content - Only Visible if Terms Accepted */}
        {acceptedTerms && (
          <div className="w-full aspect-video rounded-lg overflow-hidden shadow-lg border">
            <iframe
              title="MediRate_14Jan"
              width="100%"
              height="100%"
              src="https://app.powerbi.com/reportEmbed?reportId=78da698e-c2e0-4113-b58b-b82d860d9531&autoAuth=true&ctid=ea69e699-88e7-447d-b936-54f7c3d698a3"
              frameBorder="0"
              allowFullScreen={true}
            ></iframe>
          </div>
        )}
      </div>
      
      {/* Terms and Conditions Modal - Blocks Interaction */}
      {showTerms && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full relative">
            <h2 className="text-lg font-semibold mb-4">USE OF THE MEDIRATE SOLUTION IS SUBJECT TO THE FOLLOWING TERMS AND CONDITIONS</h2>
            <p className="text-sm text-gray-700 mb-2">1. CPT® Content is copyrighted by the American Medical Association and CPT is a registered trademark of the AMA.</p>
            <p className="text-sm text-gray-700 mb-2">2. MediRate, as a party to a license agreement with the AMA, is authorized to grant End User a limited, non-exclusive, non-transferable, non-sublicensable license...</p>
            <p className="text-sm text-gray-700 mb-2">3. The provision of updated CPT Content in the MediRate Product(s) is dependent on a continuing contractual relationship between MediRate and the AMA.</p>
            <p className="text-sm text-gray-700 mb-2">4. End User is prohibited from making CPT Content publicly available; creating derivative works (including translating) of the CPT Content...</p>
            <p className="text-sm text-gray-700 mb-2">5. End User expressly acknowledges and agrees to the extent permitted by applicable law, use of the CPT Content is at End User’s sole risk...</p>
            <p className="text-sm text-gray-700 mb-2">6. End User is required to keep records and submit reports including information necessary for the calculation of royalties payable to the AMA by MediRate...</p>
            <p className="text-sm text-gray-700 mb-2">7. U.S. Government End Users. CPT is commercial technical data, which was developed exclusively at private expense by the American Medical Association...</p>
            <p className="text-sm text-gray-700 mb-2">8. End User must ensure that anyone with authorized access to the MediRate Product(s) will comply with the provisions of the End User Agreement.</p>
            <p className="text-sm text-gray-700 mb-2">9. AMA shall be named as a third-party beneficiary of the End User Agreement.</p>
            <p className="text-sm text-gray-700 mb-2">10. End User expressly consents to the release of its name to the AMA.</p>
            <p className="text-sm text-gray-700 mb-2">11. The responsibility for the content of any “National Correct Coding Policy” included in this product is with the Centers for Medicare and Medicaid Services...</p>
            <button onClick={handleAcceptTerms} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">Accept</button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
