"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import bbox from "@turf/bbox"
import {
  AttributionControl,
  FullscreenControl,
  Layer,
  Map as MapView,
  MapRef,
  NavigationControl,
  Popup,
  ScaleControl,
  Source,
} from "react-map-gl/maplibre"
import { MySlider } from "../components/Slider"

type MapMode = "atlas" | "heatmap" | "language"
type FitPadding = number | { top: number; right: number; bottom: number; left: number }

interface MapCameraState {
  bearing: number
  latitude: number
  longitude: number
  pitch: number
  zoom: number
}

interface LoadableState<T> {
  data: T | null
  error: string | null
  loading: boolean
}

interface SiteCount {
  label: string
  count: number
}

interface SiteMapPoint {
  siteDasiId: number
  uri: string
  modernName: string
  ancientName: string | null
  country: string
  typeOfSite: string
  language: string
  coordinatesAccuracy: string
  coordinates: [number, number]
  kingdoms: string[]
  chronology: string | null
}

interface SiteMapResponse {
  summary: {
    totalSites: number
    mappedSites: number
    countries: number
    siteTypes: number
    coordinateCoveragePercent: number
  }
  filters: {
    countries: string[]
    siteTypes: string[]
    accuracies: string[]
  }
  points: SiteMapPoint[]
  countryCounts: SiteCount[]
  siteTypeCounts: SiteCount[]
  accuracyCounts: SiteCount[]
}

interface EpigraphHeatmapPoint {
  epigraphDasiId: number
  epigraphUri: string
  epigraphTitle: string
  siteDasiId: number
  siteUri: string
  siteName: string
  country: string
  typeOfSite: string
  coordinates: [number, number]
  period: string
}

interface EpigraphHeatmapResponse {
  summary: {
    publishedEpigraphs: number
    mappedEpigraphs: number
    mappedSites: number
    periods: number
  }
  periods: string[]
  points: EpigraphHeatmapPoint[]
}

interface LanguageOption {
  key: string
  label: string
  family: string
  branch: string
  leaf: string
  group: string
  epigraphCount: number
  siteCount: number
}

interface LanguageMapPoint {
  siteDasiId: number
  siteUri: string
  siteName: string
  ancientName: string | null
  country: string
  typeOfSite: string
  coordinatesAccuracy: string
  coordinates: [number, number]
  period: string
  languageKey: string
  languageLabel: string
  languageFamily: string
  languageBranch: string
  languageLeaf: string
  languageGroup: string
  epigraphCount: number
}

interface LanguagePeriodMapResponse {
  summary: {
    publishedEpigraphs: number
    mappedEpigraphs: number
    mappedSites: number
    periods: number
    languages: number
  }
  periods: string[]
  languages: LanguageOption[]
  points: LanguageMapPoint[]
}

interface PointFeatureCollection {
  type: "FeatureCollection"
  features: Array<{
    type: "Feature"
    geometry: {
      type: "Point"
      coordinates: [number, number]
    }
    properties: Record<string, string | number>
  }>
}

interface LineFeatureCollection {
  type: "FeatureCollection"
  features: Array<{
    type: "Feature"
    geometry: {
      type: "LineString"
      coordinates: Array<[number, number]>
    }
    properties: Record<string, string | number>
  }>
}

interface VisibleHeatmapPoint extends EpigraphHeatmapPoint {
  displayCoordinates: [number, number]
  pointKey: string
}

interface VisibleLanguagePoint extends LanguageMapPoint {
  pointKey: string
  color: string
}

interface LanguageBranchGroup {
  branch: string
  color: string
  languages: LanguageOption[]
}

interface LanguageFamilyGroup {
  family: string
  branches: LanguageBranchGroup[]
}

interface LanguageChronology {
  branchOrder: Record<string, number>
  familyOrder: Record<string, number>
  fallbackOrder: number
  languageOrder: Record<string, number>
}

const modeDefinitions: Array<{ description: string; id: MapMode; shortTitle: string; title: string }> = [
  {
    shortTitle: "Sites",
    id: "atlas",
    title: "Sites",
    description: "Browse the mapped site catalogue with country, type, and coordinate-accuracy filters.",
  },
  {
    shortTitle: "Epigraphs",
    id: "heatmap",
    title: "Epigraphs",
    description: "Browse mapped published epigraphs by period across the corpus.",
  },
  {
    shortTitle: "Languages",
    id: "language",
    title: "Languages",
    description: "Compare where language groups cluster through time on the mapped site network.",
  },
]

const languagePalette = [
  "#0f766e",
  "#b45309",
  "#1d4ed8",
  "#9333ea",
  "#be123c",
  "#15803d",
  "#475569",
  "#c2410c",
  "#7c2d12",
  "#0369a1",
  "#4f46e5",
  "#a21caf",
]

const statCardClass = "rounded-md border border-gray-200 bg-white px-3 py-2.5"
const sideCardClass = "rounded-md border border-gray-200 bg-white p-3"
const mapShellClass = "relative overflow-hidden rounded-md border border-gray-200 bg-white"
const panelHeightClass = "h-[460px] sm:h-[540px]"
const sectionClass = "space-y-4"
const sectionLeadClass = "text-[13px] leading-5 text-gray-600"
const mapBadgeBaseClass = "pointer-events-auto inline-flex max-w-max self-start items-center whitespace-nowrap rounded-full border bg-white/96 px-2 py-0.5 text-[10px] font-medium shadow-sm backdrop-blur-sm"
const popupDismissDelayMs = 180
const epigraphJitterBaseDistanceMeters = 60
const epigraphJitterMaxDistanceMeters = 420
const goldenAngleRadians = Math.PI * (3 - Math.sqrt(5))

function getMapToneClass(tone: "amber" | "neutral" | "sky"): string {
  return tone === "amber" ? "border-amber-200 text-amber-950" : tone === "sky" ? "border-sky-200 text-sky-950" : "border-gray-300 text-gray-800"
}

function MapModeSwitcher({
  onSelectMode,
  selectedMode,
}: {
  onSelectMode: (nextMode: MapMode) => void
  selectedMode: MapMode
}) {
  return (
    <div className="pointer-events-auto w-full rounded-md border border-white/70 bg-white/88 p-1 shadow-md shadow-slate-900/10 backdrop-blur-sm">
      <div className="grid grid-cols-3 gap-1">
        {modeDefinitions.map((mode) => {
          const isSelected = selectedMode === mode.id

          return (
            <button
              className={`rounded-md px-2 py-1.5 text-[11px] font-semibold transition sm:text-[12px] ${
                isSelected ? "bg-slate-900 text-white" : "text-gray-700 hover:bg-gray-100"
              }`}
              key={mode.id}
              onClick={() => onSelectMode(mode.id)}
              title={mode.description}
              type="button"
            >
              {mode.shortTitle}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function MapSummaryBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode
  tone?: "amber" | "neutral" | "sky"
}) {
  return <div className={`${mapBadgeBaseClass} ${getMapToneClass(tone)}`}>{children}</div>
}

async function fetchAnalyticsData<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to load analytics data (${response.status})`)
  }

  return (await response.json()) as T
}

function fitMapToGeoJson(map: MapRef | null, geoJson: PointFeatureCollection, maxZoom = 7, padding: FitPadding = 56): void {
  if (!map || geoJson.features.length === 0) {
    return
  }

  try {
    const [minX, minY, maxX, maxY] = bbox(geoJson as never)
    map.fitBounds(
      [
        [minX, minY],
        [maxX, maxY],
      ],
      {
        padding,
        duration: 800,
        maxZoom,
      },
    )
  } catch {
    // Ignore invalid bounds when the feature set is degenerate.
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const normalizedHex = hex.replace("#", "")
  if (normalizedHex.length !== 6) {
    return `rgba(15, 23, 42, ${alpha})`
  }

  const red = Number.parseInt(normalizedHex.slice(0, 2), 16)
  const green = Number.parseInt(normalizedHex.slice(2, 4), 16)
  const blue = Number.parseInt(normalizedHex.slice(4, 6), 16)

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function offsetCoordinatesByMeters(
  coordinates: [number, number],
  distanceMeters: number,
  angleRadians: number,
): [number, number] {
  const [longitude, latitude] = coordinates
  const metersPerDegreeLatitude = 111_320
  const longitudeScale = Math.max(
    Math.cos((latitude * Math.PI) / 180) * metersPerDegreeLatitude,
    1e-6,
  )

  return [
    longitude + (distanceMeters * Math.cos(angleRadians)) / longitudeScale,
    latitude + (distanceMeters * Math.sin(angleRadians)) / metersPerDegreeLatitude,
  ]
}

function getJitteredEpigraphCoordinates(
  coordinates: [number, number],
  index: number,
  total: number,
): [number, number] {
  if (total <= 1) {
    return coordinates
  }

  const jitterIndex = index + 1
  const distanceMeters = Math.min(
    epigraphJitterBaseDistanceMeters * Math.sqrt(jitterIndex),
    epigraphJitterMaxDistanceMeters,
  )

  return offsetCoordinatesByMeters(
    coordinates,
    distanceMeters,
    jitterIndex * goldenAngleRadians,
  )
}

function useMinWidth(minWidth: number): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const mediaQuery = window.matchMedia(`(min-width: ${minWidth}px)`)
    const updateMatch = () => setMatches(mediaQuery.matches)
    updateMatch()

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateMatch)
      return () => mediaQuery.removeEventListener("change", updateMatch)
    }

    mediaQuery.addListener(updateMatch)
    return () => mediaQuery.removeListener(updateMatch)
  }, [minWidth])

  return matches
}

function useInteractivePopupHover<T>() {
  const [hoveredItem, setHoveredItemState] = useState<T | null>(null)
  const dismissTimeoutRef = useRef<number | null>(null)

  const cancelPendingDismiss = () => {
    if (dismissTimeoutRef.current === null) {
      return
    }

    window.clearTimeout(dismissTimeoutRef.current)
    dismissTimeoutRef.current = null
  }

  const scheduleDismiss = () => {
    cancelPendingDismiss()
    dismissTimeoutRef.current = window.setTimeout(() => {
      dismissTimeoutRef.current = null
      setHoveredItemState(null)
    }, popupDismissDelayMs)
  }

  const setHoveredItem = (nextItem: T | null) => {
    if (!nextItem) {
      scheduleDismiss()
      return
    }

    cancelPendingDismiss()
    setHoveredItemState(nextItem)
  }

  useEffect(() => {
    return () => {
      if (dismissTimeoutRef.current !== null) {
        window.clearTimeout(dismissTimeoutRef.current)
      }
    }
  }, [])

  return {
    hoveredItem,
    setHoveredItem,
    cancelPendingDismiss,
    scheduleDismiss,
  }
}

function PeriodRange({
  embedded = false,
  label,
  periods,
  summary,
  summaryTone = "neutral",
  value,
  onChange,
}: {
  embedded?: boolean
  label: string
  periods: string[]
  summary?: React.ReactNode
  summaryTone?: "amber" | "neutral" | "sky"
  value: number
  onChange: (nextValue: number) => void
}) {
  const labels = ["All", ...periods]
  const selectedLabel = labels[value] ?? "All"
  const shellClass = embedded
    ? "rounded-md border border-white/70 bg-white/90 px-3.5 py-2 shadow-lg shadow-slate-900/10 backdrop-blur-sm"
    : statCardClass
  const tickClassName = embedded ? "h-1.5 w-px bg-slate-400" : "h-1.5 w-px bg-stone-400"
  const labelRowClassName = embedded ? "relative mt-2.5 min-h-6 text-[10px] font-medium text-slate-600" : "relative mt-2.5 min-h-6 text-[10px] font-medium text-stone-600"
  const activeLabelClassName = embedded ? "text-slate-950" : "text-stone-900"

  const handleSliderChange = (nextValue: number) => {
    onChange(Math.round(nextValue))
  }

  return (
    <div className={shellClass}>
      <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className={embedded ? "text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500" : "text-[13px] font-semibold text-gray-900"}>{label}</div>
          {!embedded && <div className="text-[11px] leading-5 text-gray-500">Scrub through the sequence to compare how the map shifts over time.</div>}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <div className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${embedded ? "border border-slate-900 bg-slate-900 text-white" : "bg-slate-100 text-slate-900"}`}>
            {selectedLabel}
          </div>
          {summary && (
            <div className={`${mapBadgeBaseClass} ${getMapToneClass(summaryTone)}`}>
              {summary}
            </div>
          )}
        </div>
      </div>

      <div className="mt-2.5 px-2 sm:px-3">
        <MySlider
          label={label}
          maxValue={Math.max(labels.length - 1, 0)}
          minValue={0}
          onChange={handleSliderChange}
          step={1}
          value={value}
        />

        <div className={labelRowClassName}>
          {labels.map((period, index) => {
            const positionPercentage = labels.length === 1 ? 50 : (index / (labels.length - 1)) * 100
            const alignmentClassName =
              labels.length === 1
                ? "-translate-x-1/2 items-center text-center"
                : index === 0
                  ? "items-start text-left"
                  : "-translate-x-1/2 items-center text-center"
            const periodValueTextClassName = index === 0 ? "-translate-x-[2px] break-words" : "break-words"

            return (
              <div
                className={`absolute top-0 flex min-w-0 flex-col gap-1 leading-tight ${alignmentClassName} ${index === value ? activeLabelClassName : ""}`}
                key={`${period}-${index}`}
                style={{
                  left: `${positionPercentage}%`,
                  width: `${labels.length === 1 ? 100 : 100 / labels.length}%`,
                }}
                title={period}
              >
                <span aria-hidden className={tickClassName} />
                <span className={periodValueTextClassName}>{period}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function LanguageSelector({
  embedded = false,
  chronology,
  groupColors,
  languages,
  onSelect,
  selectedLanguageKey,
}: {
  embedded?: boolean
  chronology: LanguageChronology
  groupColors: Record<string, string>
  languages: LanguageOption[]
  onSelect: (languageKey: string) => void
  selectedLanguageKey: string
}) {
  const families: LanguageFamilyGroup[] = useMemo(() => {
    const groupedFamilies = new Map<string, Map<string, LanguageOption[]>>()
    const originalLanguageOrder = new Map(languages.map((language, index) => [language.key, index]))

    for (const language of languages) {
      const family = language.family || "Other"
      const branch = language.branch || "Other"

      if (!groupedFamilies.has(family)) {
        groupedFamilies.set(family, new Map<string, LanguageOption[]>())
      }

      const familyBranches = groupedFamilies.get(family)
      if (!familyBranches) {
        continue
      }

      if (!familyBranches.has(branch)) {
        familyBranches.set(branch, [])
      }

      familyBranches.get(branch)?.push(language)
    }

    return [...groupedFamilies.entries()]
      .sort(
        (left, right) =>
          (chronology.familyOrder[left[0]] ?? chronology.fallbackOrder) -
            (chronology.familyOrder[right[0]] ?? chronology.fallbackOrder) ||
          left[0].localeCompare(right[0]),
      )
      .map(([family, branches]) => ({
        family,
        branches: [...branches.entries()]
          .sort(
            (left, right) =>
              (chronology.branchOrder[`${family}::${left[0]}`] ?? chronology.fallbackOrder) -
                (chronology.branchOrder[`${family}::${right[0]}`] ?? chronology.fallbackOrder) ||
              left[0].localeCompare(right[0]),
          )
          .map(([branch, branchLanguages]) => ({
            branch,
            color: groupColors[branchLanguages[0]?.group] ?? languagePalette[0],
            languages: [...branchLanguages].sort(
              (left, right) =>
                (chronology.languageOrder[left.key] ?? chronology.fallbackOrder) -
                  (chronology.languageOrder[right.key] ?? chronology.fallbackOrder) ||
                (originalLanguageOrder.get(left.key) ?? 0) - (originalLanguageOrder.get(right.key) ?? 0) ||
                left.label.localeCompare(right.label),
            ),
          })),
      }))
  }, [chronology, groupColors, languages])

  const containerClass = embedded
    ? "flex h-full min-h-0 flex-col rounded-md border border-white/75 bg-white/90 p-3 shadow-xl shadow-slate-900/10 backdrop-blur-sm"
    : `${sideCardClass} flex h-full min-h-0 flex-col`

  return (
    <div className={containerClass}>
      <div className={embedded ? "mb-3 border-b border-slate-200/80 pb-2.5" : "mb-1"}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className={embedded ? "text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500" : "text-[13px] font-semibold text-gray-900"}>Languages</div>
            {/* {embedded ? (
              <div className="mt-1 text-[12px] leading-5 text-slate-600">Focus on one language or compare families and branches across the map.</div>
            ) : null} */}
          </div>
          {embedded ? (
            <div className="rounded-full border border-slate-200 bg-white/90 px-2 py-0.5 text-[11px] font-medium text-slate-700">
              {languages.length.toLocaleString()}
            </div>
          ) : null}
        </div>
      </div>
      {!embedded && <div className="mb-2 text-[11px] leading-5 text-gray-500">Browse the field or focus on a single language within its family and branch.</div>}

      <button
        className={`mb-3 flex w-full items-center justify-between rounded-md border px-3 py-2.5 text-left transition ${
          selectedLanguageKey === "All"
            ? embedded
              ? "border-slate-900 bg-slate-900 text-white shadow-sm"
              : "border-gray-900 bg-white text-gray-900"
            : embedded
              ? "border-slate-200 bg-white/85 text-slate-900 hover:border-slate-300 hover:bg-white"
              : "border-gray-200 bg-white text-gray-900 hover:border-gray-300 hover:bg-gray-50"
        }`}
        onClick={() => onSelect("All")}
        type="button"
      >
        <span className="text-[13px] font-medium">All languages</span>
        <span className={`text-xs ${selectedLanguageKey === "All" ? (embedded ? "text-white/85" : "text-gray-700") : embedded ? "text-slate-500" : "text-gray-500"}`}>
          {languages.length.toLocaleString()}
        </span>
      </button>

      <div className={`min-h-0 flex-1 overflow-y-auto pr-0.5 ${embedded ? "space-y-3" : "space-y-2.5"}`}>
        {families.map((family: LanguageFamilyGroup) => (
          <div className={`overflow-hidden ${embedded ? "rounded-md border border-slate-200/80 bg-white/78 shadow-sm shadow-slate-900/5" : "rounded-md border border-gray-200 bg-white"}`} key={family.family}>
            <div className={`${embedded ? "border-b border-slate-200/80 bg-slate-50/75" : "bg-gray-50 border-b border-gray-100"} px-2.5 py-1.5 text-[13px] font-semibold text-slate-800`}>{family.family}</div>
            <div className={embedded ? "space-y-2 p-2" : "space-y-1.5 p-1.5"}>
              {family.branches.map((branch: LanguageBranchGroup) => {
                const branchLabel = branch.branch === "Unknown" ? branch.languages[0]?.group || family.family : branch.branch

                return (
                  <div
                    className={embedded ? "overflow-hidden rounded-md border border-white/70 shadow-sm shadow-slate-900/5" : "overflow-hidden rounded-md"}
                    key={`${family.family}-${branch.branch}`}
                    style={{ backgroundColor: hexToRgba(branch.color, embedded ? 0.1 : 0.08) }}
                  >
                    <div
                      className={`flex items-center gap-2 px-2.5 ${embedded ? "py-2 text-[10px] tracking-[0.14em]" : "py-1.5 text-[10px] tracking-wide"} font-semibold uppercase text-slate-800`}
                      style={{ backgroundColor: hexToRgba(branch.color, embedded ? 0.16 : 0.2) }}
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: branch.color }} />
                      <span>{branchLabel}</span>
                    </div>

                    <div className={embedded ? "space-y-1 p-1.5" : "space-y-0.5 p-1"}>
                      {branch.languages.map((language: LanguageOption) => {
                        const isSelected = language.key === selectedLanguageKey

                        return (
                          <button
                            className={`flex w-full items-start justify-between rounded-md border px-2.5 py-1.5 text-left text-[13px] transition ${
                              isSelected
                                ? embedded
                                  ? "border-slate-900 bg-white text-slate-950 shadow-sm"
                                  : "border-gray-900 bg-white text-gray-900"
                                : embedded
                                  ? "border-transparent bg-white/55 text-slate-700 hover:bg-white"
                                  : "border-transparent text-gray-700 hover:bg-white/80"
                            }`}
                            key={language.key}
                            onClick={() => onSelect(language.key)}
                            type="button"
                          >
                            <span className="min-w-0 flex items-center gap-2">
                              <span className="mt-1 h-2.5 w-2.5 flex-none rounded-full" style={{ backgroundColor: branch.color }} />
                              <span className="truncate">{language.label}</span>
                            </span>
                            <span className={`ml-3 flex-none text-xs font-medium ${isSelected ? "text-gray-700" : embedded ? "text-slate-500" : "text-gray-500"}`}>
                              {language.epigraphCount.toLocaleString()}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AtlasFilterControls({
  compact,
  embedded = false,
  stacked = false,
  filters,
  selectedSiteType,
  setSelectedCountry,
  setSelectedSiteType,
}: {
  compact: boolean
  embedded?: boolean
  stacked?: boolean
  filters: SiteMapResponse["filters"]
  selectedSiteType: string
  setSelectedCountry: React.Dispatch<React.SetStateAction<string>>
  setSelectedSiteType: React.Dispatch<React.SetStateAction<string>>
}) {
  return (
    <div className={`grid gap-2.5 ${stacked ? "grid-cols-1" : compact ? "sm:grid-cols-2" : "md:grid-cols-3"}`}>
      <label className={`flex flex-col gap-1 text-[13px] ${embedded ? "text-gray-800" : "text-gray-700"}`}>
        <span>Site type</span>
        <select
          className={`rounded-md border px-2.5 py-1.5 text-[13px] ${embedded ? "border-gray-400 bg-white/92 text-gray-900" : "border-gray-300 bg-white"}`}
          onChange={(event) => setSelectedSiteType(event.target.value)}
          value={selectedSiteType}
        >
          <option value="All">All site types</option>
          {filters.siteTypes.map((siteType) => (
            <option key={siteType} value={siteType}>
              {siteType}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-end">
        <button
          className={`w-full rounded-md border px-2.5 py-1.5 text-[13px] font-medium transition hover:bg-gray-50 ${embedded ? "border-gray-400 bg-white/92 text-gray-900" : "border-gray-300 bg-white text-gray-700"}`}
          onClick={() => {
            setSelectedCountry("All")
            setSelectedSiteType("All")
          }}
          type="button"
        >
          Reset filters
        </button>
      </div>
    </div>
  )
}

function SiteAtlasPanel({
  data,
  isActive,
  onInitialFitComplete,
  onSelectMode,
  onViewStateChange,
  selectedMode,
  shouldInitialFit,
  viewState,
}: {
  data: SiteMapResponse
  isActive: boolean
  onInitialFitComplete: () => void
  onSelectMode: (nextMode: MapMode) => void
  onViewStateChange: (nextViewState: MapCameraState) => void
  selectedMode: MapMode
  shouldInitialFit: boolean
  viewState: MapCameraState
}) {
  const [selectedCountry, setSelectedCountry] = useState("All")
  const [selectedSiteType, setSelectedSiteType] = useState("All")
  const {
    hoveredItem: hoveredSite,
    setHoveredItem: setHoveredSite,
    cancelPendingDismiss: keepHoveredSiteVisible,
    scheduleDismiss: scheduleHoveredSiteDismiss,
  } = useInteractivePopupHover<SiteMapPoint>()
  const mapRef = useRef<MapRef>(null)
  const controlsInsideMap = useMinWidth(1024)

  const filteredPoints = useMemo(() => {
    return data.points.filter((point) => {
      if (selectedCountry !== "All" && point.country !== selectedCountry) {
        return false
      }
      if (selectedSiteType !== "All" && point.typeOfSite !== selectedSiteType) {
        return false
      }
      return true
    })
  }, [data.points, selectedCountry, selectedSiteType])

  const pointLookup = useMemo(() => {
    return new Map(filteredPoints.map((point) => [`site-${point.siteDasiId}`, point]))
  }, [filteredPoints])

  const geoJson = useMemo<PointFeatureCollection>(() => {
    return {
      type: "FeatureCollection",
      features: filteredPoints.map((point) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: point.coordinates,
        },
        properties: {
          pointKey: `site-${point.siteDasiId}`,
        },
      })),
    }
  }, [filteredPoints])

  useEffect(() => {
    if (!isActive || !shouldInitialFit || !mapRef.current || geoJson.features.length === 0) {
      return
    }

    fitMapToGeoJson(mapRef.current, geoJson, 7, controlsInsideMap ? { top: 88, right: 84, bottom: 248, left: 72 } : { top: 96, right: 84, bottom: 96, left: 56 })
    onInitialFitComplete()
  }, [controlsInsideMap, geoJson, isActive, onInitialFitComplete, shouldInitialFit])

  useEffect(() => {
    if (!mapRef.current || !isActive) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      mapRef.current?.resize()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [controlsInsideMap, isActive])

  return (
    <div aria-hidden={!isActive} className={isActive ? sectionClass : "hidden"}>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <div className={statCardClass}>
          <div className="text-xs uppercase tracking-wide text-gray-500">Mapped sites</div>
          <div className="mt-1 text-xl font-semibold text-gray-900">{data.summary.mappedSites.toLocaleString()}</div>
        </div>
        <div className={statCardClass}>
          <div className="text-xs uppercase tracking-wide text-gray-500">Countries</div>
          <div className="mt-1 text-xl font-semibold text-gray-900">{data.summary.countries.toLocaleString()}</div>
        </div>
        <div className={statCardClass}>
          <div className="text-xs uppercase tracking-wide text-gray-500">Site types</div>
          <div className="mt-1 text-xl font-semibold text-gray-900">{data.summary.siteTypes.toLocaleString()}</div>
        </div>
        <div className={statCardClass}>
          <div className="text-xs uppercase tracking-wide text-gray-500">Coordinate coverage</div>
          <div className="mt-1 text-xl font-semibold text-gray-900">{data.summary.coordinateCoveragePercent}%</div>
        </div>
      </div>

      {!controlsInsideMap && (
        <AtlasFilterControls
          compact={false}
          filters={data.filters}
          selectedSiteType={selectedSiteType}
          setSelectedCountry={setSelectedCountry}
          setSelectedSiteType={setSelectedSiteType}
        />
      )}

      <div className={`${panelHeightClass} ${mapShellClass}`}>
        <MapView
          bearing={viewState.bearing}
          attributionControl={false}
          latitude={viewState.latitude}
          longitude={viewState.longitude}
          interactiveLayerIds={["site-points"]}
          mapStyle="https://tiles.openfreemap.org/styles/liberty"
          onMove={(event) => onViewStateChange(event.viewState as MapCameraState)}
          onMouseMove={(event) => {
            const pointKey = event.features?.[0]?.properties?.pointKey
            if (typeof pointKey !== "string") {
              scheduleHoveredSiteDismiss()
              return
            }

            setHoveredSite(pointLookup.get(pointKey) ?? null)
          }}
          onMouseOut={scheduleHoveredSiteDismiss}
          pitch={viewState.pitch}
          RTLTextPlugin="https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.3.0/dist/mapbox-gl-rtl-text.js"
          ref={mapRef}
          style={{ width: "100%", height: "100%" }}
          zoom={viewState.zoom}
        >
          <AttributionControl compact position="top-right" />
          <ScaleControl position="top-right" />
          <FullscreenControl position="top-right" />
          <NavigationControl position="top-right" />

          <Source data={geoJson as never} id="site-atlas" type="geojson">
            <Layer
              id="site-points"
              paint={{
                "circle-color": "#0f172a",
                "circle-opacity": 0.88,
                "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 4, 7, 7, 10, 10],
                "circle-stroke-color": "#ffffff",
                "circle-stroke-width": 1.25,
              }}
              type="circle"
            />
          </Source>

          {hoveredSite && (
            <Popup
              anchor="bottom"
              closeButton={false}
              closeOnClick={false}
              latitude={hoveredSite.coordinates[1]}
              longitude={hoveredSite.coordinates[0]}
            >
              <div
                className="max-w-[210px] space-y-1 px-2 py-1 text-[13px]"
                onMouseEnter={keepHoveredSiteVisible}
                onMouseLeave={scheduleHoveredSiteDismiss}
              >
                <div className="font-semibold text-gray-900">{hoveredSite.modernName}</div>
                {hoveredSite.ancientName && hoveredSite.ancientName !== "Unknown" && (
                  <div className="text-gray-600">Ancient name: {hoveredSite.ancientName}</div>
                )}
                <div className="text-gray-600">Country: {hoveredSite.country}</div>
                <div className="text-gray-600">Type: {hoveredSite.typeOfSite}</div>
                <div className="text-gray-600">Language: {hoveredSite.language}</div>
                <div className="text-gray-600">Coordinates: {hoveredSite.coordinatesAccuracy}</div>
                {hoveredSite.kingdoms.length > 0 && <div className="text-gray-600">Kingdoms: {hoveredSite.kingdoms.join(", ")}</div>}
                {hoveredSite.chronology && <div className="text-gray-600">Chronology: {hoveredSite.chronology}</div>}
                <a
                  className="inline-flex pt-1 text-xs font-medium text-blue-700 hover:text-blue-900"
                  href={hoveredSite.uri}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open on DASI
                </a>
              </div>
            </Popup>
          )}

          <div className="pointer-events-none absolute left-3 right-28 top-3 z-10">
            <div className="mx-auto max-w-[22rem]">
              <MapModeSwitcher onSelectMode={onSelectMode} selectedMode={selectedMode} />
            </div>
          </div>

          {controlsInsideMap ? (
            <div className="pointer-events-none absolute bottom-2 left-2 z-10 w-[20.5rem] max-w-[calc(100%-1rem)]">
              <div className="pointer-events-auto rounded-md border border-white/75 bg-white/92 p-3 shadow-xl shadow-slate-900/10 backdrop-blur-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Atlas controls</div>
                  </div>
                  <MapSummaryBadge>
                    {filteredPoints.length.toLocaleString()} / {data.summary.mappedSites.toLocaleString()} sites
                  </MapSummaryBadge>
                </div>
                <div className="mt-3 border-t border-slate-200/80 pt-3">
                  <AtlasFilterControls
                    compact={false}
                    embedded
                    filters={data.filters}
                    selectedSiteType={selectedSiteType}
                    setSelectedCountry={setSelectedCountry}
                    setSelectedSiteType={setSelectedSiteType}
                    stacked
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="pointer-events-none absolute left-3 top-[4.5rem] z-10">
                <MapSummaryBadge>
                  {filteredPoints.length.toLocaleString()} / {data.summary.mappedSites.toLocaleString()} sites
                </MapSummaryBadge>
              </div>
            </>
          )}
        </MapView>
      </div>
    </div>
  )
}

function EpigraphHeatmapPanel({
  data,
  isActive,
  onSelectMode,
  onViewStateChange,
  selectedMode,
  viewState,
}: {
  data: EpigraphHeatmapResponse
  isActive: boolean
  onSelectMode: (nextMode: MapMode) => void
  onViewStateChange: (nextViewState: MapCameraState) => void
  selectedMode: MapMode
  viewState: MapCameraState
}) {
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState(0)
  const {
    hoveredItem: hoveredPoint,
    setHoveredItem: setHoveredPoint,
    cancelPendingDismiss: keepHoveredPointVisible,
    scheduleDismiss: scheduleHoveredPointDismiss,
  } = useInteractivePopupHover<VisibleHeatmapPoint>()
  const mapRef = useRef<MapRef>(null)
  const controlsInsideMap = useMinWidth(1024)

  const selectedPeriod = selectedPeriodIndex === 0 ? "All" : data.periods[selectedPeriodIndex - 1] ?? "All"

  const visiblePoints = useMemo(() => {
    const siteGroups = new Map<number, EpigraphHeatmapPoint[]>()

    for (const point of data.points) {
      if (selectedPeriod !== "All" && point.period !== selectedPeriod) {
        continue
      }

      const existingPoints = siteGroups.get(point.siteDasiId)
      if (existingPoints) {
        existingPoints.push(point)
        continue
      }

      siteGroups.set(point.siteDasiId, [point])
    }

    const nextVisiblePoints: VisibleHeatmapPoint[] = []

    for (const [siteDasiId, sitePoints] of siteGroups.entries()) {
      const sortedSitePoints = [...sitePoints].sort(
        (left, right) =>
          left.epigraphDasiId - right.epigraphDasiId ||
          left.epigraphTitle.localeCompare(right.epigraphTitle),
      )

      sortedSitePoints.forEach((point, index) => {
        nextVisiblePoints.push({
          ...point,
          displayCoordinates: getJitteredEpigraphCoordinates(
            point.coordinates,
            index,
            sortedSitePoints.length,
          ),
          pointKey: `heatmap-${point.epigraphDasiId}-${siteDasiId}`,
        })
      })
    }

    return nextVisiblePoints.sort(
      (left, right) =>
        left.period.localeCompare(right.period) ||
        left.siteName.localeCompare(right.siteName) ||
        left.epigraphTitle.localeCompare(right.epigraphTitle),
    )
  }, [data.points, selectedPeriod])

  const pointLookup = useMemo(() => {
    return new Map(visiblePoints.map((point) => [point.pointKey, point]))
  }, [visiblePoints])

  const visibleOccurrences = useMemo(() => {
    return visiblePoints.length
  }, [visiblePoints])

  const visibleSiteCount = useMemo(() => {
    return new Set(visiblePoints.map((point) => point.siteDasiId)).size
  }, [visiblePoints])

  const heatmapGeoJson = useMemo<PointFeatureCollection>(() => {
    return {
      type: "FeatureCollection",
      features: visiblePoints.map((point) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: point.coordinates,
        },
        properties: {},
      })),
    }
  }, [visiblePoints])

  const pointGeoJson = useMemo<PointFeatureCollection>(() => {
    return {
      type: "FeatureCollection",
      features: visiblePoints.map((point) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: point.displayCoordinates,
        },
        properties: {
          pointKey: point.pointKey,
        },
      })),
    }
  }, [visiblePoints])

  const connectorLineGeoJson = useMemo<LineFeatureCollection>(() => {
    return {
      type: "FeatureCollection",
      features: visiblePoints.flatMap((point) => {
        if (
          point.displayCoordinates[0] === point.coordinates[0] &&
          point.displayCoordinates[1] === point.coordinates[1]
        ) {
          return []
        }

        return [
          {
            type: "Feature" as const,
            geometry: {
              type: "LineString" as const,
              coordinates: [point.coordinates, point.displayCoordinates],
            },
            properties: {
              pointKey: point.pointKey,
            },
          },
        ]
      }),
    }
  }, [visiblePoints])

  useEffect(() => {
    if (!mapRef.current || !isActive) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      mapRef.current?.resize()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [controlsInsideMap, isActive])

  return (
    <div aria-hidden={!isActive} className={isActive ? sectionClass : "hidden"}>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <div className={statCardClass}>
          <div className="text-xs uppercase tracking-wide text-gray-500">Published epigraphs</div>
          <div className="mt-1 text-xl font-semibold text-gray-900">{data.summary.publishedEpigraphs.toLocaleString()}</div>
        </div>
        <div className={statCardClass}>
          <div className="text-xs uppercase tracking-wide text-gray-500">Mapped epigraphs</div>
          <div className="mt-1 text-xl font-semibold text-gray-900">{data.summary.mappedEpigraphs.toLocaleString()}</div>
        </div>
        <div className={statCardClass}>
          <div className="text-xs uppercase tracking-wide text-gray-500">Periods</div>
          <div className="mt-1 text-xl font-semibold text-gray-900">{data.summary.periods.toLocaleString()}</div>
        </div>
        <div className={statCardClass}>
          <div className="text-xs uppercase tracking-wide text-gray-500">Mapped sites</div>
          <div className="mt-1 text-xl font-semibold text-gray-900">{data.summary.mappedSites.toLocaleString()}</div>
        </div>
      </div>

      {!controlsInsideMap && (
        <PeriodRange
          label="Period"
          onChange={setSelectedPeriodIndex}
          periods={data.periods}
          summary={`${visibleOccurrences.toLocaleString()} epigraphs at ${visibleSiteCount.toLocaleString()} sites`}
          summaryTone="amber"
          value={selectedPeriodIndex}
        />
      )}

      <div className={`${panelHeightClass} ${mapShellClass}`}>
        <MapView
          bearing={viewState.bearing}
          attributionControl={false}
          latitude={viewState.latitude}
          longitude={viewState.longitude}
          interactiveLayerIds={["epigraph-points"]}
          mapStyle="https://tiles.openfreemap.org/styles/liberty"
          onMove={(event) => onViewStateChange(event.viewState as MapCameraState)}
          onMouseMove={(event) => {
            const pointKey = event.features?.[0]?.properties?.pointKey
            if (typeof pointKey !== "string") {
              scheduleHoveredPointDismiss()
              return
            }

            setHoveredPoint(pointLookup.get(pointKey) ?? null)
          }}
          onMouseOut={scheduleHoveredPointDismiss}
          pitch={viewState.pitch}
          RTLTextPlugin="https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.3.0/dist/mapbox-gl-rtl-text.js"
          ref={mapRef}
          style={{ width: "100%", height: "100%" }}
          zoom={viewState.zoom}
        >
          <AttributionControl compact position="top-right" />
          <ScaleControl position="top-right" />
          <FullscreenControl position="top-right" />
          <NavigationControl position="top-right" />

            <Source data={heatmapGeoJson as never} id="epigraph-heatmap-density" type="geojson">
              <Layer
                id="epigraph-heat"
                paint={{
                  "heatmap-color": [
                    "interpolate",
                    ["linear"],
                    ["heatmap-density"],
                    0,
                    "rgba(255,255,255,0)",
                    0.15,
                    "rgba(250,204,21,0.3)",
                    0.35,
                    "rgba(251,146,60,0.6)",
                    0.6,
                    "rgba(249,115,22,0.75)",
                    1,
                    "rgba(190,24,93,0.9)",
                  ],
                  "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.7, 7, 2],
                  "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 6, 0.9, 9, 0.2],
                  "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 14, 8, 36],
                  "heatmap-weight": 1,
                }}
                type="heatmap"
              />
            </Source>

            <Source data={connectorLineGeoJson as never} id="epigraph-heatmap-connectors" type="geojson">
              <Layer
                id="epigraph-point-connectors"
                layout={{
                  "line-cap": "round",
                  "line-join": "round",
                }}
                paint={{
                  "line-color": "#64748b",
                  "line-opacity": ["interpolate", ["linear"], ["zoom"], 5, 0, 8, 0.55],
                  "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.5, 9, 1.1],
                }}
                type="line"
              />
            </Source>

            <Source data={pointGeoJson as never} id="epigraph-heatmap-points" type="geojson">
              <Layer
                id="epigraph-points"
                paint={{
                  "circle-color": "#9f1239",
                  "circle-opacity": ["interpolate", ["linear"], ["zoom"], 6.5, 0, 8, 0.82],
                  "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 3, 9, 6],
                  "circle-stroke-color": "#ffffff",
                  "circle-stroke-width": 1.25,
                  "circle-stroke-opacity": ["interpolate", ["linear"], ["zoom"], 6.5, 0, 8, 0.82],
                }}
                type="circle"
              />
            </Source>

            {hoveredPoint && (
              <Popup
                anchor="bottom"
                closeButton={false}
                closeOnClick={false}
                latitude={hoveredPoint.displayCoordinates[1]}
                longitude={hoveredPoint.displayCoordinates[0]}
              >
                <div
                  className="max-w-[210px] space-y-1 px-2 py-1 text-[13px]"
                  onMouseEnter={keepHoveredPointVisible}
                  onMouseLeave={scheduleHoveredPointDismiss}
                >
                  <div className="font-semibold text-gray-900">{hoveredPoint.epigraphTitle}</div>
                  <div className="text-gray-600">Site: {hoveredPoint.siteName}</div>
                  <div className="text-gray-600">Country: {hoveredPoint.country}</div>
                  <div className="text-gray-600">Type: {hoveredPoint.typeOfSite}</div>
                  <div className="text-gray-600">Period: {hoveredPoint.period}</div>
                  <a
                    className="inline-flex pt-1 text-xs font-medium text-blue-700 hover:text-blue-900"
                    href={hoveredPoint.epigraphUri}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open epigraph on DASI
                  </a>
                </div>
              </Popup>
            )}

            <div className="pointer-events-none absolute left-3 right-28 top-3 z-10">
              <div className="mx-auto max-w-[22rem]">
                <MapModeSwitcher onSelectMode={onSelectMode} selectedMode={selectedMode} />
              </div>
            </div>

            {controlsInsideMap ? (
              <div className="pointer-events-none absolute bottom-2 left-3 right-3 z-10">
                <div className="pointer-events-auto mx-auto w-full max-w-none">
                  <PeriodRange
                    embedded
                    label="Period"
                    onChange={setSelectedPeriodIndex}
                    periods={data.periods}
                    summary={`${visibleOccurrences.toLocaleString()} epigraphs at ${visibleSiteCount.toLocaleString()} sites`}
                    summaryTone="amber"
                    value={selectedPeriodIndex}
                  />
                </div>
              </div>
            ) : null}
        </MapView>
      </div>
    </div>
  )
}

function LanguagePeriodPanel({
  data,
  isActive,
  onSelectMode,
  onViewStateChange,
  selectedMode,
  viewState,
}: {
  data: LanguagePeriodMapResponse
  isActive: boolean
  onSelectMode: (nextMode: MapMode) => void
  onViewStateChange: (nextViewState: MapCameraState) => void
  selectedMode: MapMode
  viewState: MapCameraState
}) {
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState(0)
  const [selectedLanguageKey, setSelectedLanguageKey] = useState("All")
  const {
    hoveredItem: hoveredPoint,
    setHoveredItem: setHoveredPoint,
    cancelPendingDismiss: keepHoveredLanguagePointVisible,
    scheduleDismiss: scheduleHoveredLanguagePointDismiss,
  } = useInteractivePopupHover<VisibleLanguagePoint>()
  const mapRef = useRef<MapRef>(null)
  const controlsInsideMap = useMinWidth(1024)

  const selectedPeriod = selectedPeriodIndex === 0 ? "All" : data.periods[selectedPeriodIndex - 1] ?? "All"
  const selectedPeriodLabel = selectedPeriod === "All" ? "All periods" : selectedPeriod

  const groupColors = useMemo(() => {
    const groups = [...new Set(data.languages.map((language) => language.group))].sort((left, right) => left.localeCompare(right))
    return Object.fromEntries(
      groups.map((group, index) => [group, languagePalette[index % languagePalette.length]]),
    ) as Record<string, string>
  }, [data.languages])

  const periodOrder = useMemo(() => {
    return Object.fromEntries(data.periods.map((period, index) => [period, index])) as Record<string, number>
  }, [data.periods])

  const languageChronology = useMemo<LanguageChronology>(() => {
    const branchOrder: Record<string, number> = {}
    const familyOrder: Record<string, number> = {}
    const fallbackOrder = data.periods.length + 1
    const languageOrder: Record<string, number> = {}

    for (const point of data.points) {
      const family = point.languageFamily || "Other"
      const branch = point.languageBranch || "Other"
      const branchKey = `${family}::${branch}`
      const order = periodOrder[point.period] ?? fallbackOrder

      if (languageOrder[point.languageKey] === undefined || order < languageOrder[point.languageKey]) {
        languageOrder[point.languageKey] = order
      }
      if (branchOrder[branchKey] === undefined || order < branchOrder[branchKey]) {
        branchOrder[branchKey] = order
      }
      if (familyOrder[family] === undefined || order < familyOrder[family]) {
        familyOrder[family] = order
      }
    }

    return { branchOrder, familyOrder, fallbackOrder, languageOrder }
  }, [data.periods.length, data.points, periodOrder])

  const visiblePoints = useMemo(() => {
    const grouped = new Map<string, VisibleLanguagePoint>()

    for (const point of data.points) {
      if (selectedPeriod !== "All" && point.period !== selectedPeriod) {
        continue
      }
      if (selectedLanguageKey !== "All" && point.languageKey !== selectedLanguageKey) {
        continue
      }

      const aggregateKey = selectedLanguageKey === "All" ? `${point.siteDasiId}:${point.languageKey}` : `${point.siteDasiId}`
      const existing = grouped.get(aggregateKey)
      if (existing) {
        existing.epigraphCount += point.epigraphCount
        continue
      }

      grouped.set(aggregateKey, {
        ...point,
        color: groupColors[point.languageGroup] ?? languagePalette[0],
        period: selectedPeriod === "All" ? "All" : point.period,
        pointKey: `language-${aggregateKey}`,
      })
    }

    return [...grouped.values()].sort(
      (left, right) => right.epigraphCount - left.epigraphCount || left.siteName.localeCompare(right.siteName),
    )
  }, [data.points, groupColors, selectedLanguageKey, selectedPeriod])

  const visibleOccurrences = useMemo(() => {
    return visiblePoints.reduce((total, point) => total + point.epigraphCount, 0)
  }, [visiblePoints])

  const pointLookup = useMemo(() => {
    return new Map(visiblePoints.map((point) => [point.pointKey, point]))
  }, [visiblePoints])

  const geoJson = useMemo<PointFeatureCollection>(() => {
    return {
      type: "FeatureCollection",
      features: visiblePoints.map((point) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: point.coordinates,
        },
        properties: {
          color: point.color,
          epigraphCount: point.epigraphCount,
          pointKey: point.pointKey,
        },
      })),
    }
  }, [visiblePoints])

  useEffect(() => {
    if (!mapRef.current || !isActive) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      mapRef.current?.resize()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [controlsInsideMap, isActive, selectedLanguageKey])

  const languageLayoutClass = "grid gap-4"

  return (
    <div aria-hidden={!isActive} className={isActive ? sectionClass : "hidden"}>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <div className={statCardClass}>
          <div className="text-xs uppercase tracking-wide text-gray-500">Published epigraphs</div>
          <div className="mt-1 text-xl font-semibold text-gray-900">{data.summary.publishedEpigraphs.toLocaleString()}</div>
        </div>
        <div className={statCardClass}>
          <div className="text-xs uppercase tracking-wide text-gray-500">Mapped epigraphs</div>
          <div className="mt-1 text-xl font-semibold text-gray-900">{data.summary.mappedEpigraphs.toLocaleString()}</div>
        </div>
        <div className={statCardClass}>
          <div className="text-xs uppercase tracking-wide text-gray-500">Languages</div>
          <div className="mt-1 text-xl font-semibold text-gray-900">{data.summary.languages.toLocaleString()}</div>
        </div>
        <div className={statCardClass}>
          <div className="text-xs uppercase tracking-wide text-gray-500">Mapped sites</div>
          <div className="mt-1 text-xl font-semibold text-gray-900">{data.summary.mappedSites.toLocaleString()}</div>
        </div>
      </div>

      {!controlsInsideMap && (
        <PeriodRange
          label="Period"
          onChange={setSelectedPeriodIndex}
          periods={data.periods}
          summary={`${visibleOccurrences.toLocaleString()} occurrences in ${visiblePoints.length.toLocaleString()} clusters`}
          summaryTone="sky"
          value={selectedPeriodIndex}
        />
      )}

      <div className={languageLayoutClass}>
        {!controlsInsideMap && (
          <div className={`order-2 xl:order-1 ${panelHeightClass}`}>
            <LanguageSelector
              chronology={languageChronology}
              groupColors={groupColors}
              languages={data.languages}
              onSelect={setSelectedLanguageKey}
              selectedLanguageKey={selectedLanguageKey}
            />
          </div>
        )}

        <div className={`order-1 xl:order-2 ${panelHeightClass} ${mapShellClass}`}>
          <MapView
            bearing={viewState.bearing}
            attributionControl={false}
            latitude={viewState.latitude}
            longitude={viewState.longitude}
            interactiveLayerIds={["language-points"]}
            mapStyle="https://tiles.openfreemap.org/styles/liberty"
            onMove={(event) => onViewStateChange(event.viewState as MapCameraState)}
            onMouseMove={(event) => {
              const pointKey = event.features?.[0]?.properties?.pointKey
              if (typeof pointKey !== "string") {
                scheduleHoveredLanguagePointDismiss()
                return
              }

              setHoveredPoint(pointLookup.get(pointKey) ?? null)
            }}
            onMouseOut={scheduleHoveredLanguagePointDismiss}
            pitch={viewState.pitch}
            RTLTextPlugin="https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.3.0/dist/mapbox-gl-rtl-text.js"
            ref={mapRef}
            style={{ width: "100%", height: "100%" }}
            zoom={viewState.zoom}
          >
            <AttributionControl compact position="top-right" />
            <ScaleControl position="top-right" />
            <FullscreenControl position="top-right" />
            <NavigationControl position="top-right" />

            <Source data={geoJson as never} id="language-period-map" type="geojson">
              <Layer
                id="language-points"
                paint={{
                  "circle-color": ["get", "color"],
                  "circle-opacity": 0.82,
                  "circle-radius": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    4,
                    ["interpolate", ["linear"], ["get", "epigraphCount"], 1, 4, 20, 10],
                    8,
                    ["interpolate", ["linear"], ["get", "epigraphCount"], 1, 7, 20, 16],
                  ],
                  "circle-stroke-color": "#ffffff",
                  "circle-stroke-width": 1.2,
                }}
                type="circle"
              />
            </Source>

            {hoveredPoint && (
              <Popup
                anchor="bottom"
                closeButton={false}
                closeOnClick={false}
                latitude={hoveredPoint.coordinates[1]}
                longitude={hoveredPoint.coordinates[0]}
              >
                <div
                  className="max-w-[220px] space-y-1 px-2 py-1 text-[13px]"
                  onMouseEnter={keepHoveredLanguagePointVisible}
                  onMouseLeave={scheduleHoveredLanguagePointDismiss}
                >
                  <div className="font-semibold text-gray-900">{hoveredPoint.siteName}</div>
                  <div className="text-gray-600">Language: {hoveredPoint.languageLabel}</div>
                  <div className="text-gray-600">Group: {hoveredPoint.languageGroup}</div>
                  <div className="text-gray-600">Country: {hoveredPoint.country}</div>
                  <div className="text-gray-600">Period: {selectedPeriodLabel}</div>
                  <div className="text-gray-600">Epigraphs: {hoveredPoint.epigraphCount.toLocaleString()}</div>
                  <a
                    className="inline-flex pt-1 text-xs font-medium text-blue-700 hover:text-blue-900"
                    href={hoveredPoint.siteUri}
                    rel="noreferrer"
                    target="_blank"
                  >
                    DASI site {hoveredPoint.siteDasiId}
                  </a>
                </div>
              </Popup>
            )}

            <div className="pointer-events-none absolute left-3 right-20 top-3 z-10">
              <div className="mx-auto max-w-[22rem]">
                <MapModeSwitcher onSelectMode={onSelectMode} selectedMode={selectedMode} />
              </div>
            </div>

            {controlsInsideMap ? (
              <>
                <div className="pointer-events-none absolute bottom-2 left-[20rem] right-3 z-10">
                  <div className="pointer-events-auto w-full max-w-none">
                    <PeriodRange
                      embedded
                      label="Period"
                      onChange={setSelectedPeriodIndex}
                      periods={data.periods}
                      summary={`${visibleOccurrences.toLocaleString()} occurrences in ${visiblePoints.length.toLocaleString()} clusters`}
                      summaryTone="sky"
                      value={selectedPeriodIndex}
                    />
                  </div>
                </div>

                <div className="pointer-events-none absolute bottom-2 left-2 top-2 z-10 w-[18.75rem]">
                  <div className="pointer-events-auto h-full min-h-0">
                    <LanguageSelector
                      embedded
                      chronology={languageChronology}
                      groupColors={groupColors}
                      languages={data.languages}
                      onSelect={setSelectedLanguageKey}
                      selectedLanguageKey={selectedLanguageKey}
                    />
                  </div>
                </div>
              </>
            ) : null}
          </MapView>
        </div>

        {/* {selectedLanguage && (
          <div className="order-3 space-y-3">
            <div className={sideCardClass}>
              <div className="mb-2 text-[13px] font-semibold text-gray-900">Selected language</div>
              <div className="space-y-1 text-[13px] leading-5 text-gray-600">
                <div className="font-medium text-gray-900">{selectedLanguage.label}</div>
                <div>Family: {selectedLanguage.family}</div>
                {selectedLanguage.branch !== "Unknown" && <div>Branch: {selectedLanguage.branch}</div>}
                {selectedLanguage.leaf !== "Unknown" && selectedLanguage.leaf !== selectedLanguage.label && (
                  <div>Leaf: {selectedLanguage.leaf}</div>
                )}
                <div className="pt-1.5">
                  <span className="font-medium text-gray-900">{selectedLanguage.epigraphCount.toLocaleString()}</span> mapped epigraphs across{" "}
                  <span className="font-medium text-gray-900">{selectedLanguage.siteCount.toLocaleString()}</span> sites.
                </div>
              </div>
            </div>
          </div>
        )} */}
      </div>
    </div>
  )
}

const Maps: React.FC = () => {
  const [mapViewState, setMapViewState] = useState<MapCameraState>({ bearing: 0, latitude: 15, longitude: 45, pitch: 0, zoom: 4.5 })
  const [selectedMode, setSelectedMode] = useState<MapMode>("atlas")
  const [mountedModes, setMountedModes] = useState<Record<MapMode, boolean>>({ atlas: true, heatmap: false, language: false })
  const [hasInitialMapFit, setHasInitialMapFit] = useState(false)
  const [siteMapState, setSiteMapState] = useState<LoadableState<SiteMapResponse>>({ data: null, error: null, loading: true })
  const [heatmapState, setHeatmapState] = useState<LoadableState<EpigraphHeatmapResponse>>({ data: null, error: null, loading: true })
  const [languageState, setLanguageState] = useState<LoadableState<LanguagePeriodMapResponse>>({ data: null, error: null, loading: true })

  useEffect(() => {
    let isMounted = true

    const loadDataset = async <T,>(
      url: string,
      setState: React.Dispatch<React.SetStateAction<LoadableState<T>>>,
    ) => {
      try {
        const payload = await fetchAnalyticsData<T>(url)
        if (isMounted) {
          setState({ data: payload, error: null, loading: false })
        }
      } catch (fetchError) {
        if (isMounted) {
          setState({
            data: null,
            error: fetchError instanceof Error ? fetchError.message : "Failed to load analytics data",
            loading: false,
          })
        }
      }
    }

    void loadDataset("/api/v1/analytics/site_map", setSiteMapState)
    void loadDataset("/api/v1/analytics/epigraph_heatmap", setHeatmapState)
    void loadDataset("/api/v1/analytics/language_period_map", setLanguageState)

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    setMountedModes((current) => {
      if (current[selectedMode]) {
        return current
      }

      return {
        ...current,
        [selectedMode]: true,
      }
    })
  }, [selectedMode])

  const activeState = selectedMode === "atlas" ? siteMapState : selectedMode === "heatmap" ? heatmapState : languageState

  return (
    <div className="mx-auto max-w-[95rem] px-4 py-4 sm:px-5 lg:px-6">
      <div className="mb-4 space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-[2rem]">Maps</h1>
        <p className={sectionLeadClass}>
          Explore the public corpus through three spatial lenses: the site atlas, an epigraph heatmap by period, and a
          language-by-period map.
        </p>
      </div>

      {activeState.loading && !activeState.data ? (
        <div className="flex min-h-[420px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-gray-900" />
        </div>
      ) : activeState.error && !activeState.data ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{activeState.error}</div>
      ) : siteMapState.data || heatmapState.data || languageState.data ? (
        <>
          {mountedModes.atlas && siteMapState.data ? (
            <SiteAtlasPanel
              data={siteMapState.data}
              isActive={selectedMode === "atlas"}
              onInitialFitComplete={() => setHasInitialMapFit(true)}
              onSelectMode={setSelectedMode}
              onViewStateChange={setMapViewState}
              selectedMode={selectedMode}
              shouldInitialFit={!hasInitialMapFit}
              viewState={mapViewState}
            />
          ) : null}
          {mountedModes.heatmap && heatmapState.data ? (
            <EpigraphHeatmapPanel
              data={heatmapState.data}
              isActive={selectedMode === "heatmap"}
              onSelectMode={setSelectedMode}
              onViewStateChange={setMapViewState}
              selectedMode={selectedMode}
              viewState={mapViewState}
            />
          ) : null}
          {mountedModes.language && languageState.data ? (
            <LanguagePeriodPanel
              data={languageState.data}
              isActive={selectedMode === "language"}
              onSelectMode={setSelectedMode}
              onViewStateChange={setMapViewState}
              selectedMode={selectedMode}
              viewState={mapViewState}
            />
          ) : null}
        </>
      ) : (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Maps data is unavailable right now.
        </div>
      )}
    </div>
  )
}

export default Maps
