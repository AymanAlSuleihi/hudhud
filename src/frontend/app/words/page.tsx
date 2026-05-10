import type { Metadata } from "next"
import Words from "../../src/views/Words"
import { PageFrame } from "../../src/next/components/PageFrame"
import { createPageMetadata } from "../../src/next/lib/metadata"

export const metadata: Metadata = createPageMetadata({
  title: "Words",
  description: "Explore the forthcoming Hudhud Words experience for Ancient South Arabian vocabulary and terminology.",
  path: "/words",
})

export default function WordsPage() {
  return (
    <PageFrame>
      <Words />
    </PageFrame>
  )
}