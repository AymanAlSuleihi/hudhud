import React, { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { MapTrifold, ChartBar, Info, ChatDots, Scroll, X, Quotes } from "@phosphor-icons/react"

export const Navbar: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isHeaderVisible, setIsHeaderVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

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

  // const toggleSidebar = () => {
  //   setIsSidebarOpen(!isSidebarOpen)
  //   setIsHeaderVisible(isSidebarOpen)
  // }

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
          <div className="absolute left-4 sm:left-8 md:left-20 lg:left-32 xl:left-40 2xl:left-52 top-6 3xs:top-1/3 transform -translate-y-1/2">
            <span className="text-md font-medium text-gray-900 tracking-[2px]">Hudhud</span>
          </div>

          <div className="absolute left-4 sm:left-8 md:left-20 lg:left-32 xl:left-40 2xl:left-52 right-[calc(50%+50px)] top-10 3xs:top-1/2 h-[1px] bg-black/40" />

          <div className="absolute left-4 sm:left-8 md:left-20 lg:left-32 xl:left-40 2xl:left-52 top-10 3xs:top-[calc(66.667%-8px)] max-w-[calc(50%-60px)]">
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
                className="h-32 w-auto object-contain drop-shadow-sm"
              />
            </Link>
          </div>

          <div className="absolute right-4 sm:right-8 md:right-20 lg:right-32 xl:right-40 2xl:right-52 top-6 3xs:top-1/3 transform -translate-y-1/2 translate-x-[9px]">
            <span className="text-lg font-medium text-gray-900 tracking-[10px]">𐩠𐩵𐩠𐩵</span>
          </div>

          <div className="absolute right-4 sm:right-8 md:right-20 lg:right-32 xl:right-40 2xl:right-52 left-[calc(50%+50px)] top-10 3xs:top-1/2 h-[1px] bg-black/40" />

          <div className="absolute right-4 sm:right-8 md:right-20 lg:right-32 xl:right-40 2xl:right-52 top-10 3xs:top-[calc(66.667%-8px)] max-w-[calc(50%-60px)]">
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

          {/* <button 
            onClick={toggleSidebar}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-md hover:bg-white/10 backdrop-blur-sm transition-colors"
            aria-label="Toggle sidebar"
          >
            <List className="w-6 h-6 text-gray-700" />
          </button> */}
        </div>
      </div>

      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-opacity-50 backdrop-blur-xs z-40"
          onClick={closeSidebar}
        />
      )}

      {/* TODO: Remove */}
      <aside 
        className={`hidden left-0 top-0 h-screen w-60 bg-transparent backdrop-blur-md border-r border-gray-200 shadow-lg transition-transform duration-300 ease-in-out z-60 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:shadow-none`}
      >
        <button 
          onClick={closeSidebar}
          className="lg:hidden absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <div className="flex flex-col h-full pt-8">
          <div className="flex justify-center px-6 mb-8">
            <Link to="/" onClick={closeSidebar}>
              <img 
                src="/hudhud_logo.png" 
                alt="Hudhud Logo" 
                className="h-64 w-auto object-contain"
              />
            </Link>
          </div>

          <nav className="flex-1 px-4">
            <div className="space-y-2">
              <Link 
                to="/" 
                className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors font-medium"
                onClick={closeSidebar}
              >
                <ChatDots className="w-5 h-5 mr-3" />
                Ask
              </Link>
              
              <Link 
                to="/epigraphs" 
                className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors font-medium"
                onClick={closeSidebar}
              >
                <Scroll className="w-5 h-5 mr-3" />
                Epigraphs
              </Link>
              
              <Link 
                to="/words" 
                className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors font-medium"
                onClick={closeSidebar}
              >
                <Quotes className="w-5 h-5 mr-3" />
                Words
              </Link>
              
              <Link 
                to="/maps" 
                className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors font-medium"
                onClick={closeSidebar}
              >
                <MapTrifold className="w-5 h-5 mr-3" />
                Maps
              </Link>
              
              <Link 
                to="/stats" 
                className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors font-medium"
                onClick={closeSidebar}
              >
                <ChartBar className="w-5 h-5 mr-3" />
                Stats
              </Link>
              
              <Link 
                to="/about" 
                className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors font-medium"
                onClick={closeSidebar}
              >
                <Info className="w-5 h-5 mr-3" />
                About
              </Link>
            </div>
          </nav>
        </div>
      </aside>
    </>
  )
}