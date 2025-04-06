import React, { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { 
  SearchField, 
  Button,
  Label,
  Popover
} from "react-aria-components"
import { EpigraphsService, EpigraphsOutBasic } from "../client"
import { Select } from "../components/Select"
import { MagnifyingGlass } from "@phosphor-icons/react"
import { AdvancedFilters } from "../components/AdvancedFilters"

const Search: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "")
  const [sortField, setSortField] = useState(searchParams.get("sort") || "period")
  const [sortOrder, setSortOrder] = useState(searchParams.get("order") || "asc")
  const [epigraphs, setEpigraphs] = useState<EpigraphsOutBasic | null>(null)
  const [fields, setFields] = useState<Record<string, string[]>>({})
  const [filters, setFilters] = useState({})

  useEffect(() => {
    const fetchFields = async () => {
      EpigraphsService.epigraphsGetAllFieldValues()
        .then((response) => {setFields(response) })
        .catch((error) => {
          console.error("Error fetching fields:", error)
        }
      )
    }
    fetchFields()
  }, [])

  console.log("filters", filters)

  const handleSearch = async () => {
    try {
      setSearchParams({
        q: searchTerm,
        sort: sortField,
        order: sortOrder,
        ...filters
      })

      const result = await EpigraphsService.epigraphsFilterEpigraphs({
        translationText: searchTerm,
        sortField: sortField,
        sortOrder: sortOrder,
        filters: JSON.stringify(filters),
      })
      setEpigraphs(result)
    } catch (error) {
      console.error("Error fetching epigraphs:", error)
    }
  }

  useEffect(() => {
    if (searchParams.get("q")) {
      handleSearch()
    }
  }, [])

  return (
    <div className="max-w-7xl p-4 mx-auto">
      <h1 className="text-2xl font-bold mb-4">Epigraph Translations Search</h1>

      <div className="mb-4 space-y-2">
        <p>The DASI project is missing a search feature for translations, so I built one here.
           You can sort the results by period, DASI ID, title, or language.</p>
        <p>At the moment, only exact phrase search is supported.</p>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <SearchField
          value={searchTerm}
          onChange={setSearchTerm}
          onSubmit={handleSearch}
          className="flex-1"
        >
          <Label className="block text-sm font-medium mb-1">Exact Phrase</Label>
          <div className="relative">
            <input 
              className="w-full border border-gray-400 p-2 pl-9 rounded"
              placeholder="Search within translations..."
            />
            <MagnifyingGlass className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
          </div>
        </SearchField>

        <Select 
          label="Sort By"
          selectedKey={sortField}
          onSelectionChange={(key) => setSortField(key.toString())}
          options={[
            { id: "period", label: "Period" },
            { id: "dasi_id", label: "DASI ID" },
            { id: "title", label: "Title" },
            { id: "language_level_1", label: "Language" }
          ]}
        />

        <Select
          label="Sort Order"
          selectedKey={sortOrder}
          onSelectionChange={(key) => setSortOrder(key.toString())}
          options={[
            { id: "asc", label: "Ascending" },
            { id: "desc", label: "Descending" }
          ]}
        />

        <Button
          onPress={handleSearch}
          className="bg-zinc-500 text-white px-4 py-2 rounded self-end"
        >
          Search
        </Button>
      </div>

      <AdvancedFilters
        values={filters}
        onChange={setFilters}
        fields={fields}
      />

      {epigraphs && (
        <div>
          <p className="mb-4">Found {epigraphs.count} results</p>
          <div className="space-y-4">
            {epigraphs.epigraphs.map((epigraph) => (
              <div key={epigraph.id} className="border border-gray-400 p-4 rounded-sm">
                <div className="flex justify-between mb-2">
                  <h2 className="font-bold">{epigraph.title}</h2>
                  <span className="text-gray-500">DASI ID: {epigraph.dasi_id}</span>
                </div>

                <div className="flex flex-wrap justify-between gap-1 mb-4 text-sm">
                  <div>
                    <span className="font-medium">Period:</span> {epigraph.period || "Unknown"}
                  </div>
                  <div>
                    <span className="font-medium">Language:</span>{' '}
                    {[epigraph.language_level_1, epigraph.language_level_2, epigraph.language_level_3]
                      .filter(Boolean).join(' → ')}
                  </div>
                  <div>
                    <span className="font-medium">Sites:</span>{' '}
                    {epigraph.sites?.map((site) => site.name).join(', ') || "Unknown"}
                  </div>
                  <div>
                    <a href={epigraph.uri} target="_blank" rel="noopener noreferrer"
                       className="text-blue-600 hover:underline">
                      View Source
                    </a>
                  </div>
                </div>

                {epigraph.translations && epigraph.translations.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-medium mb-2">Translations:</h3>
                    <div className="space-y-2">
                      {epigraph.translations.map((trans, idx) => (
                        <div key={idx} className="text-sm bg-gray-100/70 p-3 rounded">
                          <p>{trans.text}</p>
                          {trans.language && (
                            <p className="text-gray-500 text-xs mt-1">
                              Language: {trans.language}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Search