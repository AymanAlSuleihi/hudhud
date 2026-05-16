"use client"

import React, { useEffect, useState, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { X, MagnifyingGlass, Funnel, MapTrifold, Keyboard, ToggleLeft, ToggleRight, Hash, ArrowRight } from "@phosphor-icons/react"
import {
  SearchField,
  Label,
  ToggleButton,
} from "react-aria-components"
import {
  EpigraphFacetBucket,
  EpigraphFacetSchemaFieldResponse,
  EpigraphQueryResponse,
  EpigraphsOut,
  EpigraphsService,
  EpigraphSearchSchemaResponse,
  EpigraphSearchSortOptionResponse,
} from "../client"
import { EpigraphCard } from "../components/EpigraphCard"
import { Spinner } from "../components/Spinner"
import { MySelect, MyItem } from "../components/Select"
import { MySlider } from "../components/Slider"
import { OnScreenKeyboard } from "../components/OnScreenKeyboard"
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

const SEARCH_DEBOUNCE_MS = 1000
const FILTER_DEBOUNCE_MS = 1000

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

const Epigraphs: React.FC = () => {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const initialSearchParamsRef = useRef({
    page: Number(searchParams.get("page") || 1),
    pageSize: Number(searchParams.get("pageSize") || 25),
    sortField: searchParams.get("sort"),
    sortOrder: searchParams.get("order"),
    searchTerm: searchParams.get("q") || "",
    scopeParams: Object.fromEntries(
      Array.from(searchParams.entries()).filter(([key]) => key.startsWith("search_")),
    ),
  })
  const [epigraphs, setEpigraphs] = useState<EpigraphsOut | null>(null)
  const [currentPage, setCurrentPage] = useState(initialSearchParamsRef.current.page)
  const [pageSize, setPageSize] = useState(initialSearchParamsRef.current.pageSize)
  const [sortField, setSortField] = useState(initialSearchParamsRef.current.sortField || "dasi_id")
  const [sortOrder, setSortOrder] = useState(initialSearchParamsRef.current.sortOrder || "asc")
  const [isLoading, setIsLoading] = useState(false)
  const [filters, setFilters] = useState<Filters>({})
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
  const [mapMarkers, setMapMarkers] = useState<Array<{
    id: string
    coordinates: [number, number]
    color: string
    label: string
  }>>([])

  const [visibleEpigraphId, setVisibleEpigraphId] = useState<string | null>(null)
  const epigraphRefs = useRef<{[key: string]: HTMLDivElement | null}>({})

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

  const getFilterLabel = (fieldKey: string): string => {
    return facetSchema.find((field) => field.key === fieldKey)?.label || fieldKey
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
        })
      }
    }

    const selectedValue = filters[fieldKey]
    if (selectedValue !== undefined) {
      const encodedValue = encodeFilterValue(selectedValue)
      if (!optionsByKey.has(encodedValue)) {
        optionsByKey.set(encodedValue, {
          key: encodedValue,
          label: formatFacetValue(selectedValue),
          value: selectedValue,
          count: 0,
        })
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
    .map((option) => option.value)
    .filter((value): value is string => typeof value === "string")
  const languageLevel2Options = getFilterOptions("language_level_2")
    .map((option) => option.value)
    .filter((value): value is string => typeof value === "string")
  const languageLevel3Options = getFilterOptions("language_level_3")
    .map((option) => option.value)
    .filter((value): value is string => typeof value === "string")

  const selectedLanguageLevel1 = typeof filters.language_level_1 === "string" ? filters.language_level_1 : undefined
  const selectedLanguageLevel2 = typeof filters.language_level_2 === "string" ? filters.language_level_2 : undefined
  const selectedLanguageLevel3 = typeof filters.language_level_3 === "string" ? filters.language_level_3 : undefined
  const hasLanguageFilters = LANGUAGE_FILTER_KEYS.some((key) => filters[key] !== undefined)

  const booleanFacetFields = facetSchema.filter((field) => BOOLEAN_FILTER_KEYS.includes(field.key as (typeof BOOLEAN_FILTER_KEYS)[number]))
  const genericFacetFields = facetSchema.filter((field) => !NON_GENERIC_FILTER_KEYS.has(field.key))

  const clearFilterDebounce = () => {
    if (filterDebounceRef.current) {
      clearTimeout(filterDebounceRef.current)
      filterDebounceRef.current = null
    }
  }

  const replaceSearchParams = (params: Record<string, string>) => {
    const nextSearchParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        nextSearchParams.set(key, value)
      }
    })

    const queryString = nextSearchParams.toString()
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
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

      const urlParams: Record<string, string> = {
        page: page.toString(),
        pageSize: size.toString(),
        sort: sort,
        order: order
      }

      if (effectiveSearchQuery) {
        urlParams.q = effectiveSearchQuery
        currentSearchSchema.scopes.forEach((scope) => {
          urlParams[getPrimaryScopeParamKey(scope.key)] = String(Boolean(currentSearchFields[scope.key]))
        })
      }

      replaceSearchParams(urlParams)

      const apiFilters: Record<string, FilterValue> = {
        dasi_published: true,
        ...currentFilters
      }

      Object.keys(apiFilters).forEach(key => {
        if (apiFilters[key as keyof typeof apiFilters] === "" || apiFilters[key as keyof typeof apiFilters] === undefined) {
          delete apiFilters[key as keyof typeof apiFilters]
        }
      })

      const result: EpigraphQueryResponse = await EpigraphsService.epigraphsQueryEpigraphs({
        requestBody: {
          search_text: effectiveSearchQuery,
          scope_keys: effectiveSearchQuery ? getSelectedScopeKeys(currentSearchFields, currentSearchSchema) : undefined,
          filters: apiFilters,
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
          {},
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
          return Array.isArray(coords) && coords.length === 2 && coords.every(n => typeof n === "number")
        })
        .map(e => {
          const isCurrent = visibleEpigraphId === e.dasi_id.toString()
          let color = "#2563EB"
          if (!isCurrent) {
            const accuracy = e.sites_objs?.[0]?.coordinates_accuracy
            color = accuracy === "approximate" ? "#F59E0B" : "#10B981" 
          }
          return {
            id: e.dasi_id.toString(),
            coordinates: e.sites_objs?.[0]?.coordinates as [number, number],
            color,
            label: `${e.title} - ${(e.sites_objs?.[0]?.modern_name) || "Unknown"}`,
          }
        })
      setMapMarkers(markers)
    } else {
      setMapMarkers([])
    }
  }, [epigraphs, visibleEpigraphId])

  const getMapCenter = (): [number, number] => {
    if (mapMarkers.length === 0) return [15, 45]
    if (mapMarkers.length === 1) return mapMarkers[0].coordinates
    const sum = mapMarkers.reduce(
      (acc, marker) => [acc[0] + marker.coordinates[0], acc[1] + marker.coordinates[1]],
      [0, 0]
    )
    return [sum[0] / mapMarkers.length, sum[1] / mapMarkers.length]
  }

  const renderPagination = () => {
    if (!epigraphs) return null
    const totalPages = Math.ceil(epigraphs.count / pageSize)

    const handlePageInputChange = (value: string) => {
      setPageInputValue(value)
    }

    const handlePageInputSubmit = (value: string) => {
      const pageNum = parseInt(value)
      if (pageNum >= 1 && pageNum <= totalPages) {
        fetchEpigraphs(pageNum, pageSize, sortField, sortOrder, filters, searchTerm)
      } else {
        setPageInputValue(currentPage.toString())
      }
    }

    const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handlePageInputSubmit(e.currentTarget.value)
      }
    }
    
    return (
      <div className="mt-6 flex flex-col sm:flex-row justify-between items-end gap-4">
        <div className="sm:flex-1"></div>

        <div className="flex gap-2 items-center">
          <button
            onClick={() => fetchEpigraphs(currentPage - 1, pageSize, sortField, sortOrder, filters, searchTerm)}
            disabled={currentPage <= 1 || isLoading}
            className="px-3 py-1 rounded shadow border border-gray-900 hover:border-gray-700 hover:text-gray-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 text-sm cursor-pointer"
          >
            Previous
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm whitespace-nowrap">Page</span>
            <input
              type="number"
              min="1"
              max={totalPages}
              value={pageInputValue}
              onChange={(e) => handlePageInputChange(e.target.value)}
              onBlur={(e) => handlePageInputSubmit(e.target.value)}
              onKeyDown={handlePageInputKeyDown}
              className="w-16 px-2 py-1 text-center border border-gray-300 rounded text-sm h-8"
            />
            <span className="text-sm whitespace-nowrap">of {totalPages}</span>
          </div>

          <button
            onClick={() => fetchEpigraphs(currentPage + 1, pageSize, sortField, sortOrder, filters, searchTerm)}
            disabled={currentPage >= totalPages || isLoading}
            className="px-3 py-1 rounded shadow border border-gray-900 hover:border-gray-700 hover:text-gray-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 text-sm cursor-pointer"
          >
            Next
          </button>
        </div>

        <div className="flex items-end gap-2 sm:flex-1 sm:justify-end">
          <MySelect
            label="Results per page"
            selectedKey={pageSize.toString()}
            onSelectionChange={(key: React.Key | null) => {
              if (typeof key === "string") {
                handlePageSizeChange(Number(key))
              }
            }}
            buttonClassName="h-8 max-h-8"
          >
            <MyItem key="10" id="10">10</MyItem>
            <MyItem key="25" id="25">25</MyItem>
            <MyItem key="50" id="50">50</MyItem>
            <MyItem key="100" id="100">100</MyItem>
            <MyItem key="250" id="250">250</MyItem>
          </MySelect>
        </div>
      </div>
    )
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
        <div className="overflow-hidden rounded-md border border-stone-300 bg-[linear-gradient(135deg,rgba(250,250,249,1),rgba(245,245,244,0.92))] shadow-sm">
          <div className="px-4 py-3 sm:px-5 sm:py-4">
            <div className="space-y-3">
              <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(150px,180px)_auto]">
                <SearchField className="flex-1">
                  <Label className="sr-only">Search</Label>
                  <div className="relative flex items-center w-full">
                    <input 
                      ref={searchInputRef}
                      defaultValue={searchParams.get("q") || ""}
                      aria-label="Search epigraphs"
                      onFocus={(event) => handleTextInputFocus(event.currentTarget)}
                      onChange={(e) => handleSearchInputChange(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          if (debounceRef.current) {
                            clearTimeout(debounceRef.current)
                          }
                          handleSearch(e.currentTarget.value)
                        }
                      }}
                      className="h-11 w-full rounded-md border border-gray-400 bg-white p-2 pl-9 pr-14"
                      placeholder="Search epigraphs"
                    />
                    <MagnifyingGlass className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                      <button
                        type="button"
                        className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-900 shadow transition-colors hover:border-gray-700 hover:text-gray-700"
                        onClick={() => {
                          if (debounceRef.current) {
                            clearTimeout(debounceRef.current)
                          }
                          const inputValue = searchInputRef.current?.value || ""
                          handleSearch(inputValue)
                        }}
                        title="Search"
                      >
                        <MagnifyingGlass size={16} />
                      </button>
                    </div>
                  </div>
                </SearchField>

                <div className="relative min-w-[150px] sm:min-w-[180px]">
                <input
                  type="number"
                  placeholder="DASI ID"
                  value={dasiIdInput}
                  aria-label="Go to DASI ID"
                  onChange={(e) => setDasiIdInput(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const val = dasiIdInput.trim()
                      if (val) router.push(`/epigraphs/${parseInt(val, 10)}`)
                    }
                  }}
                  className="h-10 w-full rounded-md border border-stone-300 bg-white pl-10 pr-10 text-sm text-stone-900 outline-none transition-colors focus:border-stone-500"
                />
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" size={15} />
                <button
                  type="button"
                  onClick={() => {
                    const val = dasiIdInput.trim()
                    if (!val) return
                    const id = parseInt(val, 10)
                    if (isNaN(id)) return
                    router.push(`/epigraphs/${id}`)
                  }}
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-900"
                  title="Go to epigraph"
                >
                  <ArrowRight size={16} />
                </button>
              </div>

                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-md border border-stone-300 bg-white text-stone-700 shadow-sm transition-colors hover:border-stone-500 hover:text-stone-900"
                  onClick={() => setShowKeyboard((value) => !value)}
                  title={showKeyboard ? "Hide Keyboard" : "Show Keyboard"}
                >
                  <Keyboard size={16} />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(searchSchema?.scopes || []).map((scope) => (
                  <ToggleButton
                    key={scope.key}
                    isSelected={Boolean(searchFields[scope.key])}
                    onChange={(selected) => handleScopeChange(scope.key, selected)}
                    className={({isSelected}) => `
                      flex items-center gap-2 px-2 sm:px-3 py-2 font-semibold rounded shadow border transition-colors h-8 whitespace-nowrap text-sm cursor-pointer
                      ${isSelected 
                        ? "border-gray-600 text-gray-800 bg-white"
                        : "border-gray-900 hover:border-gray-700 hover:text-gray-700 bg-transparent"
                      }
                    `}
                  >
                    {searchFields[scope.key] ? <ToggleRight size={16} weight="fill" className="text-gray-700" /> : <ToggleLeft size={16} />}
                    <span className="flex items-center gap-1">{scope.label}</span>
                  </ToggleButton>
                ))}

                <button
                  type="button"
                  onClick={() => setShowFilters((value) => !value)}
                  className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-gray-900 px-3 text-sm font-semibold shadow transition-colors hover:border-gray-700 hover:text-gray-700"
                >
                  <Funnel size={14} />
                  <span>{showFilters ? "Hide Filters" : "Filters"}</span>
                  {Object.keys(filters).length > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-white px-1 text-xs font-medium text-zinc-600">
                      {Object.keys(filters).length}
                    </span>
                  )}
                </button>

                {Object.keys(filters).length > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="inline-flex h-8 items-center gap-2 rounded-md border border-gray-900 px-3 text-sm font-semibold shadow transition-colors hover:border-gray-700 hover:text-gray-700"
                  >
                    Clear Filters
                    <X size={12} />
                  </button>
                )}
              </div>

              {showFilters && facetSchema.length > 0 && (
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-3">
                  {periodValues.length > 0 && (
                    <div className="rounded-md border border-gray-300 bg-white p-3 lg:col-span-2 xl:col-span-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-stone-900">Period</div>
                        <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">
                          {selectedPeriodSummary}
                        </span>
                      </div>

                      <div className="mt-3 px-3 sm:px-4">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-stone-500">
                          <span>
                            From <span className="normal-case tracking-normal text-stone-700">{periodValues[selectedPeriodStartIndex] ?? "-"}</span>
                          </span>
                          <span>
                            To <span className="normal-case tracking-normal text-stone-700">{periodValues[selectedPeriodEndIndex] ?? "-"}</span>
                          </span>
                        </div>

                        <MySlider
                          label="Period range"
                          thumbLabels={["Period start", "Period end"]}
                          minValue={0}
                          maxValue={Math.max(periodValues.length - 1, 0)}
                          step={1}
                          value={[selectedPeriodStartIndex, selectedPeriodEndIndex]}
                          onChange={handlePeriodSliderChange}
                        />

                        <div className="relative mt-3 min-h-14 text-[10px] font-medium text-stone-500">
                          {periodValues.map((period, index) => {
                            const positionPercentage =
                              periodValues.length === 1 ? 50 : (index / (periodValues.length - 1)) * 100
                            const alignmentClassName =
                              periodValues.length === 1
                                ? "-translate-x-1/2 items-center text-center"
                                : index === 0
                                  ? "items-start text-left"
                                  : index === periodValues.length - 1
                                    ? "-translate-x-full items-end text-right"
                                    : "-translate-x-1/2 items-center text-center"

                            return (
                              <div
                                key={`${period}-${index}`}
                                className={`absolute top-0 flex min-w-0 flex-col gap-1 leading-tight ${alignmentClassName}`}
                                style={{
                                  left: `${positionPercentage}%`,
                                  width: `${periodValues.length === 1 ? 100 : 100 / periodValues.length}%`,
                                }}
                              >
                                <span aria-hidden className="h-2 w-px bg-stone-300" />
                                <span className="break-words">{period}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="rounded-md border border-gray-300 bg-white p-3 lg:col-span-2">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-stone-900">Language</div>
                      {hasLanguageFilters && (
                        <button
                          type="button"
                          onClick={clearLanguageFilters}
                          className="inline-flex h-7 items-center rounded-md border border-gray-300 px-2 text-xs font-semibold text-stone-700 transition-colors hover:border-stone-500 hover:text-stone-900"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <div className="grid gap-2 md:grid-cols-3">
                      <MySelect
                        label="Family"
                        selectedKey={selectedLanguageLevel1 || "all"}
                        onSelectionChange={(value: React.Key | null) => {
                          if (typeof value === "string") {
                            handleFilterChange("language_level_1", value)
                          }
                        }}
                        buttonClassName="h-8 max-h-8 w-full text-xs sm:text-sm"
                        isDisabled={languageLevel1Options.length === 0}
                      >
                        <MyItem key="all" id="all">All families</MyItem>
                        {languageLevel1Options.map((option) => (
                          <MyItem key={option} id={option} textValue={option}>
                            {option}
                          </MyItem>
                        ))}
                      </MySelect>

                      <MySelect
                        label="Branch"
                        selectedKey={selectedLanguageLevel2 || "all"}
                        onSelectionChange={(value: React.Key | null) => {
                          if (typeof value === "string") {
                            handleFilterChange("language_level_2", value)
                          }
                        }}
                        buttonClassName="h-8 max-h-8 w-full text-xs sm:text-sm"
                        isDisabled={!selectedLanguageLevel1 || languageLevel2Options.length === 0}
                      >
                        <MyItem key="all" id="all">All branches</MyItem>
                        {languageLevel2Options.map((option) => (
                          <MyItem key={option} id={option} textValue={option}>
                            {option}
                          </MyItem>
                        ))}
                      </MySelect>

                      <MySelect
                        label="Leaf"
                        selectedKey={selectedLanguageLevel3 || "all"}
                        onSelectionChange={(value: React.Key | null) => {
                          if (typeof value === "string") {
                            handleFilterChange("language_level_3", value)
                          }
                        }}
                        buttonClassName="h-8 max-h-8 w-full text-xs sm:text-sm"
                        isDisabled={!selectedLanguageLevel2 || languageLevel3Options.length === 0}
                      >
                        <MyItem key="all" id="all">All leaves</MyItem>
                        {languageLevel3Options.map((option) => (
                          <MyItem key={option} id={option} textValue={option}>
                            {option}
                          </MyItem>
                        ))}
                      </MySelect>
                    </div>
                  </div>

                  {booleanFacetFields.map((field) => {
                    const selectedValue = typeof filters[field.key] === "boolean" ? filters[field.key] : undefined
                    const filterChoices = [
                      { label: "All", value: null, count: undefined },
                      { label: "No", value: false, count: getBooleanFilterCount(field.key, false) },
                      { label: "Yes", value: true, count: getBooleanFilterCount(field.key, true) },
                    ]

                    return (
                      <div key={field.key} className="rounded-md border border-gray-300 bg-white p-3">
                        <div className="text-sm font-semibold text-stone-900">{field.label}</div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {filterChoices.map((choice) => {
                            const isSelected = choice.value === null ? selectedValue === undefined : selectedValue === choice.value

                            return (
                              <button
                                key={`${field.key}-${choice.label}`}
                                type="button"
                                onClick={() => handleBooleanFilterChange(field.key, choice.value)}
                                className={`inline-flex h-8 items-center rounded-md border px-2.5 text-xs font-semibold transition-colors ${
                                  isSelected
                                    ? "border-stone-900 bg-stone-900 text-stone-50"
                                    : "border-stone-300 text-stone-700 hover:border-stone-500 hover:text-stone-900"
                                }`}
                              >
                                {choice.count !== undefined ? `${choice.label} (${choice.count})` : choice.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}

                  {genericFacetFields.map((field) => {
                    const availableValues = getFilterOptions(field.key)

                    return (
                      <div key={field.key} className="rounded-md border border-gray-300 bg-white p-3">
                        <MySelect
                          label={field.label}
                          selectedKey={filters[field.key] !== undefined ? encodeFilterValue(filters[field.key]) : "all"}
                          onSelectionChange={(value: React.Key | null) => {
                            if (typeof value === "string") {
                              handleFilterChange(field.key, value)
                            }
                          }}
                          buttonClassName="h-8 max-h-8 w-full text-xs sm:text-sm"
                          isDisabled={availableValues.length === 0}
                        >
                          <MyItem key="all" id="all">All</MyItem>
                          {availableValues.map((option) => (
                            <MyItem key={option.key} id={option.key} textValue={option.label}>
                              {option.count !== undefined ? `${option.label} (${option.count})` : option.label}
                            </MyItem>
                          ))}
                        </MySelect>
                      </div>
                    )
                  })}
                </div>
              )}

              {Object.keys(filters).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {Object.entries(filters).map(([key, value]) => {
                    const displayValue = formatActiveFilterValue(key, value)
                    return (
                      <button
                        key={key}
                        onClick={() => handleFilterChange(key, "all")}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-900 px-2 py-1 text-xs font-semibold shadow-sm transition-colors hover:border-gray-700 hover:text-gray-700"
                        title="Remove filter"
                      >
                        <span className="hidden sm:inline">{getFilterLabel(key)}:</span>
                        <span className="sm:hidden">{getFilterLabel(key).split(" ")[0]}:</span>
                        <span className="max-w-16 truncate sm:max-w-24 md:max-w-32">{displayValue}</span>
                        <X size={10} className="flex-shrink-0" />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {showKeyboard && (
          <div className="mt-2"><OnScreenKeyboard onInsert={handleInsertChar} /></div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-end gap-4 mb-6">
        {epigraphs && (
          <div className="mt-auto">
            <p className="text-sm sm:text-base">
              {((currentPage - 1) * pageSize + 1)}-{((currentPage - 1) * pageSize + epigraphs.epigraphs.length)} of {epigraphs.count} epigraphs
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end flex-wrap w-full sm:w-auto sm:justify-end">
          <div className="flex flex-row gap-2 flex-wrap">
            <MySelect
              label="Sort By"
              selectedKey={sortField}
              onSelectionChange={(key: React.Key | null) => {
                if (typeof key === "string") {
                  handleSortChange(key)
                }
              }}
              buttonClassName="h-8 max-h-8 min-w-24 sm:min-w-32 text-xs sm:text-sm"
            >
              {(searchSchema?.sortOptions || [])
                .filter((sortOption) => hasActiveSearchQuery || !sortOption.searchOnly)
                .map((sortOption) => (
                  <MyItem key={sortOption.key} id={sortOption.key} textValue={sortOption.label}>
                    {sortOption.label}
                  </MyItem>
                ))}
            </MySelect>

            <MySelect
              label="Sort Order"
              selectedKey={sortOrder}
              onSelectionChange={(key: React.Key | null) => {
                if (typeof key === "string") {
                  handleOrderChange(key)
                }
              }}
              buttonClassName="h-8 max-h-8 min-w-20 sm:min-w-28 text-xs sm:text-sm"
            >
              <MyItem key="asc" id="asc">Ascending</MyItem>
              <MyItem key="desc" id="desc">Descending</MyItem>
            </MySelect>
          </div>
        </div>
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
          {renderPagination()}
        </div>
      ) : (
        <div className="flex justify-center">
          <Spinner size="w-10 h-10" colour="#666" />
        </div>
      )}

      {mapMarkers.length > 0 && mapVisible && (
        <div className="fixed bottom-4 right-4 z-40 w-64">
          <ClientMap
            center={getMapCenter()}
            zoom={mapMarkers.length > 1 ? 6 : 8}
            markers={mapMarkers}
            minimap={true}
            highlightedId={visibleEpigraphId}
            onEpigraphSelect={scrollToEpigraph}
            onClose={() => setMapVisible(false)}
          />
        </div>
      )}
      {mapMarkers.length > 0 && !mapVisible && (
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

export default Epigraphs