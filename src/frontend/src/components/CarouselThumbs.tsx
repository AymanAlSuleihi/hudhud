import React from "react"

type SlideType = {
  thumbnailSrc: string
  hdSrc: string
}

type PropType = {
  selected: boolean
  slide: SlideType
  onClick: () => void
}

export const CarouselThumbs: React.FC<PropType> = (props) => {
  const { selected, slide, onClick } = props

  return (
    <div
      className={"flex-none".concat(
        selected ? " scale-105" : ""
      )}
    >
      <button
        onClick={onClick}
        type="button"
      >
        <img
          src={slide.thumbnailSrc}
          alt=""
          className={"h-16 w-16 rounded object-cover".concat(
            selected ? " border border-gray-200 bg-gray-200": ""
          )}
          onError={(e) => {
            console.error('Failed to load thumbnail image');
            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5OL0E8L3RleHQ+PC9zdmc+';
          }}
        />
      </button>
    </div>
  )
}