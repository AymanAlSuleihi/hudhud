import { Suspense } from "react"
import type { Metadata } from "next"
import Epigraphs from "../../src/views/Epigraphs"
import { PageFrame } from "../../src/next/components/PageFrame"
import { createPageMetadata } from "../../src/next/lib/metadata"

export const metadata: Metadata = createPageMetadata({
  title: "Epigraphs",
  description: "Browse and search Ancient South Arabian inscriptions with advanced filters, full-text search, and source maps.",
  path: "/epigraphs",
})

export default function EpigraphsPage() {
  return (
    <PageFrame>
      <Suspense fallback={<div className="p-4 text-sm text-gray-600">Loading epigraphs...</div>}>
        <Epigraphs />
      </Suspense>
    </PageFrame>
  )
}