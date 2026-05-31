"use client"

import React, { useEffect } from "react"
import { useParams } from "next/navigation"
import { EpigraphsService, EpigraphOut } from "../client"
import { EpigraphCard } from "../components/EpigraphCard"
import { Spinner } from "../components/Spinner"
import { ClientMap } from "../next/components/ClientMap"
import { MapTrifold, ArrowLeft, WarningCircle, StackSimple } from "@phosphor-icons/react"

type FilterValue = string | boolean | string[]
type MapMarkerStyle = "results" | "outside"
type MapLayerKey = MapMarkerStyle
type MapMarker = {
  id: string
  coordinates: [number, number]
  color: string
  label: string
  style: MapMarkerStyle
}
type EpigraphMapMarkersResponse = {
  markers: Array<{
    id: number
    dasi_id: number
    title: string
    label: string
    coordinates: [number, number]
    site_name?: string | null
  }>
  result_count: number
  mapped_count: number
}

const MAP_LAYER_CONFIG: Record<MapLayerKey, { label: string; color: string; strokeColor?: string }> = {
  results: {
    label: "Similar epigraphs",
    color: "#A16207",
    strokeColor: "#A16207",
  },
  outside: {
    label: "Other epigraphs",
    color: "#999999",
    strokeColor: "#444444",
  },
}

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === "string") {
    const parsedValue = Number(value)
    return Number.isFinite(parsedValue) ? parsedValue : null
  }

  return null
}

const normaliseMarkerCoordinates = (coordinates: unknown): [number, number] | null => {
  if (Array.isArray(coordinates) && coordinates.length >= 2) {
    const latitude = toFiniteNumber(coordinates[0])
    const longitude = toFiniteNumber(coordinates[1])

    if (latitude !== null && longitude !== null) {
      return [latitude, longitude]
    }
  }

  if (coordinates && typeof coordinates === "object") {
    const coordinateRecord = coordinates as Record<string, unknown>
    const latitude = toFiniteNumber(coordinateRecord.lat ?? coordinateRecord.latitude)
    const longitude = toFiniteNumber(
      coordinateRecord.lng ?? coordinateRecord.lon ?? coordinateRecord.longitude,
    )

    if (latitude !== null && longitude !== null) {
      return [latitude, longitude]
    }
  }

  return null
}

const toMapMarkers = (
  markers: EpigraphMapMarkersResponse["markers"],
  style: MapMarkerStyle,
): MapMarker[] => {
  return markers
    .map((marker) => {
      const coordinates = normaliseMarkerCoordinates(marker.coordinates)

      if (!coordinates) {
        return null
      }

      return {
        id: marker.dasi_id.toString(),
        coordinates,
        color: MAP_LAYER_CONFIG[style].color,
        label: marker.label,
        style,
      }
    })
    .filter((marker): marker is MapMarker => marker !== null)
}

const toEpigraphMapMarker = (epigraphData: EpigraphOut): MapMarker | null => {
  const coordinates = normaliseMarkerCoordinates(epigraphData.sites_objs?.[0]?.coordinates)

  if (!coordinates) {
    return null
  }

  return {
    id: epigraphData.dasi_id.toString(),
    coordinates,
    color: MAP_LAYER_CONFIG.results.color,
    label: `${epigraphData.title} - ${epigraphData.sites_objs?.[0]?.modern_name || "Unknown"}`,
    style: "results",
  }
}

interface EpigraphProps {
  initialUrlKey?: string
  initialEpigraph?: EpigraphOut | null
  initialError?: string | null
}

const Epigraph: React.FC<EpigraphProps> = ({
  initialUrlKey,
  initialEpigraph = null,
  initialError = null,
}) => {
  const params = useParams<{ urlKey?: string | string[] }>()
  const routeUrlKey = Array.isArray(params?.urlKey) ? params.urlKey[0] : params?.urlKey
  const urlKey = initialUrlKey ?? routeUrlKey
  const [epigraph, setEpigraph] = React.useState<EpigraphOut | null>(initialEpigraph)
  const [isLoading, setIsLoading] = React.useState(!initialEpigraph && !initialError)
  const [error, setError] = React.useState<string | null>(initialError)
  const [similarEpigraphs, setSimilarEpigraphs] = React.useState<EpigraphOut[]>([])
  const [isSimilarLoading, setIsSimilarLoading] = React.useState(false)
  const [mapVisible, setMapVisible] = React.useState(true)
  const [allMapMarkers, setAllMapMarkers] = React.useState<MapMarker[]>([])
  const [mapLayerVisibility, setMapLayerVisibility] = React.useState<Record<MapLayerKey, boolean>>({
    results: true,
    outside: true,
  })
  const [mapLayersExpanded, setMapLayersExpanded] = React.useState(false)
  const [visibleEpigraphId, setVisibleEpigraphId] = React.useState<string | null>(null)
  const epigraphRefs = React.useRef<{[key: string]: HTMLDivElement | null}>({})
  const hasLoadedAllMapMarkersRef = React.useRef(false)

  const fetchAllMapMarkers = async () => {
    try {
      const response = await fetch("/api/v1/epigraphs/query/map-markers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          search_text: "",
          filters: {
            dasi_published: true,
          } satisfies Record<string, FilterValue>,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || `Marker request failed with status ${response.status}`)
      }

      const result = (await response.json()) as EpigraphMapMarkersResponse
      hasLoadedAllMapMarkersRef.current = true
      setAllMapMarkers(toMapMarkers(result.markers, "outside"))
    } catch (error) {
      hasLoadedAllMapMarkersRef.current = false
      console.error("Error fetching epigraph map markers:", error)
    }
  }

  const fetchSimilarEpigraphs = async (epigraphId: number, currentEpigraph: EpigraphOut | null = epigraph) => {
    try {
      setIsSimilarLoading(true)
      const response = await EpigraphsService.epigraphsGetSimilarEpigraphs({
        epigraphId,
        distanceThreshold: 1,
        limit: 10,
        filters: JSON.stringify({ dasi_published: { not: false } })
      })
      const similarData = response.epigraphs || []
      setSimilarEpigraphs(similarData)

    } catch (err) {
      console.error("Error fetching similar epigraphs:", err)
    } finally {
      setIsSimilarLoading(false)
    }
  }

  useEffect(() => {
    if (!epigraph || hasLoadedAllMapMarkersRef.current) {
      return
    }

    void fetchAllMapMarkers()
  }, [epigraph])

  useEffect(() => {
    let isCancelled = false

    if (!urlKey) {
      setIsLoading(false)
      return () => {
        isCancelled = true
      }
    }

    setSimilarEpigraphs([])

    if (initialEpigraph && String(initialEpigraph.dasi_id) === urlKey) {
      setEpigraph(initialEpigraph)
      setError(initialError)
      setIsLoading(false)
      void fetchSimilarEpigraphs(initialEpigraph.id, initialEpigraph)

      return () => {
        isCancelled = true
      }
    }

    if (initialError) {
      setEpigraph(null)
      setError(initialError)
      setIsLoading(false)

      return () => {
        isCancelled = true
      }
    }

    setIsLoading(true)
    setError(null)

    void EpigraphsService.epigraphsReadEpigraphByDasiId({ dasiId: parseInt(urlKey, 10) })
      .then((response) => {
        if (isCancelled) {
          return
        }

        setEpigraph(response)
        void fetchSimilarEpigraphs(response.id, response)
      })
      .catch((err) => {
        if (isCancelled) {
          return
        }

        console.error("Error fetching epigraph:", err)
        const status = (err && (err.response?.status || err.status)) || null
        if (status === 403) {
          setError("This epigraph is not yet published.")
        } else if (status === 404) {
          setError("The requested epigraph does not exist.")
        } else {
          setError("Failed to load epigraph. Please try again.")
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [urlKey, initialEpigraph, initialError])

  const resultMapMarkers = React.useMemo(() => {
    const markerEntries = new Map<string, MapMarker>()

    if (epigraph) {
      const mainMarker = toEpigraphMapMarker(epigraph)

      if (mainMarker) {
        markerEntries.set(mainMarker.id, mainMarker)
      }
    }

    for (const similarEpigraph of similarEpigraphs) {
      const similarMarker = toEpigraphMapMarker(similarEpigraph)

      if (similarMarker) {
        markerEntries.set(similarMarker.id, similarMarker)
      }
    }

    return Array.from(markerEntries.values())
  }, [epigraph, similarEpigraphs])

  const resultMarkerIds = React.useMemo(
    () => new Set(resultMapMarkers.map((marker) => marker.id)),
    [resultMapMarkers],
  )

  const outsideResultMapMarkers = React.useMemo(
    () => allMapMarkers.filter((marker) => !resultMarkerIds.has(marker.id)),
    [allMapMarkers, resultMarkerIds],
  )

  const highlightedMapMarker = React.useMemo(() => {
    if (!mapLayerVisibility.results || !visibleEpigraphId) {
      return null
    }

    return resultMapMarkers.find((marker) => marker.id === visibleEpigraphId) || null
  }, [mapLayerVisibility.results, resultMapMarkers, visibleEpigraphId])

  const visibleBackgroundMapMarkers = React.useMemo(() => {
    const visibleMarkers: MapMarker[] = []

    if (mapLayerVisibility.results) {
      visibleMarkers.push(
        ...resultMapMarkers.filter((marker) => marker.id !== highlightedMapMarker?.id),
      )
    }

    if (mapLayerVisibility.outside) {
      visibleMarkers.push(...outsideResultMapMarkers)
    }

    return visibleMarkers
  }, [highlightedMapMarker?.id, mapLayerVisibility.outside, mapLayerVisibility.results, outsideResultMapMarkers, resultMapMarkers])

  const availableMapMarkers = React.useMemo(
    () => [...resultMapMarkers, ...outsideResultMapMarkers],
    [outsideResultMapMarkers, resultMapMarkers],
  )

  const mapLayerOptions = React.useMemo(
    () => [
      {
        key: "results" as const,
        label: MAP_LAYER_CONFIG.results.label,
        color: MAP_LAYER_CONFIG.results.color,
        count: resultMapMarkers.length,
      },
      {
        key: "outside" as const,
        label: MAP_LAYER_CONFIG.outside.label,
        color: MAP_LAYER_CONFIG.outside.color,
        count: outsideResultMapMarkers.length,
      },
    ],
    [outsideResultMapMarkers.length, resultMapMarkers.length],
  )

  const hasAvailableMapMarkers = availableMapMarkers.length > 0
  const visiblePinMarkers = highlightedMapMarker ? [highlightedMapMarker] : []
  const markersForViewport =
    visiblePinMarkers.length > 0 || visibleBackgroundMapMarkers.length > 0
      ? [...visiblePinMarkers, ...visibleBackgroundMapMarkers]
      : availableMapMarkers

  useEffect(() => {
    if (!epigraph && !similarEpigraphs.length) return

    let debounceTimeout: NodeJS.Timeout | null = null
    let lastSelectedId = visibleEpigraphId

    const checkVisibleEpigraph = () => {
      const epigraphElements = Object.entries(epigraphRefs.current)
        .filter(([_, element]) => element !== null)
        .map(([id, element]) => ({ id, element }))

      if (epigraphElements.length === 0) return

      const viewportHeight = window.innerHeight

      const visibilityScores = epigraphElements.map(({ id, element }) => {
        if (!element) return { id, visiblePercentage: 0, pixelsVisible: 0 }

        const rect = element.getBoundingClientRect()
        const elementHeight = rect.height
        const elementTop = rect.top
        const elementBottom = rect.bottom

        if (elementBottom <= 0 || elementTop >= viewportHeight) {
          return { id, visiblePercentage: 0, pixelsVisible: 0 }
        }

        const visibleTop = Math.max(0, elementTop)
        const visibleBottom = Math.min(viewportHeight, elementBottom)
        const pixelsVisible = visibleBottom - visibleTop
        const visiblePercentage = pixelsVisible / elementHeight
        const positionBoost = 1 - (visibleTop / viewportHeight) * 0.2

        return { 
          id, 
          visiblePercentage: visiblePercentage * positionBoost,
          pixelsVisible
        }
      })

      const visibleElements = visibilityScores.filter(score => score.pixelsVisible > 0)

      if (visibleElements.length === 0) return

      const mostVisible = visibleElements.reduce((prev, current) => {
        return current.visiblePercentage > prev.visiblePercentage ? current : prev
      })

      if (mostVisible.id !== lastSelectedId && mostVisible.visiblePercentage > 0.05) {
        lastSelectedId = mostVisible.id
        setVisibleEpigraphId(mostVisible.id)
      }
    }

    const handleScroll = () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout)
      }

      debounceTimeout = setTimeout(() => {
        window.requestAnimationFrame(checkVisibleEpigraph)
      }, 150)
    }

    window.addEventListener("scroll", handleScroll)
    window.addEventListener("resize", handleScroll)
    setTimeout(checkVisibleEpigraph, 800)

    return () => {
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("resize", handleScroll)
      if (debounceTimeout) {
        clearTimeout(debounceTimeout)
      }
    }
  }, [epigraph, similarEpigraphs, visibleEpigraphId])

  if (isLoading) {
    return (
      <div className="max-w-7xl p-4 mx-auto">
        <div className="flex justify-center items-center min-h-64">
          <Spinner size="w-10 h-10" colour="#666" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl p-4 mx-auto">
        <div className="mb-6">
          <button
            type="button"
            onClick={() => window.history.length > 1 ? window.history.back() : window.location.assign('/epigraphs')}
            className="inline-flex items-center gap-1 px-2 sm:px-3 py-2 rounded shadow border border-gray-900 hover:border-gray-700 hover:text-gray-700 transition-colors font-semibold h-8 whitespace-nowrap cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
        </div>

        <div className="flex items-center gap-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-yellow-800 text-sm">
          <WarningCircle size={16} className="min-w-[16px] min-h-[16px]" />
          <div>{error}</div>
        </div>
      </div>
    )
  }

  if (!epigraph && !isLoading && !error) {
    return (
      <div className="max-w-7xl p-4 mx-auto">
        <div className="mb-6">
          <button
            type="button"
            onClick={() => window.history.length > 1 ? window.history.back() : window.location.assign('/epigraphs')}
            className="inline-flex items-center gap-1 px-2 sm:px-3 py-2 rounded shadow border border-gray-900 hover:border-gray-700 hover:text-gray-700 transition-colors font-semibold h-8 whitespace-nowrap cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
        </div>

        <div className="flex items-center gap-2 p-2 lg:ml-3 bg-yellow-100 border border-yellow-300 rounded text-yellow-800 text-sm">
          <WarningCircle size={16} className="min-w-[16px] min-h-[16px]" />
          <div>The requested epigraph could not be found.</div>
        </div>
      </div>
    )
  }

  const getMapCenter = (): [number, number] => {
    if (markersForViewport.length === 0) return [15, 45]

    if (markersForViewport.length === 1) return markersForViewport[0].coordinates

    const sum = markersForViewport.reduce(
      (acc, marker) => {
        return [acc[0] + marker.coordinates[0], acc[1] + marker.coordinates[1]]
      },
      [0, 0]
    )

    return [sum[0] / markersForViewport.length, sum[1] / markersForViewport.length]
  }

  const toggleMapLayerVisibility = (layerKey: MapLayerKey) => {
    setMapLayerVisibility((currentVisibility) => ({
      ...currentVisibility,
      [layerKey]: !currentVisibility[layerKey],
    }))
  }

  const mapLayerOverlay = (
    <div className="absolute left-[10px] top-[146px] z-10 pointer-events-auto">
      <button
        type="button"
        onClick={() => setMapLayersExpanded((expanded) => !expanded)}
        className="flex h-[29px] w-[29px] items-center justify-center rounded-[4px] border border-stone-300 bg-white text-stone-700 shadow-sm transition-colors hover:bg-stone-100 hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-stone-500/25"
        aria-expanded={mapLayersExpanded}
        aria-controls="epigraph-map-layers"
        aria-label={mapLayersExpanded ? "Hide map layers" : "Show map layers"}
      >
        <StackSimple size={15} weight={mapLayersExpanded ? "fill" : "regular"} />
      </button>

      {mapLayersExpanded && (
        <div
          id="epigraph-map-layers"
          className="absolute left-full -top-11 ml-1.5 w-50 rounded-md border border-stone-300/90 bg-white/95 p-1.5 shadow-lg backdrop-blur-sm"
        >
          <p className="px-0.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">
            Map layers
          </p>
          <div className="space-y-1">
            {mapLayerOptions.map((layer) => {
              const isVisible = mapLayerVisibility[layer.key]
              const isDisabled = layer.count === 0

              return (
                <label
                  key={layer.key}
                  className={`flex items-center justify-between gap-2 rounded-md border px-1.5 py-1 text-[11px] transition-colors ${
                    isVisible
                      ? "border-stone-300 bg-stone-50 text-stone-900"
                      : "border-stone-200 bg-white text-stone-500"
                  } ${isDisabled ? "opacity-50" : "cursor-pointer"}`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isVisible}
                      disabled={isDisabled}
                      onChange={() => toggleMapLayerVisibility(layer.key)}
                      className="h-3 w-3 rounded border-stone-300 text-stone-900 focus:ring-stone-500"
                    />
                    <span
                      className={`block h-2 w-2 flex-none rounded-full ${layer.key === "outside" ? "border" : ""}`}
                      style={{
                        backgroundColor: layer.color,
                        borderColor: layer.color,
                      }}
                    />
                    <span>{layer.label}</span>
                  </span>
                  <span className="tabular-nums text-stone-500">{layer.count}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )

  const scrollToEpigraph = (epigraphId: string) => {
    const ref = epigraphRefs.current[epigraphId]

    if (ref) {
      ref.scrollIntoView({ behavior: "smooth", block: "start" })
      setVisibleEpigraphId(epigraphId)
      return
    }

    window.open(`/epigraphs/${epigraphId}`, "_blank", "noopener,noreferrer")
  }

  if (!epigraph) return null

  return (
    <div className="max-w-7xl p-4 mx-auto">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => window.history.length > 1 ? window.history.back() : window.location.assign('/epigraphs')}
          className="inline-flex items-center gap-1 px-2 sm:px-3 py-2 rounded shadow border border-gray-900 hover:border-gray-700 hover:text-gray-700 transition-colors font-semibold h-8 whitespace-nowrap cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
      </div>

      <div 
        ref={(el) => {
          epigraphRefs.current[epigraph.dasi_id.toString()] = el
        }}
        data-epigraph-id={epigraph.dasi_id.toString()}
      >
        <EpigraphCard
          epigraph={epigraph}
          notes={true}
          bibliography={true}
          hideHudhudLink={true}
        />
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Similar Epigraphs</h2>
        {isSimilarLoading ? (
          <div className="flex justify-center items-center min-h-32">
            <Spinner size="w-8 h-8" colour="#666" />
          </div>
        ) : similarEpigraphs.length > 0 ? (
          <div className="space-y-4">
            {similarEpigraphs.map((similar) => (
              <div 
                key={similar.id}
                ref={(el) => {
                  epigraphRefs.current[similar.dasi_id.toString()] = el
                }}
                data-epigraph-id={similar.dasi_id.toString()}
              >
                <EpigraphCard
                  epigraph={similar}
                  notes={true}
                  bibliography={true}
                  hideHudhudLink={false}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No similar epigraphs found.</p>
        )}
      </div>

      {hasAvailableMapMarkers && mapVisible && (
        <div className="fixed bottom-4 right-4 z-40 w-64">
          <ClientMap
            center={getMapCenter()}
            zoom={markersForViewport.length > 1 ? 6 : 8}
            markers={visiblePinMarkers}
            backgroundMarkers={visibleBackgroundMapMarkers}
            onEpigraphSelect={scrollToEpigraph}
            minimap={true}
            highlightedId={visibleEpigraphId}
            onClose={() => setMapVisible(false)}
            overlayContent={mapLayerOverlay}
          />
        </div>
      )}

      {hasAvailableMapMarkers && !mapVisible && (
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={() => setMapVisible(true)}
            className="bg-white p-2 rounded-md shadow-lg hover:bg-gray-100 focus:outline-none flex items-center justify-center text-gray-700"
            aria-label="Show map"
          >
            <MapTrifold size={24} weight="regular" />
          </button>
        </div>
      )}
    </div>
  )
}

export default Epigraph