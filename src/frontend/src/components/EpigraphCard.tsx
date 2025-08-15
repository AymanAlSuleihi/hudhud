import React from "react"
import { EpigraphOut } from "../client"
import { Link } from "react-router-dom"
import { Eye, Image, ArrowSquareOut, WarningCircle, X, MagnifyingGlass } from "@phosphor-icons/react"
import { MyDisclosure } from "./Disclosure"
import TextRenderer from "./TextRenderer"
import { Button, Tooltip, TooltipTrigger, OverlayArrow, ModalOverlay } from "react-aria-components"
import Carousel from "./Carousel"

interface EpigraphCardProps {
  epigraph: EpigraphOut
  notes?: boolean
  bibliography?: boolean
  hideHudhudLink?: boolean
}

export const EpigraphCard: React.FC<EpigraphCardProps> = ({
  epigraph,
  notes = false,
  bibliography = false,
  hideHudhudLink = false,
}) => {
  const [highlightedLines, setHighlightedLines] = React.useState<{
    transIdx: number,
    lines: number[],
  }>({
    transIdx: -1,
    lines: [],
  })

  const [enlargedImage, setEnlargedImage] = React.useState<{
    images: Array<{
      id: string
      caption?: string
    }>
    currentIndex: number
  } | null>(null)

  const parseLineRange = (lineStr: string | undefined): number[] => {
    if (!lineStr) return []
    return lineStr.split("-").map(Number).reduce((lines, num, i, range) => {
      if (range.length === 2 && i === 0) {
        return [...Array(range[1] - range[0] + 1)].map((_, i) => range[0] + i)
      }
      return [...lines, num]
    }, [] as number[])
  }

  let lineOffset = 0
  try {
    if (epigraph.epigraph_text) {
      const match = epigraph.epigraph_text.match(/<lb[^>]*n=["']undefined["'][^>]*>/)
      if (match) lineOffset = 1
    }
  } catch (e) {}

  const getDisplayLineNum = (i: number) => i - lineOffset + 1

  const renderObjectField = (obj: any, depth: number = 0): JSX.Element => {
    if (obj === null || obj === undefined) return <span className="text-gray-400">N/A</span>
    
    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
      return <span>{String(obj)}</span>
    }
    
    if (Array.isArray(obj)) {
      if (obj.length === 0) return <span className="text-gray-400">None</span>
      return (
        <div className={`space-y-1 ${depth > 0 ? 'ml-2' : ''}`}>
          {obj.map((item, idx) => (
            <div key={idx} className="flex bg-red-100">
              <br />
              <div className="flex-1">
                {renderObjectField(item, depth + 1)}
              </div>
            </div>
          ))}
        </div>
      )
    }
    
    if (typeof obj === 'object') {
      const entries = Object.entries(obj).filter(([_, value]) => 
        value !== null && value !== undefined && value !== ''
      )
      if (entries.length === 0) return <span className="text-gray-400">Empty</span>
      
      return (
        <div className={`space-y-1 bg-blue-100 ${depth > 0 ? 'ml-2' : ''}`}>
          {entries.map(([key, value]) => (
            <div key={key} className="flex flex-wrap gap-1 bg-green-100">
              <span className="font-medium text-gray-600 capitalize flex-shrink-0">
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
              </span>
              <div className="flex-1 min-w-0">
                {renderObjectField(value, depth + 1)}
              </div>
            </div>
          ))}
        </div>
      )
    }
    
    return <span>{String(obj)}</span>
  }

  return (
    <div className="border border-gray-400 p-4 rounded-sm backdrop-blur-xs drop-shadow-md shadow-sm">
      <div className="flex flex-col sm:flex-row sm:flex-wrap justify-between items-start sm:items-center gap-2 border-b border-gray-200 pb-4 mb-4">
        <div className="flex-grow">
          <h2 className="font-bold text-lg">
            <Link to={`/epigraphs/${epigraph.id}`} className="hover:underline">
              {epigraph.title || "Untitled Epigraph"}
            </Link>
          </h2>
        </div>
        <div className="flex flex-col justify-start items-end">
          <div className="flex items-center gap-2 sm:gap-2 text-sm flex-wrap">
            {!hideHudhudLink && (
              <Link to={`/epigraphs/${epigraph.id}`} className="flex items-center gap-1 px-2 sm:px-3 py-2 rounded shadow border border-gray-900 hover:border-gray-700 hover:text-gray-700 transition-colors font-semibold h-8 whitespace-nowrap">
                <span className="hidden sm:inline">View on Hudhud</span>
                <span className="sm:hidden">Hudhud</span>
                <Eye size={16} />
              </Link>
            )}
            <TooltipTrigger delay={0}>
              <Button className="flex items-center gap-1 px-2 sm:px-3 py-2 rounded shadow border border-gray-900 hover:border-gray-700 hover:text-gray-700 transition-colors font-semibold h-8 whitespace-nowrap">
                <a href={epigraph.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                  <span className="hidden sm:inline">View on DASI</span>
                  <span className="sm:hidden">DASI</span>
                  <ArrowSquareOut size={16} />
                </a>
              </Button>
              <Tooltip>
                <OverlayArrow>
                  <svg width={8} height={8} viewBox="0 0 8 8">
                    <path d="M0 0 L4 4 L8 0" />
                  </svg>
                </OverlayArrow>
                <div className="backdrop-blur-sm border bg-transparent border-gray-200 drop-shadow px-2 py-1 rounded text-xs max-w-xs">
                  Note: DASI may be temporarily offline or experiencing downtime
                </div>
              </Tooltip>
            </TooltipTrigger>
            <span className="text-gray-700 font-semibold text-xs sm:text-sm">
              <span className="hidden sm:inline">DASI ID: </span>
              <span className="sm:hidden">ID: </span>
              {epigraph.dasi_id}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse md:flex-row gap-0 mt-2">
        <div className="flex-1 min-w-0 md:pr-6">
          {Array.isArray((epigraph as any).images) && (epigraph as any).images.length > 0 && (
            <div className="mb-4 border-gray-200 pb-4">
              <div className="flex flex-wrap gap-4">
                {((epigraph as any).images as any[]).map((image: any, idx: number) => (
                  <div key={idx} className="max-w-sm flex-1 min-w-[220px]">
                    {image.copyright_free && (
                      <div className="bg-white/40 backdrop-blur-xs rounded-lg p-3 h-full flex flex-col border border-gray-200">
                        <div className="flex-shrink-0 mb-3 relative group aspect-[4/3] w-full">
                          <img
                            src={`/public/images/rec_${image.image_id}_high.jpg`}
                            alt={image.caption || "Epigraph Image"}
                            className="w-full h-full object-cover rounded-md bg-white border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                            style={{ minHeight: "120px", maxHeight: "320px" }}
                            onClick={() => {
                              const copyrightFreeImages = ((epigraph as any).images as any[])?.filter((img: any) => img.copyright_free) || []
                              const currentImageIndex = copyrightFreeImages.findIndex((img: any) => img.image_id === image.image_id)
                              setEnlargedImage({ 
                                images: copyrightFreeImages.map((img: any) => ({ id: img.image_id, caption: img.caption })),
                                currentIndex: currentImageIndex
                              })
                            }}
                            onError={(e) => {
                              e.currentTarget.style.display = "none"
                              const errorDiv = e.currentTarget.nextElementSibling as HTMLElement
                              if (errorDiv) errorDiv.style.display = "block"
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center transition-all duration-200 rounded-md cursor-pointer opacity-0 group-hover:opacity-100"
                               onClick={() => {
                                 const copyrightFreeImages = ((epigraph as any).images as any[])?.filter((img: any) => img.copyright_free) || []
                                 const currentImageIndex = copyrightFreeImages.findIndex((img: any) => img.image_id === image.image_id)
                                 setEnlargedImage({ 
                                   images: copyrightFreeImages.map((img: any) => ({ id: img.image_id, caption: img.caption })),
                                   currentIndex: currentImageIndex
                                 })
                               }}>
                            <MagnifyingGlass size={32} className="text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" />
                          </div>
                          <div className="hidden text-red-500 text-sm mt-2" style={{display: "none"}}>
                            <div className="flex items-center gap-2">
                              <WarningCircle size={16} />
                              <span>Image failed to load</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex-grow">
                          {image.caption && (
                            <p className="text-sm text-gray-600 leading-relaxed mb-2">{image.caption}</p>
                          )}
                        </div>
                      </div>
                    )}
                    {!image.copyright_free && (
                      <div className="bg-white/40 backdrop-blur-xs border border-gray-200 rounded-lg p-4 text-center h-full flex flex-col justify-center min-h-[200px]">
                        <div className="flex flex-col my-auto">
                        <div className="mx-auto text-gray-500 mb-3">
                          <Image size={32} />
                        </div>
                        <p className="text-gray-700 text-sm font-medium mb-1">External image</p>
                        <p className="text-gray-600 text-xs mb-3">Available on source website</p>
                        {image.caption && (
                          <p className="text-gray-600 text-xs italic mb-3">"{image.caption}"</p>
                        )}
                        </div>

                        <button 
                          onClick={() => window.open(`https://dasi.cnr.it/de/cgi-bin/wsimg.pl?recId=${image.image_id}&size=high`, "_blank", "noopener,noreferrer")}
                          className="rounded shadow border border-gray-900 hover:border-gray-700 hover:text-gray-700 text-xs font-semibold px-3 py-2 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>View image on DASI</span>
                          <ArrowSquareOut size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {epigraph.epigraph_text && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-medium">Text:</h3>
              </div>
              <div className="text-sm bg-white/30 backdrop-blur-xs p-3 rounded border border-gray-200">
                <TextRenderer 
                  text={epigraph.epigraph_text} 
                  highlightedLines={highlightedLines.lines}
                  onLineHover={(lineNum: number | null) => {
                    if (lineNum == null) {
                      setHighlightedLines({ transIdx: -1, lines: [] })
                      return
                    }
                    let foundTransIdx = -1
                    if (Array.isArray((epigraph as any).translations)) {
                      for (let idx = 0; idx < (epigraph as any).translations.length; idx++) {
                        const trans = (epigraph as any).translations[idx]
                        const lines = trans.text?.split("\n") ?? []
                        for (let i = 0; i < lines.length; i++) {
                          const displayLineNum = getDisplayLineNum(i)
                          if (displayLineNum === lineNum) {
                            foundTransIdx = idx
                            break
                          }
                        }
                        if (foundTransIdx !== -1) break
                      }
                    }
                    setHighlightedLines({ transIdx: foundTransIdx, lines: [lineNum] })
                  }}
                />
              </div>
            </div>
          )}

          {Array.isArray((epigraph as any).translations) && (epigraph as any).translations.length > 0 && (
            <div className="mb-4">
              <h3 className="font-medium mb-2">Translations:</h3>
              <div className="space-y-2">
                {((epigraph as any).translations as any[]).map((trans: any, idx: number) => (
                  <div key={idx} className="text-sm bg-white/30 backdrop-blur-xs p-3 rounded border border-gray-200">
                    <div className="mb-4">
                      <pre className="font-sans whitespace-pre-wrap">
                        {(trans.text?.startsWith('@@') ? trans.text.slice(4) : trans.text)
                          ?.split("\n")
                          .map((line: string, i: number) => {
                            const displayLineNum = getDisplayLineNum(i)
                            return (
                              <span 
                                key={i} 
                                className={`flex py-[2px] cursor-pointer transition-all duration-200 border-yellow-400
                                  ${highlightedLines.transIdx === idx && highlightedLines.lines.includes(displayLineNum) ? "bg-yellow-100/70 backdrop-blur-sm shadow-md border-l-4 scale-[103%]" : ""}`}
                                onMouseEnter={() => {
                                  setHighlightedLines({ transIdx: idx, lines: [displayLineNum] })
                                }}
                                onMouseLeave={() => {
                                  setHighlightedLines({ transIdx: -1, lines: [] })
                                }}
                                onFocus={() => {
                                  setHighlightedLines({ transIdx: idx, lines: [displayLineNum] })
                                }}
                                onBlur={() => {
                                  setHighlightedLines({ transIdx: -1, lines: [] })
                                }}
                                data-line={i + 1}
                              >
                                <span className="inline-block text-left text-gray-400 select-none mx-4">
                                  {displayLineNum > 0 ? displayLineNum : ""}
                                </span>
                                {line}
                              </span>
                            )
                          })}
                      </pre>
                      <div className="justify-between flex flex-wrap gap-2 mt-2">
                      </div>
                    </div>

                    {trans.notes && trans.notes.length > 0 && (
                      <div className="border-t border-gray-200 pt-2 mt-2">
                        <p className="text-xs font-medium text-gray-600 mb-1">Translation Notes:</p>
                        <div className="space-y-1">
                          {trans.notes.map((note: any, noteIdx: number) => (
                            <div 
                              key={noteIdx} 
                              className={`flex py-[2px] rounded text-xs cursor-pointer transition-all duration-200 border-blue-300
                                ${note.line &&
                                  highlightedLines.transIdx === idx && 
                                  parseLineRange(note.line).some(l => 
                                    highlightedLines.lines.includes(l)) ? "!bg-blue-100/70 backdrop-blur-sm shadow-md border-l-4 scale-105" : ""}`}
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
                              console.log("Note clicked:", note, "Line:", lineNum, "Text:", text)
                            }}
                            data-line={note.line}
                            >
                              <span className="text-gray-400 mr-4 w-8 shrink-0 select-none inline-block text-right">{note.line}</span>
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
            epigraph.apparatus_notes ||
            epigraph.cultural_notes ||
            (epigraph.objects?.some(obj => obj.support_notes || obj.deposit_notes || Array.isArray((obj as any).cultural_notes) && (obj as any).cultural_notes.length > 0) || false)) &&
          (
            <div className="mb-4">
              <MyDisclosure title="Notes">
                <div className="ml-2">
                  {epigraph.general_notes && (
                    <div className="mt-4">
                      <h3 className="font-medium mb-2">General Notes:</h3>
                      <div className="text-sm bg-white/30 backdrop-blur-xs p-3 rounded border border-gray-200">
                        <p>{epigraph.general_notes}</p>
                      </div>
                    </div>
                  )}
                  {epigraph.apparatus_notes && Array.isArray(epigraph.apparatus_notes) && (epigraph.apparatus_notes as {note: string, line?: string}[]).length > 0 && (
                    <div className="mt-4">
                      <h3 className="font-medium mb-2">Apparatus Notes:</h3>
                      <div className="space-y-2">
                        {(epigraph.apparatus_notes as {note: string, line?: string}[]).map((note, idx) => (
                          <div key={idx} className="text-sm bg-white/30 backdrop-blur-xs p-3 rounded border border-gray-200">
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
                          <div key={idx} className="text-sm bg-white/30 backdrop-blur-xs p-3 rounded border border-gray-200">
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
                          <div className="text-sm bg-white/30 backdrop-blur-xs p-3 rounded border border-gray-200">
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
                      {Array.isArray((obj as any).cultural_notes) && (obj as any).cultural_notes.length > 0 && (
                        <div className="mt-4">
                          <h3 className="font-medium mb-2">Object Cultural Notes:</h3>
                          <div className="space-y-2">
                            {((obj as any).cultural_notes as any[]).map((note: any, idx: number) => (
                              <div key={idx} className="text-sm bg-white/30 backdrop-blur-xs p-3 rounded border border-gray-200">
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
            <div className="mb-4">
              <MyDisclosure title="Bibliography">
                <div className="space-y-2 ml-2">
                  {(epigraph.bibliography as {reference: string, page?: string}[]).map((bib, idx) => (
                    <div key={idx} className="text-sm bg-white/30 backdrop-blur-xs p-3 rounded border border-gray-200">
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

        <div className="w-full md:w-100 flex-shrink-0 md:border-t-0 md:border-l border-gray-200 bg-white/20 backdrop-blur-xs md:bg-transparent md:backdrop-blur-none">
          <div className="flex flex-col divide-y divide-gray-200 text-sm">
            {(epigraph.period || epigraph.chronology_conjectural || epigraph.mentioned_date || 
              (epigraph.objects && epigraph.objects.some(obj => obj.start_date && obj.end_date))) && (
            <div className="p-4">
              <h3 className="font-semibold text-gray-700 mb-2">Chronological</h3>
              <div>
                <span className="font-medium">Period:</span> {epigraph.period || "Unknown"}
                {epigraph.period && epigraph.chronology_conjectural && <span className="text-gray-500 italic"> (conjectural)</span>}
                {epigraph.objects && epigraph.objects.length > 0 && (
                  <>
                    {epigraph.objects.map((obj) => (
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
            )}

            {((epigraph.objects && epigraph.objects.length > 0 && epigraph.objects.some(obj => 
              obj.support_type_level_1 || obj.materials || obj.shape || obj.measures || 
              (Array.isArray((obj as any).decorations) && (obj as any).decorations.length > 0)
            )) || epigraph.letter_measure) && (
            <div className="p-4">
              <h3 className="font-semibold text-gray-700 mb-2">Physical</h3>
              {epigraph.objects && epigraph.objects.length > 0 && (
                <div>
                  {epigraph.objects.map((obj, idx) => (
                    <div key={idx} className="mb-3 last:mb-0">
                      {obj.support_type_level_1 && (
                        <div className="text-sm mb-1">
                          <span className="font-medium">Support: </span> {[
                            obj.support_type_level_1,
                            obj.support_type_level_2,
                            obj.support_type_level_3,
                            obj.support_type_level_4,
                          ].filter(Boolean).join(" → ") || "Unknown"}
                        </div>
                      )}

                      {obj.materials && Array.isArray(obj.materials) && obj.materials.length > 0 && (
                        <div className="mt-1">
                          <span className="font-medium">Materials:</span> {obj.materials.join(", ")}
                        </div>
                      )}

                      {obj.shape && (
                        <div className="mt-1">
                          <span className="font-medium">Shape:</span> {obj.shape}
                        </div>
                      )}

                      {obj.measures && (
                        <div className="mt-1">
                          <span className="font-medium">Measures:</span> {obj.measures}
                        </div>
                      )}

                      {Array.isArray((obj as any).decorations) && (obj as any).decorations.length > 0 && (
                        <div className="mt-1">
                          <span className="font-medium">Decorations:</span>
                          <div className="text-sm mt-1 space-y-2">
                            {((obj as any).decorations as any[]).map((decoration: any, decIdx: number) => {
                              const renderValue = (value: any, depth: number = 0): JSX.Element => {
                                if (value === null || value === undefined) return <span className="text-gray-400">N/A</span>
                                
                                if (Array.isArray(value)) {
                                  if (value.length === 0) return <span className="text-gray-400">None</span>
                                  return (
                                    <div className="space-y-2">
                                      {value.map((item, idx) => (
                                        <div key={idx} className={`${depth > 0 ? 'ml-3' : ''} ${idx > 0 ? 'border-t border-gray-200 pt-1' : ''}`}>
                                          {renderValue(item, depth + 1)}
                                        </div>
                                      ))}
                                    </div>
                                  )
                                }
                                
                                if (typeof value === 'object') {
                                  return (
                                    <div className="space-y-1">
                                      {Object.entries(value)
                                        .filter(([_, v]) => v !== null && v !== undefined && v !== '')
                                        .map(([k, v]) => (
                                          <div key={k} className={`${depth > 0 ? 'ml-3' : ''}`}>
                                            <span className="font-medium capitalize">
                                              {k.replace(/([A-Z])/g, ' $1').replace(/(\d)/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                                            </span>{' '}
                                            <span className="">
                                              {typeof v === 'object' || Array.isArray(v) ? '' : String(v)}
                                            </span>
                                            {(typeof v === 'object' || Array.isArray(v)) && (
                                              <div className="mt-1">
                                                {renderValue(v, depth + 1)}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                    </div>
                                  )
                                }
                                
                                return <span className="text-gray-800">{String(value)}</span>
                              }

                              return (
                                <div key={decIdx} className={`px-2 py-1 rounded-sm text-sm ${decIdx > 0 ? 'mt-2 pt-2' : ''}`}>
                                  {typeof decoration === 'string' ? (
                                    <span>{decoration}</span>
                                  ) : (
                                    <div className="space-y-1">
                                      {Object.entries(decoration).filter(([_, value]) => 
                                        value !== null && value !== undefined && value !== ''
                                      ).map(([key, value]) => (
                                        <div key={key}>
                                          <span className="font-medium capitalize">
                                            {key.replace(/([A-Z])/g, ' $1').replace(/(\d)/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                                          </span>{' '}
                                          <span className="">
                                            {typeof value === 'object' || Array.isArray(value) ? '' : String(value)}
                                          </span>
                                          {(typeof value === 'object' || Array.isArray(value)) && (
                                            <div className="mt-1">
                                              {renderValue(value, 1)}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {epigraph.letter_measure && (
                <div className="mt-1">
                  <span className="font-medium">Letter Measure:</span> {epigraph.letter_measure}
                </div>
              )}
            </div>
            )}

            {(epigraph.language_level_1 || epigraph.language_level_2 || epigraph.language_level_3 || 
              epigraph.alphabet || epigraph.script_typology || epigraph.textual_typology || epigraph.royal_inscription ||
              (Array.isArray((epigraph as any).script_cursus) && (epigraph as any).script_cursus.length > 0) ||
              (Array.isArray((epigraph as any).writing_techniques) && (epigraph as any).writing_techniques.length > 0) ||
              (Array.isArray((epigraph as any).concordances) && (epigraph as any).concordances.length > 0)) && (
            <div className="p-4">
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
                {Array.isArray((epigraph as any).script_cursus) && (epigraph as any).script_cursus.length > 0 && (
                  <div className="mt-1">
                    <span className="font-medium">Script Cursus:</span> {((epigraph as any).script_cursus as string[]).join(", ")}
                  </div>
                )}
                {epigraph.textual_typology && (
                  <div className="mt-1">
                    <span className="font-medium">Textual Typology:</span> {epigraph.textual_typology}
                    {epigraph.textual_typology_conjectural && <span className="text-gray-500 italic"> (conjectural)</span>}
                  </div>
                )}
                {Array.isArray((epigraph as any).writing_techniques) && (epigraph as any).writing_techniques.length > 0 && (
                  <div className="mt-1">
                    <span className="font-medium">Writing Techniques:</span> {((epigraph as any).writing_techniques as string[]).join(", ")}
                  </div>
                )}
                {epigraph.royal_inscription && (
                  <div className="mt-1">
                    <span className="font-medium">Royal Inscription:</span> {epigraph.royal_inscription ? "Yes" : "No"}
                  </div>
                )}
                {Array.isArray((epigraph as any).concordances) && (epigraph as any).concordances.length > 0 && (
                  <div className="mt-1">
                    <span className="font-medium">Concordances:</span> {((epigraph as any).concordances as string[]).join(", ")}
                  </div>
                )}
              </div>
            </div>
            )}

            {((epigraph.sites_objs && epigraph.sites_objs.length > 0) || 
              (epigraph.objects && epigraph.objects.length > 0 && epigraph.objects.some(obj => 
                Array.isArray((obj as any).deposits) && (obj as any).deposits.length > 0
              ))) && (
            <div className="p-4">
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
                  {epigraph.objects.map((obj) => (
                    <>
                      {Array.isArray((obj as any).deposits) && (obj as any).deposits.length > 0 && (
                        <>
                        {(obj as any).deposits.map((deposit: any, depositIdx: number) => (
                          <div key={depositIdx} className="mt-1">
                            <span className="font-medium">Deposit:</span>
                            <div className="ml-2 text-s">
                              {Object.entries(deposit).map(([key, value]) => (
                                <div key={key}>
                                  <span className="font-medium capitalize">{key.replace(/([A-Z])/g, " $1")}:</span> {String(value)}
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
            )}
          </div>
        </div>
      </div>

      {enlargedImage && (
        <ModalOverlay 
          isOpen={!!enlargedImage} 
          onOpenChange={() => setEnlargedImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
          <div className="w-[90vw] h-[90vh] max-w-4xl max-h-[90vh] flex flex-col items-center justify-center">
            <Button 
              className="absolute top-4 right-4 px-4 pt-4 text-gray-400 hover:text-gray-600 transition-colors border-none bg-transparent flex-shrink-0 z-10"
              onPress={() => setEnlargedImage(null)}
            >
              <X size={28} />
            </Button>
            <div className="flex-1 flex flex-col items-center justify-center w-full h-full">
              {enlargedImage.images.length > 1 ? (
                <div className="w-full h-full flex flex-col items-center justify-center ">
                  <Carousel 
                    slides={enlargedImage.images.map(img => ({
                      thumbnailSrc: `/public/images/rec_${img.id}_high.jpg`,
                      hdSrc: `/public/images/rec_${img.id}_high.jpg`
                    }))}
                    options={{ startIndex: enlargedImage.currentIndex }}
                  />
                  {enlargedImage.images[enlargedImage.currentIndex]?.caption && (
                    <div className="flex justify-center w-full mt-2">
                      <div className="bg-black/70 backdrop-blur-sm px-4 py-2 rounded text-sm text-gray-100 max-w-lg text-center shadow-lg">
                        {enlargedImage.images[enlargedImage.currentIndex]?.caption}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-full">
                  <img
                    src={`/public/images/rec_${enlargedImage.images[0]?.id}_high.jpg`}
                    alt={enlargedImage.images[0]?.caption || "Epigraph Image"}
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      console.error("Failed to load enlarged image")
                      e.currentTarget.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzljYTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkZhaWxlZCB0byBsb2FkIGltYWdlPC90ZXh0Pjwvc3ZnPg=="
                    }}
                  />
                  {enlargedImage.images[0]?.caption && (
                    <div className="flex justify-center w-full mt-2">
                      <div className="bg-black/70 backdrop-blur-sm px-4 py-2 rounded text-sm text-gray-100 max-w-lg text-center shadow-lg">
                        {enlargedImage.images[0]?.caption}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}

export default EpigraphCard