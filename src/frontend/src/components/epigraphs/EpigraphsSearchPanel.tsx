"use client"

import React from "react"
import {
  ArrowRightIcon,
  HashIcon,
  KeyboardIcon,
  MagnifyingGlassIcon,
  ToggleLeftIcon,
  ToggleRightIcon,
} from "@phosphor-icons/react"
import { OnScreenKeyboard } from "../OnScreenKeyboard"
import { Label, SearchField, ToggleButton } from "react-aria-components"
import type { EpigraphSearchSchemaResponse } from "../../client"

type SearchScopeState = Record<string, boolean>

interface EpigraphsSearchPanelProps {
  defaultSearchValue: string
  searchSchema: EpigraphSearchSchemaResponse | null
  searchFields: SearchScopeState
  searchInputRef: React.RefObject<HTMLInputElement>
  showKeyboard: boolean
  dasiIdInput: string
  onSearchInputChange: (value: string) => void
  onKeyboardInsert: (char: string) => void
  onSearchSubmit: (value: string) => void
  onSearchInputFocus: (input: HTMLInputElement) => void
  onScopeChange: (scopeKey: string, selected: boolean) => void
  onToggleKeyboard: () => void
  onDasiIdInputChange: (value: string) => void
  onDasiIdSubmit: (value: string) => void
}

export const EpigraphsSearchPanel: React.FC<EpigraphsSearchPanelProps> = ({
  defaultSearchValue,
  searchSchema,
  searchFields,
  searchInputRef,
  showKeyboard,
  dasiIdInput,
  onSearchInputChange,
  onSearchSubmit,
  onSearchInputFocus,
  onScopeChange,
  onToggleKeyboard,
  onKeyboardInsert,
  onDasiIdInputChange,
  onDasiIdSubmit,
}) => {
  return (
    <div className="space-y-3">
      <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(150px,180px)_auto]">
        <SearchField className="flex-1">
          <Label className="sr-only">Search</Label>
          <div className="relative flex items-center w-full">
            <input
              ref={searchInputRef}
              defaultValue={defaultSearchValue}
              aria-label="Search epigraphs"
              onFocus={(event) => onSearchInputFocus(event.currentTarget)}
              onChange={(event) => onSearchInputChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onSearchSubmit(event.currentTarget.value)
                }
              }}
              className="h-10 w-full rounded-md border border-gray-400 bg-white p-2 pl-9 pr-14 outline-none transition-colors focus:border-gray-500"
              placeholder="Search epigraphs"
            />
            <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />

            <div className="absolute right-10 top-1/2 -translate-y-1/2 flex gap-1">
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-600 shadow transition-colors hover:border-gray-700 hover:text-gray-700"
                onClick={onToggleKeyboard}
                title={showKeyboard ? "Hide Keyboard" : "Show Keyboard"}
              >
                <KeyboardIcon size={16} />
              </button>
            </div>
            <div className="absolute right-[5px] top-1/2 -translate-y-1/2 flex gap-1">
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-600 shadow transition-colors hover:border-gray-700 hover:text-gray-700"
                onClick={() => onSearchSubmit(searchInputRef.current?.value || "")}
                title="Search"
              >
                <MagnifyingGlassIcon size={16} />
              </button>
            </div>
          </div>
        </SearchField>

        <div className="relative min-w-[150px] sm:min-w-[180px]">
          <input
            type="number"
            placeholder="DASI ID"
            value={dasiIdInput}
            aria-label="Go to DASI ID"
            onChange={(event) => onDasiIdInputChange(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onDasiIdSubmit(dasiIdInput)
              }
            }}
            className="h-10 w-full rounded-md border border-gray-400 bg-white pl-10 pr-10 outline-none transition-colors focus:border-gray-500"
          />
          <HashIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={15} />
          <button
            type="button"
            onClick={() => onDasiIdSubmit(dasiIdInput)}
            className="absolute right-[5px] top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md border border-gray-600 shadow transition-colors hover:border-gray-700 hover:text-gray-700"
            title="Go to epigraph"
          >
            <ArrowRightIcon size={16} />
          </button>
        </div>

      </div>

      {showKeyboard && <OnScreenKeyboard onInsert={onKeyboardInsert} />}

      <div>
        <div className="pb-1 text-xs font-medium tracking-wide text-gray-700">
          Search within:
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(searchSchema?.scopes || []).map((scope) => (
            <ToggleButton
              key={scope.key}
              isSelected={Boolean(searchFields[scope.key])}
              onChange={(selected) => onScopeChange(scope.key, selected)}
              className="group flex items-center gap-2 px-3 py-2 h-8 rounded shadow border border-gray-900 hover:border-gray-700 hover:text-gray-700 transition-colors cursor-pointer w-auto font-semibold whitespace-nowrap text-sm"
            >
              {searchFields[scope.key]
                ? <ToggleRightIcon size={16} weight="fill" className="text-gray-700" />
                : <ToggleLeftIcon size={16} />}
              <span className="flex items-center gap-1">{scope.label}</span>
            </ToggleButton>
          ))}
        </div>
      </div>
    </div>
  )
}