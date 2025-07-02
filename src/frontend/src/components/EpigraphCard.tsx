import React from "react"
import { EpigraphOut } from "../client"
import { Link } from "react-router-dom"
import { Eye, ArrowSquareOut, WarningCircle } from "@phosphor-icons/react"
import { MyDisclosure } from "./Disclosure"
import TextRenderer from "./TextRenderer"
import { Button, Tooltip, TooltipTrigger, OverlayArrow } from "react-aria-components"

interface EpigraphCardProps {
  epigraph: EpigraphOut
  notes?: boolean
  bibliography?: boolean
}

export const EpigraphCard: React.FC<EpigraphCardProps> = ({
  epigraph,
  notes = false,
  bibliography = false,
}) => {
  const [highlightedLines, setHighlightedLines] = React.useState<{
    transIdx: number,
    lines: number[],
  }>({
    transIdx: -1,
    lines: [],
  })

  const parseLineRange = (lineStr: string | undefined): number[] => {
    if (!lineStr) return []
    return lineStr.split("-").map(Number).reduce((lines, num, i, range) => {
      if (range.length === 2 && i === 0) {
        return [...Array(range[1] - range[0] + 1)].map((_, i) => range[0] + i)
      }
      return [...lines, num]
    }, [] as number[])
  }

  return (
    <div className="border border-gray-400 p-4 rounded-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h2 className="font-bold text-lg">
            <Link to={`/epigraphs/${epigraph.id}`} className="hover:underline">
              {epigraph.title || "Untitled Epigraph"}
            </Link>
          </h2>
        </div>

      <div className="flex flex-col justify-start items-end">
        <div className="flex items-center gap-4 text-sm">
          <Link to={`/epigraphs/${epigraph.id}`} className="flex items-center gap-1 text-gray-700 hover:text-gray-500 transition-colors font-semibold">
            View on Hudhud
            <Eye size={16} />
          </Link>
          <TooltipTrigger delay={0}>
            <Button className="flex items-center gap-1 text-gray-700 hover:text-gray-500 transition-colors font-semibold p-0 bg-transparent border-none">
              <a href={epigraph.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                View on DASI
                <ArrowSquareOut size={16} />
              </a>
            </Button>
            <Tooltip>
              <OverlayArrow>
                <svg width={8} height={8} viewBox="0 0 8 8">
                  <path d="M0 0 L4 4 L8 0" />
                </svg>
              </OverlayArrow>
              <div className="bg-gray-100 border-gray-200 border drop-shadow px-2 py-1 rounded text-xs max-w-xs">
                Note: DASI may be temporarily offline or experiencing downtime
              </div>
            </Tooltip>
          </TooltipTrigger>
          <span className="text-gray-700 font-semibold">DASI ID: {epigraph.dasi_id}</span>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
      {/* Temporal data */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-2">Temporal</h3>
        <div>
          <span className="font-medium">Period:</span> {epigraph.period || "Unknown"}
          {epigraph.period && epigraph.chronology_conjectural && <span className="text-gray-500 italic"> (conjectural)</span>}
          {epigraph.objects && epigraph.objects.length > 0 && (
            <>
              {epigraph.objects.map((obj, idx) => (
                <div>
                  {obj.start_date && obj.end_date && (
                    <>
                      <span className="font-medium">Range: </span>{obj.start_date} - {obj.end_date}
                    </>
                  )}
                </div>
              ))}
            </>
          )}
          {epigraph.mentioned_date && (
            <div className="mt-1">
              <span className="font-medium">Mentioned Date:</span> {epigraph.mentioned_date}
            </div>
          )}
        </div>
      </div>

      {/* Physical data */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-2">Physical</h3>
        {epigraph.objects && epigraph.objects.length > 0 && (
          <div>
            {epigraph.objects.map((obj, idx) => (
              <>
                {obj.support_type_level_1 && (
                  <div key={idx} className="text-sm mb-1">
                    <span className="font-medium">Support: </span> {[
                      obj.support_type_level_1,
                      obj.support_type_level_2,
                      obj.support_type_level_3,
                      obj.support_type_level_4,
                    ].filter(Boolean).join(" → ") || "Unknown"}
                  </div>
                )}

                {obj.materials && obj.materials.length > 0 && (
                  <div className="mt-1">
                    <span className="font-medium">Materials:</span> {obj.materials.join(", ")}
                  </div>
                )}
              </>
            ))}
          </div>
        )}
      </div>

      {/* Linguistic data */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-2">Linguistic</h3>
        <div>
          <span className="font-medium">Language: </span> {[
            epigraph.language_level_1,
            epigraph.language_level_2,
            epigraph.language_level_3,
          ].filter(Boolean).join(" → ") || "Unknown"}
          {epigraph.alphabet && (
            <div className="mt-1">
              <span className="font-medium">Alphabet:</span> {epigraph.alphabet}
            </div>
          )}
          {epigraph.script_typology && (
            <div className="mt-1">
              <span className="font-medium">Script Typology:</span> {epigraph.script_typology}
            </div>
          )}
          {epigraph.script_cursus && (
            <div className="mt-1">
              <span className="font-medium">Script Cursus:</span> {epigraph.script_cursus}
            </div>
          )}
          {epigraph.textual_typology && (
            <div className="mt-1">
              <span className="font-medium">Textual Typology:</span> {epigraph.textual_typology}
              {epigraph.textual_typology_conjectural && <span className="text-gray-500 italic"> (conjectural)</span>}
            </div>
          )}
          {epigraph.writing_techniques && (
            <div className="mt-1">
              <span className="font-medium">Writing Techniques:</span> {epigraph.writing_techniques}
            </div>
          )}
          {epigraph.royal_inscription && (
            <div className="mt-1">
              <span className="font-medium">Royal Inscription:</span> {epigraph.royal_inscription ? "Yes" : "No"}
            </div>
          )}
        </div>
      </div>

      {/* Spatial data */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-2">Spatial</h3>
        {epigraph.sites_objs && epigraph.sites_objs.length > 0 && (
          <div>
            {epigraph.sites_objs.map((site, idx) => (
              <div key={idx} className="text-sm mb-1">
                <span className="font-medium">Site: </span> {[
                  site.modern_name,
                  site.governorate,
                  site.country,
                ].filter(item => item && item !== "Unknown").join(", ") || "Unknown"}
                {site.ancient_name && (
                  <div className="mt-1">
                    <span className="font-medium">Ancient Name:</span> {site.ancient_name}
                  </div>
                )}
                {site.type_of_site && (
                  <div className="mt-1">
                    <span className="font-medium">Type of Site:</span> {site.type_of_site}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {epigraph.objects && epigraph.objects.length > 0 && (
          <div>
            {epigraph.objects.map((obj, idx) => (
              <>
                {obj.deposits && obj.deposits.length > 0 && (
                  <>
                  {obj.deposits.map((deposit, depositIdx) => (
                    <div key={depositIdx} className="mt-1">
                      <span className="font-medium">Deposit:</span>
                      <div className="ml-2 text-s">
                        {Object.entries(deposit).map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span> {String(value)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  </>
                )}
                
              </>
            ))}
          </div>
        )}
      </div>
    </div>

    {epigraph.epigraph_text && (
      <div className="mt-4">
<div className="flex items-center gap-2 mb-2">
        <h3 className="font-medium">Text:</h3>
<div className="flex items-center gap-1 p-2 bg-yellow-100 border border-yellow-300 rounded text-yellow-800 text-xs">
            <WarningCircle size={12} />
            Development in progress - Text rendering may be inaccurate or incomplete.
          </div>
        </div>
        <div className="text-sm bg-gray-100/70 p-3 rounded">
          <TextRenderer text={epigraph.epigraph_text} />
        </div>
      </div>
    )}

    {epigraph.translations && epigraph.translations.length > 0 && (
      <div className="mt-4">
        <h3 className="font-medium mb-2">Translations:</h3>
        <div className="space-y-2">
          {epigraph.translations.map((trans, idx) => (
            <div key={idx} className="text-sm bg-gray-100/70 p-3 rounded">
              <div className="mb-4">
                <pre className="font-sans whitespace-pre-wrap">
                  {trans.text.split("\n").map((line, i) => (
                    <span 
                      key={i} 
                      className={`flex px-4 py-[2px] hover:bg-slate-200 cursor-pointer transition-colors
                        ${highlightedLines.transIdx === idx && 
                          highlightedLines.lines.includes(i + 1) ? "bg-slate-200" : ""}`}
                      onMouseEnter={() => setHighlightedLines({
                        transIdx: idx,
                        lines: [i + 1]
                      })}
                      onMouseLeave={() => setHighlightedLines({
                        transIdx: -1,
                        lines: []
                      })}
                      onClick={() => {
                        const note = trans.notes?.find(n => 
                          parseLineRange(n.line).includes(i + 1)
                        )
                        if (note) {
                          console.log('Note clicked:', note)
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
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <p className="text-xs font-medium text-gray-600 mb-1">Translation Notes:</p>
                  <div className="space-y-1">
                    {trans.notes.map((note, noteIdx) => (
                      <div 
                        key={noteIdx} 
                        className={`flex px-3 py-[2px] rounded text-xs hover:bg-slate-200 cursor-pointer transition-colors
                          ${note.line &&
                            highlightedLines.transIdx === idx && 
                            parseLineRange(note.line).some(l => 
                              highlightedLines.lines.includes(l)) ? "!bg-slate-200" : ""}`}
                        onMouseEnter={() => note.line && setHighlightedLines({
                          transIdx: idx,
                          lines: parseLineRange(note.line)
                        })}
                        onMouseLeave={() => setHighlightedLines({
                          transIdx: -1,
                          lines: []
                        })}
                        onClick={() => {
                          const lineNum = parseLineRange(note.line)[0]
                          const text = trans.text.split("\n")[lineNum - 1]
                          console.log('Note clicked:', note, 'Line:', lineNum, 'Text:', text)
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

    {notes && (
      epigraph.general_notes ||
      epigraph.aparatus_notes ||
      epigraph.cultural_notes ||
      epigraph.objects.some(obj => obj.support_notes || obj.deposit_notes || obj.cultural_notes?.length > 0)) &&
    (
      <div className="mt-4">
        <MyDisclosure title="Notes">
          <div className="ml-2">
            {epigraph.general_notes && (
              <div className="mt-4">
                <h3 className="font-medium mb-2">General Notes:</h3>
                <div className="text-sm bg-gray-100/70 p-3 rounded">
                  <p>{epigraph.general_notes}</p>
                </div>
              </div>
            )}
            {epigraph.aparatus_notes && Array.isArray(epigraph.aparatus_notes) && (epigraph.aparatus_notes as {note: string, line?: string}[]).length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium mb-2">Apparatus Notes:</h3>
                <div className="space-y-2">
                  {(epigraph.aparatus_notes as {note: string, line?: string}[]).map((note, idx) => (
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
              </div>
            )}
            {epigraph.cultural_notes && Array.isArray(epigraph.cultural_notes) && (epigraph.cultural_notes as {note: string, topic?: string}[]).length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium mb-2">Cultural Notes:</h3>
                <div className="space-y-2">
                  {(epigraph.cultural_notes as {note: string, topic?: string}[]).map((note, idx) => (
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
              </div>
            )}
            {epigraph.objects && epigraph.objects.length > 0 && epigraph.objects.map((obj, objIdx) => (
              <div key={objIdx}>
                {obj.support_notes && (
                  <div className="mt-4">
                    <h3 className="font-medium mb-2">Support Notes:</h3>
                    <div className="text-sm bg-gray-100/70 p-3 rounded">
                      <p>{obj.support_notes}</p>
                    </div>
                  </div>
                )}
                {obj.deposit_notes && (
                  <div className="mt-4">
                    <h3 className="font-medium mb-2">Deposit Notes:</h3>
                    <div className="text-sm bg-gray-100/70 p-3 rounded">
                      <p>{obj.deposit_notes}</p>
                    </div>
                  </div>
                )}
                {obj.cultural_notes && obj.cultural_notes.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-medium mb-2">Object Cultural Notes:</h3>
                    <div className="space-y-2">
                      {obj.cultural_notes.map((note, idx) => (
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
                  </div>
                )}
              </div>
            ))}
          </div>
        </MyDisclosure>
      </div>
    )}

    {bibliography && epigraph.bibliography && Array.isArray(epigraph.bibliography) && (epigraph.bibliography as {reference: string, page?: string}[]).length > 0 && (
      <div className="mt-4">
        <MyDisclosure title="Bibliography">
          <div className="space-y-2 ml-2">
            {(epigraph.bibliography as {reference: string, page?: string}[]).map((bib, idx) => (
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
  )
}

export default EpigraphCard