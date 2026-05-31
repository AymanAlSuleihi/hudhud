import type { Metadata, Viewport } from "next"
import { Montserrat, Noto_Sans_Old_South_Arabian } from "next/font/google"
import Script from "next/script"
import "./globals.css"
import { Navbar } from "../src/components/Navbar"
import { CookieConsent } from "../src/components/CookieConsent"
import { defaultDescription, getSiteUrl, siteName } from "../src/next/lib/site"

const googleAnalyticsId = "G-1BDTQ5V0QJ"
const umamiWebsiteId = "04fe2800-b404-4930-a179-b56477a431d9"

const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-montserrat",
})

const notoSansOldSouthArabian = Noto_Sans_Old_South_Arabian({
  subsets: ["old-south-arabian"],
  weight: "400",
  display: "swap",
  variable: "--font-old-south-arabian",
})

export const metadata: Metadata = {
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: defaultDescription,
  metadataBase: new URL(getSiteUrl()),
  applicationName: siteName,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  keywords: [
    "Ancient South Arabian",
    "inscriptions",
    "DASI",
    "archaeology",
    "epigraphy",
    "pre-Islamic Arabia",
    "Sabaic",
    "Minaic",
    "Qatabanic",
    "Hadramitic",
  ],
  authors: [
    {
      name: "Sheba's Caravan",
    },
  ],
  icons: {
    icon: [
      {
        url: "/hudhud.svg",
        type: "image/svg+xml",
        sizes: "any",
      },
    ],
    shortcut: "/hudhud.svg",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="en"
      className={`${montserrat.variable} ${notoSansOldSouthArabian.variable}`}
    >
      <body>
        <Script id="gtag-init" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('consent', 'default', { analytics_storage: 'denied' });
            gtag('config', '${googleAnalyticsId}');
          `}
        </Script>
        <Script
          src={`/stats.js`}
          data-website-id={umamiWebsiteId}
          strategy="afterInteractive"
        />
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
          strategy="afterInteractive"
        />
        <Navbar />
        {children}
        <CookieConsent />
      </body>
    </html>
  )
}