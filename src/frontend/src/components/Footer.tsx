import React from "react"
import { Link } from "react-router-dom"
import { Copyright, EnvelopeSimple, InstagramLogo } from "@phosphor-icons/react"

export const Footer: React.FC = () => {
  return (
    <footer className="mt-1 pt-2 text-sm text-gray-700">
      <div className="max-w-8xl mx-auto px-4">
        <div className="text-center border-t border-gray-200 pt-6 pb-8">
          <p className="mb-4">
            Epigraphic data provided by the{" "}
            <a 
              href="https://dasi.cnr.it/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-gray-500 transition-colors font-semibold"
              aria-label="Digital Archive for the Study of pre-Islamic Arabian Inscriptions"
              data-umami-event="Footer DASI Click"
            >
              Digital Archive for the Study of pre-Islamic Arabian Inscriptions (DASI)
            </a>
            {" "}under{" "}
            <a 
              href="https://creativecommons.org/licenses/by/4.0/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-gray-500 transition-colors font-semibold"
              aria-label="Creative Commons Attribution 4.0 International License"
              data-umami-event="Footer CC BY 4.0 Click"
            >
              CC BY 4.0
            </a>
          </p>
          {/* Contact */}
          <div className="flex items-center justify-center mb-3">
            <a
              href="https://instagram.com/shebascaravan"
              target="_blank"
              rel="noopener noreferrer"
              className="flex justify-center items-center hover:text-gray-500 transition-colors font-semibold mr-4"
              aria-label="Instagram"
              data-umami-event="Footer Instagram Click"
            >
              <InstagramLogo size={16} className="mr-1" />
              shebascaravan
            </a>
          </div>
          <div className="flex items-center justify-center mb-3">
            <a 
              href="mailto:contact@shebascaravan.com" 
              className="flex justify-center items-center hover:text-gray-500 transition-colors font-semibold"
              aria-label="Email"
              data-umami-event="Footer Contact Email Click"
            >
              <EnvelopeSimple size={16} className="mr-1 translate-y-[1px]" />
              contact@shebascaravan.com
            </a>
          </div>
          <div className="flex items-center justify-center gap-4 mb-3">
            <Link 
              to="/terms-of-service" 
              className="hover:text-gray-500 transition-colors font-semibold"
            >
              Terms of Service
            </Link>
            <span className="text-gray-400">|</span>
            <Link 
              to="/privacy-policy" 
              className="hover:text-gray-500 transition-colors font-semibold"
            >
              Privacy Policy
            </Link>
          </div>
          <div className="flex items-center justify-center">
            <Copyright size={14} className="mr-1" />
            <p>{new Date().getFullYear()} Hudhud Project. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer