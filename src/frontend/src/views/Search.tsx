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
import { MyDisclosure } from "../components/Disclosure"

const Search: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "")
  const [sortField, setSortField] = useState(searchParams.get("sort") || "period")
  const [sortOrder, setSortOrder] = useState(searchParams.get("order") || "asc")
  const [epigraphs, setEpigraphs] = useState<EpigraphsOutBasic | null>(null)
  const [searchFields, setSearchFields] = useState({
    translationText: true,
    notes: true,
    bibliography: true,
  })
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get("page") || 1))
  const [pageSize] = useState(25)
  const [highlightedLines, setHighlightedLines] = useState<{
    epigraphIdx: number,
    transIdx: number,
    lines: number[],
  }>({
    epigraphIdx: -1,
    transIdx: -1,
    lines: [],
  })
  type Note = {
    note: string
    line?: string
    topic?: string
  }

  const [selectedNote, setSelectedNote] = useState<{
    transIdx: number,
    note: Note | null,
    text: string | null,
    lineNumber: number | null
  }>({ transIdx: -1, note: null, text: null, lineNumber: null })

  const parseLineRange = (lineStr: string | undefined): number[] => {
    if (!lineStr) return []
    return lineStr.split('-').map(Number).reduce((lines, num, i, range) => {
      if (range.length === 2 && i === 0) {
        return [...Array(range[1] - range[0] + 1)].map((_, i) => range[0] + i)
      }
      return [...lines, num]
    }, [] as number[])
  }

  // useEffect(() => {
  //   const fetchFields = async () => {
  //     EpigraphsService.epigraphsGetAllFieldValues()
  //       .then((response) => {setFields(response) })
  //       .catch((error) => {
  //         console.error("Error fetching fields:", error)
  //       }
  //     )
  //   }
  //   fetchFields()
  // }, [])


  const handleSearch = async (term: string, page: number = currentPage) => {
    if (term) {
      setSearchTerm(term)
    }
    try {
      setSearchParams({
        q: term,
        sort: sortField,
        order: sortOrder,
        page: page.toString(),
      })

      const field_map = {
        translationText: searchFields.translationText ? ["translations"] : [],
        // text: searchFields.text ? ["text"] : [],
        notes: searchFields.notes ? ["general_notes", "aparatus_notes", "cultural_notes"] : [],
        bibliography: searchFields.bibliography ? ["bibliography"] : [],
      }
      const fields = Object.values(field_map)
        .flat()
        .filter(Boolean)
        .join(',')

      const result = await EpigraphsService.epigraphsFullTextSearchEpigraphs({
        searchText: term,
        fields: fields,
        sortField: sortField,
        sortOrder: sortOrder,
        skip: (page - 1) * pageSize,
        limit: pageSize,
      })
      setEpigraphs(result)
      setCurrentPage(page)
    } catch (error) {
      console.error("Error fetching epigraphs:", error)
    }
  }

  useEffect(() => {
    if (searchParams.get("q")) {
      const page = Number(searchParams.get("page")) || 1
      handleSearch(searchParams.get("q") || "", page)
    }
  }, [])

  const renderPagination = () => {
    if (!epigraphs) return null
    const totalPages = Math.ceil(epigraphs.count / pageSize)
    return (
      <div className="mt-6 flex justify-center gap-2">
        <button
          onClick={() => handleSearch(searchTerm, currentPage - 1)}
          disabled={currentPage <= 1}
          className="px-3 py-1 rounded bg-gray-100 disabled:opacity-50"
        >
          Previous
        </button>
        <span className="px-3 py-1">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => handleSearch(searchTerm, currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-3 py-1 rounded bg-gray-100 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    )
  }

  const handleNoteClick = (idx: number, note: Note, text: string, lineNumber: number) => {
    setSelectedNote({ 
      transIdx: idx, 
      note,
      text,
      lineNumber
    })
  }

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
          onSubmit={handleSearch}
          className="flex-1"
        >
          <Label className="block text-sm font-medium mb-1">Exact Phrase</Label>
          <div className="relative">
            <input 
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      console.log("searchTerm", e.currentTarget.value)
                      handleSearch(e.currentTarget.value)
                    }
                  }}
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
              onPress={() => handleSearch(searchTerm)}
          className="bg-zinc-500 text-white px-4 py-2 rounded self-end"
        >
          Search
        </Button>

            <div className="w-full flex gap-2 items-center">
              <Label className="text-sm font-medium">Search within:</Label>
              <ToggleButton
                isSelected={searchFields.translationText}
                onChange={selected => setSearchFields(prev => ({...prev, translationText: selected}))}
                className={({isSelected}) => `
                  px-3 py-1 rounded text-sm
                  ${isSelected ? 'bg-zinc-700 text-white' : 'bg-gray-100'}
                `}
              >
                Translations
              </ToggleButton>
              <ToggleButton
                isSelected={searchFields.notes}
                onChange={selected => setSearchFields(prev => ({...prev, notes: selected}))}
                className={({isSelected}) => `
                  px-3 py-1 rounded text-sm
                  ${isSelected ? 'bg-zinc-700 text-white' : 'bg-gray-100'}
                `}
              >
                Notes
              </ToggleButton>
              <ToggleButton
                isSelected={searchFields.bibliography}
                onChange={selected => setSearchFields(prev => ({...prev, bibliography: selected}))}
                className={({isSelected}) => `
                  px-3 py-1 rounded text-sm
                  ${isSelected ? 'bg-zinc-700 text-white' : 'bg-gray-100'}
                `}
              >
                Bibliography
              </ToggleButton>
            </div>
      </div>

      {epigraphs && (
        <div>
          <p className="mb-4">Found {epigraphs.count} results</p>
          <div className="space-y-4">
                {epigraphs.epigraphs.map((epigraph, epigraphIdx) => (
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
                        <div className="space-y-4">
                      {epigraph.translations.map((trans, idx) => (
                            <div key={idx} className="bg-gray-100/70 rounded p-3 border border-gray-400">
                              <div className="mb-4">
                                <pre className="font-sans whitespace-pre-wrap">
                                  {trans.text.split('\n').map((line, i) => (
                                    <span 
                                      key={i} 
                                      className={`flex px-4 py-[2px] hover:bg-slate-200 cursor-pointer transition-colors
                                        ${highlightedLines.epigraphIdx === epigraphIdx &&
                                          highlightedLines.transIdx === idx && 
                                          highlightedLines.lines.includes(i + 1) ? 'bg-slate-200' : ''}`}
                                      onMouseEnter={() => setHighlightedLines({
                                        epigraphIdx: epigraphIdx,
                                        transIdx: idx,
                                        lines: [i + 1]
                                      })}
                                      onMouseLeave={() => setHighlightedLines({
                                        epigraphIdx: -1,
                                        transIdx: -1,
                                        lines: []
                                      })}
                                      onClick={() => {
                                        const note = trans.notes?.find(n => 
                                          parseLineRange(n.line).includes(i + 1)
                                        )
                                        if (note) {
                                          handleNoteClick(idx, note, line, i + 1)
                                        }
                                      }}
                                      data-line={i + 1}
                                    >
                                      <span className="text-gray-400 w-8 shrink-0 select-none">{i + 1}</span>
                                      <span>{line}</span>
                                    </span>
                                  ))}
                                </pre>
                                <div className="justify-between flex flex-wrap gap-2 mt-2">
                          {trans.language && (
                                    <p className="text-gray-500 text-xs">
                              Language: {trans.language}
                            </p>
                                  )}
                                  {trans.label && (
                                    <p className="text-gray-500 text-xs">
                                      Label: {trans.label}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {trans.notes && trans.notes.length > 0 && (
                                <div className="border-t border-gray-200 p-3 mt-3">
                                  <p className="text-sm font-medium mb-2">Translation Notes:</p>
                                  <div className="space-y-1">
                                    {trans.notes.map((note, noteIdx) => (
                                      <div 
                                        key={noteIdx} 
                                        className={`flex px-3 py-[2px] rounded text-sm hover:bg-slate-200 cursor-pointer transition-colors
                                          ${note.line &&
                                            highlightedLines.transIdx === idx && 
                                            highlightedLines.epigraphIdx === epigraphIdx &&
                                            parseLineRange(note.line).some(l => 
                                              highlightedLines.lines.includes(l)) ? '!bg-slate-200' : ''}`}
                                        onMouseEnter={() => note.line && setHighlightedLines({
                                          epigraphIdx: epigraphIdx,
                                          transIdx: idx,
                                          lines: parseLineRange(note.line)
                                        })}
                                        onMouseLeave={() => setHighlightedLines({
                                          epigraphIdx: -1,
                                          transIdx: -1,
                                          lines: []
                                        })}
                                        onClick={() => {
                                          const lineNum = parseLineRange(note.line)[0]
                                          const text = trans.text.split('\n')[lineNum - 1]
                                          handleNoteClick(idx, note, text, lineNum)
                                        }}
                                        data-line={note.line}
                                      >
                                        <span className="text-gray-400 w-8 shrink-0 select-none">{note.line}</span>
                                        <span>{note.note}</span>
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

                    {epigraph.general_notes && (
                      <div className="mt-4">
                        <MyDisclosure title="General Notes">
                          <div className="text-sm bg-gray-100/70 p-3 rounded">
                            <p>{epigraph.general_notes}</p>
                          </div>
                        </MyDisclosure>
                      </div>
                    )}
                    {epigraph.aparatus_notes && (
                      <div className="mt-4">
                        <MyDisclosure title="Apparatus Notes">
                          <div className="space-y-2">
                            {epigraph.aparatus_notes.map((note, idx) => (
                              <div key={idx} className="text-sm bg-gray-100/70 p-3 rounded">
                                <p>{note.note}</p>
                                {note.line && (
                                  <p className="text-gray-500 text-xs mt-1">
                                    Line: {note.line}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </MyDisclosure>
                      </div>
                    )}
                    {epigraph.cultural_notes && (
                      <div className="mt-4">
                        <MyDisclosure title="Cultural Notes">
                          <div className="space-y-2">
                            {epigraph.cultural_notes.map((note, idx) => (
                              <div key={idx} className="text-sm bg-gray-100/70 p-3 rounded">
                                <p>{note.note}</p>
                                {note.topic && (
                                  <p className="text-gray-500 text-xs mt-1">
                                    Topic: {note.topic}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </MyDisclosure>
                      </div>
                    )}
                    {epigraph.bibliography && (
                      <div className="mt-4">
                        <MyDisclosure title="Bibliography">
                          <div className="space-y-2">
                            {epigraph.bibliography.map((bib, idx) => (
                              <div key={idx} className="text-sm bg-gray-100/70 p-3 rounded">
                                <p>{bib.reference}</p>
                                {bib.page && (
                                  <p className="text-gray-500 text-xs mt-1">
                                    Page: {bib.page}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </MyDisclosure>
                  </div>
                )}
              </div>
            ))}
          </div>
              {renderPagination()}
        </div>
      )}
        </div>
    </div>
  )
}

export default Search