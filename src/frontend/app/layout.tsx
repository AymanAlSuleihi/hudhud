import type { Metadata } from "next"
import "./globals.css"
import { Navbar } from "../src/components/Navbar"
import { CookieConsent } from "../src/components/CookieConsent"
import { createDefaultMetadata } from "../src/next/lib/metadata"
import { getSiteUrl } from "../src/next/lib/site"

export const metadata: Metadata = {
  ...createDefaultMetadata(),
  metadataBase: new URL(getSiteUrl()),
  applicationName: "Hudhud",
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