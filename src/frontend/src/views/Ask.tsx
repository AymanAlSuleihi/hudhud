import React, { useState, useEffect } from "react"
import { ChatDots, Warning } from "@phosphor-icons/react"
import { AskService } from "../client"
import { SearchField, Label } from "react-aria-components"
import { Spinner } from "../components/Spinner"
import { EpigraphCard } from "../components/EpigraphCard"

const Ask: React.FC = () => {
  const [query, setQuery] = useState<string>("")
  const [answer, setAnswer] = useState<string>("")
  const [epigraphs, setEpigraphs] = useState<any[]>([])
  const [sources, setSources] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [recentQueries, setRecentQueries] = useState<string[]>([])

  useEffect(() => {
    const savedQueries = localStorage.getItem("hudhudRecentQueries")
    if (savedQueries) {
      try {
        setRecentQueries(JSON.parse(savedQueries))
      } catch (e) {
        console.error("Failed to parse saved queries:", e)
      }
    }
  }, [])

  useEffect(() => {
    if (recentQueries.length > 0) {
      localStorage.setItem("hudhudRecentQueries", JSON.stringify(recentQueries))
    }
  }, [recentQueries])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!query.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      console.log("Querying Hudhud with:", query)
      const response = await AskService.askQueryHudhud({ requestBody: { query } })
      setAnswer(response.answer)

      if (response.epigraphs && Array.isArray(response.epigraphs)) {
        setEpigraphs(response.epigraphs)

        const sourcesFromEpigraphs = response.epigraphs.map(epigraph => 
          `Epigraph ${epigraph.id}${epigraph.title ? `: ${epigraph.title}` : ""}`
        )
        setSources(sourcesFromEpigraphs)
      } else {
        setEpigraphs([])
        setSources([])
      }

      if (!recentQueries.includes(query)) {
        const updatedQueries = [query, ...recentQueries].slice(0, 5)
        setRecentQueries(updatedQueries)
      }
    } catch (err) {
      setError("Sorry, there was an error processing your query. Please try again.")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestedQueryClick = (suggestedQuery: string) => {
    setQuery(suggestedQuery)
    const submitQuery = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await AskService.askQueryHudhud({ requestBody: { query: suggestedQuery } })
        setAnswer(response.answer)

        if (response.epigraphs && Array.isArray(response.epigraphs)) {
          setEpigraphs(response.epigraphs)

          const sourcesFromEpigraphs = response.epigraphs.map(epigraph => 
            `Epigraph ${epigraph.id}${epigraph.title ? `: ${epigraph.title}` : ""}`
          )
          setSources(sourcesFromEpigraphs)
        } else {
          setEpigraphs([])
          setSources([])
        }
      } catch (err) {
        setError("Sorry, there was an error processing your query. Please try again.")
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    submitQuery()
  }

  const suggestedQueries = [
    "What trade goods made Ancient South Arabia wealthy?",
    "Compare Sabaean and Himyarite kingdoms and their political systems",
    "How did inscriptions record water management in Ancient Yemen?",
    "What do we know about medicine and healing practices in Ancient South Arabia?",
    "Explain the relationship between incense trade and temple architecture",
    "What was the significance of the Marib Dam in Sabaean society?",
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-4">
        <SearchField
          onSubmit={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
        >
          <Label className="block text-sm font-medium mb-1">Ask Hudhud a question about Ancient South Arabia</Label>
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  handleSubmit({ preventDefault: () => {} } as React.FormEvent)
                }
                }}
                placeholder="e.g., What was the culture of Ancient South Arabia like? or How did the Sabaean kingdom fall?"
                className="w-full p-4 pr-20 border border-gray-300 rounded h-12"
                disabled={isLoading}
              />
            <button
              type="submit"
              disabled={isLoading}
              onClick={handleSubmit}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-zinc-600 hover:bg-zinc-500 text-white p-2 rounded"
            >
              {isLoading ? (
                <Spinner colour="#fff" size="w-6 h-6" />
              ) : (
                <ChatDots size={20} weight="bold" />
              )}
            </button>
          </div>
        </SearchField>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center p-10">
          <Spinner colour="#666" size="w-12 h-12 mb-4" />
          <p className="text-gray-600">Hudhud is searching the ancient texts...</p>
        </div>
      )}

      {!answer && !isLoading && !error && (
        <div className="mb-10">
          <div className="mb-8 p-6 bg-zinc-50 border border-zinc-200 rounded">
            <h2 className="text-lg font-semibold mb-3 text-gray-900">How Hudhud Works</h2>
            <div className="text-gray-800 space-y-2">
              <p className="text-sm">
                Hudhud is an AI assistant specialised in Ancient South Arabian history and epigraphy. Here's how it works:
              </p>
              <ul className="text-sm space-y-1 ml-4">
                <li className="flex items-start">
                  <span className="mr-2 mt-1">•</span>
                  <span><strong>Expert Knowledge:</strong> Trained on scholarly research about ancient Yemen, including the Sabaean, Himyarite, and other South Arabian kingdoms</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-1">•</span>
                  <span><strong>Epigraphic Sources:</strong> Searches through a database of ancient inscriptions and archaeological evidence</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-1">•</span>
                  <span><strong>Cited Answers:</strong> Provides responses with references to specific epigraphs and historical sources</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-1">•</span>
                  <span><strong>Academic Focus:</strong> Emphasises scholarly accuracy and archaeological evidence over speculation</span>
                </li>
              </ul>
            </div>
          </div>

          <h2 className="text-lg font-semibold mb-3">Try asking about:</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {suggestedQueries.map((q, index) => (
              <button
                key={index}
                onClick={() => handleSuggestedQueryClick(q)}
                className="text-left p-3 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
              >
                <span className="flex items-center">
                  {q}
                </span>
              </button>
            ))}
          </div>

          {recentQueries.length > 0 && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-3">Your recent queries (only you can see this):</h2>
              <div className="flex flex-wrap gap-2">
                {recentQueries.map((q, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestedQueryClick(q)}
                    className="text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded text-red-700 flex items-start">
          <Warning size={24} className="mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Error</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {answer && (
        <div className="bg-white border border-gray-200 rounded overflow-hidden">
          <div className="p-6">
            <div className="prose max-w-none">
              {answer.split('\n').map((paragraph, index) => {
                if (paragraph.trim() === '') return null

                if (paragraph.match(/^###\s+/)) {
                  return <h4 key={index} className="text-base font-semibold mt-3 mb-2">{paragraph.replace(/^###\s+/, "")}</h4>
                } else if (paragraph.match(/^##\s+/)) {
                  return <h3 key={index} className="text-lg font-semibold mt-4 mb-2">{paragraph.replace(/^##\s+/, "")}</h3>
                } else if (paragraph.match(/^#\s+/)) {
                  return <h2 key={index} className="text-xl font-semibold mt-5 mb-3">{paragraph.replace(/^#\s+/, "")}</h2>
                }

                else if (paragraph.match(/^\d+\.\s+/)) {
                  const numberMatch = paragraph.match(/^\d+\./)
                  return (
                    <div key={index} className="flex mb-3">
                      <span className="mr-2 font-medium">{numberMatch ? numberMatch[0] : ""}</span>
                      <p dangerouslySetInnerHTML={{ 
                        __html: paragraph.replace(/^\d+\.\s+/, "")
                          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                          .replace(/\*(.*?)\*/g, "<em>$1</em>")
                          .replace(/`(.*?)`/g, "<code>$1</code>")
                      }} />
                    </div>
                  )
                }

                else if (paragraph.match(/^[-*]\s+/)) {
                  return (
                    <div key={index} className="flex mb-3 ml-3">
                      <span className="mr-2">•</span>
                      <p dangerouslySetInnerHTML={{ 
                        __html: paragraph.replace(/^[-*]\s+/, "")
                          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                          .replace(/\*(.*?)\*/g, "<em>$1</em>")
                          .replace(/`(.*?)`/g, "<code>$1</code>")
                      }} />
                    </div>
                  )
                }

                else if (paragraph.match(/^\s+[-*]\s+/)) {
                  const indentMatch = paragraph.match(/^\s+/)
                  const indentLevel = indentMatch ? indentMatch[0].length / 2 : 0
                  return (
                    <div key={index} className={`flex mb-3 ml-${3 + indentLevel*2}`}>
                      <span className="mr-2">◦</span>
                      <p dangerouslySetInnerHTML={{ 
                        __html: paragraph.replace(/^\s+[-*]\s+/, "")
                          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                          .replace(/\*(.*?)\*/g, "<em>$1</em>")
                          .replace(/`(.*?)`/g, "<code>$1</code>")
                      }} />
                    </div>
                  )
                }

                else {
                  return <p key={index} className="mb-4" dangerouslySetInnerHTML={{ 
                    __html: paragraph
                      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                      .replace(/\*(.*?)\*/g, "<em>$1</em>")
                      .replace(/`(.*?)`/g, '<code class="px-1 py-0.5 bg-gray-100 rounded text-sm font-mono">$1</code>')
                  }} />
                }
              })}
            </div>

            <div className="bg-yellow-50 border-yellow-200 p-4 text-yellow-900 text-sm">
              <strong>AI Disclaimer:</strong> Hudhud might make mistakes. Please verify information independently and consult scholarly literature for critical research or academic use.
            </div>
          </div>

          {epigraphs.length > 0 && (
            <div className="bg-gray-50 p-6 border-t border-gray-200">
              <h3 className="font-semibold mb-4">Source Epigraphs</h3>
              <div className="space-y-6">
                {epigraphs.map((epigraph, index) => (
                  <EpigraphCard
                    key={index}
                    epigraph={epigraph}
                    notes={true}
                    bibliography={true}
                  />
                ))}
              </div>
            </div>
          )}

          {sources.length > 0 && (
            <div className="bg-gray-50 p-6 border-t border-gray-200">
              <h3 className="font-semibold mb-2">Sources</h3>
              <ul className="list-disc pl-5 space-y-1">
                {sources.map((source, index) => (
                  <li key={index} className="text-sm text-gray-600">{source}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Ask