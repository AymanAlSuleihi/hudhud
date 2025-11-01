import React from "react"
import { MetaTags } from "../components/MetaTags"

const TermsOfService: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <MetaTags data={{
        title: "Terms of Service - Hudhud",
        description: "Terms of Service for using the Hudhud platform for Ancient South Arabian Inscriptions.",
        url: `${import.meta.env.VITE_BASE_URL}/terms-of-service`,
        image: `${import.meta.env.VITE_BASE_URL}/hudhud_logo_white.png`,
        type: "website"
      }} />

      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>

      <p className="mb-6 text-sm text-gray-600">
        Last Updated: November 1, 2025
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
          <p className="mb-3">
            By accessing and using Hudhud (the "Platform"), you accept and agree to be bound by the terms 
            and provisions of this agreement. If you do not agree to these Terms of Service, please do not 
            use this Platform.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="mb-3">
            Hudhud provides a digital platform for exploring pre-Islamic Arabian inscriptions and epigraphic
            data. The Platform offers search capabilities, data visualisation, and access to historical
            artifacts and related information sourced from DASI (Digital Archive for the Study of pre‑Islamic
            Arabian Inscriptions) and publicly available academic research papers.
            </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. Data Usage and Attribution</h2>
          <p className="mb-3">
            The content available on this Platform includes:
          </p>
          <ul className="list-disc ml-6 mb-3 space-y-2">
            <li><strong>Epigraphic data from DASI</strong> (licensed under CC BY 4.0) - Users are free to share and adapt this data with proper attribution to DASI and its contributing institutions</li>
            <li><strong>Publicly available research papers</strong> - Metadata and references to academic papers, subject to their respective terms and licenses</li>
          </ul>
          <p className="mb-3">
            Users must:
          </p>
          <ul className="list-disc ml-6 mb-3 space-y-2">
            <li>Properly cite the original source of any data or research used</li>
            <li>Respect copyright and licensing terms of research papers and their publishers</li>
            <li>Follow DASI's CC BY 4.0 license terms when using epigraphic data</li>
            <li>Not redistribute full-text articles unless they are clearly marked as open access</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. User Responsibilities</h2>
          <p className="mb-3">Users agree to:</p>
          <ul className="list-disc ml-6 mb-3 space-y-2">
            <li>Use the Platform for lawful purposes only</li>
            <li>Not attempt to gain unauthorised access to any part of the Platform</li>
            <li>Not interfere with or disrupt the Platform's operation</li>
            <li>Respect the academic and research nature of the Platform</li>
            <li>Provide accurate information when submitting queries or feedback</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Intellectual Property Rights</h2>
          <p className="mb-3">
            The Platform's design, features, and functionality are owned by Sheba's Caravan and are protected by 
            international copyright, trademark, and other intellectual property laws.
          </p>
          <p className="mb-3">
            Content available through this Platform includes:
          </p>
          <ul className="list-disc ml-6 mb-3 space-y-2">
            <li><strong>DASI epigraphic data:</strong> Licensed under Creative Commons Attribution 4.0 International (CC BY 4.0). Users may freely share and adapt this data with proper attribution.</li>
            <li><strong>Research paper metadata:</strong> Sourced from publicly available databases. Full-text articles remain subject to their publishers' copyright and licensing terms.</li>
          </ul>
          <p className="mb-3">
            For the Platform itself, users may not:
          </p>
          <ul className="list-disc ml-6 mb-3 space-y-2">
            <li>Copy, modify, or create derivative works from the Platform itself</li>
            <li>Reverse engineer or attempt to extract source code</li>
            <li>Remove or alter any copyright, trademark, or proprietary notices from the Platform</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. AI-Generated Content</h2>
          <p className="mb-3">
            Hudhud uses artificial intelligence to generate responses, summaries, and interpretations of 
            epigraphic data. Users acknowledge that:
          </p>
          <ul className="list-disc ml-6 mb-3 space-y-2">
            <li>AI-generated content may contain errors or inaccuracies</li>
            <li>AI responses should not be considered authoritative scholarly sources</li>
            <li>Users should verify information with primary sources and scholarly literature</li>
            <li>AI interpretations are provided as research aids, not definitive conclusions</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">7. Disclaimer of Warranties</h2>
          <p className="mb-3">
            THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER 
            EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT:
          </p>
          <ul className="list-disc ml-6 mb-3 space-y-2">
            <li>The Platform will be uninterrupted, secure, or error-free</li>
            <li>The epigraphic data or research paper metadata will be accurate, complete, or up-to-date</li>
            <li>Links to external research papers will remain functional</li>
            <li>Defects will be corrected</li>
            <li>The Platform is free of viruses or other harmful components</li>
          </ul>
          <p className="mb-3 text-sm text-gray-600">
            Users should verify critical information against primary sources and original publications.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">8. Limitation of Liability</h2>
          <p className="mb-3">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, SHEBA'S CARAVAN SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, 
            SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED 
            DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES RESULTING FROM:
          </p>
          <ul className="list-disc ml-6 mb-3 space-y-2">
            <li>Your use or inability to use the Platform</li>
            <li>Any unauthorised access to or use of our servers and/or any personal information stored therein</li>
            <li>Any errors or omissions in content or data</li>
            <li>Reliance on AI-generated content or interpretations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">9. Changes to Service</h2>
          <p className="mb-3">
            We reserve the right to modify, suspend, or discontinue the Platform or any part thereof at any 
            time without notice. We may also modify these Terms of Service at any time by posting updated terms 
            on this page. Your continued use of the Platform after such changes constitutes acceptance of the 
            new terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">10. Third-Party Services</h2>
          <p className="mb-3">
            The Platform may integrate with or link to third-party services, including but not limited to:
          </p>
          <ul className="list-disc ml-6 mb-3 space-y-2">
            <li>OpenAI for AI-powered features</li>
            <li>Analytics services for usage statistics</li>
            <li>External databases and repositories</li>
            <li>Publisher websites and digital object identifier (DOI) resolvers</li>
            <li>Academic institutions and research archives</li>
          </ul>
          <p className="mb-3">
            We are not responsible for the content, privacy policies, practices, or availability of any third-party services.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">11. Academic Use</h2>
          <p className="mb-3">
            This Platform is designed primarily for academic and research purposes. Users are encouraged to:
          </p>
          <ul className="list-disc ml-6 mb-3 space-y-2">
            <li>Use the Platform to support scholarly research and education</li>
            <li>Share findings and discoveries with the academic community</li>
            <li>Provide feedback to improve the Platform's accuracy and usefulness</li>
            <li>Respect the scholarly standards of citation and attribution</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">12. Governing Law</h2>
          <p className="mb-3">
            These Terms shall be governed by and construed in accordance with applicable international laws 
            regarding academic research and data usage. Any disputes arising from these Terms or your use of 
            the Platform shall be resolved through appropriate channels.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">13. Contact Information</h2>
          <p className="mb-3">
            For questions about these Terms of Service, please contact us through the appropriate channels 
            provided on the Platform.
          </p>
        </section>

        <section>
          <p className="text-sm text-gray-600">
            By using Hudhud, you acknowledge that you have read, understood, and agree to be bound by these 
            Terms of Service.
          </p>
        </section>
      </div>
    </div>
  )
}

export default TermsOfService
