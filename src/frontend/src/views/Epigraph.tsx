import React, { useEffect } from "react"
import { useParams } from "react-router-dom"
import { EpigraphsService, EpigraphOut } from "../client"
import { EpigraphCard } from "../components/EpigraphCard"
import { Spinner } from "../components/Spinner"
import { MapComponent } from "../components/Map"
import { MapTrifold } from "@phosphor-icons/react"
import { MetaTags } from "../components/MetaTags"
import { generateEpigraphMetaTags, generateEpigraphStructuredData, getDefaultMetaTags } from "../utils/metaTags"

const Epigraph: React.FC = () => {
  const { urlKey } = useParams<{ urlKey: string }>()
  const [epigraph, setEpigraph] = React.useState<EpigraphOut | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [similarEpigraphs, setSimilarEpigraphs] = React.useState<EpigraphOut[]>([])
  const [isSimilarLoading, setIsSimilarLoading] = React.useState(false)
  const [mapVisible, setMapVisible] = React.useState(true)
  const [mapMarkers, setMapMarkers] = React.useState<{
    id: string
    coordinates: [number, number]
    color: string
    label: string
  }[]>([])
  const [visibleEpigraphId, setVisibleEpigraphId] = React.useState<string | null>(null)
  const epigraphRefs = React.useRef<{[key: string]: HTMLDivElement | null}>({})

  const updateMapMarkers = (epigraphData: EpigraphOut, similarEpigraphsData: EpigraphOut[] = []) => {
    const markers = []

    if (epigraphData.sites_objs && 
        epigraphData.sites_objs.length > 0 && 
        epigraphData.sites_objs[0].coordinates) {

      markers.push({
        id: epigraphData.id.toString(),
        coordinates: (epigraphData.sites_objs[0].coordinates as [number, number]),
        color: "#2563EB",
        label: `${epigraphData.title} - ${epigraphData.sites_objs[0].modern_name || "Unknown"} (Main)`,
      })
    }

    similarEpigraphsData.forEach(similar => {
      if (similar.sites_objs && 
          similar.sites_objs.length > 0 && 
          similar.sites_objs[0].coordinates) {

        markers.push({
          id: similar.id.toString(),
          coordinates: (similar.sites_objs[0].coordinates as [number, number]),
          color: similar.sites_objs[0].coordinates_accuracy === "approximate" ? "#F59E0B" : "#10B981", // Amber/Green for similar
          label: `${similar.title} - ${similar.sites_objs[0].modern_name || "Unknown"} (Similar)`,
        })
      }
    })

    setMapMarkers(markers)
  }

  const fetchSimilarEpigraphs = async (epigraphId: number) => {
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

      if (epigraph) {
        updateMapMarkers(epigraph, similarData)
      }
    } catch (err) {
      console.error("Error fetching similar epigraphs:", err)
    } finally {
      setIsSimilarLoading(false)
    }
  }

  useEffect(() => {
    if (epigraph && similarEpigraphs.length > 0) {
      updateMapMarkers(epigraph, similarEpigraphs)
    }
  }, [similarEpigraphs])

  useEffect(() => {
    if (urlKey) {
      setIsLoading(true)
      setError(null)

      EpigraphsService.epigraphsReadEpigraphById({ epigraphId: parseInt(urlKey) })
        .then((response) => {
          setEpigraph(response)
          updateMapMarkers(response, [])
          fetchSimilarEpigraphs(parseInt(urlKey))
        })
        .catch((err) => {
          console.error("Error fetching epigraph:", err)
          setError("Failed to load epigraph. Please try again.")
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [urlKey])

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
        <MetaTags data={getDefaultMetaTags()} />
        <div className="flex justify-center items-center min-h-64">
          <Spinner size="w-10 h-10" colour="#666" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl p-4 mx-auto">
        <MetaTags data={getDefaultMetaTags()} />
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!epigraph) {
    return (
      <div className="max-w-7xl p-4 mx-auto">
        <MetaTags data={getDefaultMetaTags()} />
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Epigraph Not Found</h1>
          <p>The requested epigraph could not be found.</p>
        </div>
      </div>
    )
  }

  const getMapCenter = (): [number, number] => {
    if (mapMarkers.length === 0) return [15, 45]

    if (visibleEpigraphId) {
      const visibleMarker = mapMarkers.find(marker => marker.id === visibleEpigraphId)
      if (visibleMarker) {
        return visibleMarker.coordinates
      }
    }

    if (mapMarkers.length === 1) return mapMarkers[0].coordinates

    const sum = mapMarkers.reduce(
      (acc, marker) => {
        return [acc[0] + marker.coordinates[0], acc[1] + marker.coordinates[1]]
      },
      [0, 0]
    )

    return [sum[0] / mapMarkers.length, sum[1] / mapMarkers.length]
  }

  const scrollToEpigraph = (epigraphId: string) => {
    if (epigraphId === epigraph?.id.toString()) {
      window.scrollTo({ top: 0, behavior: "smooth" })
      return
    }

    window.open(`/epigraphs/${epigraphId}`, '_blank')
  }

  return (
    <div className="max-w-7xl p-4 mx-auto">
      <MetaTags 
        data={generateEpigraphMetaTags(epigraph)} 
        structuredData={generateEpigraphStructuredData(epigraph)}
      />
      <div 
        ref={el => epigraphRefs.current[epigraph?.id.toString() || ''] = el}
        data-epigraph-id={epigraph?.id.toString()}
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
                ref={el => epigraphRefs.current[similar.id.toString()] = el}
                data-epigraph-id={similar.id.toString()}
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

      {mapMarkers.length > 0 && mapVisible && (
        <div 
          className="fixed bottom-4 right-4 z-40 w-64"
        >
          <MapComponent
            center={getMapCenter()}
            zoom={mapMarkers.length > 1 ? 6 : 8}
            markers={mapMarkers}
            onEpigraphSelect={scrollToEpigraph}
            minimap={true}
            highlightedId={visibleEpigraphId}
            onClose={() => setMapVisible(false)}
          />
        </div>
      )}

      {mapMarkers.length > 0 && !mapVisible && (
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={() => setMapVisible(true)}
            className="bg-white p-2 rounded-full shadow-lg hover:bg-gray-100 focus:outline-none flex items-center justify-center text-gray-700"
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