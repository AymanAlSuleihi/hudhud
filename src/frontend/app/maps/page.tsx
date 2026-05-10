import type { Metadata } from "next"

import Maps from "../../src/views/Maps"
import { PageFrame } from "../../src/next/components/PageFrame"
import { createPageMetadata } from "../../src/next/lib/metadata"

export const metadata: Metadata = createPageMetadata({
  title: "Maps",
  description: "Explore the Hudhud site atlas, epigraph heatmap by period, and language-by-period map across the public corpus.",
  path: "/maps",
})

export default function MapsPage() {
  return (
    <PageFrame>
      <Maps />
    </PageFrame>
  )
}