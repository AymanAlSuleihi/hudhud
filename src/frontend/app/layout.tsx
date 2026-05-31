import type { Metadata } from "next"
import { Montserrat, Noto_Sans_Old_South_Arabian } from "next/font/google"
import "./globals.css"
import { Navbar } from "../src/components/Navbar"
import { CookieConsent } from "../src/components/CookieConsent"
import { defaultDescription, getSiteUrl, siteName } from "../src/next/lib/site"

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
        <Navbar />
        {children}
        <CookieConsent />
      </body>
    </html>
  )
}