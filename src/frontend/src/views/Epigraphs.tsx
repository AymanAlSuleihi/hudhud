import React, { useEffect, useState, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import { X, MagnifyingGlass, Check, Funnel, MapTrifold, Keyboard } from "@phosphor-icons/react"
import { 
  SearchField, 
  Button,
  Label,
  ToggleButton,
} from "react-aria-components"
import { EpigraphsService, EpigraphsOut } from "../client"
import { EpigraphCard } from "../components/EpigraphCard"
import { Spinner } from "../components/Spinner"
import { MySelect, MyItem } from "../components/Select"
import { OnScreenKeyboard } from "../components/OnScreenKeyboard"
import { MapComponent } from "../components/Map"
import { MyDisclosure } from "../components/Disclosure"
import { MetaTags } from "../components/MetaTags"
import { generateEpigraphsListMetaTags } from "../utils/metaTags"

interface Filters {
  period?: string
  chronology_conjectural?: string
  language_level_1?: string
  language_level_2?: string
  language_level_3?: string
  alphabet?: string
  script_typology?: string
  script_cursus?: string
  textual_typology?: string
  textual_typology_conjectural?: string
  writing_techniques?: string
  royal_inscription?: string
}

const Epigraphs: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [epigraphs, setEpigraphs] = useState<EpigraphsOut | null>(null)
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get("page") || 1))
  const [pageSize, setPageSize] = useState(Number(searchParams.get("pageSize") || 25))
  const [sortField, setSortField] = useState(searchParams.get("sort") || "dasi_id")
  const [sortOrder, setSortOrder] = useState(searchParams.get("order") || "asc")
  const [isLoading, setIsLoading] = useState(false)
  const [filters, setFilters] = useState<Filters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [fieldValues, setFieldValues] = useState<Record<string, any[]>>({})

  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "")
  const [searchFields, setSearchFields] = useState({
    epigraphText: searchParams.get("search_epigraph_text") !== "false",
    translationText: searchParams.get("search_translations") !== "false",
    notes: searchParams.get("search_notes") !== "false", 
    bibliography: searchParams.get("search_bibliography") !== "false",
    title: searchParams.get("search_title") !== "false",
    physical: searchParams.get("search_physical") !== "false",
  })
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [pageInputValue, setPageInputValue] = useState(currentPage.toString())
  const [showKeyboard, setShowKeyboard] = useState(false)
  const [mapVisible, setMapVisible] = useState(true)
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

  const filterLabels = {
    period: "Period",
    chronology_conjectural: "Chronology (Conjectural)",
    language_level_1: "Language (Level 1)",
    language_level_2: "Language (Level 2)",
    language_level_3: "Language (Level 3)",
    alphabet: "Alphabet",
    script_typology: "Script Typology",
    script_cursus: "Script Cursus",
    textual_typology: "Textual Typology",
    textual_typology_conjectural: "Textual Typology (Conjectural)",
    writing_techniques: "Writing Techniques",
    royal_inscription: "Royal Inscription",
  }

  const fetchEpigraphs = async (
    page: number = 1, 
    size: number = pageSize, 
    sort: string = sortField, 
    order: string = sortOrder, 
    currentFilters: Filters = filters,
    searchQuery: string = searchTerm
  ) => {
    try {
      setIsLoading(true)

      const urlParams: Record<string, string> = {
        page: page.toString(),
        pageSize: size.toString(),
        sort: sort,
        order: order
      }

      if (searchQuery) {
        urlParams.q = searchQuery
        urlParams.search_epigraph_text = searchFields.epigraphText.toString()
        urlParams.search_translations = searchFields.translationText.toString()
        urlParams.search_notes = searchFields.notes.toString()
        urlParams.search_bibliography = searchFields.bibliography.toString()
        urlParams.search_title = searchFields.title.toString()
        urlParams.search_physical = searchFields.physical.toString()
      }

      setSearchParams(urlParams)

      const apiFilters = {
        dasi_published: true,
        ...currentFilters
      }

      Object.keys(apiFilters).forEach(key => {
        if (apiFilters[key as keyof typeof apiFilters] === "" || apiFilters[key as keyof typeof apiFilters] === undefined) {
          delete apiFilters[key as keyof typeof apiFilters]
        }
      })

      let result: EpigraphsOut

      if (searchQuery) {
        const field_map = {
          epigraphText: searchFields.epigraphText ? ["epigraph_text"] : [],
          translationText: searchFields.translationText ? ["translations"] : [],
          notes: searchFields.notes ? ["general_notes", "apparatus_notes", "cultural_notes", "support_notes", "deposit_notes", "object_cultural_notes", "images", "sites", "deposits"] : [],
          bibliography: searchFields.bibliography ? ["bibliography"] : [],
          title: searchFields.title ? ["title"] : [],
          physical: searchFields.physical ? ["decorations", "materials", "shape"] : [],
        }
        const fields = [
          ...Object.values(field_map).flat()
        ].filter(Boolean).join(",")

        result = await EpigraphsService.epigraphsFullTextSearchEpigraphs({
          searchText: searchQuery,
          fields: fields,
          sortField: sort,
          sortOrder: order,
          skip: (page - 1) * size,
          limit: size,
          filters: Object.keys(apiFilters).length > 1 ? JSON.stringify(apiFilters) : undefined,
        })
      } else {
        result = await EpigraphsService.epigraphsReadEpigraphs({
          skip: (page - 1) * size,
          limit: size,
          sortField: sort,
          sortOrder: order,
          filters: JSON.stringify(apiFilters),
        })
      }
      
      setEpigraphs(result)
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
    const page = Number(searchParams.get("page")) || 1
    const size = Number(searchParams.get("pageSize")) || 25
    const sort = searchParams.get("sort") || "dasi_id"
    const order = searchParams.get("order") || "asc"
    const query = searchParams.get("q") || ""

    if (query) {
      setSearchTerm(query)
      if (searchInputRef.current) {
        searchInputRef.current.value = query
      }
    }

    fetchEpigraphs(page, size, sort, order, {}, query)
  }, [])

  const handleSearch = (term: string) => {
    if (term.trim()) {
      setSearchTerm(term)
      fetchEpigraphs(1, pageSize, sortField, sortOrder, filters, term)
    } else {
      setSearchTerm("")
      fetchEpigraphs(1, pageSize, sortField, sortOrder, filters, "")
    }
  }

  const handleSearchInputChange = (value: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      handleSearch(value)
    }, 300)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  const handlePageSizeChange = (newSize: number) => {
    const currentFirstItem = (currentPage - 1) * pageSize + 1
    const newPage = Math.ceil(currentFirstItem / newSize)
    fetchEpigraphs(newPage, newSize, sortField, sortOrder, filters, searchTerm)
  }

  const handleSortChange = (newSort: string) => {
    fetchEpigraphs(1, pageSize, newSort, sortOrder, filters, searchTerm)
  }

  const handleOrderChange = (newOrder: string) => {
    fetchEpigraphs(1, pageSize, sortField, newOrder, filters, searchTerm)
  }

  const handleFilterChange = (filterKey: keyof Filters, value: string) => {
    const newFilters = { ...filters }

    if (filterKey === "language_level_1") {
      delete newFilters.language_level_2
      delete newFilters.language_level_3
    } else if (filterKey === "language_level_2") {
      delete newFilters.language_level_3
    }

    if (value === "" || value === "all") {
      delete newFilters[filterKey]
    } else {
      newFilters[filterKey] = value
    }

    setFilters(newFilters)
    fetchEpigraphs(1, pageSize, sortField, sortOrder, newFilters, searchTerm)
    fetchFieldValues(newFilters)
  }

  const clearAllFilters = () => {
    setFilters({})
    fetchEpigraphs(1, pageSize, sortField, sortOrder, {}, searchTerm)
    fetchFieldValues({})
  }

  const clearSearch = () => {
    setSearchTerm("")
    if (searchInputRef.current) {
      searchInputRef.current.value = ""
    }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    fetchEpigraphs(1, pageSize, sortField, sortOrder, filters, "")
  }

  const fetchFieldValues = async (currentFilters: Filters = {}) => {
    try {
      let result

      if (Object.keys(currentFilters).length > 0) {
        const apiFilters = {
          dasi_published: true,
          ...currentFilters
        }

        Object.keys(apiFilters).forEach(key => {
          if (apiFilters[key as keyof typeof apiFilters] === "" || apiFilters[key as keyof typeof apiFilters] === undefined) {
            delete apiFilters[key as keyof typeof apiFilters]
          }
        })

        try {
          result = await EpigraphsService.epigraphsGetFilteredFieldValues({
            filters: JSON.stringify(apiFilters)
          })
          console.log("Fetched filtered field values for filters:", currentFilters)
          console.log("API filters sent:", apiFilters)
          console.log("Field values received:", result)
        } catch (error) {
          console.error("Failed to fetch filtered field values, falling back to all values:", error)
          result = await EpigraphsService.epigraphsGetAllFieldValues()
        }
      } else {
        result = await EpigraphsService.epigraphsGetAllFieldValues()
        console.log("Fetched all field values (no filters)")
      }

      setFieldValues(result)
    } catch (error) {
      console.error("Error fetching field values:", error)
      try {
        const result = await EpigraphsService.epigraphsGetAllFieldValues()
        setFieldValues(result)
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError)
      }
    }
  }

  useEffect(() => {
    fetchFieldValues()
  }, [searchTerm])

  useEffect(() => {
    if (searchTerm) {
      fetchEpigraphs(1, pageSize, sortField, sortOrder, filters, searchTerm)
    }
  }, [searchFields])

  useEffect(() => {
    if (epigraphs && epigraphs.epigraphs) {
      const markers = epigraphs.epigraphs
        .filter(e => {
          const coords = Array.isArray(e.sites_objs) && e.sites_objs?.[0]?.coordinates
          return Array.isArray(coords) && coords.length === 2 && coords.every(n => typeof n === "number")
        })
        .map(e => {
          const isCurrent = visibleEpigraphId === e.id.toString()
          let color = "#2563EB"
          if (!isCurrent) {
            const accuracy = e.sites_objs?.[0]?.coordinates_accuracy
            color = accuracy === "approximate" ? "#F59E0B" : "#10B981" 
          }
          return {
            id: e.id.toString(),
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
            className="px-3 py-1 rounded bg-zinc-600 hover:bg-zinc-700 text-white transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 text-sm"
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
            className="px-3 py-1 rounded bg-zinc-600 hover:bg-zinc-700 text-white transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 text-sm"
          >
            Next
          </button>
        </div>

        <div className="flex items-end gap-2 sm:flex-1 sm:justify-end">
          <MySelect
            label="Results per page"
            selectedKey={pageSize.toString()}
            onSelectionChange={(key) => {
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
            <MyItem key="200" id="200">200</MyItem>
            <MyItem key="500" id="500">500</MyItem>
            <MyItem key="1000" id="1000">1000</MyItem>
          </MySelect>
        </div>
      </div>
    )
  }

  const handleInsertChar = (char: string) => {
    const input = searchInputRef.current
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
        .map(e => ({ id: e.id.toString(), element: epigraphRefs.current[e.id.toString()] }))
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
      <MetaTags data={generateEpigraphsListMetaTags(searchParams)} />
      <h1 className="text-2xl font-bold mb-4">Epigraphs</h1>
      <div className="mb-1 space-y-4">
        <div className="flex flex-wrap gap-x-2 gap-y-4 items-start">
          <div className="flex flex-col flex-1 min-w-[200px]">
            <div className="flex items-center gap-2">
              <SearchField className="flex-1">
                <Label className="block text-sm font-medium mb-1">Search</Label>
                <div className="relative flex items-center w-full">
                  <input 
                    ref={searchInputRef}
                    defaultValue={searchParams.get("q") || ""}
                    onChange={(e) => handleSearchInputChange(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        if (debounceRef.current) {
                          clearTimeout(debounceRef.current)
                        }
                        handleSearch(e.currentTarget.value)
                      }
                    }}
                    className="w-full border border-gray-400 p-2 pl-9 pr-32 rounded h-12"
                    placeholder="Search epigraphs..."
                  />
                  <MagnifyingGlass className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <button
                      type="button"
                      className="flex items-center justify-center px-2 py-1 bg-zinc-600 hover:bg-zinc-700 text-white rounded h-9 w-9"
                      onClick={() => setShowKeyboard((v) => !v)}
                      title={showKeyboard ? "Hide Keyboard" : "Show Keyboard"}
                    >
                      <Keyboard size={16} />
                    </button>
                    <button
                      type="button"
                      className="flex items-center justify-center px-2 py-1 bg-zinc-600 hover:bg-zinc-700 text-white rounded h-9 w-9"
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
            </div>
          </div>
        </div>
        {showKeyboard && (
          <div className="mt-2"><OnScreenKeyboard onInsert={handleInsertChar} /></div>
        )}

        <div className="flex gap-x-1 gap-y-1 items-center flex-wrap">
          <Label className="text-sm font-medium whitespace-nowrap w-full">Search within:</Label>
          <ToggleButton
            isSelected={searchFields.epigraphText}
            onChange={selected => setSearchFields(prev => ({...prev, epigraphText: selected}))}
            className={({isSelected}) => `
              flex items-center gap-1 px-2 sm:px-3 py-2 font-medium rounded transition-colors h-8 whitespace-nowrap text-sm
              ${isSelected 
                ? "bg-zinc-600 text-white shadow-sm"
                : "bg-zinc-600 hover:bg-zinc-700 text-white"
              }
            `}
          >
            <span className="flex items-center gap-1">
              {searchFields.epigraphText && (
                <Check size={14} className="text-white" />
              )}
              <span className="hidden sm:inline">Epigraph Text</span>
              <span className="sm:hidden">Text</span>
            </span>
          </ToggleButton>
          <ToggleButton
            isSelected={searchFields.translationText}
            onChange={selected => setSearchFields(prev => ({...prev, translationText: selected}))}
            className={({isSelected}) => `
              flex items-center gap-1 px-2 sm:px-3 py-2 font-medium rounded transition-colors h-8 whitespace-nowrap text-sm
              ${isSelected 
                ? "bg-zinc-600 text-white shadow-sm"
                : "bg-zinc-600 hover:bg-zinc-700 text-white"
              }
            `}
          >
            <span className="flex items-center gap-1">
              {searchFields.translationText && (
                <Check size={14} className="text-white" />
              )}
              <span className="hidden sm:inline">Translations</span>
              <span className="sm:hidden">Trans.</span>
            </span>
          </ToggleButton>
          <ToggleButton
            isSelected={searchFields.notes}
            onChange={selected => setSearchFields(prev => ({...prev, notes: selected}))}
            className={({isSelected}) => `
              flex items-center gap-1 px-2 sm:px-3 py-2 font-medium rounded transition-colors h-8 whitespace-nowrap text-sm
              ${isSelected 
                ? "bg-zinc-600 text-white shadow-sm"
                : "bg-zinc-600 hover:bg-zinc-700 text-white"
              }
            `}
          >
            <span className="flex items-center gap-1">
              {searchFields.notes && (
                <Check size={14} className="text-white" />
              )}
              Notes
            </span>
          </ToggleButton>
          <ToggleButton
            isSelected={searchFields.bibliography}
            onChange={selected => setSearchFields(prev => ({...prev, bibliography: selected}))}
            className={({isSelected}) => `
              flex items-center gap-1 px-2 sm:px-3 py-2 font-medium rounded transition-colors h-8 whitespace-nowrap text-sm
              ${isSelected 
                ? "bg-zinc-600 text-white shadow-sm"
                : "bg-zinc-600 hover:bg-zinc-700 text-white"
              }
            `}
          >
            <span className="flex items-center gap-1">
              {searchFields.bibliography && (
                <Check size={14} className="text-white" />
              )}
              <span className="hidden sm:inline">Bibliography</span>
              <span className="sm:hidden">Biblio.</span>
            </span>
          </ToggleButton>
          <ToggleButton
            isSelected={searchFields.title}
            onChange={selected => setSearchFields(prev => ({...prev, title: selected}))}
            className={({isSelected}) => `
              flex items-center gap-1 px-2 sm:px-3 py-2 font-medium rounded transition-colors h-8 whitespace-nowrap text-sm
              ${isSelected 
                ? "bg-zinc-600 text-white shadow-sm"
                : "bg-zinc-600 hover:bg-zinc-700 text-white"
              }
            `}
          >
            <span className="flex items-center gap-1">
              {searchFields.title && (
                <Check size={14} className="text-white" />
              )}
              Title
            </span>
          </ToggleButton>
          <ToggleButton
            isSelected={searchFields.physical}
            onChange={selected => setSearchFields(prev => ({...prev, physical: selected}))}
            className={({isSelected}) => `
              flex items-center gap-1 px-2 sm:px-3 py-2 font-medium rounded transition-colors h-8 whitespace-nowrap text-sm
              ${isSelected 
                ? "bg-zinc-600 text-white shadow-sm"
                : "bg-zinc-600 hover:bg-zinc-700 text-white"
              }
            `}
          >
            <span className="flex items-center gap-1">
              {searchFields.physical && (
                <Check size={14} className="text-white" />
              )}
              <span className="hidden sm:inline">Physical Attributes</span>
              <span className="sm:hidden">Phys.</span>
            </span>
          </ToggleButton>
        </div>
        <MyDisclosure title="Search Tips" className="text-sm">
          <div className="text-sm text-gray-700 border border-gray-400 rounded-sm p-3 mt-2 mb-4">
            <div className="overflow-x-auto">
              <table className="min-w-full border-gray-100 rounded-md bg-white text-left text-sm">
                <thead>
                  <tr className=" border-b border-gray-200">
                    <th className="px-3 py-2 font-semibold text-gray-700">Operator</th>
                    <th className="px-3 py-2 font-semibold text-gray-700">Meaning</th>
                    <th className="px-3 py-2 font-semibold text-gray-700">Example</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-2 font-semibold text-gray-700">*</td>
                    <td className="px-3 py-2 text-gray-700 lg:text-nowrap">Matches zero or more characters</td>
                    <td className="px-3 py-2 text-gray-700"><span className="font-semibold">hud*</span> → "hud", "hudhud", "hudson"</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-semibold text-gray-700">?</td>
                    <td className="px-3 py-2 text-gray-700 lg:text-nowrap">Matches any single character</td>
                    <td className="px-3 py-2 text-gray-700"><span className="font-semibold">hudh?d</span> → "hudhud", "hudhod"</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-semibold text-gray-700">+</td>
                    <td className="px-3 py-2 text-gray-700 lg:text-nowrap">Required word or phrase</td>
                    <td className="px-3 py-2 text-gray-700"><span className="font-semibold">+king</span> → must include "king"</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-semibold text-gray-700">-</td>
                    <td className="px-3 py-2 text-gray-700 lg:text-nowrap">Exclude word</td>
                    <td className="px-3 py-2 text-gray-700"><span className="font-semibold">-war</span> → must not include "war"</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-semibold text-gray-700">""</td>
                    <td className="px-3 py-2 text-gray-700 lg:text-nowrap">Exact phrase</td>
                    <td className="px-3 py-2 text-gray-700"><span className="font-semibold">"south arabia"</span> → must contain the exact phrase</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-semibold text-gray-700">Combined</td>
                    <td className="px-3 py-2 text-gray-700 lg:text-nowrap">Mix operators for advanced search</td>
                    <td className="px-3 py-2 text-gray-700"><span className="font-semibold">+?ound* -pillar temple "south arabia"</span> → must include any word matching "?ound*" (e.g., "found", "foundation", "boundary"), must not include "pillar", should include "temple", and must contain the exact phrase "south arabia"</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </MyDisclosure>
      </div>

      <div className="">
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            {Object.entries(filterLabels).map(([key, label]) => {
              const availableValues = fieldValues[key] || []
              return (
                <div key={key}>
                  <MySelect
                    label={label}
                    selectedKey={filters[key as keyof Filters] || "all"}
                    onSelectionChange={(value) => {
                      if (typeof value === "string") {
                        handleFilterChange(key as keyof Filters, value)
                      }
                    }}
                    buttonClassName="h-8 max-h-8 w-full"
                  >
                    <MyItem key="all" id="all">All</MyItem>
                    {availableValues.map((value: any) => {
                      let displayValue: string
                      let keyValue: string

                      if (typeof value === "boolean") {
                        displayValue = value ? "Yes" : "No"
                        keyValue = String(value)
                      } else if (Array.isArray(value)) {
                        displayValue = value.join(", ")
                        keyValue = JSON.stringify(value)
                      } else {
                        displayValue = String(value)
                        keyValue = String(value)
                      }

                      return (
                        <MyItem key={keyValue} id={keyValue}>
                          {displayValue}
                        </MyItem>
                      )
                    })}
                  </MySelect>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
        <div className="flex-shrink-0">
          {epigraphs && (
            <div>
              <p className="text-sm sm:text-base">
                {((currentPage - 1) * pageSize + 1)}-{((currentPage - 1) * pageSize + epigraphs.epigraphs.length)} of {epigraphs.count} total epigraphs
              </p>
              {Object.keys(filters).length > 0 && (
                <div className="mt-2 text-sm text-gray-600">
                  <span className="font-medium">Active filters:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(filters).map(([key, value]) => {
                      let displayValue: string
                      if (typeof value === "boolean") {
                        displayValue = value ? "Yes" : "No"
                      } else if (Array.isArray(value)) {
                        displayValue = value.join(", ")
                      } else {
                        displayValue = String(value)
                      }
                      return (
                        <span key={key} className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-600 text-white rounded text-sm font-medium">
                          <span className="hidden sm:inline">{filterLabels[key as keyof typeof filterLabels]}:</span>
                          <span className="sm:hidden">{filterLabels[key as keyof typeof filterLabels].split(' ')[0]}:</span>
                          {displayValue}
                          <button
                            onClick={() => handleFilterChange(key as keyof Filters, "all")}
                            className="hover:text-gray-300 flex items-center transition-colors"
                            title="Remove filter"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 items-end flex-wrap">
          {Object.keys(filters).length > 0 && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-2 px-2 sm:px-4 py-2 bg-zinc-600 hover:bg-zinc-700 text-white transition-colors font-medium rounded h-8 whitespace-nowrap text-sm"
            >
              <span className="hidden sm:inline">Clear All Filters</span>
              <span className="sm:hidden">Clear</span>
              <X size={12} />
            </button>
          )}

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-center gap-2 px-2 sm:px-4 py-2 bg-zinc-600 hover:bg-zinc-700 text-white transition-colors font-medium rounded h-8 text-sm sm:whitespace-nowrap w-8 sm:w-auto"
          >
            <Funnel size={14} />
            <span className="hidden sm:inline">{showFilters ? "Hide Filters" : "Show Filters"}</span>
            {Object.keys(filters).length > 0 && (
              <span className="bg-white text-zinc-600 text-sm px-2 py-1 rounded-full font-medium">
                {Object.keys(filters).length}
              </span>
            )}
          </button>

          <MySelect
            label="Sort By"
            selectedKey={sortField}
            onSelectionChange={(key) => {
              if (typeof key === "string") {
                handleSortChange(key)
              }
            }}
            buttonClassName="h-8 max-h-8 min-w-0"
          >
            <MyItem key="dasi_id" id="dasi_id">DASI ID</MyItem>
            <MyItem key="period" id="period">Period</MyItem>
            <MyItem key="title" id="title">Title</MyItem>
            <MyItem key="language_level_1" id="language_level_1">Language</MyItem>
          </MySelect>

          <MySelect
            label="Sort Order"
            selectedKey={sortOrder}
            onSelectionChange={(key) => {
              if (typeof key === "string") {
                handleOrderChange(key)
              }
            }}
            buttonClassName="h-8 max-h-8 min-w-0"
          >
            <MyItem key="asc" id="asc">Ascending</MyItem>
            <MyItem key="desc" id="desc">Descending</MyItem>
          </MySelect>
        </div>
      </div>

      {epigraphs && !isLoading ? (
        <div key={`${JSON.stringify(filters)}-${currentPage}-${searchTerm}`}>
          <div className="space-y-4">
            {epigraphs.epigraphs.map((epigraph) => (
              <div
                key={epigraph.id}
                ref={el => epigraphRefs.current[epigraph.id.toString()] = el}
                data-epigraph-id={epigraph.id.toString()}
              >
                <EpigraphCard
                  epigraph={epigraph}
                  notes={true}
                  bibliography={true}
                  // highlighted={visibleEpigraphId === epigraph.id.toString()}
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
          <MapComponent
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

export default Epigraphs