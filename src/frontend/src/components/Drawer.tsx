import React from "react"
import { X } from "@phosphor-icons/react"

type DrawerProps = {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

export const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 transform transition-transform duration-300 ease-in-out">
      <div className="bg-white border-t border-gray-200 shadow-lg max-h-[40vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b bg-white sticky top-0">
          <h3 className="font-medium">Translation Details</h3>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  )
}
