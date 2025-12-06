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
            <div 
              className={`absolute bg-gray-500 rounded-full ${
                orientation === "vertical" 
                  ? "w-full left-0 bottom-0" 
                  : "h-full top-0 left-0"
              }`} 
              style={
                orientation === "vertical" 
                  ? {
                      height: `${typeof props.value === "number" ? (props.value / (props.maxValue as number)) * 100 : 0}%`
                    }
                  : {
                      width: `${typeof props.value === "number" ? (props.value / (props.maxValue as number)) * 100 : 0}%`
                    }
              } 
            />
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