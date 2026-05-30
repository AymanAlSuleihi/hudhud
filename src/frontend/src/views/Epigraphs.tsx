"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { MapTrifoldIcon, StackSimple } from "@phosphor-icons/react"
import {
  EpigraphFacetBucket,
  EpigraphFacetSchemaFieldResponse,
  EpigraphQueryResponse,
  EpigraphsOut,
  EpigraphsService,
  EpigraphSearchSchemaResponse,
  EpigraphSearchSortOptionResponse,
} from "../client"
import { MyDisclosure } from "../components/Disclosure"
import { EpigraphsFiltersPanel } from "../components/epigraphs/EpigraphsFiltersPanel"
import { EpigraphCard } from "../components/EpigraphCard"
import { Spinner } from "../components/Spinner"
import { EpigraphsPaginationControls } from "../components/epigraphs/EpigraphsPaginationControls"
import { EpigraphsSearchPanel } from "../components/epigraphs/EpigraphsSearchPanel"
import { EpigraphsSortControls } from "../components/epigraphs/EpigraphsSortControls"
import { ClientMap } from "../next/components/ClientMap"

type FilterValue = string | boolean | string[]
type Filters = Record<string, FilterValue>
type SearchScopeState = Record<string, boolean>
type FacetValue = string | boolean | number | string[]
type FilterOption = {
  key: string
  label: string
  value: FacetValue
  count?: number
}
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
type EpigraphMapMarkerRequest = {
  search_text: string
  scope_keys?: string[]
  filters: Record<string, FilterValue>
}

const LEGACY_SCOPE_PARAM_KEYS: Record<string, string[]> = {
  epigraphText: ["search_epigraph_text", "search_epigraphText"],
  translationText: ["search_translations", "search_translationText"],
  notes: ["search_notes"],
  bibliography: ["search_bibliography"],
  title: ["search_title"],
  physical: ["search_physical"],
}

const BOOLEAN_FILTER_KEYS = [
  "chronology_conjectural",
  "textual_typology_conjectural",
  "royal_inscription",
] as const

const LANGUAGE_FILTER_KEYS = ["language_level_1", "language_level_2", "language_level_3"] as const

const NON_GENERIC_FILTER_KEYS = new Set<string>(["period", ...BOOLEAN_FILTER_KEYS, ...LANGUAGE_FILTER_KEYS])
const FILTER_PARAM_PREFIX = "filter_"

const SEARCH_DEBOUNCE_MS = 1000
const FILTER_DEBOUNCE_MS = 1000

const MAP_LAYER_CONFIG: Record<MapLayerKey, { label: string; color: string; strokeColor?: string }> = {
  results: {
    label: "Search results",
    color: "#A16207",
    strokeColor: "#A16207",
  },
  outside: {
    label: "Other epigraphs",
    color: "#999999",
    strokeColor: "#444444",
  },
}

const CURRENT_SCROLL_PIN_COLOR = MAP_LAYER_CONFIG.results.color

const hasValidMarkerCoordinates = (coordinates: unknown): coordinates is [number, number] => {
  return (
    Array.isArray(coordinates) &&
    coordinates.length === 2 &&
    coordinates.every((value) => typeof value === "number")
  )
}

const toMapMarkers = (
  markers: EpigraphMapMarkersResponse["markers"],
  style: MapMarkerStyle,
): MapMarker[] => {
  return markers
    .filter((marker) => hasValidMarkerCoordinates(marker.coordinates))
    .map((marker) => ({
      id: marker.dasi_id.toString(),
      coordinates: marker.coordinates,
      color: MAP_LAYER_CONFIG[style].color,
      label: marker.label,
      style,
    }))
}

const encodeFilterValue = (value: FilterValue | FacetValue): string => {
  if (Array.isArray(value)) {
    return `__array__:${JSON.stringify(value)}`
  }

  if (typeof value === "boolean") {
    return value ? "__bool_true__" : "__bool_false__"
  }

  return String(value)
}

const decodeFilterValue = (value: string): FilterValue => {
  if (value.startsWith("__array__:")) {
    return JSON.parse(value.slice("__array__:".length)) as string[]
  }

  if (value === "__bool_true__") {
    return true
  }

  if (value === "__bool_false__") {
    return false
  }

  return value
}

const formatFacetValue = (value: FacetValue): string => {
  if (Array.isArray(value)) {
    return value.join(", ")
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No"
  }

  return String(value)
}

const formatActiveFilterValue = (fieldKey: string, value: FilterValue | FacetValue): string => {
  if (fieldKey === "period" && Array.isArray(value)) {
    if (value.length === 0) {
      return "All periods"
    }

    if (value.length === 1) {
      return value[0]
    }

    return `${value[0]} to ${value[value.length - 1]}`
  }

  return formatFacetValue(value as FacetValue)
}

const getScopeParamKeys = (scopeKey: string): string[] => {
  return LEGACY_SCOPE_PARAM_KEYS[scopeKey] || [`search_${scopeKey}`]
}

const getPrimaryScopeParamKey = (scopeKey: string): string => {
  return getScopeParamKeys(scopeKey)[0]
}

type SearchParamsLike = Pick<URLSearchParams, "entries" | "get" | "getAll" | "keys">

type InitialSearchState = {
  page: number
  pageSize: number
  sortField: string | null
  sortOrder: string | null
  searchTerm: string
  scopeParams: Record<string, string>
  filters: Filters
}

const getFilterParamKey = (filterKey: string): string => {
  return `${FILTER_PARAM_PREFIX}${filterKey}`
}

const encodeFilterParamValues = (value: FilterValue): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => encodeFilterValue(item))
  }

  return [encodeFilterValue(value)]
}

const decodeFilterParamValues = (values: string[]): FilterValue | undefined => {
  const decodedValues = values.flatMap((value) => {
    const decodedValue = decodeFilterValue(value)

    if (Array.isArray(decodedValue)) {
      return decodedValue.filter((item): item is string => typeof item === "string")
    }

    return [decodedValue]
  })

  if (decodedValues.length === 0) {
    return undefined
  }

  if (decodedValues.length === 1) {
    return decodedValues[0]
  }

  if (decodedValues.every((value): value is string => typeof value === "string")) {
    return Array.from(new Set(decodedValues))
  }

  return decodedValues[decodedValues.length - 1]
}

const buildInitialSearchState = (searchParams: SearchParamsLike): InitialSearchState => {
  const filters: Filters = {}

  Array.from(new Set(searchParams.keys()))
    .filter((key) => key.startsWith(FILTER_PARAM_PREFIX))
    .forEach((paramKey) => {
      const filterKey = paramKey.slice(FILTER_PARAM_PREFIX.length)
      const filterValue = decodeFilterParamValues(searchParams.getAll(paramKey))

      if (filterValue !== undefined) {
        filters[filterKey] = filterValue
      }
    })

  return {
    page: Number(searchParams.get("page") || 1),
    pageSize: Number(searchParams.get("pageSize") || 25),
    sortField: searchParams.get("sort"),
    sortOrder: searchParams.get("order"),
    searchTerm: searchParams.get("q") || "",
    scopeParams: Object.fromEntries(
      Array.from(searchParams.entries()).filter(([key]) => key.startsWith("search_")),
    ),
    filters,
  }
}

const buildInitialScopeState = (
  schema: EpigraphSearchSchemaResponse,
  searchParamEntries: Record<string, string>,
): SearchScopeState => {
  const defaultScopeKeys = new Set(schema.defaults.scopeKeys)
  const scopeState: SearchScopeState = {}

  schema.scopes.forEach((scope) => {
    const matchingParamKey = getScopeParamKeys(scope.key).find((paramKey) => searchParamEntries[paramKey] !== undefined)
    if (!matchingParamKey) {
      scopeState[scope.key] = defaultScopeKeys.has(scope.key)
      return
    }

    scopeState[scope.key] = searchParamEntries[matchingParamKey] !== "false"
  })

  return scopeState
}

const getSelectedPeriodValues = (filterValue: FilterValue | undefined, periodValues: string[]): string[] => {
  if (periodValues.length === 0) {
    return []
  }

  if (Array.isArray(filterValue)) {
    const selectedValues = filterValue.filter(
      (value): value is string => typeof value === "string" && periodValues.includes(value),
    )

    return selectedValues.length > 0 ? selectedValues : periodValues
  }

  if (typeof filterValue === "string" && periodValues.includes(filterValue)) {
    return [filterValue]
  }

  return periodValues
}

const getSelectedPeriodRange = (selectedValues: string[], periodValues: string[]): [number, number] => {
  if (periodValues.length === 0) {
    return [0, 0]
  }

  const indices = selectedValues
    .map((value) => periodValues.indexOf(value))
    .filter((index) => index >= 0)

  if (indices.length === 0) {
    return [0, periodValues.length - 1]
  }

  return [Math.min(...indices), Math.max(...indices)]
}

const getSelectedStringFilterValues = (filterValue: FilterValue | undefined): string[] => {
  if (Array.isArray(filterValue)) {
    return filterValue.filter((value): value is string => typeof value === "string")
  }

  if (typeof filterValue === "string") {
    return [filterValue]
  }

  return []
}

const Epigraphs: React.FC = () => {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const initialSearchParamsRef = useRef(buildInitialSearchState(searchParams))
  const [epigraphs, setEpigraphs] = useState<EpigraphsOut | null>(null)
  const [currentPage, setCurrentPage] = useState(initialSearchParamsRef.current.page)
  const [pageSize, setPageSize] = useState(initialSearchParamsRef.current.pageSize)
  const [sortField, setSortField] = useState(initialSearchParamsRef.current.sortField || "dasi_id")
  const [sortOrder, setSortOrder] = useState(initialSearchParamsRef.current.sortOrder || "asc")
  const [isLoading, setIsLoading] = useState(false)
  const [filters, setFilters] = useState<Filters>(initialSearchParamsRef.current.filters)
  const [showFilters, setShowFilters] = useState(false)
  const [fieldValues, setFieldValues] = useState<Record<string, FacetValue[]>>({})
  const [facetCounts, setFacetCounts] = useState<Record<string, EpigraphFacetBucket[]>>({})
  const [facetSchema, setFacetSchema] = useState<EpigraphFacetSchemaFieldResponse[]>([])
  const [searchSchema, setSearchSchema] = useState<EpigraphSearchSchemaResponse | null>(null)

  const [searchTerm, setSearchTerm] = useState(initialSearchParamsRef.current.searchTerm)
  const [searchFields, setSearchFields] = useState<SearchScopeState>({})
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const filterDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const activeTextInputRef = useRef<HTMLInputElement | null>(null)

  const [pageInputValue, setPageInputValue] = useState(currentPage.toString())
  const [showKeyboard, setShowKeyboard] = useState(false)
  const [mapVisible, setMapVisible] = useState(true)
  const [dasiIdInput, setDasiIdInput] = useState("")
  const [mapMarkers, setMapMarkers] = useState<MapMarker[]>([])
  const [resultMapMarkers, setResultMapMarkers] = useState<MapMarker[]>([])
  const [allMapMarkers, setAllMapMarkers] = useState<MapMarker[]>([])
  const [mapLayerVisibility, setMapLayerVisibility] = useState<Record<MapLayerKey, boolean>>({
    results: true,
    outside: true,
  })
  const [mapLayersExpanded, setMapLayersExpanded] = useState(false)

  const [visibleEpigraphId, setVisibleEpigraphId] = useState<string | null>(null)
  const epigraphRefs = useRef<{[key: string]: HTMLDivElement | null}>({})
  const loadedResultMapMarkerRequestKeyRef = useRef<string | null>(null)
  const hasLoadedAllMapMarkersRef = useRef(false)

  useEffect(() => {
    setPageInputValue(currentPage.toString())
  }, [currentPage])

  const getDefaultSort = (hasSearchText: boolean) => {
    if (!searchSchema) {
      return hasSearchText
        ? { sortField: "_score", sortOrder: "desc" }
        : { sortField: "dasi_id", sortOrder: "asc" }
    }

    return hasSearchText ? searchSchema.defaults.search : searchSchema.defaults.browse
  }

  const getSortOption = (key: string): EpigraphSearchSortOptionResponse | undefined => {
    return searchSchema?.sortOptions.find((sortOption) => sortOption.key === key)
  }

  const getSelectedScopeKeys = (
    currentSearchFields: SearchScopeState,
    currentSearchSchema: EpigraphSearchSchemaResponse,
  ): string[] => {
    return currentSearchSchema.scopes
      .filter((scope) => currentSearchFields[scope.key])
      .map((scope) => scope.key)
  }

  const getFilterOptions = (fieldKey: string): FilterOption[] => {
    const optionsByKey = new Map<string, FilterOption>()

    for (const bucket of facetCounts[fieldKey] || []) {
      optionsByKey.set(encodeFilterValue(bucket.value), {
        key: encodeFilterValue(bucket.value),
        label: formatFacetValue(bucket.value),
        value: bucket.value,
        count: bucket.count,
      })
    }

    for (const value of fieldValues[fieldKey] || []) {
      const encodedValue = encodeFilterValue(value)
      if (!optionsByKey.has(encodedValue)) {
        optionsByKey.set(encodedValue, {
          key: encodedValue,
          label: formatFacetValue(value),
          value,
          count: 0,
        })
      }
    }

    const selectedValue = filters[fieldKey]
    if (selectedValue !== undefined) {
      const selectedValues = Array.isArray(selectedValue) ? selectedValue : [selectedValue]

      for (const value of selectedValues) {
        const encodedValue = encodeFilterValue(value)
        if (!optionsByKey.has(encodedValue)) {
          optionsByKey.set(encodedValue, {
            key: encodedValue,
            label: formatFacetValue(value),
            value,
            count: 0,
          })
        }
      }
    }

    return Array.from(optionsByKey.values())
  }

  const activeSearchQuery = searchTerm.trim()

  const hasActiveSearchQuery = Boolean(activeSearchQuery)

  const periodValues = getFilterOptions("period")
    .map((option) => option.value)
    .filter((value): value is string => typeof value === "string")

  const selectedPeriodValues = getSelectedPeriodValues(filters.period, periodValues)
  const [selectedPeriodStartIndex, selectedPeriodEndIndex] = getSelectedPeriodRange(
    selectedPeriodValues,
    periodValues,
  )
  const selectedPeriodSummary =
    selectedPeriodValues.length === periodValues.length
      ? "All periods"
      : formatActiveFilterValue("period", selectedPeriodValues)

  const languageLevel1Options = getFilterOptions("language_level_1")
    .filter((option) => typeof option.value === "string")
  const languageLevel2Options = getFilterOptions("language_level_2")
    .filter((option) => typeof option.value === "string")
  const languageLevel3Options = getFilterOptions("language_level_3")
    .filter((option) => typeof option.value === "string")

  const selectedLanguageLevel1Values = getSelectedStringFilterValues(filters.language_level_1)
  const selectedLanguageLevel2Values = getSelectedStringFilterValues(filters.language_level_2)
  const selectedLanguageLevel3Values = getSelectedStringFilterValues(filters.language_level_3)
  const hasLanguageFilters = LANGUAGE_FILTER_KEYS.some((key) => filters[key] !== undefined)
  const activeFilterCount = Object.keys(filters).length

  const booleanFacetFields = facetSchema.filter((field) => BOOLEAN_FILTER_KEYS.includes(field.key as (typeof BOOLEAN_FILTER_KEYS)[number]))
  const genericFacetFields = facetSchema.filter((field) => !NON_GENERIC_FILTER_KEYS.has(field.key))

  const clearFilterDebounce = () => {
    if (filterDebounceRef.current) {
      clearTimeout(filterDebounceRef.current)
      filterDebounceRef.current = null
    }
  }

  const replaceSearchParams = (nextSearchParams: URLSearchParams) => {
    const queryString = nextSearchParams.toString()
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
  }

  const fetchMapMarkers = async (
    requestBody: EpigraphMapMarkerRequest,
  ): Promise<EpigraphMapMarkersResponse | null> => {
    try {
      const response = await fetch("/api/v1/epigraphs/query/map-markers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || `Marker request failed with status ${response.status}`)
      }

      return response.json() as Promise<EpigraphMapMarkersResponse>
    } catch (error) {
      console.error("Error fetching epigraph map markers:", error)
      return null
    }
  }

  const fetchEpigraphs = async (
    page: number = 1, 
    size: number = pageSize, 
    sort: string = sortField, 
    order: string = sortOrder, 
    currentFilters: Filters = filters,
    searchQuery: string = searchTerm,
    currentSearchFields: SearchScopeState = searchFields,
    currentSearchSchema: EpigraphSearchSchemaResponse | null = searchSchema,
  ) => {
    if (!currentSearchSchema) {
      return
    }

    try {
      clearFilterDebounce()
      setIsLoading(true)

      const effectiveSearchQuery = searchQuery.trim()

      const sanitizedFilters = Object.fromEntries(
        Object.entries(currentFilters).filter(([, value]) => {
          return value !== "" && value !== undefined && (!Array.isArray(value) || value.length > 0)
        }),
      ) as Filters

      const nextSearchParams = new URLSearchParams()
      nextSearchParams.set("page", page.toString())
      nextSearchParams.set("pageSize", size.toString())
      nextSearchParams.set("sort", sort)
      nextSearchParams.set("order", order)

      if (effectiveSearchQuery) {
        nextSearchParams.set("q", effectiveSearchQuery)
        currentSearchSchema.scopes.forEach((scope) => {
          nextSearchParams.set(
            getPrimaryScopeParamKey(scope.key),
            String(Boolean(currentSearchFields[scope.key])),
          )
        })
      }

      Object.entries(sanitizedFilters)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .forEach(([filterKey, filterValue]) => {
          encodeFilterParamValues(filterValue).forEach((value) => {
            nextSearchParams.append(getFilterParamKey(filterKey), value)
          })
        })

      replaceSearchParams(nextSearchParams)

      const apiFilters: Record<string, FilterValue> = {
        dasi_published: true,
        ...sanitizedFilters,
      }

      const markerRequestBody = {
        search_text: effectiveSearchQuery,
        scope_keys: effectiveSearchQuery ? getSelectedScopeKeys(currentSearchFields, currentSearchSchema) : undefined,
        filters: apiFilters,
      }
      const markerRequestKey = JSON.stringify(markerRequestBody)
      const resultMarkerRequestPromise =
        markerRequestKey !== loadedResultMapMarkerRequestKeyRef.current
          ? fetchMapMarkers(markerRequestBody)
          : null
      const allMarkerRequestPromise =
        !hasLoadedAllMapMarkersRef.current
          ? fetchMapMarkers({
              search_text: "",
              filters: {
                dasi_published: true,
              },
            })
          : null

      const result: EpigraphQueryResponse = await EpigraphsService.epigraphsQueryEpigraphs({
        requestBody: {
          ...markerRequestBody,
          page,
          page_size: size,
          sort_field: sort,
          sort_order: order,
        },
      })

      setEpigraphs(result.results)
      setFieldValues(result.facets)
      setFacetCounts(result.facet_counts)
      setFacetSchema(result.facet_schema)
      setCurrentPage(page)
      setPageSize(size)
      setSortField(sort)
      setSortOrder(order)

      const [resultMarkerResult, allMarkerResult] = await Promise.all([
        resultMarkerRequestPromise,
        allMarkerRequestPromise,
      ])

      if (resultMarkerRequestPromise) {
        if (resultMarkerResult) {
          loadedResultMapMarkerRequestKeyRef.current = markerRequestKey
          setResultMapMarkers(toMapMarkers(resultMarkerResult.markers, "results"))
        } else {
          loadedResultMapMarkerRequestKeyRef.current = null
          setResultMapMarkers([])
        }
      }

      if (allMarkerRequestPromise) {
        if (allMarkerResult) {
          hasLoadedAllMapMarkersRef.current = true
          setAllMapMarkers(toMapMarkers(allMarkerResult.markers, "outside"))
        } else {
          hasLoadedAllMapMarkersRef.current = false
          setAllMapMarkers([])
        }
      }
    } catch (error) {
      console.error("Error fetching epigraphs:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    const initialisePage = async () => {
      try {
        const schema = await EpigraphsService.epigraphsGetEpigraphSearchSchemaEndpoint()
        if (!isMounted) {
          return
        }

        const initialScopeState = buildInitialScopeState(schema, initialSearchParamsRef.current.scopeParams)
        const hasSearchText = Boolean(initialSearchParamsRef.current.searchTerm.trim())
        const defaultSort = hasSearchText ? schema.defaults.search : schema.defaults.browse
        const initialSortField = initialSearchParamsRef.current.sortField || defaultSort.sortField
        const initialSortOrder = initialSearchParamsRef.current.sortOrder || defaultSort.sortOrder

        setSearchSchema(schema)
        setSearchFields(initialScopeState)
        setSearchTerm(initialSearchParamsRef.current.searchTerm)
        setSortField(initialSortField)
        setSortOrder(initialSortOrder)

        if (searchInputRef.current) {
          searchInputRef.current.value = initialSearchParamsRef.current.searchTerm
        }

        await fetchEpigraphs(
          initialSearchParamsRef.current.page,
          initialSearchParamsRef.current.pageSize,
          initialSortField,
          initialSortOrder,
          initialSearchParamsRef.current.filters,
          initialSearchParamsRef.current.searchTerm,
          initialScopeState,
          schema,
        )
      } catch (error) {
        console.error("Error loading epigraph search schema:", error)
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    initialisePage()

    return () => {
      isMounted = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (term: string) => {
    if (term.trim()) {
      setSearchTerm(term)
      const { sortField: newSortField, sortOrder: newSortOrder } = getDefaultSort(true)
      setSortField(newSortField)
      setSortOrder(newSortOrder)
      fetchEpigraphs(1, pageSize, newSortField, newSortOrder, filters, term)
    } else {
      setSearchTerm("")
      const { sortField: newSortField, sortOrder: newSortOrder } = getDefaultSort(false)
      setSortField(newSortField)
      setSortOrder(newSortOrder)
      fetchEpigraphs(1, pageSize, newSortField, newSortOrder, filters, "")
    }
  }

  const handleSearchInputChange = (value: string) => {
    clearFilterDebounce()

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      handleSearch(value)
    }, SEARCH_DEBOUNCE_MS)
  }

  const handleImmediateSearch = (value: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }

    handleSearch(value)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      clearFilterDebounce()
    }
  }, [])

  const handlePageSizeChange = (newSize: number) => {
    const currentFirstItem = (currentPage - 1) * pageSize + 1
    const newPage = Math.ceil(currentFirstItem / newSize)
    fetchEpigraphs(newPage, newSize, sortField, sortOrder, filters, searchTerm)
  }

  const handleSortChange = (newSort: string) => {
    const newOrder = getSortOption(newSort)?.defaultOrder || sortOrder
    fetchEpigraphs(1, pageSize, newSort, newOrder, filters, searchTerm)
  }

  const handleOrderChange = (newOrder: string) => {
    fetchEpigraphs(1, pageSize, sortField, newOrder, filters, searchTerm)
  }

  const applyFilters = (nextFilters: Filters, debounceMs?: number) => {
    setFilters(nextFilters)

    clearFilterDebounce()

    if (debounceMs) {
      filterDebounceRef.current = setTimeout(() => {
        fetchEpigraphs(1, pageSize, sortField, sortOrder, nextFilters, searchTerm)
      }, debounceMs)
      return
    }

    fetchEpigraphs(1, pageSize, sortField, sortOrder, nextFilters, searchTerm)
  }

  const updateFilter = (filterKey: string, nextValue?: FilterValue, debounceMs?: number) => {
    const newFilters = { ...filters }

    if (filterKey === "language_level_1") {
      delete newFilters.language_level_2
      delete newFilters.language_level_3
    } else if (filterKey === "language_level_2") {
      delete newFilters.language_level_3
    }

    if (nextValue === undefined || nextValue === "" || (Array.isArray(nextValue) && nextValue.length === 0)) {
      delete newFilters[filterKey]
    } else {
      newFilters[filterKey] = nextValue
    }

    applyFilters(newFilters, debounceMs)
  }

  const handleFilterChange = (filterKey: string, value: string) => {
    if (value === "" || value === "all") {
      updateFilter(filterKey, undefined)
      return
    }

    updateFilter(filterKey, decodeFilterValue(value))
  }

  const handleMultiFilterChange = (filterKey: string, values: string[]) => {
    const decodedValues = Array.from(
      new Set(
        values.flatMap((value) => {
          const decodedValue = decodeFilterValue(value)

          if (Array.isArray(decodedValue)) {
            return decodedValue.filter((item): item is string => typeof item === "string")
          }

          return typeof decodedValue === "string" ? [decodedValue] : []
        }),
      ),
    )

    if (decodedValues.length === 0) {
      updateFilter(filterKey, undefined, FILTER_DEBOUNCE_MS)
      return
    }

    updateFilter(
      filterKey,
      decodedValues.length === 1 ? decodedValues[0] : decodedValues,
      FILTER_DEBOUNCE_MS,
    )
  }

  const handleBooleanFilterChange = (filterKey: string, value: boolean | null) => {
    updateFilter(filterKey, value === null ? undefined : value)
  }

  const handlePeriodSliderChange = (nextValue: number | number[]) => {
    if (!Array.isArray(nextValue) || nextValue.length < 2 || periodValues.length === 0) {
      return
    }

    const [rawStart, rawEnd] = nextValue
    const nextStart = Math.max(0, Math.min(Math.round(rawStart), Math.round(rawEnd)))
    const nextEnd = Math.min(periodValues.length - 1, Math.max(Math.round(rawStart), Math.round(rawEnd)))

    if (nextStart === selectedPeriodStartIndex && nextEnd === selectedPeriodEndIndex) {
      return
    }

    const nextPeriods = periodValues.slice(nextStart, nextEnd + 1)
    updateFilter(
      "period",
      nextPeriods.length === periodValues.length ? undefined : nextPeriods,
      FILTER_DEBOUNCE_MS,
    )
  }

  const clearLanguageFilters = () => {
    const newFilters = { ...filters }
    LANGUAGE_FILTER_KEYS.forEach((key) => {
      delete newFilters[key]
    })
    applyFilters(newFilters)
  }

  const getBooleanFilterCount = (fieldKey: string, value: boolean) => {
    return facetCounts[fieldKey]?.find((bucket) => bucket.value === value)?.count
  }

  const clearAllFilters = () => {
    applyFilters({})
  }

  const handleToggleKeyboard = () => {
    setShowKeyboard((value) => !value)
  }

  const handleDasiIdSubmit = (value: string) => {
    const trimmedValue = value.trim()
    if (!trimmedValue) {
      return
    }

    const id = parseInt(trimmedValue, 10)
    if (isNaN(id)) {
      return
    }

    router.push(`/epigraphs/${id}`)
  }

  const handleScopeChange = (scopeKey: string, selected: boolean) => {
    const newSearchFields = {
      ...searchFields,
      [scopeKey]: selected,
    }

    setSearchFields(newSearchFields)

    if (searchTerm) {
      fetchEpigraphs(1, pageSize, sortField, sortOrder, filters, searchTerm, newSearchFields)
    }
  }

  const handleTextInputFocus = (input: HTMLInputElement) => {
    activeTextInputRef.current = input
  }

  useEffect(() => {
    if (epigraphs && epigraphs.epigraphs) {
      const markers = epigraphs.epigraphs
        .filter(e => {
          const coords = Array.isArray(e.sites_objs) && e.sites_objs?.[0]?.coordinates
          return hasValidMarkerCoordinates(coords)
        })
        .map(e => ({
          id: e.dasi_id.toString(),
          coordinates: e.sites_objs?.[0]?.coordinates as [number, number],
          color: CURRENT_SCROLL_PIN_COLOR,
          label: `${e.title} - ${(e.sites_objs?.[0]?.modern_name) || "Unknown"}`,
          style: "results" as const,
        }))
      setMapMarkers(markers)
    } else {
      setMapMarkers([])
    }
  }, [epigraphs])

  const resultMarkerIds = useMemo(() => new Set(resultMapMarkers.map((marker) => marker.id)), [resultMapMarkers])

  const outsideResultMapMarkers = useMemo(
    () => allMapMarkers.filter((marker) => !resultMarkerIds.has(marker.id)),
    [allMapMarkers, resultMarkerIds],
  )
  const highlightedMapMarker = useMemo(() => {
    if (!mapLayerVisibility.results || !visibleEpigraphId) {
      return null
    }

    return mapMarkers.find((marker) => marker.id === visibleEpigraphId) || null
  }, [mapLayerVisibility.results, mapMarkers, visibleEpigraphId])
  const visibleBackgroundMapMarkers = useMemo(() => {
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
  const availableMapMarkers = useMemo(
    () => [...resultMapMarkers, ...outsideResultMapMarkers],
    [outsideResultMapMarkers, resultMapMarkers],
  )
  const mapLayerOptions = useMemo(
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

  const getMapCenter = (): [number, number] => {
    if (markersForViewport.length === 0) return [15, 45]
    if (markersForViewport.length === 1) return markersForViewport[0].coordinates
    const sum = markersForViewport.reduce(
      (acc, marker) => [acc[0] + marker.coordinates[0], acc[1] + marker.coordinates[1]],
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

  const handlePageInputChange = (value: string) => {
    setPageInputValue(value)
  }

  const handlePageInputSubmit = (value: string) => {
    if (!epigraphs) {
      return
    }

    const totalPages = Math.ceil(epigraphs.count / pageSize)
    const pageNum = parseInt(value, 10)

    if (pageNum >= 1 && pageNum <= totalPages) {
      fetchEpigraphs(pageNum, pageSize, sortField, sortOrder, filters, searchTerm)
    } else {
      setPageInputValue(currentPage.toString())
    }
  }

  const handleInsertChar = (char: string) => {
    const input = activeTextInputRef.current || searchInputRef.current
    if (!input) return
    const start = input.selectionStart || 0
    const end = input.selectionEnd || 0
    const value = input.value
    input.value = value.slice(0, start) + char + value.slice(end)
    input.focus()
    const cursorPos = start + char.length
    input.setSelectionRange(cursorPos, cursorPos)

    handleSearchInputChange(input.value)
  }

  useEffect(() => {
    if (!epigraphs || !epigraphs.epigraphs.length) return

    let debounceTimeout: NodeJS.Timeout | null = null
    let lastSelectedId = visibleEpigraphId

    const checkVisibleEpigraph = () => {
      const epigraphElements = epigraphs.epigraphs
        .map(e => ({ id: e.dasi_id.toString(), element: epigraphRefs.current[e.dasi_id.toString()] }))
        .filter(({ element }) => element !== null)

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
  }, [epigraphs, visibleEpigraphId])

  const scrollToEpigraph = (epigraphId: string) => {
    const ref = epigraphRefs.current[epigraphId]
    if (ref) {
      ref.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <div className="2xl:max-w-10/12 p-4 mx-auto">
      <h1 className="text-2xl font-bold mb-4">Epigraphs</h1>
      <div className="mb-1 space-y-3">
        <div className="overflow-hidden rounded-md border border-gray-400 shadow-sm">
          <div className="px-4 py-3 sm:px-5 sm:py-4">
            <div className="space-y-3">
              <EpigraphsSearchPanel
                defaultSearchValue={initialSearchParamsRef.current.searchTerm}
                searchSchema={searchSchema}
                searchFields={searchFields}
                searchInputRef={searchInputRef}
                showKeyboard={showKeyboard}
                dasiIdInput={dasiIdInput}
                onSearchInputChange={handleSearchInputChange}
                onSearchSubmit={handleImmediateSearch}
                onSearchInputFocus={handleTextInputFocus}
                onScopeChange={handleScopeChange}
                onToggleKeyboard={handleToggleKeyboard}
                onKeyboardInsert={handleInsertChar}
                onDasiIdInputChange={(value) => setDasiIdInput(value)}
                onDasiIdSubmit={handleDasiIdSubmit}
              />

              <MyDisclosure
                title={
                  <span className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                    <span>Filters</span>
                    {activeFilterCount > 0 && (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-stone-300 bg-white px-1 text-xs font-medium text-stone-700">
                        {activeFilterCount}
                      </span>
                    )}
                  </span>
                }
                isExpanded={showFilters}
                onExpandedChange={setShowFilters}
                actions={
                  activeFilterCount > 0 ? (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="inline-flex h-7 items-center rounded-md border border-stone-300 bg-white px-2 text-xs font-semibold text-stone-700 transition-colors hover:border-stone-500 hover:text-stone-900"
                    >
                      Clear Filters
                    </button>
                  ) : null
                }
              >
                <EpigraphsFiltersPanel
                  showFilters={showFilters}
                  facetSchema={facetSchema}
                  filters={filters}
                  periodValues={periodValues}
                  selectedPeriodSummary={selectedPeriodSummary}
                  selectedPeriodStartIndex={selectedPeriodStartIndex}
                  selectedPeriodEndIndex={selectedPeriodEndIndex}
                  languageLevel1Options={languageLevel1Options}
                  languageLevel2Options={languageLevel2Options}
                  languageLevel3Options={languageLevel3Options}
                  selectedLanguageLevel1Values={selectedLanguageLevel1Values}
                  selectedLanguageLevel2Values={selectedLanguageLevel2Values}
                  selectedLanguageLevel3Values={selectedLanguageLevel3Values}
                  hasLanguageFilters={hasLanguageFilters}
                  booleanFacetFields={booleanFacetFields}
                  genericFacetFields={genericFacetFields}
                  getFilterOptions={getFilterOptions}
                  getBooleanFilterCount={getBooleanFilterCount}
                  onFilterChange={handleFilterChange}
                  onMultiFilterChange={handleMultiFilterChange}
                  onBooleanFilterChange={handleBooleanFilterChange}
                  onPeriodSliderChange={handlePeriodSliderChange}
                  onClearLanguageFilters={clearLanguageFilters}
                  formatActiveFilterValue={formatActiveFilterValue}
                  encodeFilterValue={encodeFilterValue}
                />
              </MyDisclosure>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-end gap-4 mb-6">
        {epigraphs && (
          <div className="mt-auto">
            <p className="text-sm sm:text-base">
              {((currentPage - 1) * pageSize + 1)}-{((currentPage - 1) * pageSize + epigraphs.epigraphs.length)} of {epigraphs.count} epigraphs
            </p>
          </div>
        )}

        <EpigraphsSortControls
          sortField={sortField}
          sortOrder={sortOrder}
          sortOptions={searchSchema?.sortOptions || []}
          hasActiveSearchQuery={hasActiveSearchQuery}
          onSortChange={handleSortChange}
          onOrderChange={handleOrderChange}
        />
      </div>

      {epigraphs && !isLoading ? (
        <div key={`${JSON.stringify(filters)}-${currentPage}-${activeSearchQuery}`}>
          <div className="space-y-4">
            {epigraphs.epigraphs.map((epigraph) => (
              <div
                key={epigraph.dasi_id}
                ref={(el) => {
                  epigraphRefs.current[epigraph.dasi_id.toString()] = el
                }}
                data-epigraph-id={epigraph.dasi_id.toString()}
              >
                <EpigraphCard
                  epigraph={epigraph}
                  notes={true}
                  bibliography={true}
                  // highlighted={visibleEpigraphId === epigraph.dasi_id.toString()}
                />
              </div>
            ))}
          </div>
          <EpigraphsPaginationControls
            currentPage={currentPage}
            totalPages={Math.ceil(epigraphs.count / pageSize)}
            pageInputValue={pageInputValue}
            pageSize={pageSize}
            isLoading={isLoading}
            onPageInputChange={handlePageInputChange}
            onPageInputSubmit={handlePageInputSubmit}
            onPreviousPage={() => fetchEpigraphs(currentPage - 1, pageSize, sortField, sortOrder, filters, searchTerm)}
            onNextPage={() => fetchEpigraphs(currentPage + 1, pageSize, sortField, sortOrder, filters, searchTerm)}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      ) : (
        <div className="flex justify-center">
          <Spinner size="w-10 h-10" colour="#666" />
        </div>
      )}

      {hasAvailableMapMarkers && mapVisible && (
        <div className="fixed bottom-4 right-4 z-40 w-64">
          <ClientMap
            center={getMapCenter()}
            zoom={markersForViewport.length > 1 ? 6 : 8}
            markers={visiblePinMarkers}
            backgroundMarkers={visibleBackgroundMapMarkers}
            minimap={true}
            highlightedId={visibleEpigraphId}
            onEpigraphSelect={scrollToEpigraph}
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
            <MapTrifoldIcon size={24} weight="regular" />
          </button>
        </div>
      )}
    </div>
  )
}

export default Epigraphs