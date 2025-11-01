import React from "react"
import { MetaTags } from "../components/MetaTags"

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <MetaTags data={{
        title: "Privacy Policy - Hudhud",
        description: "Privacy Policy for Hudhud platform explaining how we collect, use, and protect your data.",
        url: `${import.meta.env.VITE_BASE_URL}/privacy-policy`,
        image: `${import.meta.env.VITE_BASE_URL}/hudhud_logo_white.png`,
        type: "website"
      }} />

      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

      <p className="mb-6 text-sm text-gray-600">
        Last Updated: November 1, 2025
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
          <p className="mb-3">
            Hudhud, operated by Sheba's Caravan ("we", "our", or "us"), is committed to protecting your privacy. 
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you 
            use our Platform. Please read this privacy policy carefully.
          </p>
          <p className="mb-3">
            By using the Platform, you agree to the collection and use of information in accordance with 
            this policy. If you do not agree with the terms of this privacy policy, please do not access 
            the Platform.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>

          <p className="mb-3">
            <strong>We do not collect or store any personal information that identifies you as an individual.</strong> 
            We only collect non-personal information necessary to operate and improve the Platform.
          </p>

          <h3 className="text-xl font-semibold mb-3 mt-4">2.1 Information You Provide</h3>
          <p className="mb-3">
            The only information you voluntarily provide when using the Platform includes:
          </p>
          <ul className="list-disc ml-6 mb-3 space-y-2">
            <li><strong>Search queries:</strong> Text searches you perform in the search engine</li>
            <li><strong>AI chat queries:</strong> Questions and prompts you submit to the AI-powered chat feature</li>
          </ul>
          <p className="mb-3">
            We do not collect names, email addresses, phone numbers, or any other personal identifiers.
          </p>

          <h3 className="text-xl font-semibold mb-3 mt-4">2.2 Automatically Collected Information</h3>
          <p className="mb-3">
            When you access the Platform, we automatically collect non-personal technical information through 
            analytics services:
          </p>
          <ul className="list-disc ml-6 mb-3 space-y-2">
            <li><strong>Usage Data:</strong> Pages viewed, time spent on pages, and navigation patterns</li>
            <li><strong>Device Information:</strong> Browser type, operating system, device type, and anonymised IP address</li>
            <li><strong>Cookies and Tracking Technologies:</strong> Data collected through cookies for analytics purposes 
            (see Section 4 below)</li>
          </ul>
          <p className="mb-3">
            This information is collected in aggregate form and cannot be used to identify you personally.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
          <p className="mb-3">
            We use the information we collect for various purposes, including to:
          </p>
          <ul className="list-disc ml-6 mb-3 space-y-2">
            <li>Provide, operate, and maintain the Platform</li>
            <li>Improve and personalise your experience</li>
            <li>Understand and analyze how you use the Platform</li>
            <li>Develop new features, products, and services</li>
            <li>Communicate with you about updates, changes, or support</li>
            <li>Monitor and analyze usage trends and patterns</li>
            <li>Detect, prevent, and address technical issues and security threats</li>
            <li>Improve AI model performance and accuracy</li>
            <li>Conduct research and analysis for academic purposes</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Cookies and Tracking Technologies</h2>
          <p className="mb-3">
            We use cookies and similar tracking technologies for analytics purposes only. Cookies are files 
            with small amounts of data which may include an anonymous unique identifier.
          </p>

          <p className="mb-3">
            <strong>Google Analytics:</strong> We use Google Analytics to collect anonymised usage statistics 
            to help us understand how visitors use the Platform and improve the user experience. These cookies 
            do not collect personal information and are used solely for aggregate analytics.
          </p>
          <p className="mb-3">
            You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. 
            The Platform will remain functional without cookies, though we won't be able to gather usage insights.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Third-Party Services</h2>
          <p className="mb-3">
            We use the following third-party services to operate the Platform. These services may process 
            your non-personal information as described:
          </p>

          <h3 className="text-xl font-semibold mb-3 mt-4">Services We Use:</h3>
          <ul className="list-disc ml-6 mb-3 space-y-2">
            <li><strong>OpenAI:</strong> Processes your AI chat queries to generate responses. Your questions 
            are sent to OpenAI's API for processing. Please refer to OpenAI's privacy policy for information 
            on how they handle data.</li>
            <li><strong>Google Analytics:</strong> Collects anonymised usage statistics and analytics data 
            to help us understand Platform usage patterns.</li>
            <li><strong>Cloudflare:</strong> Provides content delivery network (CDN) services to improve 
            Platform performance and security. May process technical data as part of content delivery.</li>
            <li><strong>Hosting Infrastructure (Germany):</strong> Our database and application servers are 
            hosted in Germany where epigraphic data and search queries are stored.</li>
          </ul>
          <p className="mb-3">
            The Platform is operated from the United Kingdom. Data processing occurs in Germany (hosting) 
            and through the respective services listed above.
          </p>
          <p className="mb-3">
            We recommend reviewing the privacy policies of these third-party services for more information on 
            their data practices.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
          <p className="mb-3">
            We retain non-personal information (search queries and AI chat queries) for as long as necessary to:
          </p>
          <ul className="list-disc ml-6 mb-3 space-y-2">
            <li>Provide and improve the Platform's functionality</li>
            <li>Analyze usage patterns for research and development</li>
            <li>Comply with legal obligations</li>
          </ul>
          <p className="mb-3">
            Since we do not collect personal identifiable information, the data we retain cannot be linked 
            back to any individual user. Analytics data is typically retained in aggregate form for historical 
            analysis purposes.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">7. Data Security</h2>
          <p className="mb-3">
            We implement appropriate technical and organisational security measures to protect the information 
            processed by the Platform. These measures include:
          </p>
          <ul className="list-disc ml-6 mb-3 space-y-2">
            <li>Encryption of data in transit (HTTPS/TLS)</li>
            <li>Secure hosting infrastructure in Germany</li>
            <li>CDN protection through Cloudflare</li>
            <li>Regular security updates and monitoring</li>
            <li>Access controls on backend systems</li>
          </ul>
          <p className="mb-3">
            However, no method of transmission over the internet or electronic storage is 100% secure. While 
            we strive to protect the Platform and its data, we cannot guarantee absolute security. Since we 
            do not collect personal identifiable information, any potential data exposure would be limited to 
            non-personal search and chat queries.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">8. Data Sharing and Disclosure</h2>
          <p className="mb-3">
            We do not sell, trade, or rent any information collected through the Platform. The only data 
            sharing that occurs is:
          </p>
          <ul className="list-disc ml-6 mb-3 space-y-2">
            <li><strong>Service Providers:</strong> Your AI chat queries are sent to OpenAI for processing. 
            Anonymised analytics data is processed by Google Analytics.</li>
            <li><strong>Infrastructure Providers:</strong> Technical data passes through Cloudflare's CDN 
            and is stored on secure hosting infrastructure in Germany.</li>
            <li><strong>Legal Compliance:</strong> We may disclose information if required by law, regulation, 
            or legal process.</li>
            <li><strong>Aggregated Data:</strong> We may share anonymised, aggregated usage statistics for 
            research or analytical purposes. This data cannot identify individual users.</li>
          </ul>
          <p className="mb-3">
            Since we do not collect personal identifiable information, there is no personal data to share 
            or sell.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">9. Your Privacy Rights</h2>
          <p className="mb-3">
            Since we do not collect personal identifiable information, traditional data subject rights 
            (such as access, correction, or deletion of personal data) do not apply in the conventional sense.
          </p>
          <p className="mb-3">
            However, you can:
          </p>
          <ul className="list-disc ml-6 mb-3 space-y-2">
            <li><strong>Control Cookies:</strong> Disable analytics cookies through your browser settings</li>
            <li><strong>Opt-Out of Analytics:</strong> Use browser extensions or settings to block Google Analytics 
            and other analytics services</li>
            <li><strong>Limit Data Sharing:</strong> Avoid using the AI chat feature if you prefer not to have 
            your queries processed by OpenAI</li>
          </ul>
          <p className="mb-3">
            The Platform does not require any account creation or login, so there is no user profile to 
            manage or delete.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">10. Children's Privacy</h2>
          <p className="mb-3">
            Our Platform is not directed to children under the age of 13. We do not knowingly collect personal 
            information from children under 13. If you are a parent or guardian and believe your child has 
            provided us with personal information, please contact us so we can delete such information.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">11. International Data Transfers</h2>
          <p className="mb-3">
            The Platform is operated from the United Kingdom. Your non-personal information may be processed in:
          </p>
          <ul className="list-disc ml-6 mb-3 space-y-2">
            <li><strong>Germany:</strong> Where our servers are hosted</li>
            <li><strong>United States:</strong> Where OpenAI processes AI chat queries and Google provides 
            analytics services</li>
            <li><strong>Globally:</strong> Through Cloudflare's CDN network for content delivery</li>
          </ul>
          <p className="mb-3">
            By using the Platform, you acknowledge that your search queries and AI chat queries may be 
            processed in these locations. Since no personal identifiable information is collected, these 
            transfers do not involve personal data as defined by most data protection regulations.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">12. Changes to This Privacy Policy</h2>
          <p className="mb-3">
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting 
            the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to 
            review this Privacy Policy periodically for any changes.
          </p>
          <p className="mb-3">
            Your continued use of the Platform after such changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">13. Contact Us</h2>
          <p className="mb-3">
            If you have questions or concerns about this Privacy Policy or our data practices, please contact 
            us through the appropriate channels provided on the Platform.
          </p>
        </section>

        <section>
          <p className="text-sm text-gray-600">
            By using Hudhud, you acknowledge that you have read and understood this Privacy Policy and agree 
            to its terms.
          </p>
        </section>
      </div>
    </div>
  )
}

export default PrivacyPolicy
