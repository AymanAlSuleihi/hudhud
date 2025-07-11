import React, { useState } from "react"
import { Link } from "react-router-dom"
import { MapTrifold, ChartBar, Info, ChatDots, Scroll } from "@phosphor-icons/react"

export const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  return(
    <>
      <div className="bg-gray-200 text-gray-800 text-sm text-center py-1">
        Development in progress - Some features may not work as expected.
        For any queries or suggestions you can reach me at {" "}
        <a href="mailto:contact@shebascaravan.com" className="hover:text-gray-500 text-gray-600 transition-colors font-semibold">contact@shebascaravan.com</a>
      </div>
      <nav className="relative flex items-center justify-between my-4 px-4 pt-8">
        <div className="absolute left-1/2 transform -translate-x-1/2 flex justify-center items-center scale-75 md:scale-80">
          <Link to="/" className="flex items-center gap-4">
            <div className="my-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                version="1.1"
                width="48"
                height="48"
                viewBox="0 0 238 231"
                className="fill-current -translate-y-2 h-full scale-[2.8]"
              >
                <path d="m 175.6,202.4 c -0.3,-2.4 -4.7,-6.5 -6.3,-8.2 -1.9,-2.1 -4.1,-4 -6,-6.1 -1.7,-1.9 -3.9,-3.3 -5.4,-5.4 -1.9,-2.6 -3.5,-5.5 -5.2,-8.2 -0.8,-1.3 -1.7,-2.6 -2.4,-3.9 -0.8,-1.6 -0.2,-2.5 -0.6,-3.9 -0.6,-2.2 -3.6,-5.5 -4.9,-7.5 -3.5,-5.5 -6.2,-10.6 -10,-15.9 -1.7,-2.3 -3.2,-4.1 -3.4,-7 -0.2,-3.2 -1.3,-5.5 -2.9,-8.3 -3.3,-5.4 -8,-9.5 -10.1,-15.5 -2,-5.5 -1.9,-12.3 -1.1,-18 0.4,-2.8 0.6,-5.5 1.1,-8.3 0.3,-1.5 0.6,-3.1 0.8,-4.6 0.1,-1.4 -0.2,-2.7 -0.1,-4 0.1,-1.6 0.9,-2.9 0.9,-4.6 0,-1.7 -0.6,-2 1.6,-2.9 3.1,-1.3 7.4,-1.5 10.8,-2 3.2,-0.5 6.5,-0.7 9.6,-1.7 1.4,-0.5 3.1,-0.9 3.1,-2.6 0,-1.9 -2.1,-2.1 -3.8,-1.8 1.6,-1 2,-2.8 0.6,-3.8 -1.1,-0.8 -3.4,-0.4 -4.6,-0.4 0.9,-1.6 1.1,-2.3 2.5,-3.3 1.5,-1.1 3.4,-1.6 4.8,-2.7 1.1,-0.9 2.3,-2.2 1,-3.1 -1.3,-0.9 -3.8,0.6 -4.9,1.1 1.2,-1.4 1.8,-3.1 -0.5,-3.4 -1.7,-0.2 -2.5,0.9 -3.5,2 0.5,-2.3 2.7,-2.3 3.7,-3.9 1.5,-2.5 -2.2,-2.2 -3.8,-2 -3.7,0.4 -7.3,2.1 -11,2.8 1.7,-2.5 3.5,-4.8 5.3,-7.2 1.5,-2 3.7,-3.9 4.3,-6.4 1.2,-4.5 -4.1,-1 -5.8,0.2 -2.4,1.7 -4.5,4 -7,5.3 1.4,-2.4 1.8,-3.5 -0.2,-5.5 -0.3,-0.3 -0.8,0.2 -1.3,-0.4 -0.3,-0.3 0.4,-0.8 0,-1.2 -1,-1 -0.8,-1.4 -2.4,-1.2 -3.7,0.5 -7.4,5 -9.7,7.5 -1.5,-2.3 -2.5,-4 -2.7,-6.8 -0.1,-1.8 1.1,-6.8 -0.2,-8.1 -3.4,-3.6 -6.5,9.4 -6.9,11.2 -1.3,-2.7 -3.1,-5.7 -5.7,-2.5 -2.1,2.5 -1.5,5.4 -1.2,8.4 -2.2,-1.1 -5.8,-8.1 -7.7,-3.2 -1.3,3.4 1.3,6 1.7,9.2 -1.2,-0.7 -2.5,-1.3 -3.4,-0.4 -1.1,1 -0.5,2.7 0.2,3.7 -2.6,-0.7 0.1,3.6 0.5,4.7 -3.2,-0.2 -1.8,1.4 -2.4,3.3 -0.5,1.6 -2.4,1.5 -1.4,4 0.9,2.2 3.1,3.5 5,4.6 1.4,0.8 4.9,1.6 4.6,3.5 -10.8,1.9 -22,3.6 -32.1,7.9 -1.1,0.5 -7.7,3.8 -3.9,4.6 0.7,0.1 2.2,-0.7 2.8,-0.9 2.1,-0.7 4.2,-1.4 6.4,-2.1 5.6,-1.9 11.4,-2.4 17.3,-3.2 2.4,-0.4 4.6,-0.4 7,-0.3 1.2,0 2.7,-0.2 3.6,0.4 0.8,0.5 2.1,2.6 2.7,3.3 3.4,5 1.7,9.6 -0.4,14.7 -2.6,6.2 -5.5,12.3 -8.3,18.4 -0.8,1.9 -1.6,4.2 -2.9,5.9 -1.7,2.2 -3.7,3 -4.5,5.8 -1.6,6 0.3,13.2 1.9,19.1 1,3.5 2.2,5.8 4.7,8.7 1.9,2.2 4.2,3.6 5.8,6.1 0.1,-0.2 0.2,-0.5 0.4,-0.8 0.2,1.3 1.4,4.9 3.1,3.2 0.7,1.8 1.4,3.3 2.4,4.9 0.1,-0.4 0.5,-0.7 0.6,-1.1 2.6,2.1 4.8,7.6 5.3,10.8 0.7,4.6 0.6,6.6 -1.8,10.5 -2.3,3.8 -3.8,7.9 -8.6,8.1 -3.4,0.2 -8.5,-1.1 -9.7,3.4 1.7,-1.1 3.6,-0.2 5.6,-0.3 1.7,-0.1 3.7,0 5.4,-0.3 2,-0.3 3.5,-1.3 5.6,-0.8 2.4,0.5 3.4,1.6 5.9,1.6 3.9,-0.1 7.9,0.6 11.8,0.2 0.8,-0.1 1.5,-0.5 2.4,-0.5 1.1,0 2.4,0.8 3.5,1.1 1.7,0.4 4.1,1.2 5.8,0.6 -2.3,-1 -4.4,-1.1 -6.5,-2.5 -2.5,-1.6 -2.5,-2.6 -1.8,-5.4 0.7,-2.7 1.7,-5.2 3,-7.6 0.3,-0.6 1.1,-2.9 1.3,-3.1 0.6,-0.5 1.9,-0.2 3,-0.4 -0.9,-0.5 -1.7,-1.2 -2.5,-1.9 4.8,1.8 11,1.1 15.1,4.5 4.5,3.8 8.2,8.7 12.7,12.6 2.2,1.9 4.2,3.8 6.3,5.8 1.7,1.6 3.4,4.2 5.5,4.9 1,0.3 3.4,0.6 4.5,0.3 1.3,-0.3 1.5,-0.9 2.9,-0.9 0.2,0 1.1,0.8 1.5,0.9 0.5,0.1 1.5,0.1 1.9,0 1.8,-0.2 2,0 1.7,-1.8z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <h1 className="text-[34px] font-semibold tracking-tighter -translate-x-5">Hudhud</h1>
              <h1 className="text-4xl font-semibold tracking-tighter">𐩠 𐩵 𐩠 𐩵</h1>
            </div>
          </Link>
        </div>

        <button 
          onClick={toggleMenu} 
          className="ml-auto focus:outline-none md:hidden z-10"
          aria-label="Toggle menu"
        >
          <svg 
            className="w-6 h-6" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            {isMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        <div className="hidden md:flex ml-auto gap-1 xl:gap-3 items-start text-md xl:text-base z-10 max-w-[40%] flex-wrap justify-end xl:mr-14">
          <Link to="/" className="hover:text-gray-500 text-gray-900 transition-colors font-semibold whitespace-nowrap px-1 flex-shrink-0">Ask</Link>
          <Link to="/epigraphs" className="hover:text-gray-500 text-gray-900 transition-colors font-semibold whitespace-nowrap px-1 flex-shrink-0">Epigraphs</Link>
          <Link to="/maps" className="hover:text-gray-500 text-gray-900 transition-colors font-semibold whitespace-nowrap px-1 flex-shrink-0">Maps</Link>
          <Link to="/stats" className="hover:text-gray-500 text-gray-900 transition-colors font-semibold whitespace-nowrap px-1 flex-shrink-0">Stats</Link>
          <Link to="/about" className="hover:text-gray-500 text-gray-900 transition-colors font-semibold whitespace-nowrap px-1 flex-shrink-0">About</Link>
        </div>

        <div 
          className={`absolute top-full left-0 right-0 bg-white z-50 shadow-md transition-all duration-300 ease-in-out mt-8 ${
            isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
          } overflow-hidden md:hidden`}
        >
          <div className="flex flex-col p-4 space-y-2">
            <Link 
              to="/" 
              className="hover:bg-gray-100 text-gray-900 transition-colors font-semibold py-3 px-4 rounded-md flex items-center justify-center border border-gray-100"
              onClick={() => setIsMenuOpen(false)}
            >
              <ChatDots className="w-5 h-5 mr-3" />
              Ask
            </Link>
            <Link
              to="/epigraphs" 
              className="hover:bg-gray-100 text-gray-900 transition-colors font-semibold py-3 px-4 rounded-md flex items-center justify-center border border-gray-100"
              onClick={() => setIsMenuOpen(false)}
            >
              <Scroll className="w-5 h-5 mr-3" />
              Epigraphs
            </Link>
            <Link 
              to="/maps" 
              className="hover:bg-gray-100 text-gray-900 transition-colors font-semibold py-3 px-4 rounded-md flex items-center justify-center border border-gray-100"
              onClick={() => setIsMenuOpen(false)}
            >
              <MapTrifold className="w-5 h-5 mr-3" />
              Maps
            </Link>
            <Link 
              to="/stats" 
              className="hover:bg-gray-100 text-gray-900 transition-colors font-semibold py-3 px-4 rounded-md flex items-center justify-center border border-gray-100"
              onClick={() => setIsMenuOpen(false)}
            >
              <ChartBar className="w-5 h-5 mr-3" />
              Stats
            </Link>
            <Link 
              to="/about" 
              className="hover:bg-gray-100 text-gray-900 transition-colors font-semibold py-3 px-4 rounded-md flex items-center justify-center border border-gray-100"
              onClick={() => setIsMenuOpen(false)}
            >
              <Info className="w-5 h-5 mr-3" />
              About
            </Link>
          </div>
        </div>
      </nav>
    </>
  )
}