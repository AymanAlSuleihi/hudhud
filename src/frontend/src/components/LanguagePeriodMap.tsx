import React, { useEffect, useState, useRef } from "react"
import {
  Map,
  Source,
  Layer,
  NavigationControl,
  ScaleControl,
  FullscreenControl,
  MapRef,
  Popup
} from "react-map-gl/maplibre"
import bbox from "@turf/bbox"
import "maplibre-gl/dist/maplibre-gl.css"
import { AnalyticsService } from "../client"
import { MySlider } from "./Slider"

interface Language {
  level_1: string
  level_2: string
  level_3: string
  display: string
}

interface FeatureProperties {
  count: number
  name?: string
  language?: string
  period?: string
  coordinates_accuracy?: string
}

interface GeoFeature {
  type: string
  properties: FeatureProperties
  geometry?: {
    type: string
    coordinates: number[]
  }
}

interface FeatureCollection {
  type: "FeatureCollection"
  features: GeoFeature[]
}

const LanguagePeriodMap: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [selectedPeriodIdx, setSelectedPeriodIdx] = useState(0)
  const [selectedLanguageIdx, setSelectedLanguageIdx] = useState(0)
  const [mapData, setMapData] = useState<any>(null)
  const [hoveredSite, setHoveredSite] = useState<any>(null)
  const [periods, setPeriods] = useState<string[]>([])
  const [languages, setLanguages] = useState<Language[]>([])
  const [mapCache, setMapCache] = useState<any>(null)
  const [epigraphCount, setEpigraphCount] = useState<number>(0)
  const [languageColors, setLanguageColors] = useState<{[key: string]: string}>({})
  const mapRef = useRef<MapRef>(null)

  // Track zoom level changes
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    
    const onZoomEnd = () => {
      console.log("zoom level:", map.getZoom())
    }
    
    map.on("zoomend", onZoomEnd)
    
    return () => {
      map.off("zoomend", onZoomEnd)
    }
  }, [mapRef])

  // useEffect(() => {
  //   console.log("Hovered Site:", hoveredSite)
  // }, [hoveredSite])

  useEffect(() => {
    const fetchMapData = async () => {
      try {
        setLoading(true)

        const response = await AnalyticsService.analyticsGetLanguagePeriodMap()

        if (!response) {
          await AnalyticsService.analyticsLanguagePeriodMap()
          setTimeout(async () => {
            const newData = await AnalyticsService.analyticsGetLanguagePeriodMap()
            if (newData) {
              setMapCache(newData)
              setPeriods(newData.period_list || [])
              setLanguages(newData.language_list || [])
              updateMapData(newData, 0, 0)
            }
          }, 2000)
        } else {
          setMapCache(response)
          setPeriods(response.period_list || [])
          setLanguages(response.language_list || [])
          updateMapData(response, 0, 0)
        }
      } catch (error) {
        console.error("Error fetching language map data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchMapData()
  }, [])

  useEffect(() => {
    if (!mapCache) return
    updateMapData(mapCache, selectedPeriodIdx, selectedLanguageIdx)
  }, [selectedPeriodIdx, selectedLanguageIdx, mapCache])

  useEffect(() => {
    if (!languages || languages.length === 0) return

    const colorPalette = [
      "#e6194B", "#3cb44b", "#ffe119", "#4363d8", "#f58231", "#911eb4",
      "#42d4f4", "#f032e6", "#bfef45", "#fabed4", "#469990", "#dcbeff",
      "#9A6324", "#fffac8", "#800000", "#aaffc3", "#808000", "#ffd8b1",
      "#000075", "#a9a9a9", "#ffffff", "#000000"
    ]

    const uniqueLevel2 = Array.from(new Set(languages.map(lang => lang.level_2)))

    const level2ColorMap: {[key: string]: string} = {}
    uniqueLevel2.forEach((lang2, index) => {
      level2ColorMap[lang2] = colorPalette[index % colorPalette.length]
    })

    const colorMap: {[key: string]: string} = {}
    languages.forEach(lang => {
      colorMap[lang.level_3] = lang.level_2 ? level2ColorMap[lang.level_2] : "#9C27B0"
    })

    setLanguageColors(colorMap)
  }, [languages])

  // Helper function to update map data based on selections
  const updateMapData = (cache: any, periodIdx: number, languageIdx: number) => {
    if (!cache) return
    
    const selectedPeriod = periodIdx === 0 ? "All" : cache.period_list[periodIdx - 1]
    const allLanguages = cache.language_list || []
    console.log("All Languages:", allLanguages)
    
    // Define interfaces for the GeoJSON structures
    interface Feature {
      type: string
      properties?: {
      count: number
      name?: string
      language?: string
      period?: string
      coordinates_accuracy?: string
      }
      geometry?: {
      type: string
      coordinates: number[]
      }
    }

    interface FeatureCollection {
      type: string
      features: Feature[]
    }

    let data: FeatureCollection
    let totalCount = 0
    
    if (languageIdx === 0) {
      // Show all languages for the selected period
      if (selectedPeriod === "All") {
        // Combine all language data for all periods
        data = {
          type: "FeatureCollection",
          features: []
        }
        
        // Collect all features from all languages
        Object.values(cache.all_periods).forEach((langData: any) => {
          if (langData && langData.features) {
            data.features = [...data.features, ...langData.features]
            totalCount += langData.features.reduce((sum: number, feature: any) => 
              sum + (feature.properties?.count || 0), 0)
          }
        })
      } else {
        // Combine all language data for specific period
        data = {
          type: "FeatureCollection",
          features: []
        }
        
        // Collect all features from all languages for this period
        Object.values(cache.periods[selectedPeriod]).forEach((langData: any) => {
          if (langData && langData.features) {
            data.features = [...data.features, ...langData.features]
            totalCount += langData.features.reduce((sum: number, feature: any) => 
              sum + (feature.properties?.count || 0), 0)
          }
        })
      }
    } else {
      // Show specific language
      const selectedLanguage = allLanguages[languageIdx - 1]
      
      if (selectedPeriod === "All") {
        // Get data for specific language, all periods
        data = cache.all_periods[selectedLanguage?.level_3] || { type: "FeatureCollection", features: [] }
      } else {
        // Get data for specific language and period
        data = cache.periods[selectedPeriod][selectedLanguage?.level_3] || { type: "FeatureCollection", features: [] }
      }
      
      if (data && data.features) {
        totalCount = data.features.reduce((sum: number, feature: any) => 
          sum + (feature.properties?.count || 0), 0)
      }
    }
    
    setMapData(data)
    setEpigraphCount(totalCount)
  }
  
  // Fit map bounds when map data changes
  useEffect(() => {
    if (!mapRef.current || !mapData || !mapData.features || mapData.features.length === 0) return
    
    try {
      // Get the bounding box of all points
      const bboxResult = bbox(mapData)

      const bounds: [number, number, number, number] = [
        bboxResult[0], bboxResult[1], bboxResult[2], bboxResult[3]
      ]

      // Adjust the map to fit all points
      mapRef.current.fitBounds(bounds, {
        padding: 50,
        duration: 1000,
        maxZoom: 8 // Lower max zoom to prevent excessive zooming
      })
    } catch (error) {
      console.error("Error fitting bounds:", error)
    }
  }, [mapData])

  // Get currently selected period info for display
  const getSelectedPeriodInfo = () => {
    if (selectedPeriodIdx === 0) {
      return "All Periods"
    } else if (periods[selectedPeriodIdx - 1]) {
      return periods[selectedPeriodIdx - 1]
    }
    return "Unknown"
  }
  // console.log("Selected Language:", selectedLanguageIdx)
  // console.log("Languages:", languages)
  // console.log("Selected Period:", selectedPeriodIdx)
  // console.log("Periods:", periods)

  return (
    <div className="w-full">
      <h2 className="text-xl font-bold mb-4">Epigraphs by Language and Period</h2>
      
      {/* Period slider */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <p>Select Period:</p>
          <div className="text-sm font-medium bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
            {getSelectedPeriodInfo()}
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
                              md:visible ${index % 2 !== 0 ? "hidden md:block" : ""}`}
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
      
      <div className="flex flex-col md:flex-row gap-4">
        {/* Language selector for both mobile and desktop */}
        <div className="md:w-64 md:order-1 order-2 flex flex-col">
          {/* Language selector - consistent across all devices */}
          <div className="flex h-[500px] flex-col justify-between">
            {/* The count information positioned at top */}
            <div className="text-sm text-center mb-4">
              <div className="flex items-center justify-between mb-1">
                <div className="font-medium">Selected:</div>
                <div className="font-semibold">
                  {epigraphCount} epigraph{epigraphCount !== 1 ? "s" : ""}
                </div>
              </div>
            </div>
            
            {/* The vertical slider with language info text rotated */}
            <div className="relative flex-grow">
              <div className="absolute right-0 bottom-0 h-full w-full flex flex-col-reverse justify-between pointer-events-none">
                {/* Replace React-Aria ListBox with standard divs for language selection */}
                <div className="w-full h-full overflow-y-auto text-xs pointer-events-auto pr-1">
                  {/* "All Languages" option */}
                  <div 
                    className={`flex items-center py-1 px-2 cursor-pointer hover:bg-gray-100 rounded mb-2 ${selectedLanguageIdx === 0 ? "bg-blue-100" : ""}`}
                    onClick={() => setSelectedLanguageIdx(0)}
                  >
                    <div className="text-gray-600 whitespace-nowrap">All Languages</div>
                  </div>
                  
                  {/* Pre-process and render language groups */}
                  {languages.length > 0 && (() => {
                    // Create language sections
                    const sections: JSX.Element[] = []
                    
                    // Group languages by level_1
                    const level1Map: Record<string, Language[]> = {}
                    languages.forEach(lang => {
                      const level1 = lang.level_1 || "Uncategorized"
                      if (!level1Map[level1]) {
                        level1Map[level1] = []
                      }
                      level1Map[level1].push(lang)
                    })
                    
                    // Sort level_1 keys and create sections
                    Object.keys(level1Map)
                      .sort()
                      .forEach(level1 => {
                        // Group by level_2 within this level_1
                        const level2Map: Record<string, Language[]> = {}
                        level1Map[level1].forEach(lang => {
                          const level2 = lang.level_2 || "Other"
                          if (!level2Map[level2]) {
                            level2Map[level2] = []
                          }
                          level2Map[level2].push(lang)
                        })
                        
                        // Use consistent colors for level_1 sections
                        const level1BorderColor = "#64748b" // Consistent slate-500 color for all level 1 borders
                        const level1HeaderColor = "#f1f5f9" // Consistent slate-100 color for all level 1 headers
                        
                        // Create a section for this level_1
                        const section = (
                          <div 
                            key={`section-${level1}`} 
                            className="mb-4 rounded overflow-hidden border"
                            style={{ 
                              borderColor: level1BorderColor,
                              backgroundColor: "white"
                            }}
                          >
                            {/* Level 1 header */}
                            <div 
                              className="font-medium text-gray-700 px-2 py-1"
                              style={{ backgroundColor: level1HeaderColor }}
                            >
                              {level1}
                            </div>
                            
                            {/* Container for level 2 groups */}
                            <div className="p-1 space-y-2">
                              {/* Level 2 groups */}
                              {Object.keys(level2Map)
                                .sort()
                                .map(level2 => {
                                  // Find color for level_2 header
                                  const level2FirstLang = level2Map[level2][0]
                                  const level2Color = level2FirstLang && languageColors[level2FirstLang.level_3] 
                                    ? `${languageColors[level2FirstLang.level_3]}15` // Light background for level 2 section
                                    : "#fafbfc"
                                  
                                  const level2HeaderColor = level2FirstLang && languageColors[level2FirstLang.level_3] 
                                    ? `${languageColors[level2FirstLang.level_3]}40` // Stronger color for the header
                                    : "#f9fafb"
                                  
                                  return (
                                    <div 
                                      key={`group-${level1}-${level2}`}
                                      className="rounded overflow-hidden"
                                      style={{ backgroundColor: level2Color }}
                                    >
                                      {/* Level 2 header */}
                                      <div 
                                        className="font-medium text-gray-600 px-2 py-0.5 text-xs"
                                        style={{ backgroundColor: level2HeaderColor }}
                                      >
                                        {level2}
                                      </div>
                                      
                                      <div className="px-1 py-1">
                                        {/* Level 3 languages */}
                                        {level2Map[level2].map(lang => {
                                          const langIndex = languages.findIndex(l => l.level_3 === lang.level_3) + 1
                                          
                                          return (
                                            <div 
                                              key={`lang-${lang.level_3}`}
                                              className={`flex items-center py-1 px-2 cursor-pointer hover:bg-white hover:bg-opacity-70 rounded ${selectedLanguageIdx === langIndex ? "bg-blue-100" : ""}`}
                                              onClick={() => setSelectedLanguageIdx(langIndex)}
                                            >
                                              <div 
                                                className="text-gray-700 truncate"
                                                title={`${lang.level_3} (${lang.level_2} > ${lang.level_1})`}
                                              >
                                                {lang.level_3}
                                              </div>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )
                                })}
                            </div>
                          </div>
                        )
                        
                        sections.push(section)
                      })
                    
                    return sections
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Map */}
        <div className="h-[500px] md:flex-grow rounded-lg overflow-hidden shadow-lg border border-gray-300 md:order-2 order-1">
          {loading && (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
            </div>
          )}
          
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
            interactiveLayerIds={
              Object.entries(
                mapData?.features.reduce((groups: {[key: string]: null}, feature: GeoFeature) => {
                  const langObj = languages.find(l => l.level_3 === feature.properties?.language)
                  const level2 = langObj?.level_2 || "Unknown"
                  if (!groups[level2]) groups[level2] = null
                  return groups
                }, {}) || {}
              ).map(([level2]) => `circle-${level2}`)
            }
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
            
            {mapData && (
              <>
                <Source type="geojson" data={mapData}>
                  {/* Use the group-based heatmap approach for all cases */}
                  {(
                    // Group features by level_2 language for more consolidated visualization
                    (Object.entries(
                      // Group data by level_2 language
                      mapData.features.reduce((groups: {[key: string]: FeatureCollection}, feature: GeoFeature) => {
                        // Find the language object for this feature
                        const langObj = languages.find(l => l.level_3 === feature.properties?.language)
                        const level2 = langObj?.level_2 || "Unknown"
                        
                        if (!groups[level2]) {
                          groups[level2] = {
                            type: "FeatureCollection",
                            features: []
                          }
                        }
                        groups[level2].features.push(feature)
                        return groups
                      }, {})
                    ) as [string, FeatureCollection][]).map(([level2, data]) => {
                      // Find the first language with this level_2 to get its color
                      const language = languages.find(l => l.level_2 === level2)
                      if (!language) return null
                      
                      const color = languageColors[language.level_3] || "#9C27B0"
                      
                      // Only create a layer if there's data for this language group
                      if (data.features.length === 0) return null
                      
                      return (
                        <React.Fragment key={level2}>
                          <Source id={`source-${level2}`} type="geojson" data={data as any}>
                            <Layer
                              id={`heatmap-${level2}`}
                              type="heatmap"
                              paint={{
                                "heatmap-weight": [
                                  "interpolate",
                                  ["linear"],
                                  ["get", "count"],
                                  1, 0.3,
                                  5, 0.4,
                                  10, 0.5,
                                  20, 0.6,
                                  50, 0.7,
                                  100, 1
                                ],
                                "heatmap-intensity": 1.6,
                                "heatmap-color": [
                                  "interpolate",
                                  ["linear"],
                                  ["heatmap-density"],
                                  0, "rgba(0,0,0,0)",
                                  0.1, `rgba(${parseInt(color.slice(1,3),16)},${parseInt(color.slice(3,5),16)},${parseInt(color.slice(5,7),16)},0.4)`, // Lower starting opacity
                                  0.3, `rgba(${parseInt(color.slice(1,3),16)},${parseInt(color.slice(3,5),16)},${parseInt(color.slice(5,7),16)},0.5)`,
                                  0.5, `rgba(${parseInt(color.slice(1,3),16)},${parseInt(color.slice(3,5),16)},${parseInt(color.slice(5,7),16)},0.7)`, // Added middle step
                                  0.7, `rgba(${parseInt(color.slice(1,3),16)},${parseInt(color.slice(3,5),16)},${parseInt(color.slice(5,7),16)},0.85)`,
                                  1.0, `rgba(${parseInt(color.slice(1,3),16)},${parseInt(color.slice(3,5),16)},${parseInt(color.slice(5,7),16)},1.0)`
                                ],
                                "heatmap-radius": [
                                  "interpolate",
                                  // ["exponential", 1.2],
                                  ["linear"],
                                  ["zoom"],
                                  0, 2,    // Reduced from 25
                                  5, 15,   // Medium zoom level
                                  10, 25    // Reduced from 35
                                ],
                                "heatmap-opacity": 0.9
                              }}
                            />
                            <Layer
                              id={`circle-${level2}`}
                              type="circle"
                              paint={{
                                "circle-radius": [
                                  "interpolate",
                                  ["linear"],
                                  ["zoom"],
                                  7, [
                                    "interpolate",
                                    ["linear"],
                                    ["get", "count"],
                                    1, 6,
                                    5, 8,
                                    10, 10,
                                    20, 12,
                                    50, 14,
                                    100, 20
                                  ],
                                  16, [
                                    "interpolate",
                                    ["linear"],
                                    ["get", "count"],
                                    1, 3,
                                    5, 4,
                                    10, 5,
                                    20, 6,
                                    50, 7,
                                    100, 10
                                  ],
                                ],
                                "circle-color": color,
                                "circle-opacity": [
                                  "interpolate",
                                  ["linear"],
                                  ["zoom"],
                                  7, 0,
                                  9, 0.8
                                ],
                                "circle-stroke-color": "#ffffff",
                                "circle-stroke-width": 0.5,
                                "circle-stroke-opacity": [
                                  "interpolate",
                                  ["linear"],
                                  ["zoom"],
                                  7, 0,
                                  9, 0.7
                                ]
                              }}
                            />
                          </Source>
                        </React.Fragment>
                      )
                    })
                  )}
                </Source>
                
                {hoveredSite && (
                  <Popup
                    longitude={hoveredSite.longitude}
                    latitude={hoveredSite.latitude}
                    anchor="bottom"
                    onClose={() => setHoveredSite(null)}
                    closeButton={false}
                    closeOnClick={false}
                  >
                    <div className="px-2 py-1">
                      <h3 className="font-medium text-sm">{hoveredSite.name}</h3>
                      <p className="text-xs">
                        {hoveredSite.count} epigraph{hoveredSite.count !== 1 ? "s" : ""} in {hoveredSite.language || "unknown language"} 
                      </p>
                      <p className="text-xs">
                        Period: {hoveredSite.period}
                      </p>
                      <p className="text-xs text-gray-500">
                        Coordinates: {hoveredSite.coordinates_accuracy || "Unknown"}
                      </p>
                    </div>
                  </Popup>
                )}
              </>
            )}
          </Map>
        </div>
      </div>

      {/* Add a legend showing language colors */}
      <div className="mt-4 text-sm text-gray-600">
        <p>The map shows the distribution of languages across sites by period.</p>
        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-1">
          {selectedLanguageIdx === 0 && 
            Array.from(new Set(languages.map(lang => lang.level_2)))
              .filter(Boolean)
              .slice(0, 12)
              .map((level2, index) => {
                const lang = languages.find(l => l.level_2 === level2)
                if (!lang) return null

                const uniqueKey = `${level2}-${index}`

                return (
                  <div key={uniqueKey} className="flex items-center">
                    <span 
                      className="inline-block w-3 h-3 rounded-full mr-1" 
                      style={{backgroundColor: languageColors[lang.level_3] || "#9C27B0"}}
                    ></span>
                    <span className="truncate" title={`${level2} > ${lang.level_1}`}>{level2}</span>
                  </div>
                )
              })
          }
          {selectedLanguageIdx > 0 && (
            <div className="flex items-center">
              <span 
                className="inline-block w-3 h-3 rounded-full mr-1" 
                style={{backgroundColor: languageColors[languages[selectedLanguageIdx - 1]?.level_3] || "#9C27B0"}}
              ></span>
              <span>{languages[selectedLanguageIdx - 1]?.level_2 || languages[selectedLanguageIdx - 1]?.level_3}</span>
            </div>
          )}
        </div>
        {/* <div className="mt-2">
          <p>
            <span className="inline-block w-3 h-3 rounded-full bg-purple-800 mr-1"></span> 
            Purple markers indicate precise coordinates
          </p>
          <p>
            <span className="inline-block w-3 h-3 rounded-full bg-purple-400 mr-1"></span>
            Light purple markers indicate approximate coordinates
          </p>
        </div> */}
      </div>
    </div>
  )
}

export default LanguagePeriodMap
