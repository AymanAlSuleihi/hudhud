import type { ReactNode } from "react"
import { Footer } from "../../components/Footer"

interface PageFrameProps {
  children: ReactNode
  mainClassName?: string
}

export function PageFrame({ children, mainClassName = "" }: PageFrameProps) {
  const classes = mainClassName ? `p-4 ${mainClassName}` : "p-4"

  return (
    <div className="min-h-screen mt-18">
      <main className={classes}>{children}</main>
      <Footer />
    </div>
  )
}