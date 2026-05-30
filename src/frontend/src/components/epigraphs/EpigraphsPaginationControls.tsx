"use client"

import React from "react"
import { MyItem, MySelect } from "../Select"

interface EpigraphsPaginationControlsProps {
  currentPage: number
  totalPages: number
  pageInputValue: string
  pageSize: number
  isLoading: boolean
  onPageInputChange: (value: string) => void
  onPageInputSubmit: (value: string) => void
  onPreviousPage: () => void
  onNextPage: () => void
  onPageSizeChange: (value: number) => void
}

export const EpigraphsPaginationControls: React.FC<EpigraphsPaginationControlsProps> = ({
  currentPage,
  totalPages,
  pageInputValue,
  pageSize,
  isLoading,
  onPageInputChange,
  onPageInputSubmit,
  onPreviousPage,
  onNextPage,
  onPageSizeChange,
}) => {
  const handlePageInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      onPageInputSubmit(event.currentTarget.value)
    }
  }

  return (
    <div className="mt-6 flex flex-col sm:flex-row justify-between items-end gap-4">
      <div className="sm:flex-1"></div>

      <div className="flex gap-2 items-center">
        <button
          onClick={onPreviousPage}
          disabled={currentPage <= 1 || isLoading}
          className="px-3 py-1 rounded shadow border border-gray-900 hover:border-gray-700 hover:text-gray-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 text-sm cursor-pointer"
        >
          Previous
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm whitespace-nowrap">Page</span>
          <input
            type="number"
            min="1"
            max={totalPages}
            value={pageInputValue}
            onChange={(event) => onPageInputChange(event.target.value)}
            onBlur={(event) => onPageInputSubmit(event.target.value)}
            onKeyDown={handlePageInputKeyDown}
            className="w-16 px-2 py-1 text-center border border-gray-300 rounded text-sm h-8"
          />
          <span className="text-sm whitespace-nowrap">of {totalPages}</span>
        </div>

        <button
          onClick={onNextPage}
          disabled={currentPage >= totalPages || isLoading}
          className="px-3 py-1 rounded shadow border border-gray-900 hover:border-gray-700 hover:text-gray-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 text-sm cursor-pointer"
        >
          Next
        </button>
      </div>

      <div className="flex items-end gap-2 sm:flex-1 sm:justify-end">
        <MySelect
          label="Results per page"
          selectedKey={pageSize.toString()}
          onSelectionChange={(key: React.Key | null) => {
            if (typeof key === "string") {
              onPageSizeChange(Number(key))
            }
          }}
          buttonClassName="h-8 max-h-8"
        >
          <MyItem key="10" id="10">10</MyItem>
          <MyItem key="25" id="25">25</MyItem>
          <MyItem key="50" id="50">50</MyItem>
          <MyItem key="100" id="100">100</MyItem>
          <MyItem key="250" id="250">250</MyItem>
        </MySelect>
      </div>
    </div>
  )
}