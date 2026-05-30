"use client"

import React from "react"
import type { EpigraphSearchSortOptionResponse } from "../../client"
import { MyItem, MySelect } from "../Select"

interface EpigraphsSortControlsProps {
  sortField: string
  sortOrder: string
  sortOptions: EpigraphSearchSortOptionResponse[]
  hasActiveSearchQuery: boolean
  onSortChange: (value: string) => void
  onOrderChange: (value: string) => void
}

export const EpigraphsSortControls: React.FC<EpigraphsSortControlsProps> = ({
  sortField,
  sortOrder,
  sortOptions,
  hasActiveSearchQuery,
  onSortChange,
  onOrderChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end flex-wrap w-full sm:w-auto sm:justify-end">
      <div className="flex flex-row gap-2 flex-wrap">
        <MySelect
          label="Sort By"
          selectedKey={sortField}
          onSelectionChange={(key: React.Key | null) => {
            if (typeof key === "string") {
              onSortChange(key)
            }
          }}
          buttonClassName="h-8 max-h-8 min-w-24 sm:min-w-32 text-xs sm:text-sm"
        >
          {sortOptions
            .filter((sortOption) => hasActiveSearchQuery || !sortOption.searchOnly)
            .map((sortOption) => (
              <MyItem key={sortOption.key} id={sortOption.key} textValue={sortOption.label}>
                {sortOption.label}
              </MyItem>
            ))}
        </MySelect>

        <MySelect
          label="Sort Order"
          selectedKey={sortOrder}
          onSelectionChange={(key: React.Key | null) => {
            if (typeof key === "string") {
              onOrderChange(key)
            }
          }}
          buttonClassName="h-8 max-h-8 min-w-20 sm:min-w-28 text-xs sm:text-sm"
        >
          <MyItem key="asc" id="asc">Ascending</MyItem>
          <MyItem key="desc" id="desc">Descending</MyItem>
        </MySelect>
      </div>
    </div>
  )
}