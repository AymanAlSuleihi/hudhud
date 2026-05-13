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
            ? "h-full w-2 bg-gray-200 rounded-sm" 
            : "w-full h-2 bg-gray-200 rounded-sm"
        }`}
      >
        {({ state }) => (
          <>
            {(() => {
              const minValue = Number(props.minValue ?? 0)
              const maxValue = Number(props.maxValue ?? 100)
              const range = Math.max(maxValue - minValue, 1)
              const values = state.values.map((value) => Number(value)).sort((left, right) => left - right)
              const startValue = values[0] ?? minValue
              const endValue = values[values.length - 1] ?? startValue
              const startOffset = ((startValue - minValue) / range) * 100
              const endOffset = ((endValue - minValue) / range) * 100

              return (
                <div 
                  className={`absolute bg-gray-500 rounded-full ${
                    orientation === "vertical" 
                      ? "w-full left-0" 
                      : "h-full top-0"
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
            {state.values.map((_, i) => (
              <SliderThumb 
                key={i} 
                index={i} 
                aria-label={thumbLabels?.[i]} 
                className={`w-5 h-5 bg-white border-2 border-gray-500 rounded-full cursor-grab focus:cursor-grabbing shadow z-10 ${
                  orientation === "vertical" 
                    ? "translate-x-1" 
                    : "translate-y-1"
                }`}
              />
            ))}
          </>
        )}
      </SliderTrack>
    </Slider>
  )
}