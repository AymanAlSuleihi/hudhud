import React from "react"
import { MapPin } from "@phosphor-icons/react"

type PinProps = {
  size?: number
  color?: string
  isHighlighted?: boolean
}

const Pin: React.FC<PinProps> = ({ 
  size = 20, 
  color = "black",
  isHighlighted = false 
}) => {
  return (
    <div
      className={`relative inline-block transition-transform duration-200 ${
        isHighlighted 
          ? "scale-130 filter drop-shadow-md" 
          : "transform-none"
      }`}
    >
      <MapPin
        size={size}
        color={color}
        weight="fill"
        className={`cursor-pointer ${
          isHighlighted ? "stroke-white stroke-2" : "stroke-none stroke-0"
        }`}
      />
    </div>
  )
}

export default Pin