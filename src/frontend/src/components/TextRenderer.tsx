import React, { useState } from "react"
import { ToggleButton } from "react-aria-components"
import { WarningCircle } from "@phosphor-icons/react"

interface TagProps {
  tagName: string
  attributes: Record<string, string | undefined>
  children: React.ReactNode
  showMarkers: boolean
}

const Tag: React.FC<TagProps> = ({ tagName, attributes, children, showMarkers }) => {
  const [isHovered, setIsHovered] = useState(false)

  const getColorClasses = (tagName: string, type: string | undefined, subtype: string | undefined) => {
    const tagColorMap: Record<string, { bg: string, tooltip: string }> = {
      persName: { bg: "bg-blue-500/30", tooltip: "bg-blue-500/80" },
      orgName: { bg: "bg-green-500/30", tooltip: "bg-green-500/80" },
      placename: { bg: "bg-purple-500/30", tooltip: "bg-purple-500/80" },
      rs: { bg: "bg-yellow-500/30", tooltip: "bg-yellow-500/80" },
      surplus: { bg: "bg-stone-400/30", tooltip: "bg-stone-400/80" },
    }

    const typeColorMap: Record<string, { bg: string, tooltip: string }> = {
      royal: { bg: "bg-purple-600/30", tooltip: "bg-purple-600/80" },
      gender: { bg: "bg-pink-500/30", tooltip: "bg-pink-500/80" },
      group: { bg: "bg-emerald-500/30", tooltip: "bg-emerald-500/80" },
      complex: { bg: "bg-amber-500/30", tooltip: "bg-amber-500/80" },
      divine: { bg: "bg-red-600/30", tooltip: "bg-red-600/80" },
      theonym: { bg: "bg-red-500/30", tooltip: "bg-red-500/80" },
      place: { bg: "bg-indigo-500/30", tooltip: "bg-indigo-500/80" },
      building: { bg: "bg-indigo-600/30", tooltip: "bg-indigo-600/80" },
      sanctuary: { bg: "bg-teal-500/30", tooltip: "bg-teal-500/80" },
      patronymic: { bg: "bg-sky-700/30", tooltip: "bg-sky-700/80" },
      tribe: { bg: "bg-amber-700/30", tooltip: "bg-amber-700/80" },
      epithet: { bg: "bg-orange-500/30", tooltip: "bg-orange-500/80" },
      ciphers: { bg: "bg-cyan-700/30", tooltip: "bg-cyan-700/80" },
    }

    const subtypeColorMap: Record<string, { bg: string, tooltip: string }> = {
      withoutTitle: { bg: "bg-blue-600/30", tooltip: "bg-blue-600/80" },
      withTitle: { bg: "bg-purple-600/30", tooltip: "bg-purple-600/80" },
      m: { bg: "bg-cyan-500/30", tooltip: "bg-cyan-500/80" },
      f: { bg: "bg-rose-500/30", tooltip: "bg-rose-500/80" },
      divine: { bg: "bg-orange-700/30", tooltip: "bg-orange-700/80" },
    }

    let colors = tagColorMap[tagName] || { bg: "bg-gray-500/30", tooltip: "bg-gray-500/80" }

    if (type && typeColorMap[type]) {
      colors = typeColorMap[type]
    }

    if (subtype && subtypeColorMap[subtype]) {
      colors = subtypeColorMap[subtype]
    }

    return colors
  }

  const tooltipContent = Object.entries(attributes)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ")

  const colors = getColorClasses(tagName, attributes.type, attributes.subtype)

  const showTooltip = tagName !== "rs" && showMarkers

  return (
    <span 
      className={`${showMarkers ? colors.bg : ""} ${showMarkers ? "rounded px-1 cursor-pointer" : ""} relative mx-0.5`}
      title={showTooltip ? (tooltipContent || tagName) : undefined}
      onMouseEnter={(e) => {
        if (showTooltip) {
          e.stopPropagation()
          setIsHovered(true)
        }
      }}
      onMouseLeave={() => {
        if (showTooltip) {
          setIsHovered(false)
        }
      }}
    >
      {children}
      {showTooltip && isHovered && (
        <div className={`${colors.tooltip} border-gray-200 border drop-shadow px-2 py-1 rounded text-sm absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 text-white shadow-lg`}>
          {tooltipContent || tagName}
        </div>
      )}
    </span>
  )
}

interface TextRendererProps {
  text: string
  showMarkers?: boolean
  highlightedLines?: number[]
  onLineHover?: (lineNum: number | null) => void
}

const TextRenderer: React.FC<TextRendererProps> = ({ text, showMarkers: initialShowMarkers = true, highlightedLines = [], onLineHover }) => {
  const [showMarkers, setShowMarkers] = useState(initialShowMarkers)
  const parser = new DOMParser()
  const doc = parser.parseFromString(text, "text/xml")

  const renderNode = (node: Node): React.ReactNode => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element
      const tagName = element.tagName.toLowerCase()

      if (tagName === "milestone") {
        return "-"
      }

      if (tagName === "supplied") {
        const reason = element.getAttribute("reason")
        if (reason === "lost") {
          return (
            <span className="">
              [
              {Array.from(element.childNodes).map((child, index) => (
                <React.Fragment key={index}>
                  {renderNode(child)}
                </React.Fragment>
              ))}
              ]
            </span>
          )
        }

        return (
          <React.Fragment>
            {Array.from(element.childNodes).map((child, index) => (
              <React.Fragment key={index}>
                {renderNode(child)}
              </React.Fragment>
            ))}
          </React.Fragment>
        )
      }

      if (tagName === "gap") {
        const unit = element.getAttribute("unit")
        const reason = element.getAttribute("reason")
        const quantity = element.getAttribute("quantity")

        if (reason === "lost" && unit === "character" && quantity) {
          const dots = ".".repeat(Math.min(parseInt(quantity), 5))
          return <span className="">[{dots}]</span>
        }

        return <span className="">[...]</span>
      }

      if (tagName === "lb") {
        const lineNum = element.getAttribute("n")
        const isLineBreak = element.getAttribute("break") === "no"
        const displayLineNum = lineNum === "undefined" ? "" : lineNum
        const numericLineNum = lineNum && lineNum !== "undefined" ? parseInt(lineNum) : undefined
        const allLbElements = Array.from(doc.querySelectorAll("lb"))
        const isFirstLbElement = allLbElements[0] === element
        const isHighlighted = numericLineNum && highlightedLines.includes(numericLineNum)
        const highlightClass = isHighlighted ? "bg-slate-200" : ""
        const handleEnter = () => onLineHover && numericLineNum && onLineHover(numericLineNum)
        const handleLeave = () => onLineHover && onLineHover(null)

        if (lineNum === "1" && isFirstLbElement) {
          return <span className={`text-gray-400 text-sm mr-4 inline-block w-8 text-right ${highlightClass}`}
            onMouseEnter={handleEnter} onMouseLeave={handleLeave}>{displayLineNum}</span>
        } else {
          return (
            <React.Fragment>
              {isLineBreak && <span className="text-gray-500 text-sm">—</span>}
              {!isFirstLbElement && <br />}
              <span className={`text-gray-400 text-sm mr-4 inline-block w-8 text-right ${highlightClass}`}
                onMouseEnter={handleEnter} onMouseLeave={handleLeave}>{displayLineNum}</span>
            </React.Fragment>
          )
        }
      }

      const attributes: Record<string, string | undefined> = {}
      element.getAttributeNames().forEach(attr => {
        attributes[attr] = element.getAttribute(attr) ?? undefined
      })

      const hasLineBreaks = Array.from(element.querySelectorAll("lb")).length > 0

      if (hasLineBreaks) {
        const children = Array.from(element.childNodes)
        const parts: React.ReactNode[] = []
        let currentPart: React.ReactNode[] = []
        
        children.forEach((child, index) => {
          if (child.nodeType === Node.ELEMENT_NODE && (child as Element).tagName.toLowerCase() === "lb") {
            if (currentPart.length > 0) {
              parts.push(
                <Tag key={`part-${index}`} tagName={tagName} attributes={attributes} showMarkers={showMarkers}>
                  {currentPart}
                </Tag>
              )
              currentPart = []
            }
            parts.push(
              <React.Fragment key={`lb-${index}`}>
                {renderNode(child)}
              </React.Fragment>
            )
          } else {
            currentPart.push(
              <React.Fragment key={index}>
                {renderNode(child)}
              </React.Fragment>
            )
          }
        })

        if (currentPart.length > 0) {
          parts.push(
            <Tag key="final-part" tagName={tagName} attributes={attributes} showMarkers={showMarkers}>
              {currentPart}
            </Tag>
          )
        }

        return <React.Fragment>{parts}</React.Fragment>
      }

      return (
        <Tag
          tagName={tagName}
          attributes={attributes}
          showMarkers={showMarkers}
        >
          {Array.from(element.childNodes).map((child, index) => (
            <React.Fragment key={index}>
              {renderNode(child)}
            </React.Fragment>
          ))}
        </Tag>
      )
    }

    return null
  }

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center text-sm mb-2 ml-5 gap-2">
        <div className="flex-shrink-0 w-auto">
          <ToggleButton 
            isSelected={showMarkers}
            onChange={setShowMarkers}
            className="group flex items-center px-3 py-2 h-8 rounded border border-gray-300 bg-white hover:bg-gray-50 data-[selected]:bg-zinc-600 data-[selected]:text-white transition-colors cursor-pointer w-auto min-w-[140px] max-w-[180px]"
          >
            <span className="font-medium whitespace-nowrap">
              Semantic Markers
            </span>
          </ToggleButton>
        </div>
        <div className="flex items-center gap-1 p-2 lg:ml-3 bg-yellow-100 border border-yellow-300 rounded text-yellow-800 text-xs">
          <WarningCircle size={16} className="min-w-[16px] min-h-[16px]" />
          Development in progress - Text rendering may be inaccurate, incomplete, or misaligned.
        </div>
      </div>

      <div className="font-sans leading-relaxed">
        {Array.from(doc.documentElement.childNodes).map((node, index) => (
          <React.Fragment key={index}>
            {renderNode(node)}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

export default TextRenderer