import React, { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { MapTrifold, ChartBar, Info, ChatDots, Scroll, X, Quotes, List } from "@phosphor-icons/react"

export const Navbar: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isHeaderVisible, setIsHeaderVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY

      if (!isSidebarOpen) {
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
          setIsHeaderVisible(false)
        } else {
          setIsHeaderVisible(true)
        }
      }

      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY, isSidebarOpen])

  const closeSidebar = () => {
    setIsSidebarOpen(false)
    setIsHeaderVisible(true)
  }

  return (
    <>
      <div className={`fixed top-0 left-0 right-0 bg-transparent backdrop-blur-xs shadow-sm z-50 transition-transform duration-300 ease-in-out ${
        isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
      }`}>
        <div className="relative flex items-center justify-center py-2 px-4 min-w-0">
          <div className="absolute left-16 3xs:left-4 sm:left-8 md:left-20 lg:left-32 xl:left-40 2xl:left-52 top-1/2 3xs:top-1/3 transform -translate-y-1/2">
            <span className="text-md font-medium text-gray-900 tracking-[2px]">Hudhud</span>
          </div>

          <div className="hidden 3xs:block absolute left-4 sm:left-8 md:left-20 lg:left-32 xl:left-40 2xl:left-52 right-[calc(50%+50px)] top-10 3xs:top-1/2 h-[1px] bg-black/40" />

          <div className="hidden 3xs:block absolute left-4 sm:left-8 md:left-20 lg:left-32 xl:left-40 2xl:left-52 top-10 3xs:top-[calc(66.667%-8px)] max-w-[calc(50%-60px)]">
            <div className="flex flex-col 3xs:flex-row gap-y-1 gap-x-2 3xs:gap-x-3 sm:gap-x-4 lg:gap-x-6 xl:gap-x-8 text-xs sm:text-sm">
              <Link to="/" className="flex items-center gap-1.5 text-gray-900 font-medium hover:text-gray-700 transition-colors py-2 px-1 sm:py-0 sm:px-0 rounded-md sm:rounded-none hover:bg-gray-100 sm:hover:bg-transparent">
                <ChatDots className="w-4 h-4 3xs:hidden xs:inline" />
                Ask
              </Link>
              <Link to="/epigraphs" className="flex items-center gap-1.5 text-gray-900 font-medium hover:text-gray-700 transition-colors py-2 px-1 sm:py-0 sm:px-0 rounded-md sm:rounded-none hover:bg-gray-100 sm:hover:bg-transparent">
                <Scroll className="w-4 h-4 3xs:hidden xs:inline" />
                Epigraphs
              </Link>
              <Link to="/words" className="flex items-center gap-1.5 text-gray-900 font-medium hover:text-gray-700 transition-colors py-2 px-1 sm:py-0 sm:px-0 rounded-md sm:rounded-none hover:bg-gray-100 sm:hover:bg-transparent">
                <Quotes className="w-4 h-4 3xs:hidden xs:inline" />
                Words
              </Link>
            </div>
          </div>

          <div className="relative z-10 bg-transparent px-2 sm:px-4 md:px-6 flex-shrink-0">
            <Link to="/">
              <img 
                src="/hudhud_logo.png" 
                alt="Hudhud Logo" 
                className="3xs:h-18 h-12 w-auto object-contain drop-shadow-sm"
              />
            </Link>
          </div>

          <div className="absolute right-16 3xs:right-4 sm:right-8 md:right-20 lg:right-32 xl:right-40 2xl:right-52 top-1/2 3xs:top-1/3 transform -translate-y-1/2 3xs:translate-x-[9px]">
            <span className="text-lg font-medium text-gray-900 tracking-[10px]">𐩠𐩵𐩠𐩵</span>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="3xs:hidden absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-md hover:bg-gray-100 transition-colors z-20"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 text-gray-700" />
            ) : (
              <List className="w-5 h-5 text-gray-700" />
            )}
          </button>

          <div className="hidden 3xs:block absolute right-4 sm:right-8 md:right-20 lg:right-32 xl:right-40 2xl:right-52 left-[calc(50%+50px)] top-10 3xs:top-1/2 h-[1px] bg-black/40" />

          <div className="hidden 3xs:block absolute right-4 sm:right-8 md:right-20 lg:right-32 xl:right-40 2xl:right-52 top-10 3xs:top-[calc(66.667%-8px)] max-w-[calc(50%-60px)]">
            <div className="flex flex-col 3xs:flex-row gap-y-1 gap-x-3 sm:gap-x-5 lg:gap-x-6 xl:gap-x-8 text-xs sm:text-sm">
              <Link to="/maps" className="flex items-center gap-1.5 text-gray-900 font-medium hover:text-gray-700 transition-colors ml-auto py-2 px-1 sm:py-0 sm:px-0 rounded-md sm:rounded-none hover:bg-gray-100 sm:hover:bg-transparent">
                Maps
                <MapTrifold className="w-4 h-4 3xs:hidden xs:inline" />
              </Link>
              <Link to="/stats" className="flex items-center gap-1.5 text-gray-900 font-medium hover:text-gray-700 transition-colors ml-auto py-2 px-1 sm:py-0 sm:px-0 rounded-md sm:rounded-none hover:bg-gray-100 sm:hover:bg-transparent">
                Stats
                <ChartBar className="w-4 h-4 3xs:hidden xs:inline" />
              </Link>
              <Link to="/about" className="flex items-center gap-1.5 text-gray-900 font-medium hover:text-gray-700 transition-colors ml-auto py-2 px-1 sm:py-0 sm:px-0 rounded-md sm:rounded-none hover:bg-gray-100 sm:hover:bg-transparent">
                About
                <Info className="w-4 h-4 3xs:hidden xs:inline" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="3xs:hidden fixed top-[64px] left-0 right-0 bg-transparent backdrop-blur-xs border-b border-gray-200 shadow-sm z-40">
          <nav className="px-4 py-3 space-y-1">
              <Link 
                to="/" 
                className="flex justify-center gap-2 px-3 py-2 text-gray-900 hover:bg-gray-100 rounded-md transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <ChatDots className="w-5 h-5" />
                Ask
              </Link>
              <Link 
                to="/epigraphs" 
                className="flex justify-center gap-2 px-3 py-2 text-gray-900 hover:bg-gray-100 rounded-md transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Scroll className="w-5 h-5" />
                Epigraphs
              </Link>
              <Link 
                to="/words" 
                className="flex justify-center gap-2 px-3 py-2 text-gray-900 hover:bg-gray-100 rounded-md transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Quotes className="w-5 h-5" />
                Words
              </Link>
              <Link 
                to="/maps" 
                className="flex justify-center gap-2 px-3 py-2 text-gray-900 hover:bg-gray-100 rounded-md transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <MapTrifold className="w-5 h-5" />
                Maps
              </Link>
              <Link 
                to="/stats" 
                className="flex justify-center gap-2 px-3 py-2 text-gray-900 hover:bg-gray-100 rounded-md transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <ChartBar className="w-5 h-5" />
                Stats
              </Link>
              <Link 
                to="/about" 
                className="flex justify-center gap-2 px-3 py-2 text-gray-900 hover:bg-gray-100 rounded-md transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Info className="w-5 h-5" />
                About
              </Link>
          </nav>
        </div>
      )}

      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-opacity-50 backdrop-blur-xs z-40"
          onClick={closeSidebar}
        />
      )}
    </>
  )
}