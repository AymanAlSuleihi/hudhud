import type { Metadata } from "next"
import NotFound from "../src/views/NotFound"
import { PageFrame } from "../src/next/components/PageFrame"
import { createPageMetadata } from "../src/next/lib/metadata"

export const metadata: Metadata = createPageMetadata({
  title: "Page Not Found",
  description: "The page you are looking for could not be found.",
  path: "/404",
})

export default function NotFoundPage() {
  return (
    <PageFrame>
      <NotFound />
    </PageFrame>
  )
}