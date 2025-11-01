import React, { useEffect, useState } from "react"
import { Link } from "react-router-dom"

const COOKIE_CONSENT_KEY = "hudhud_cookie_consent"

export const CookieConsent: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!consent) {
      setShowBanner(true)
    } else if (consent === "accepted") {
      enableAnalytics()
    }
  }, [])

  const enableAnalytics = () => {
    if (window.gtag) {
      window.gtag("consent", "update", {
        analytics_storage: "granted",
      })
    }
  }

  const disableAnalytics = () => {
    if (window.gtag) {
      window.gtag("consent", "update", {
        analytics_storage: "denied",
      })
    }
  }

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted")
    enableAnalytics()
    setShowBanner(false)
  }

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "declined")
    disableAnalytics()
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-xs shadow-sm shadow-gray-400">
      <div className="max-w-7xl mx-auto p-4 sm:p-4 ">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-md font-semibold mb-2 text-gray-900">Cookie Notice</h3>
            <p className="text-sm text-gray-700">
              We use cookies to analyze site usage and improve your experience. We do not collect 
              personal information. By clicking "Accept", you consent to the use of analytics cookies. 
              You can decline and the site will remain fully functional.{" "}
              <Link 
                to="/privacy-policy" 
                className="text-gray-900 hover:text-gray-700 underline font-medium"
              >
                Learn more in our Privacy Policy
              </Link>
            </p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <button
              onClick={handleDecline}
              className="px-4 py-2 cursor-pointer text-sm font-medium text-gray-900 hover:text-gray-700 border border-gray-400 hover:border-gray-500 rounded-md transition-colors bg-transparent backdrop-blur-xs"
            >
              Decline
            </button>
            <button
              onClick={handleAccept}
              className="px-4 py-2 cursor-pointer text-sm font-medium bg-gray-900 hover:bg-gray-700 text-white rounded-md transition-colors"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

declare global {
  interface Window {
    gtag?: (
      command: string,
      action: string,
      params: Record<string, string>
    ) => void
  }
}
