import React from "react"
import { Link } from "react-router-dom"
import { ChatDots, Scroll } from "@phosphor-icons/react"
import { MetaTags } from "../components/MetaTags"

const NotFound: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <MetaTags data={{
        title: "404 - Page Not Found - Hudhud",
        description: "The page you are looking for could not be found.",
        url: `${import.meta.env.VITE_BASE_URL}/404`,
        image: `${import.meta.env.VITE_BASE_URL}/hudhud_logo_white.png`,
        type: "website"
      }} />
      
      <div className="text-center max-w-md">
        <h1 className="text-9xl font-bold text-gray-200 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 hover:border-gray-400 text-gray-900 rounded-md transition-colors"
          >
            <ChatDots size={16}/>
            Go to Ask
          </Link>
          <Link
            to="/epigraphs"
            className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 hover:border-gray-400 text-gray-900 rounded-md transition-colors"
          >
            <Scroll size={16}/>
            Browse Epigraphs
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFound
