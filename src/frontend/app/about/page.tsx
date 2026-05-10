import type { Metadata } from "next"
import About from "../../src/views/About"
import { PageFrame } from "../../src/next/components/PageFrame"
import { createPageMetadata } from "../../src/next/lib/metadata"

export const metadata: Metadata = createPageMetadata({
  title: "About",
  description: "Learn about Hudhud and its mission to make Ancient South Arabian inscriptions accessible to researchers and the public.",
  path: "/about",
})

export default function AboutPage() {
  return (
    <PageFrame>
      <About />
    </PageFrame>
  )
}