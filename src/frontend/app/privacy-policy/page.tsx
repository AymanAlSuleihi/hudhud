import type { Metadata } from "next"
import PrivacyPolicy from "../../src/views/PrivacyPolicy"
import { PageFrame } from "../../src/next/components/PageFrame"
import { createPageMetadata } from "../../src/next/lib/metadata"

export const metadata: Metadata = createPageMetadata({
  title: "Privacy Policy",
  description: "Understand how Hudhud handles analytics, search queries, and other non-personal platform data.",
  path: "/privacy-policy",
})

export default function PrivacyPolicyPage() {
  return (
    <PageFrame>
      <PrivacyPolicy />
    </PageFrame>
  )
}