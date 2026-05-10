import type { Metadata } from "next"
import TermsOfService from "../../src/views/TermsOfService"
import { PageFrame } from "../../src/next/components/PageFrame"
import { createPageMetadata } from "../../src/next/lib/metadata"

export const metadata: Metadata = createPageMetadata({
  title: "Terms of Service",
  description: "Read the terms for using Hudhud and its Ancient South Arabian inscription platform.",
  path: "/terms-of-service",
})

export default function TermsOfServicePage() {
  return (
    <PageFrame>
      <TermsOfService />
    </PageFrame>
  )
}