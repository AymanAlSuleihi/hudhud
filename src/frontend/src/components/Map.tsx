"use client"

import React, { useState, useMemo, useEffect, useRef } from "react"
import {
  Map,
  Marker,
  Popup,
  NavigationControl,
  ScaleControl,
  FullscreenControl,
  Source,
  Layer,
  MapRef
} from "react-map-gl/maplibre"
import bbox from "@turf/bbox"
import { X } from "@phosphor-icons/react"
import Pin from "./Pin"

type MapMarker = {
  id: string
  coordinates: [number, number]
  color: string
  label: string
  style?: "results" | "outside"
  popupContent?: React.ReactNode
}

type PopupAnchor = "top" | "bottom" | "top-left" | "top-right" | "bottom-left" | "bottom-right"

type PopupState = {
  markerId: string
  anchor: PopupAnchor
}

export type MapProps = {
  center: [number, number]
  zoom: number
  markers: MapMarker[]
  backgroundMarkers?: MapMarker[]
  onMarkerClick?: (markerId: string) => void
  onEpigraphSelect?: (epigraphId: string) => void | Promise<void>
  minimap?: boolean
  highlightedId?: string | null
  onClose?: () => void
  overlayContent?: React.ReactNode
}

export const MapComponent: React.FC<MapProps> = ({ 
  center, 
  zoom, 
  markers,
  backgroundMarkers = [],
  onMarkerClick,
  onEpigraphSelect,
  minimap = false,
  highlightedId = null,
  onClose,
  overlayContent,
}) => {
  const [popupState, setPopupState] = useState<PopupState | null>(null)
  const mapRef = useRef<MapRef>(null)
  const [currentCenter, setCurrentCenter] = useState(center)
  const [currentZoom, setCurrentZoom] = useState(zoom)
  const [manualPan, setManualPan] = useState(false)
  const fitMarkers = useMemo(
    () => (backgroundMarkers.length > 0 ? [...backgroundMarkers, ...markers] : markers),
    [backgroundMarkers, markers],
  )
  const hasBackgroundMarkers = backgroundMarkers.length > 0

  const highlightedMarker = useMemo(() => 
    markers.find(marker => marker.id === highlightedId),
    [markers, highlightedId]
  )

  useEffect(() => {
    setCurrentCenter(center)
  }, [center])

  useEffect(() => {
    if (highlightedId) {
      setManualPan(false)
    }
  }, [highlightedId])

  useEffect(() => {
    if (minimap && highlightedMarker && mapRef.current && !manualPan && !hasBackgroundMarkers) {
      mapRef.current.flyTo({
        center: [highlightedMarker.coordinates[1], highlightedMarker.coordinates[0]],
        duration: 800,
        zoom: currentZoom
      })
    }
  }, [highlightedMarker, minimap, currentZoom, manualPan, hasBackgroundMarkers])

  useEffect(() => {
    if (!mapRef.current || fitMarkers.length === 0) return

    try {
      const bboxResult = bbox({
        type: "FeatureCollection",
        features: fitMarkers.map(marker => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [marker.coordinates[1], marker.coordinates[0]]
          },
          properties: {}
        }))
      })

      const bounds: [number, number, number, number] = [
        bboxResult[0], bboxResult[1], bboxResult[2], bboxResult[3]
      ]

      mapRef.current.fitBounds(bounds, {
        padding: 50,
        duration: 800,
        maxZoom: minimap ? 4 : 12
      })
    } catch (error) {
      console.error("Error fitting bounds:", error)
    }
  }, [fitMarkers, minimap])

  const dedupedBackgroundMarkers = useMemo(() => {
    const markersByCoordinates: Record<string, MapMarker> = {}

    for (const marker of backgroundMarkers) {
      const coordinateKey = marker.coordinates.join(",")
      const existingMarker = markersByCoordinates[coordinateKey]

      if (!existingMarker) {
        markersByCoordinates[coordinateKey] = marker
        continue
      }

      const existingDrawOrder = existingMarker.style === "results" ? 1 : 0
      const nextDrawOrder = marker.style === "results" ? 1 : 0

      if (nextDrawOrder > existingDrawOrder) {
        markersByCoordinates[coordinateKey] = marker
      }
    }

    return Object.values(markersByCoordinates)
  }, [backgroundMarkers])

  const popupMarkers = useMemo(
    () => [...markers, ...dedupedBackgroundMarkers],
    [dedupedBackgroundMarkers, markers],
  )

  const selectedMarker = useMemo(
    () => popupMarkers.find((marker) => marker.id === popupState?.markerId),
    [popupMarkers, popupState?.markerId],
  )

  const getPopupAnchorFromScreenPosition = (
    x: number,
    y: number,
    width: number,
    height: number,
  ): PopupAnchor => {
    const horizontalMargin = minimap ? 90 : 140
    const verticalMargin = minimap ? 72 : 110
    const horizontalAnchor = x <= horizontalMargin ? "left" : x >= width - horizontalMargin ? "right" : null
    const verticalAnchor =
      y <= verticalMargin ? "top" : y >= height - verticalMargin ? "bottom" : y <= height / 2 ? "top" : "bottom"

    if (!horizontalAnchor) {
      return verticalAnchor
    }

    return `${verticalAnchor}-${horizontalAnchor}` as PopupAnchor
  }

  const getPopupAnchorForMarker = (marker: MapMarker): PopupAnchor => {
    const map = mapRef.current?.getMap()
    const container = map?.getContainer()

    if (!map || !container) {
      return "bottom"
    }

    const projectedPoint = map.project([marker.coordinates[1], marker.coordinates[0]])

    return getPopupAnchorFromScreenPosition(
      projectedPoint.x,
      projectedPoint.y,
      container.clientWidth,
      container.clientHeight,
    )
  }

  const setCanvasCursor = (cursor: string) => {
    const canvas = mapRef.current?.getMap().getCanvas()

    if (canvas) {
      canvas.style.cursor = cursor
    }
  }

  const backgroundMarkerPoints = useMemo(() => {

    return {
      type: "FeatureCollection" as const,
      features: dedupedBackgroundMarkers.map((marker) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [marker.coordinates[1], marker.coordinates[0]] as [number, number],
        },
        properties: {
          markerId: marker.id,
          color: marker.color,
          style: marker.style,
          drawOrder: marker.style === "results" ? 1 : 0,
        },
      })),
    }
  }, [dedupedBackgroundMarkers])

  const pins = markers.map((marker) => (
    <Marker
      key={marker.id}
      longitude={marker.coordinates[1]}
      latitude={marker.coordinates[0]}
      anchor="bottom"
      className={marker.id === highlightedId ? "z-50" : "z-10"}
      onClick={e => {
        e.originalEvent.stopPropagation()
        setPopupState({
          markerId: marker.id,
          anchor: getPopupAnchorForMarker(marker),
        })
        if (onMarkerClick) {
          onMarkerClick(marker.id)
        }
      }}
    >
      <div className="marker-container relative">
        <Pin 
          size={minimap ? 16 : 24} 
          color={marker.color} 
          isHighlighted={marker.id === highlightedId}
        />
      </div>
    </Marker>
  ))

  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      return document.exitFullscreen().catch(err => {
        console.error("Error attempting to exit fullscreen:", err)
      })
    }
    return Promise.resolve()
  }

  const openEpigraphInNewTab = (epigraphId: string) => {
    window.open(`/epigraphs/${epigraphId}`, "_blank", "noopener,noreferrer")
  }

  return (
    <div className="w-64 h-64 relative border border-gray-300 rounded-md overflow-hidden shadow-lg bg-white">
      <Map
        ref={mapRef}
        initialViewState={{
          latitude: currentCenter[0],
          longitude: currentCenter[1],
          zoom: currentZoom,
        }}
        interactiveLayerIds={backgroundMarkers.length > 0 ? ["minimap-background-marker-circles"] : undefined}
        onMouseMove={(event) => {
          const markerStyle = event.features?.[0]?.properties?.style

          setCanvasCursor(markerStyle === "results" ? "pointer" : "")
        }}
        onMouseLeave={() => {
          setCanvasCursor("")
        }}
        onMoveStart={() => {
          setManualPan(true)
        }}
        onMoveEnd={(evt) => {
          if (evt.viewState) {
            setCurrentZoom(evt.viewState.zoom)
          }
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="https://tiles.openfreemap.org/styles/liberty"
        RTLTextPlugin="https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.3.0/dist/mapbox-gl-rtl-text.js"
        onClick={(event) => {
          const markerId = event.features?.[0]?.properties?.markerId
          const markerStyle = event.features?.[0]?.properties?.style

          if (typeof markerId === "string" && markerStyle === "results") {
            const map = mapRef.current?.getMap()
            const container = map?.getContainer()

            setPopupState({
              markerId,
              anchor: container
                ? getPopupAnchorFromScreenPosition(
                    event.point.x,
                    event.point.y,
                    container.clientWidth,
                    container.clientHeight,
                  )
                : "bottom",
            })
            return
          }

          setPopupState(null)
        }}
        attributionControl={{compact: true}}
      >
        <NavigationControl position="top-left" />
        <ScaleControl position="bottom-left" />
        <FullscreenControl position="top-left" />
        {backgroundMarkers.length > 0 && (
          <Source id="minimap-background-markers" type="geojson" data={backgroundMarkerPoints}>
            <Layer
              id="minimap-background-marker-circles"
              type="circle"
              layout={{
                "circle-sort-key": ["get", "drawOrder"],
              }}
              paint={{
                "circle-radius": [
                  "match",
                  ["get", "style"],
                  "results",
                  minimap ? 4.5 : 5.5,
                  "outside",
                  minimap ? 3 : 4,
                  minimap ? 3.5 : 4.5,
                ],
                "circle-color": ["coalesce", ["get", "color"], "#999999"],
                "circle-opacity": minimap ? 0.8 : 0.95,
                "circle-stroke-width": minimap ? 0.55 : 1,
                "circle-stroke-color": ["coalesce", ["get", "strokeColor"], "#444444"],
                "circle-stroke-opacity": minimap ? 0.75 : 0.95,
              }}
            />
          </Source>
        )}
        {pins}
        {selectedMarker && (
          <Popup
            longitude={selectedMarker.coordinates[1]}
            latitude={selectedMarker.coordinates[0]}
            anchor={popupState?.anchor ?? "bottom"}
            offset={minimap ? 10 : 14}
            onClose={() => setPopupState(null)}
            closeButton={true}
            closeOnClick={false}
            className="map-popup"
          >
            <div className={`${minimap ? "max-w-[180px]" : "max-w-xs"}`}>
              <h3 className="font-medium text-sm">{selectedMarker.label}</h3>
              {selectedMarker.popupContent && minimap && (
                <div className="mt-1 text-xs">
                  {selectedMarker.popupContent}
                </div>
              )}
              <div className="mt-2 space-y-2">
                {onEpigraphSelect && (
                  <button
                    onClick={async () => {
                      await exitFullscreen()
                      await onEpigraphSelect(selectedMarker.id)
                    }}
                    className="text-xs bg-zinc-600 text-white px-2 py-1 rounded hover:bg-zinc-700 transition-colors w-full hover:cursor-pointer"
                  >
                    View in results
                  </button>
                )}
                <button
                  onClick={() => {
                    openEpigraphInNewTab(selectedMarker.id)
                  }}
                  className="text-xs border border-zinc-300 bg-white text-zinc-700 px-2 py-1 rounded hover:border-zinc-400 hover:text-zinc-900 transition-colors w-full hover:cursor-pointer"
                >
                  Open in new tab
                </button>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {overlayContent}

      {onClose && (
        <button 
          onClick={onClose} 
          className="absolute top-2 right-2 bg-white rounded-full w-6 h-6 flex items-center justify-center shadow-md hover:bg-gray-100 focus:outline-none z-10"
          aria-label="Close map"
        >
          <X size={14} weight="bold" />
        </button>
      )}
    </div>
  )
}