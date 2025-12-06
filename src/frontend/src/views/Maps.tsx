import React, { useEffect, useState, useRef } from "react"
import {
  Map,
  Source,
  Layer,
  NavigationControl,
  ScaleControl,
  FullscreenControl,
  MapRef,
  Popup,
} from "react-map-gl/maplibre"
import bbox from "@turf/bbox"
import { AnalyticsService } from "../client"
import 'maplibre-gl/dist/maplibre-gl.css'
// import { Slider } from "react-aria-components"
import { MySlider } from "../components/Slider"
import LanguagePeriodMap from "../components/LanguagePeriodMap"

const Maps: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [selectedPeriodIdx, setSelectedPeriodIdx] = useState(0)
  const [heatmapData, setHeatmapData] = useState<any>(null)
  const [hoveredSite, setHoveredSite] = useState<any>(null)
  const [periods, setPeriods] = useState<string[]>([])
  const [heatmapCache, setHeatmapCache] = useState<any>(null)
  const [epigraphCount, setEpigraphCount] = useState<number>(0)
  const mapRef = useRef<MapRef>(null)

  // Fetch heatmap data from backend
  useEffect(() => {
    const fetchHeatmapData = async () => {
      try {
        setLoading(true)
        
        // Try to get cached heatmap data
        const response = await AnalyticsService.analyticsGetSiteHeatmap()
        
        // If no cache exists, trigger cache creation
        if (!response) {
          await AnalyticsService.analyticsSiteHeatmap()
          // Wait a moment for cache to be created
          setTimeout(async () => {
            const newData = await AnalyticsService.analyticsGetSiteHeatmap()
            setHeatmapCache(newData)
            setPeriods(newData.period_list || [])
            setHeatmapData(newData.all_periods)
          }, 2000)
        } else {
          setHeatmapCache(response)
          setPeriods(response.period_list || [])
          setHeatmapData(response.all_periods)
        }
      } catch (error) {
        console.error("Error fetching heatmap data:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchHeatmapData()
  }, [])
  
  // Update heatmap when period changes
  useEffect(() => {
    if (!heatmapCache) return
    
    if (selectedPeriodIdx === 0) {
      // Show all periods
      setHeatmapData(heatmapCache.all_periods)
      // Calculate total epigraph count across all periods
      let totalCount = 0
      if (heatmapCache.all_periods && heatmapCache.all_periods.features) {
        totalCount = heatmapCache.all_periods.features.reduce((sum: number, feature: any) => 
          sum + (feature.properties?.count || 0), 0)
      }
      setEpigraphCount(totalCount)
    } else if (periods[selectedPeriodIdx - 1]) {
      // Show specific period
      const periodName = periods[selectedPeriodIdx - 1]
      setHeatmapData(heatmapCache.periods[periodName])
      // Calculate epigraph count for this period
      let periodCount = 0
      if (heatmapCache.periods[periodName] && heatmapCache.periods[periodName].features) {
        periodCount = heatmapCache.periods[periodName].features.reduce((sum: number, feature: any) => 
          sum + (feature.properties?.count || 0), 0)
      }
      setEpigraphCount(periodCount)
    }
  }, [selectedPeriodIdx, heatmapCache])
  
  // Fit map bounds when heatmap data changes
  useEffect(() => {
    if (!mapRef.current || !heatmapData || !heatmapData.features || heatmapData.features.length === 0) return
    
    try {
      // Get the bounding box of all points
      const bboxResult = bbox(heatmapData)

      const bounds: [number, number, number, number] = [
        bboxResult[0], bboxResult[1], bboxResult[2], bboxResult[3]
      ]

      // Adjust the map to fit all points
      mapRef.current.fitBounds(bounds, {
          padding: 50,
          duration: 1000,
          maxZoom: 8 // Lower max zoom to prevent excessive zooming

        }
      )
    } catch (error) {
      console.error("Error fitting bounds:", error)
    }
  }, [heatmapData])

  return (
    <div className="max-w-[1400px] mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Epigraph Heatmap by Period</h1>
      
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <p>Select Period:</p>
          <div className="text-sm font-medium bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
            {selectedPeriodIdx === 0 ? "All Periods" : periods[selectedPeriodIdx - 1]}: 
            <span className="ml-1 font-bold">{epigraphCount} epigraph{epigraphCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
        
        <div className="relative">
          <MySlider 
            label="Period"
            value={selectedPeriodIdx}
            onChange={setSelectedPeriodIdx}
            className="h-10 items-center w-full z-10"
            maxValue={periods.length}
            minValue={0}
            step={1}
          />
          
          {/* Combined tick marks and labels with fixed widths */}
          <div className="flex justify-between w-full absolute bottom-[5px] pointer-events-none">
            {/* "All" tick and label */}
            <div className="flex flex-col items-center w-[1px]">
              <div className="h-3 w-0.5 bg-gray-400"></div>
              <div className="text-xs text-gray-600 mt-[9px] whitespace-nowrap">All</div>
            </div>
            
            {/* Period ticks and labels */}
            {periods.map((period, index) => (
              <div className="flex flex-col items-center w-[1px]" key={period}>
                <div className="h-3 w-0.5 bg-gray-400"></div>
                <div 
                  className={`text-xs text-gray-600 mt-[9px] max-w-[60px] overflow-hidden text-ellipsis whitespace-nowrap 
                              md:visible ${index % 2 !== 0 ? 'hidden md:block' : ''}`}
                  style={{
                    transform: "translateX(-5%)"
                  }}
                  title={period}
                >
                  {period}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {loading && (
        <div className="flex justify-center items-center h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
        </div>
      )}
      
      <div className="h-[500px] rounded-lg overflow-hidden shadow-lg border border-gray-300">
        <Map
          ref={mapRef}
          initialViewState={{
            latitude: 15,
            longitude: 45,
            zoom: 5,
          }}
          mapStyle="https://tiles.openfreemap.org/styles/liberty"
          RTLTextPlugin="https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.3.0/dist/mapbox-gl-rtl-text.js"
          style={{ width: "100%", height: "100%" }}
          interactiveLayerIds={["sites-point"]} // Changed from sites-heat to sites-point
          onClick={(e) => {
            // Add click handler to ensure interaction works
            if (e.features && e.features.length > 0) {
              console.log("Clicked feature:", e.features[0].properties)
            }
          }}
          onMouseMove={(e) => {
            if (e.features && e.features.length > 0) {
              setHoveredSite({
                ...e.features[0].properties,
                longitude: e.lngLat.lng,
                latitude: e.lngLat.lat,
              })
            }
          }}
          onMouseOut={() => {
            setHoveredSite(null)
          }}
        >
          <NavigationControl position="top-left" />
          <ScaleControl position="bottom-left" />
          <FullscreenControl position="top-left" />
          
          {heatmapData && (
            <>
              <Source type="geojson" data={heatmapData}>
                {/* Heat map layer */}
                <Layer
                  id="sites-heat"
                  type="heatmap"
                  paint={{
                    // Increase the heatmap weight based on epigraph count
                    "heatmap-weight": [
                      "interpolate",
                      ["linear"],
                      ["get", "count"],
                      0, 0.2,
                      100, 1
                    ],
                    // Increase the heatmap color weight by zoom level
                    "heatmap-intensity": [
                      "interpolate",
                      ["linear"],
                      ["zoom"],
                      0, 1,
                      9, 3
                    ],
                    // Color ramp for heatmap
                    "heatmap-color": [
                      "interpolate",
                      ["linear"],
                      ["heatmap-density"],
                      0, "rgba(33,102,172,0)",
                      0.1, "rgb(103,169,207, 0.6)",
                      0.2, "rgb(103,169,207)",
                      0.4, "rgb(209,229,240)",
                      0.6, "rgb(253,219,199)",
                      0.8, "rgb(239,138,98)",
                      1, "rgb(178,24,43)"
                    ],
                    // Adjust the heatmap radius by zoom level
                    "heatmap-radius": [
                      "interpolate",
                      ["linear"],
                      ["zoom"],
                      0, 2,
                      9, 20
                    ],
                    // Transition from heatmap to circle layer by zoom level
                    "heatmap-opacity": [
                      "interpolate",
                      ["linear"],
                      ["zoom"],
                      7, 1,
                      9, 0.5
                    ],
                  }}
                />
                
                {/* Circle layer for individual sites */}
                <Layer
                  id="sites-point"
                  type="circle"
                  paint={{
                    "circle-radius": [
                      "interpolate",
                      ["linear"],
                      ["zoom"],
                      4, [
                        "interpolate",
                        ["linear"],
                        ["get", "count"],
                        1, 1,
                        10, 4
                      ],
                      8, [
                        "interpolate",
                        ["linear"],
                        ["get", "count"],
                        1, 5,
                        10, 15
                      ]
                    ],
                    "circle-color": [
                      "case",
                      ["==", ["get", "coordinates_accuracy"], "approximate"],
                      "#FFA726", // Orange for approximate coordinates
                      "#4CAF50" // Green for accurate coordinates
                    ],
                    // "circle-color": "#FF5722", // Default color for all markers
                    "circle-opacity": [
                      "interpolate",
                      ["linear"],
                      ["zoom"],
                      7, 0,
                      8, 1
                    ],
                    // "circle-stroke-color": "white",
                    // "circle-stroke-width": 1,
                  }}
                />
              </Source>
              
              {/* Popup for hovered site */}
              {hoveredSite && (
                <Popup
                  longitude={hoveredSite.longitude}
                  latitude={hoveredSite.latitude}
                  anchor="bottom"
                  onClose={() => setHoveredSite(null)}
                  closeButton={false}
                  closeOnClick={false}  // Added to prevent closing on map click
                >
                  <div className="px-2 py-1">
                    <h3 className="font-medium text-sm">{hoveredSite.name}</h3>
                    <p className="text-xs">
                      {hoveredSite.count} epigraph{hoveredSite.count !== 1 ? 's' : ''} from{' '}
                      {hoveredSite.period === 'All' ? 'all' : hoveredSite.period} {hoveredSite.period === 'All' ? 'periods' : 'period'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Coordinates: {hoveredSite.coordinates_accuracy || 'Unknown'}
                    </p>
                    {/* <Link 
                      to={`/search?q=site:${hoveredSite.id}`}
                      className="text-xs text-blue-600 hover:underline block mt-1"
                    >
                      View epigraphs
                    </Link> */}
                  </div>
                </Popup>
              )}
            </>
          )}
        </Map>
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        <p>The heatmap shows the distribution of epigraphic findings across sites by period.</p>
        <div className="items-center mt-2">
          <p>When zoomed in:</p>
          <p>
            <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-1"></span> 
            Green markers indicate sites with precise coordinates
          </p>
          <p>
            <span className="inline-block w-3 h-3 rounded-full bg-orange-500 mr-1"></span>
            Orange markers indicate sites with approximate coordinates
          </p>
        </div>
      </div>

      <div className="mt-8 border-t pt-6">
        <LanguagePeriodMap />
      </div>
    </div>
  )
}

export default Maps
