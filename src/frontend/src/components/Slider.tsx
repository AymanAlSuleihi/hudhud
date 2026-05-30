import { Slider, SliderTrack, SliderThumb, Label } from "react-aria-components"
import type { SliderProps } from "react-aria-components"

interface MySliderProps<T> extends SliderProps<T> {
  label?: string
  thumbLabels?: string[]
  orientation?: "horizontal" | "vertical"
}

export function MySlider<T extends number | number[]>(
  { label, thumbLabels, orientation = "horizontal", ...props }: MySliderProps<T>
) {
  return (
    <Slider {...props} orientation={orientation}>
      {label && <Label className="sr-only">{label}</Label>}
      <SliderTrack 
        className={`relative cursor-pointer ${
          orientation === "vertical" 
            ? "h-full w-[6px] rounded-sm border border-gray-600 bg-transparent" 
            : "w-full h-[6px] rounded-sm border border-gray-600 bg-transparent"
        }`}
      >
        {({ state }) => (
          <>
            {(() => {
              const minValue = Number(props.minValue ?? 0)
              const maxValue = Number(props.maxValue ?? 100)
              const range = Math.max(maxValue - minValue, 1)
              const values = state.values.map((value) => Number(value))
              const sortedValues = [...values].sort((left, right) => left - right)
              const startValue = sortedValues.length > 1 ? (sortedValues[0] ?? minValue) : minValue
              const endValue = sortedValues[sortedValues.length - 1] ?? startValue
              const startOffset = ((startValue - minValue) / range) * 100
              const endOffset = ((endValue - minValue) / range) * 100

              return (
                <div 
                  className={`absolute bg-gray-600 rounded-sm ${
                    orientation === "vertical" 
                      ? "left-0 w-full" 
                      : "top-0 h-full"
                  }`}
                  style={
                    orientation === "vertical"
                      ? {
                          bottom: `${startOffset}%`,
                          height: `${Math.max(endOffset - startOffset, 0)}%`,
                        }
                      : {
                          left: `${startOffset}%`,
                          width: `${Math.max(endOffset - startOffset, 0)}%`,
                        }
                  }
                />
              )
            })()}
            {(() => {
              const minValue = Number(props.minValue ?? 0)
              const maxValue = Number(props.maxValue ?? 100)
              const range = Math.max(maxValue - minValue, 1)
              const thumbOffsets = state.values.map((value) => ((Number(value) - minValue) / range) * 100)
              const overlappingThumbs = thumbOffsets.map((offset, index) => (
                thumbOffsets.some((otherOffset, otherIndex) => otherIndex !== index && Math.abs(otherOffset - offset) < 0.0001)
              ))

              return state.values.map((_, i) => {
                const overlapClassName = overlappingThumbs[i]
                  ? orientation === "vertical"
                    ? i === 0
                      ? "translate-x-1 -translate-y-1"
                      : "translate-x-1 translate-y-1"
                    : i === 0
                      ? "-translate-x-1 translate-y-1"
                      : "translate-x-1 translate-y-1"
                  : orientation === "vertical"
                    ? "translate-x-1"
                    : "translate-y-1"

                return (
                  <SliderThumb 
                    key={i} 
                    index={i} 
                    aria-label={thumbLabels?.[i]} 
                    style={{ zIndex: overlappingThumbs[i] ? state.values.length - i : 10 }}
                    className={`w-5 h-5 bg-white border-2 border-gray-500 rounded-full cursor-grab focus:cursor-grabbing shadow ${overlapClassName}`}
                  />
                )
              })
            })()}
          </>
        )}
      </SliderTrack>
    </Slider>
  )
}