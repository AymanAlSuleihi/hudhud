import React, { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { EpigraphsService, EpigraphsOutBasic } from "../client"

const Epigraphs: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "")
  const [sortField, setSortField] = useState(searchParams.get("sort") || "period")
  const [sortOrder, setSortOrder] = useState(searchParams.get("order") || "asc")
  const [epigraphs, setEpigraphs] = useState<EpigraphsOutBasic | null>(null)

  const handleSearch = async () => {
    try {
      setSearchParams({
        q: searchTerm,
        sort: sortField,
        order: sortOrder,
      })

      const result = await EpigraphsService.epigraphsFilterEpigraphs({
        translationText: searchTerm,
        sortField: sortField,
        sortOrder: sortOrder,
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

      <p className="mb-4">
        The DASI project is missing a search feature for translations, so I built one here.
        You can sort the results by period, DASI ID, title, or language.
      </p>

      <p className="mb-4">
        At the moment, only exact phrase search is supported. More advanced search features will be added in the future.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Exact Phrase
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="border border-gray-400 p-2 rounded"
            placeholder="Search within translations..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Sort By
          </label>
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value)}
            className="border border-gray-400 p-2 rounded"
          >
            <option value="period">Period</option>
            <option value="dasi_id">DASI ID</option>
            <option value="title">Title</option>
            <option value="language_level_1">Language</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Sort Order
          </label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="border border-gray-400 p-2 rounded"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
        
        <button
          onClick={handleSearch}
          className="bg-zinc-500 text-white px-4 py-2 rounded self-end"
        >
          Search
        </button>
      </div>

      {epigraphs && (
        <div>
          <p className="mb-4">Found {epigraphs.count} results</p>
          <div className="space-y-4">
            {epigraphs.epigraphs.map((epigraph) => (
              <div key={epigraph.id} className="border border-gray-400 p-4 rounded-sm">
                <div className="flex justify-between mb-2">
                  <h2 className="font-bold">{epigraph.title}</h2>
                  <div>
                    <span className="text-gray-500">DASI ID: {epigraph.dasi_id}</span>
                  </div>
                </div>

                <div className="flex flex-wrap justify-between gap-1 mb-4 text-sm">
                  <div>
                    <span className="font-medium">Period:</span> {epigraph.period || "Unknown"}
                  </div>
                  <div>
                    <span className="font-medium">Language:</span>{' '}
                    {[
                      epigraph.language_level_1,
                      epigraph.language_level_2,
                      epigraph.language_level_3
                    ].filter(Boolean).join(' → ')}
                  </div>
                  <div>
                    <span className="font-medium">Sites:</span>{' '}
                    {epigraph.sites?.map((site) => site.name).join(', ') || "Unknown"}
                  </div>
                  <div className="self-start">
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

export default Epigraphs