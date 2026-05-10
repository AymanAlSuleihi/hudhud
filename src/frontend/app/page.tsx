import type { Metadata } from "next"
import Ask from "../src/views/Ask"
import { createPageMetadata } from "../src/next/lib/metadata"

export const metadata: Metadata = createPageMetadata({
  title: "Ask",
  description: "Ask Hudhud questions about Ancient South Arabia, its inscriptions, kingdoms, people, and places.",
  path: "/",
})

export default function HomePage() {
  return <Ask />
}