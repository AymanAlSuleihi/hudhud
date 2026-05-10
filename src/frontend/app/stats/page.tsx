import type { Metadata } from "next"

import Stats from "../../src/views/Stats"
import { PageFrame } from "../../src/next/components/PageFrame"
import { createPageMetadata } from "../../src/next/lib/metadata"

export const metadata: Metadata = createPageMetadata({
  title: "Stats",
  description: "Inspect corpus coverage, translation progress, publication activity, and mapped-site distribution across the Hudhud dataset.",
  path: "/stats",
})

export default function StatsPage() {
  return (
    <PageFrame>
      <Stats />
    </PageFrame>
  )
}