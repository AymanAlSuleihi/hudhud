import React from "react"
import { ProgressBar } from "react-aria-components"

interface SpinnerProps {
  size?: string
  strokeWidth?: string
  colour?: string
}

export const Spinner: React.FC<SpinnerProps> = (props) => {
    const { size = "w-8 h-8", colour = "#333333", strokeWidth = "10" } = props
    return (
        <ProgressBar
            isIndeterminate
            aria-label="Loading..."
            className={`flex items-center justify-center rounded-full ${size}`}
        >
          <svg
            className="w-full h-full animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 100"
            fill="none"
            stroke={colour}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
              <circle cx="50" cy="50" r="40" strokeOpacity="0.2" />
              <path
                d="M50 10a40 40 0 1 1-28.284 11.716A40 40 0 0 1 50 10z"
                strokeOpacity="0.5"
                strokeDasharray="100 100"
                strokeDashoffset="0"
                transform="rotate(90 50 50)"
              />
          </svg>
        </ProgressBar>
    )
}