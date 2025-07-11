import React, { useState, useMemo, useEffect, useRef } from "react"
import {
  Map,
  Marker,
  Popup,
  NavigationControl,
  ScaleControl,
  FullscreenControl,
  MapRef
} from "react-map-gl/maplibre"
import bbox from "@turf/bbox"
import "maplibre-gl/dist/maplibre-gl.css"
import { X } from "@phosphor-icons/react"
import Pin from "./Pin"

export type MapProps = {
  center: [number, number]
  zoom: number
  markers: Array<{
    id: string
    coordinates: [number, number]
    color: string
    label: string
    popupContent?: React.ReactNode
  }>
  onMarkerClick?: (markerId: string) => void
  onEpigraphSelect?: (epigraphId: string) => void
  minimap?: boolean
  highlightedId?: string | null
  onClose?: () => void
}

export const MapComponent: React.FC<MapProps> = ({ 
  center, 
  zoom, 
  markers,
  onMarkerClick,
  onEpigraphSelect,
  minimap = false,
  highlightedId = null,
  onClose
}) => {
  const [popupInfo, setPopupInfo] = useState<string | null>(null)
  const mapRef = useRef<MapRef>(null)
  const [currentCenter, setCurrentCenter] = useState(center)
  const [currentZoom, setCurrentZoom] = useState(zoom)
  const [manualPan, setManualPan] = useState(false)

  const selectedMarker = useMemo(() => 
    markers.find(marker => marker.id === popupInfo),
    [markers, popupInfo]
  )

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
    if (minimap && highlightedMarker && mapRef.current && !manualPan) {
      mapRef.current.flyTo({
        center: [highlightedMarker.coordinates[1], highlightedMarker.coordinates[0]],
        duration: 800,
        zoom: currentZoom
      })
    }
  }, [highlightedId, minimap, currentZoom, manualPan])

  useEffect(() => {
    if (!mapRef.current || markers.length === 0) return

    try {
      const bboxResult = bbox({
        type: "FeatureCollection",
        features: markers.map(marker => ({
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
  }, [markers])

  const pins = useMemo(() => 
    markers.map((marker) => (
      <Marker
        key={marker.id}
        longitude={marker.coordinates[1]}
        latitude={marker.coordinates[0]}
        anchor="bottom"
        className={marker.id === highlightedId ? "z-50" : "z-10"}
        onClick={e => {
          e.originalEvent.stopPropagation()
          setPopupInfo(marker.id)
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
    )),
    [markers, onMarkerClick, minimap, highlightedId]
  )

  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      return document.exitFullscreen().catch(err => {
        console.error("Error attempting to exit fullscreen:", err)
      })
    }
    return Promise.resolve()
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
        onClick={() => setPopupInfo(null)}
        attributionControl={{compact: true}}
      >
        <NavigationControl position="top-left" />
        <ScaleControl position="bottom-left" />
        <FullscreenControl position="top-left" />
        {pins}
        {selectedMarker && (
          <Popup
            longitude={selectedMarker.coordinates[1]}
            latitude={selectedMarker.coordinates[0]}
            anchor="top"
            onClose={() => setPopupInfo(null)}
            closeButton={true}
            closeOnClick={false}
            className="map-popup"
          >
            <div className={`p-2 ${minimap ? "max-w-[180px]" : "max-w-xs"}`}>
              <h3 className="font-medium text-sm">{selectedMarker.label}</h3>
              {selectedMarker.popupContent && minimap && (
                <div className="mt-1 text-xs">
                  {selectedMarker.popupContent}
                </div>
              )}
              {onEpigraphSelect && (
                <button
                  onClick={() => {
                    exitFullscreen().then(() => {
                      setTimeout(() => {
                        onEpigraphSelect(selectedMarker.id)
                      }, 300)
                    })
                  }}
                  className="mt-2 text-xs bg-zinc-600 text-white px-2 py-1 rounded hover:bg-zinc-700 transition-colors w-full"
                >
                  View in results
                </button>
              )}
            </div>
          </Popup>
        )}
      </Map>

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