import type { Metadata } from "next"
import "./globals.css"
import { Navbar } from "../src/components/Navbar"
import { CookieConsent } from "../src/components/CookieConsent"
import { defaultDescription, getSiteUrl, siteName } from "../src/next/lib/site"

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
    <html lang="en">
      <body>
        <Navbar />
        {children}
        <CookieConsent />
      </body>
    </html>
  )
}