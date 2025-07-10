import React, { useCallback, useEffect, useState } from "react"
import { EmblaOptionsType } from "embla-carousel"
import useEmblaCarousel from "embla-carousel-react"
import { CarouselThumbs } from "./CarouselThumbs"

type SlideType = {
  thumbnailSrc: string
  hdSrc: string
}

type PropType = {
  slides?: SlideType[]
  options?: EmblaOptionsType
}

const Carousel: React.FC<PropType> = (props) => {
  const { slides, options } = props
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [emblaMainRef, emblaMainApi] = useEmblaCarousel(options)
  const [emblaThumbsRef, emblaThumbsApi] = useEmblaCarousel({
    containScroll: "keepSnaps",
    dragFree: true
  })

  const onThumbClick = useCallback(
    (index: number) => {
      if (!emblaMainApi || !emblaThumbsApi) return
      emblaMainApi.scrollTo(index)
    },
    [emblaMainApi, emblaThumbsApi]
  )

  const onSelect = useCallback(() => {
    if (!emblaMainApi || !emblaThumbsApi) return
    setSelectedIndex(emblaMainApi.selectedScrollSnap())
    emblaThumbsApi.scrollTo(emblaMainApi.selectedScrollSnap())
  }, [emblaMainApi, emblaThumbsApi, setSelectedIndex])

  useEffect(() => {
    if (!emblaMainApi) return
    onSelect()
    emblaMainApi.on("select", onSelect)
    emblaMainApi.on("reInit", onSelect)
  }, [emblaMainApi, onSelect])

  return (
    <section className="m-auto h-full flex flex-col">
      <div className="overflow-hidden w-full flex items-center justify-center flex-1" ref={emblaMainRef}>
        <div className="flex touch-pan-y h-full">
          {slides?.map((slide, index) => (
            <div className="flex-none min-w-0 w-full h-full" key={index}>
              <div className="w-full h-full flex items-center justify-center">
                <img
                  src={slide.hdSrc}
                  alt=""
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    console.error('Failed to load carousel image');
                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzljYTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ci4zZW0iPkZhaWxlZCB0byBsb2FkIGltYWdlPC90ZXh0Pjwvc3ZnPg==';
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="m-auto flex-shrink-0">
        <div className="overflow-hidden" ref={emblaThumbsRef}>
          <div className="flex flex-row space-x-1 pt-3 px-1">
            {slides?.map((slide, index) => (
              <CarouselThumbs
                key={index}
                onClick={() => onThumbClick(index)}
                selected={index === selectedIndex}
                slide={slide}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default Carousel