import React, { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { Warning, PaperPlaneRight, Trash, BookOpen, InstagramLogo, EnvelopeSimple, ArrowLeft, CaretLeft, CaretRight } from "@phosphor-icons/react"
import { Spinner } from "../components/Spinner"
import { EpigraphCard } from "../components/EpigraphCard"
import { MetaTags } from "../components/MetaTags"
import { getDefaultMetaTags } from "../utils/metaTags"

interface Message {
  id: string
  type: "user" | "assistant" | "error"
  text: string
  epigraphs?: any[]
  timestamp: Date
}

const Ask: React.FC = () => {
  const [query, setQuery] = useState<string>("")
  const [messages, setMessages] = useState<Message[]>(() => {
    const baseTime = Date.now()
    return [
      {
        id: `${baseTime}`,
        type: "assistant",
        text: "Hey there! I'm **Hudhud**, your guide to Ancient South Arabia.",
        timestamp: new Date(baseTime)
      },
      {
        id: `${baseTime + 1}`,
        type: "assistant",
        text: "I can help you explore the kingdoms, inscriptions, and history of ancient Yemen — from Sabaʾ and Ḥimyar to the fascinating world of pre-Islamic Arabia.",
        timestamp: new Date(baseTime + 1000)
      },
      {
        id: `${baseTime + 2}`,
        type: "assistant",
        text: "I'm trained on scholarly research and have access to thousands of ancient inscriptions. When I answer your questions, I'll cite the specific epigraphs I'm referencing.",
        timestamp: new Date(baseTime + 2000)
      },
      {
        id: `${baseTime + 3}`,
        type: "assistant",
        text: "**Quick note:** I'm still learning and might make mistakes. Always verify important information. For advanced searches, check out the [Epigraphs Page](/epigraphs).",
        timestamp: new Date(baseTime + 3000)
      },
      {
        id: `${baseTime + 4}`,
        type: "assistant",
        text: "So... what would you like to know? Ask me about trade routes, royal inscriptions, temples, or anything else about Ancient South Arabia! 🏛️",
        timestamp: new Date(baseTime + 4000)
      }
    ]
  })
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null) // Track which message is streaming
  const [recentQueries, setRecentQueries] = useState<string[]>([])
  const [currentEpigraphs, setCurrentEpigraphs] = useState<any[]>([])
  const [messageEpigraphs, setMessageEpigraphs] = useState<Map<string, any[]>>(new Map()) // Store epigraphs by message ID
  const [epigraphHistory, setEpigraphHistory] = useState<{ epigraphs: any[], messageId: string }[]>([]) // Track epigraph sets history
  const [currentEpigraphIndex, setCurrentEpigraphIndex] = useState<number>(-1) // Current position in history
  const [sidebarWidth, setSidebarWidth] = useState<number>(50) // percentage
  const [isResizing, setIsResizing] = useState<boolean>(false)
  const [dragPosition, setDragPosition] = useState<number | null>(null) // x position in pixels during drag
  const [mobileView, setMobileView] = useState<"chat" | "info">("chat") // Mobile view toggle
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const epigraphRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const infoPanelRef = useRef<HTMLDivElement>(null)

  const scrollToEpigraph = (epigraphId: string, messageId?: string) => {
    // If a messageId is provided, switch to that message's epigraphs first
    if (messageId) {
      const epigraphs = messageEpigraphs.get(messageId)
      if (epigraphs) {
        updateCurrentEpigraphs(epigraphs, messageId)
        // Wait for the epigraphs to render before scrolling
        setTimeout(() => {
          const element = epigraphRefs.current[epigraphId]
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" })
            // Highlight effect
            element.style.transition = "background-color 0.3s"
            element.style.backgroundColor = "#fef3c7"
            setTimeout(() => {
              element.style.backgroundColor = ""
            }, 2000)
          }
        }, 100)
        return
      }
    }

    // Otherwise just try to scroll to the element if it's already rendered
    const element = epigraphRefs.current[epigraphId]
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" })
      element.style.transition = "background-color 0.3s"
      element.style.backgroundColor = "#fef3c7"
      setTimeout(() => {
        element.style.backgroundColor = ""
      }, 2000)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const updateCurrentEpigraphs = (epigraphs: any[], messageId: string) => {
    // Check if this set is already the current one
    if (currentEpigraphIndex >= 0 && 
        epigraphHistory[currentEpigraphIndex]?.messageId === messageId &&
        JSON.stringify(epigraphHistory[currentEpigraphIndex]?.epigraphs) === JSON.stringify(epigraphs)) {
      return // Already showing this set
    }

    setCurrentEpigraphs(epigraphs)

    // Add to history if not empty
    if (epigraphs.length > 0) {
      const newEntry = { epigraphs, messageId }

      // If we're not at the end of history, remove everything after current index
      const newHistory = currentEpigraphIndex >= 0 
        ? [...epigraphHistory.slice(0, currentEpigraphIndex + 1), newEntry]
        : [...epigraphHistory, newEntry]

      setEpigraphHistory(newHistory)
      setCurrentEpigraphIndex(newHistory.length - 1)
    }
  }

  const navigateEpigraphs = (direction: "prev" | "next") => {
    const newIndex = direction === "prev" 
      ? Math.max(0, currentEpigraphIndex - 1)
      : Math.min(epigraphHistory.length - 1, currentEpigraphIndex + 1)

    if (newIndex !== currentEpigraphIndex && epigraphHistory[newIndex]) {
      setCurrentEpigraphIndex(newIndex)
      setCurrentEpigraphs(epigraphHistory[newIndex].epigraphs)

      // Scroll to the corresponding message in the chat
      const messageId = epigraphHistory[newIndex].messageId
      setTimeout(() => {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"] > div`) as HTMLElement
        const chatContainer = document.querySelector(".flex-1.overflow-y-auto.bg-white.scrollbar-offset-top") as HTMLElement

        if (messageElement && chatContainer) {
          const containerRect = chatContainer.getBoundingClientRect()
          const elementRect = messageElement.getBoundingClientRect()
          const relativeTop = elementRect.top - containerRect.top + chatContainer.scrollTop

          chatContainer.scrollTo({
            top: Math.max(0, relativeTop - 95),
            behavior: "smooth"
          })

          const originalBg = messageElement.style.backgroundColor
          messageElement.style.transition = "background-color 0.3s"
          messageElement.style.backgroundColor = "#fef3c7"
          setTimeout(() => {
            messageElement.style.backgroundColor = originalBg
          }, 2000)
        }
      }, 100)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true)
    setDragPosition(e.clientX)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return
    setDragPosition(e.clientX)
  }

  const handleMouseUp = (e: MouseEvent) => {
    if (isResizing && dragPosition !== null) {
      const newWidth = (e.clientX / window.innerWidth) * 100
      if (newWidth < 30) {
        setSidebarWidth(70)
      } else if (newWidth > 70) {
        setSidebarWidth(30)
      } else {
        setSidebarWidth(100 - newWidth)
      }
    }
    setIsResizing(false)
    setDragPosition(null)
  }

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"
    } else {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
  }, [isResizing])

  useEffect(() => {
    // Prevent body scroll when Ask page is mounted
    document.body.style.overflow = "hidden"
    document.documentElement.style.overflow = "hidden"
    document.documentElement.style.scrollbarGutter = "auto"
    document.body.style.width = "100vw"
    document.body.style.margin = "0"
    document.body.style.padding = "0"

    return () => {
      // Restore body scroll when Ask page is unmounted
      document.body.style.overflow = ""
      document.documentElement.style.overflow = ""
      document.documentElement.style.scrollbarGutter = ""
      document.body.style.width = ""
      document.body.style.margin = ""
      document.body.style.padding = ""
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages.length])

  useEffect(() => {
    // Scroll info panel to top when new epigraphs are loaded
    if (currentEpigraphs.length > 0 && infoPanelRef.current) {
      infoPanelRef.current.scrollTo({ top: 0, behavior: "smooth" })
    }
  }, [currentEpigraphs])

  useEffect(() => {
    const handleEpigraphClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.classList.contains("epigraph-link")) {
        e.preventDefault()
        const epigraphKey = target.getAttribute("data-epigraph")
        const messageId = target.getAttribute("data-message-id")
        if (epigraphKey) {
          scrollToEpigraph(epigraphKey, messageId || undefined)
        }
      }
    }

    document.addEventListener("click", handleEpigraphClick)
    return () => {
      document.removeEventListener("click", handleEpigraphClick)
    }
  }, [messageEpigraphs])

  useEffect(() => {
    const savedQueries = localStorage.getItem("hudhudRecentQueries")
    if (savedQueries) {
      try {
        setRecentQueries(JSON.parse(savedQueries))
      } catch (e) {
        console.error("Failed to parse saved queries:", e)
      }
    }

    // Load saved conversation
    const savedMessages = localStorage.getItem("hudhudChatHistory")
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages)
        const parsedMessages = parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
        setMessages(parsedMessages)

        // Rebuild messageEpigraphs map from saved messages
        const epigraphsMap = new Map<string, any[]>()
        const historyEntries: { epigraphs: any[], messageId: string }[] = []

        parsedMessages.forEach((msg: Message) => {
          if (msg.epigraphs && msg.epigraphs.length > 0) {
            epigraphsMap.set(msg.id, msg.epigraphs)
            historyEntries.push({ epigraphs: msg.epigraphs, messageId: msg.id })
          }
        })
        setMessageEpigraphs(epigraphsMap)

        // Set up history with the most recent epigraphs
        if (historyEntries.length > 0) {
          setEpigraphHistory(historyEntries)
          const lastEntry = historyEntries[historyEntries.length - 1]
          setCurrentEpigraphs(lastEntry.epigraphs)
          setCurrentEpigraphIndex(historyEntries.length - 1)
        }
      } catch (e) {
        console.error("Failed to parse saved messages:", e)
      }
    }
  }, [])

  useEffect(() => {
    if (recentQueries.length > 0) {
      localStorage.setItem("hudhudRecentQueries", JSON.stringify(recentQueries))
    }
  }, [recentQueries])

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("hudhudChatHistory", JSON.stringify(messages))
    }
  }, [messages])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()

    if (!query.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      text: query,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setQuery("")
    setIsLoading(true)

    // Adjust textarea height
    if (inputRef.current) {
      inputRef.current.style.height = "auto"
    }

    // Create assistant message that will be updated with streaming content
    const assistantMessageId = (Date.now() + 1).toString()
    const assistantMessage: Message = {
      id: assistantMessageId,
      type: "assistant",
      text: "",
      epigraphs: [],
      timestamp: new Date()
    }

    setMessages(prev => [...prev, assistantMessage])
    setStreamingMessageId(assistantMessageId)

    try {
      const conversationHistory = messages
        .filter(msg => msg.text && !msg.id.startsWith(Date.now().toString().slice(0, -4))) // Filter out welcome messages
        .map(msg => ({
          role: msg.type === "user" ? "user" : "assistant",
          content: msg.text
        }))

      const response = await fetch("/api/v1/ask/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          query: userMessage.text,
          conversation_history: conversationHistory
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error("Response body is not readable")
      }

      let accumulatedText = ""
      let receivedEpigraphs: any[] = []
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk

        const messages = buffer.split("\n\n")

        // Keep the last incomplete message in the buffer
        buffer = messages.pop() || ""

        for (const message of messages) {
          if (message.startsWith("data: ")) {
            try {
              const data = JSON.parse(message.slice(6))

              if (data.type === "token") {
                accumulatedText += data.content
                // Update the message in real-time
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, text: accumulatedText }
                      : msg
                  )
                )
              } else if (data.type === "epigraphs") {
                receivedEpigraphs = data.content
                // Update message with epigraphs
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, epigraphs: receivedEpigraphs }
                      : msg
                  )
                )

                // Store epigraphs for this message
                if (receivedEpigraphs.length > 0) {
                  setMessageEpigraphs(prev => {
                    const newMap = new Map(prev)
                    newMap.set(assistantMessageId, receivedEpigraphs)
                    return newMap
                  })
                  // Update the sidebar with the latest epigraphs
                  updateCurrentEpigraphs(receivedEpigraphs, assistantMessageId)
                }
              } else if (data.type === "error") {
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, type: "error", text: data.content }
                      : msg
                  )
                )
              } else if (data.type === "done") {
                // Streaming completed
                setStreamingMessageId(null)
              }
            } catch (e) {
              console.error("Error parsing SSE data:", e)
            }
          }
        }
      }

      if (!recentQueries.includes(userMessage.text)) {
        const updatedQueries = [userMessage.text, ...recentQueries].slice(0, 5)
        setRecentQueries(updatedQueries)
      }
    } catch (err) {
      setStreamingMessageId(null)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "error",
        text: "Sorry, there was an error processing your query. Please try again.",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearChat = () => {
    if (window.confirm("Are you sure you want to clear the chat history and sources?")) {
      const baseTime = Date.now()
      const welcomeMessages: Message[] = [
        {
          id: `${baseTime}`,
          type: "assistant",
          text: "Hey there! I'm **Hudhud**, your guide to Ancient South Arabia.",
          timestamp: new Date(baseTime)
        },
        {
          id: `${baseTime + 1}`,
          type: "assistant",
          text: "I can help you explore the kingdoms, inscriptions, and history of ancient Yemen — from Sabaʾ and Ḥimyar to the fascinating world of pre-Islamic Arabia.",
          timestamp: new Date(baseTime + 1000)
        },
        {
          id: `${baseTime + 2}`,
          type: "assistant",
          text: "I'm trained on scholarly research and have access to thousands of ancient inscriptions. When I answer your questions, I'll cite the specific epigraphs I'm referencing.",
          timestamp: new Date(baseTime + 2000)
        },
        {
          id: `${baseTime + 3}`,
          type: "assistant",
          text: "**Quick note:** I'm still learning and might make mistakes. Always verify important information. For advanced searches, check out the [Epigraphs Page](/epigraphs).",
          timestamp: new Date(baseTime + 3000)
        },
        {
          id: `${baseTime + 4}`,
          type: "assistant",
          text: "So... what would you like to know? Ask me about trade routes, royal inscriptions, temples, or anything else about Ancient South Arabia! 🏛️",
          timestamp: new Date(baseTime + 4000)
        }
      ]
      setMessages(welcomeMessages)
      setCurrentEpigraphs([])
      setMessageEpigraphs(new Map())
      setEpigraphHistory([])
      setCurrentEpigraphIndex(-1)
      localStorage.removeItem("hudhudChatHistory")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuery(e.target.value)
    e.target.style.height = "auto"
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px"
  }

  const formatMessage = (text: string, messageId: string) => {
    const linkifyEpigraphIds = (html: string) => {
      const messageEpis = messageEpigraphs.get(messageId) || []
      if (messageEpis.length === 0) return html

      html = html.replace(/\[EPIGRAPH:([^\]]+)\]/g, (_match, epigraphId) => {
        const matchingEpigraph = messageEpis.find(ep => 
          ep.title === epigraphId || 
          String(ep.id) === epigraphId ||
          (ep.title && ep.title.toLowerCase() === epigraphId.toLowerCase())
        )
        if (matchingEpigraph) {
          const epigraphKey = String(matchingEpigraph.id)
          return `<a href="#" data-epigraph="${epigraphKey}" data-message-id="${messageId}" class="text-zinc-600 hover:text-zinc-800 underline font-medium cursor-pointer epigraph-link">${epigraphId}</a>`
        }
        return epigraphId // Remove brackets if no match
      })

      // Also try to match exact epigraph titles in the text
      messageEpis.forEach(ep => {
        const epigraphTitle = ep.title
        if (epigraphTitle && epigraphTitle.length > 3) {
          const escapedTitle = epigraphTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const regex = new RegExp(`\\b(${escapedTitle})\\b`, 'g')
          const epigraphKey = String(ep.id)
          html = html.replace(regex, (match) => {
            // Don't linkify if already inside a link
            if (!match.includes('epigraph-link')) {
              return `<a href="#" data-epigraph="${epigraphKey}" data-message-id="${messageId}" class="text-zinc-600 hover:text-zinc-800 underline font-medium cursor-pointer epigraph-link">${match}</a>`
            }
            return match
          })
        }
      })

      return html
    }

    return text.split('\n').map((paragraph, index) => {
      if (paragraph.trim() === '') return null

      if (paragraph.match(/^###\s+/)) {
        return <h4 key={index} className="text-base font-semibold mt-3 mb-2">{paragraph.replace(/^###\s+/, "")}</h4>
      } else if (paragraph.match(/^##\s+/)) {
        return <h3 key={index} className="text-lg font-semibold mt-4 mb-2">{paragraph.replace(/^##\s+/, "")}</h3>
      } else if (paragraph.match(/^#\s+/)) {
        return <h2 key={index} className="text-xl font-semibold mt-5 mb-3">{paragraph.replace(/^#\s+/, "")}</h2>
      } else if (paragraph.match(/^\d+\.\s+/)) {
        const numberMatch = paragraph.match(/^\d+\./)
        return (
          <div key={index} className="flex mb-2">
            <span className="mr-2 font-medium text-sm">{numberMatch ? numberMatch[0] : ""}</span>
            <p className="text-sm" dangerouslySetInnerHTML={{ 
              __html: linkifyEpigraphIds(
                paragraph.replace(/^\d+\.\s+/, "")
                  .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                  .replace(/\*(.*?)\*/g, "<em>$1</em>")
                  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-zinc-600 hover:text-zinc-800 underline font-medium">$1</a>')
                  .replace(/`(.*?)`/g, "<code>$1</code>")
              )
            }} />
          </div>
        )
      } else if (paragraph.match(/^[-*]\s+/)) {
        return (
          <div key={index} className="flex mb-2 ml-3">
            <span className="mr-2 text-sm">•</span>
            <p className="text-sm" dangerouslySetInnerHTML={{ 
              __html: linkifyEpigraphIds(
                paragraph.replace(/^[-*]\s+/, "")
                  .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                  .replace(/\*(.*?)\*/g, "<em>$1</em>")
                  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-zinc-600 hover:text-zinc-800 underline font-medium">$1</a>')
                  .replace(/`(.*?)`/g, "<code>$1</code>")
              )
            }} />
          </div>
        )
      } else {
        return <p key={index} className="mb-3 text-sm" dangerouslySetInnerHTML={{ 
          __html: linkifyEpigraphIds(
            paragraph
              .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
              .replace(/\*(.*?)\*/g, "<em>$1</em>")
              .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-zinc-600 hover:text-zinc-800 underline font-medium">$1</a>')
              .replace(/`(.*?)`/g, '<code class="px-1 py-0.5 bg-gray-100 rounded text-xs font-mono">$1</code>')
          )
        }} />
      }
    })
  }

  return (
    <>
      <MetaTags data={getDefaultMetaTags()} />

      <style>{`
        .scrollbar-offset-top::-webkit-scrollbar {
          width: 8px;
        }
        .scrollbar-offset-top::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-offset-top::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 4px;
        }
        .scrollbar-offset-top::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
        .scrollbar-offset-top::-webkit-scrollbar-button:start:decrement {
          height: 89px;
          display: block;
          background: transparent;
        }
        @media (max-width: 767px) {
          .mobile-full-width {
            width: 100% !important;
          }
        }
      `}</style>

      <div className="fixed top-0 left-0 right-0 bottom-0 flex overflow-hidden bg-white z-10">
        {/* Left Side - Chat Messages */}
        <div 
          className={`flex flex-col transition-opacity duration-150 mobile-full-width ${mobileView === 'info' ? 'hidden md:flex' : 'flex'}`}
          style={{ 
            width: isResizing && dragPosition !== null 
              ? `${dragPosition}px` 
              : `${100 - sidebarWidth}%`,
            opacity: isResizing ? 0.6 : 1
          }}
        >
          <div className="flex-1 overflow-y-auto bg-white scrollbar-offset-top pt-[80px] pb-[33px] mb-[25px]">
            <div className="px-4 py-6">
              <div className="max-w-3xl mx-auto">
                {/* Clear Chat Button - Top Right */}
                {messages.length > 1 && (
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={handleClearChat}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash size={18} />
                      Clear Chat
                    </button>
                  </div>
                )}

                {/* Messages */}
                <div className="space-y-2 pb-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      data-message-id={message.id}
                      className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-md px-4 py-3 ${
                          message.type === "user"
                            ? "bg-zinc-600 text-white"
                            : message.type === "error"
                            ? "bg-red-50 border border-red-200 text-red-800"
                            : "bg-white border border-gray-200 text-gray-900 shadow-sm"
                        }`}
                      >
                        {message.type === "error" && (
                          <div className="flex items-start mb-2">
                            <Warning size={20} className="mr-2 flex-shrink-0 mt-0.5" />
                            <span className="font-semibold text-sm">Error</span>
                          </div>
                        )}

                        <div className={message.type === "user" ? "text-sm" : ""}>
                          {message.text ? (
                            formatMessage(message.text, message.id)
                          ) : message.type === "assistant" && streamingMessageId === message.id ? (
                            <div className="flex items-center gap-3">
                              <Spinner colour="#666" size="w-5 h-5" />
                              <span className="text-sm text-gray-600">Hudhud is searching the ancient texts...</span>
                            </div>
                          ) : null}
                        </div>

                        {message.type === "assistant" && message.epigraphs && message.epigraphs.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <button
                              onClick={() => {
                                updateCurrentEpigraphs(message.epigraphs || [], message.id)
                                setMobileView('info') // Switch to info view on mobile
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-zinc-600 hover:bg-zinc-500 text-white text-sm rounded-lg transition-colors w-full justify-center"
                            >
                              <BookOpen size={18} weight="bold" />
                              View {message.epigraphs.length} Source{message.epigraphs.length !== 1 ? 's' : ''}
                            </button>
                          </div>
                        )}

                        <div className="text-xs text-gray-500 mt-2">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}

                  <div ref={messagesEndRef} />
                </div>
              </div>
            </div>
          </div>

          {/* Input Area - Sticky at bottom */}
          <div className="sticky bottom-[25px] px-2 pt-1 pb-0 z-20 border-t border-gray-200 bg-white">
            <div className="max-w-3xl mx-auto">
              <form onSubmit={handleSubmit} className="relative">
                <textarea
                  ref={inputRef}
                  value={query}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question about Ancient South Arabia..."
                  className="text-sm w-full px-3 py-3 pr-14 border border-gray-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
                  rows={1}
                  disabled={isLoading}
                  style={{ maxHeight: "200px" }}
                />
                <button
                  type="submit"
                  disabled={isLoading || !query.trim()}
                  className="absolute right-1 bottom-[10px] bg-zinc-600 hover:bg-zinc-500 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-2.5 rounded-md transition-colors"
                >
                  <PaperPlaneRight size={20} weight="bold" />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Resize Handle */}
        <div
          onMouseDown={handleMouseDown}
          className={`hidden md:block w-[1px] cursor-col-resize transition-all relative ${
            isResizing ? 'bg-zinc-500 ' : 'bg-gray-200 hover:bg-zinc-400'
          }`}
        >
          <div className="absolute inset-y-0 -left-1 -right-1" />
        </div>

        {/* Right Side - Info Panel */}
        <div 
          className={`flex flex-col transition-opacity duration-150 mobile-full-width ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}`}
          style={{ 
            width: isResizing && dragPosition !== null 
              ? `calc(100% - ${dragPosition}px)` 
              : `${sidebarWidth}%`,
            opacity: isResizing ? 0.6 : 1
          }}
        >
          {/* Scrollable content area */}
          <div ref={infoPanelRef} className="flex-1 overflow-y-auto scrollbar-offset-top pt-[80px] pb-[33px] mb-[25px]">
            <div className="px-4 py-6">
              {/* Source Epigraphs Section - Shows when available */}
              {currentEpigraphs.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Source Epigraphs</h2>
                      <p className="text-sm text-gray-600 mt-1">
                        {currentEpigraphs.length} source{currentEpigraphs.length !== 1 ? 's' : ''} found
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4 mb-6">
                    {currentEpigraphs.map((epigraph, index) => {
                      const epigraphKey = String(epigraph.id)
                      return (
                        <div 
                          key={index} 
                          ref={el => epigraphRefs.current[epigraphKey] = el}
                        >
                          <EpigraphCard
                            epigraph={epigraph}
                            notes={true}
                            bibliography={true}
                            compact={true}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <h2 className="text-lg font-semibold text-gray-900 mb-4">About Hudhud</h2>

              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-sm text-gray-900 mb-2">How it works</h3>
                  <ul className="text-sm text-gray-700 space-y-2">
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Expert knowledge trained on scholarly research</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Searches thousands of ancient inscriptions</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Provides citations to source epigraphs</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-sm text-gray-900 mb-2">Tips</h3>
                  <ul className="text-sm text-gray-700 space-y-2">
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Ask specific questions about kingdoms, trade, or religious practices</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Click "View Sources" to see referenced epigraphs</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Use Shift+Enter for new lines in your question</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-900">
                    <strong>Note:</strong> Hudhud is an AI assistant and may occasionally make mistakes. Always verify important information with primary sources.
                  </p>
                </div>

                {recentQueries.length > 0 && (
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h3 className="font-semibold text-sm text-gray-900 mb-2">Recent Queries</h3>
                    <div className="space-y-2">
                      {recentQueries.slice(0, 5).map((q, index) => (
                        <button
                          key={index}
                          onClick={() => setQuery(q)}
                          className="block w-full text-left text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Control Panel - Sticky at bottom */}
          <div className="sticky bottom-[25px] bg-white border-t border-gray-200 px-4 py-4 z-20 h-[58px]">
            {/* Mobile Back Button */}
            <button
              onClick={() => setMobileView('chat')}
              className="md:hidden flex items-center justify-center gap-2 mb-3 px-4 py-2 w-full text-sm text-white bg-zinc-600 hover:bg-zinc-500 rounded-lg transition-colors"
            >
              <ArrowLeft size={18} weight="bold" />
              Back to Chat
            </button>

            {/* Navigation Controls */}
            {epigraphHistory.length > 1 && (
              <div className="flex items-center justify-center gap-2 mb-3">
                <button
                  onClick={() => navigateEpigraphs('prev')}
                  disabled={currentEpigraphIndex <= 0}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed text-gray-700 rounded transition-colors"
                >
                  <CaretLeft size={14} weight="bold" />
                  Previous
                </button>
                <span className="text-xs text-gray-500 px-2">
                  {currentEpigraphIndex + 1} of {epigraphHistory.length}
                </span>
                <button
                  onClick={() => navigateEpigraphs('next')}
                  disabled={currentEpigraphIndex >= epigraphHistory.length - 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed text-gray-700 rounded transition-colors"
                >
                  Next
                  <CaretRight size={14} weight="bold" />
                </button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-600">
                {currentEpigraphs.length > 0 ? (
                  <span className="font-medium">{currentEpigraphs.length} source{currentEpigraphs.length !== 1 ? 's' : ''} loaded</span>
                ) : (
                  <span>No sources loaded</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 text-xs text-gray-600 py-1 z-30">
        <div className="flex items-center justify-center xl:gap-5 md:gap-1 sm:gap-1 md:px-4">
          <div className="flex items-center gap-1">
            <span className="hidden xl:inline">Epigraphic data provided by</span>
            <span className="xl:hidden">Data from</span>
            <Link
              to="https://dasi.cnr.it/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-600 hover:text-zinc-800 font-medium underline decoration-1 underline-offset-2 transition-colors"
            >
              DASI
            </Link>
            <span className="hidden sm:inline">under <Link to="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="text-zinc-600 hover:text-zinc-800 font-medium underline decoration-1 underline-offset-2 transition-colors">CC BY 4.0</Link></span>
          </div>
          <span className="mx-2 text-gray-300">|</span>
          <div className="text-gray-500">
            <span className="text-gray-500">© {new Date().getFullYear()} Hudhud</span>
            <span className="text-gray-500 hidden xs:inline">&nbsp;Project</span>
          </div>
          <span className="mx-2 text-gray-300">|</span>
          <Link 
            to="/terms-of-service" 
            className="text-zinc-600 hover:text-zinc-800 font-medium transition-colors text-nowrap"
          >
            Terms
            <span className="hidden lg:inline"> of Service</span>
          </Link>
          <span className="mx-2 text-gray-300">|</span>
          <Link 
            to="/privacy-policy" 
            className="text-zinc-600 hover:text-zinc-800 font-medium transition-colors text-nowrap"
          >
            Privacy
            <span className="hidden lg:inline"> Policy</span>
          </Link>
          <span className="mx-2 text-gray-300">|</span>
          <Link 
            to="mailto:contact@shebascaravan.com" 
            className="text-zinc-600 hover:text-zinc-800 font-medium items-center gap-1 transition-colors hidden lg:inline-flex"
          >
            <EnvelopeSimple size={14} weight="bold" />
            contact@shebascaravan.com
          </Link>
          <span className="mx-2 text-gray-300 hidden lg:inline">|</span>
          <Link 
            to="https://instagram.com/shebascaravan"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-600 hover:text-zinc-800 font-medium inline-flex items-center gap-1 transition-colors"
          >
            <InstagramLogo size={14} weight="bold" />
            <span className="hidden 3xs:inline">shebascaravan</span>
          </Link>
        </div>
      </div>
    </>
  )
}

export default Ask
