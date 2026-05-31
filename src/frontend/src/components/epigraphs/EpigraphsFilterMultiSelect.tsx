"use client"

import React from "react"
import { CaretUpDown, Check } from "@phosphor-icons/react"
import { Button, DialogTrigger, ListBox, ListBoxItem, Popover } from "react-aria-components"

type MultiSelectOption = {
  key: string
  label: string
  count?: number
}

interface EpigraphsFilterMultiSelectProps {
  label: string
  allLabel: string
  options: MultiSelectOption[]
  selectedKeys: string[]
  onChange: (nextSelectedKeys: string[]) => void
  buttonClassName?: string
  isDisabled?: boolean
}

const formatOptionLabel = (option: MultiSelectOption) =>
  option.count !== undefined ? `${option.label} (${option.count})` : option.label

export const EpigraphsFilterMultiSelect: React.FC<EpigraphsFilterMultiSelectProps> = ({
  label,
  allLabel,
  options,
  selectedKeys,
  onChange,
  buttonClassName = "",
  isDisabled = false,
}) => {
  const shouldCollapseSelectionToAll = options.length > 1
  const normalizedSelectedKeys =
    shouldCollapseSelectionToAll && selectedKeys.length >= options.length && options.length > 0
      ? []
      : selectedKeys
  const selectedLabels = options
    .filter((option) => normalizedSelectedKeys.includes(option.key))
    .map((option) => option.label)

  const summaryLabel =
    selectedLabels.length === 0
      ? allLabel
      : selectedLabels.length <= 2
        ? selectedLabels.join(", ")
        : `${selectedLabels.length} selected`

  const handleSelectionChange = (keys: "all" | Iterable<React.Key>) => {
    if (keys === "all") {
      onChange([])
      return
    }

    const nextSelectedKeys = Array.from(keys, (key) => String(key))
    const selectedAllOptions =
      shouldCollapseSelectionToAll && nextSelectedKeys.length >= options.length && options.length > 0

    onChange(selectedAllOptions ? [] : nextSelectedKeys)
  }

  const handleSelectAll = () => {
    onChange([])
  }

  return (
    <div className="relative min-w-[150px] space-y-1">
      <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
        {label}
      </label>
      <DialogTrigger>
        <Button
          isDisabled={isDisabled}
          aria-label={`${label}: ${summaryLabel}`}
          className={`flex min-h-9 w-full items-center justify-between gap-2 rounded-md border border-stone-300 bg-white px-2.5 py-2 text-left text-sm text-stone-700 shadow-sm transition-colors ${buttonClassName} ${
            isDisabled ? "cursor-not-allowed bg-stone-100 text-stone-400 opacity-80" : "hover:border-stone-500"
          }`}
        >
          <span className="truncate">{summaryLabel}</span>
          <CaretUpDown className="flex-shrink-0 text-stone-500" size={14} />
        </Button>
        <Popover className="max-h-64 w-[var(--trigger-width)] cursor-default overflow-auto rounded-md border border-stone-200 bg-white shadow-xl ring-1 ring-black/5">
          <div className="py-1">
            <Button
              onPress={handleSelectAll}
              className={({ isHovered, isPressed, isFocusVisible }) => `flex w-full items-center justify-between px-2.5 py-1.5 text-left text-sm outline-none transition-colors ${
                normalizedSelectedKeys.length === 0
                  ? "bg-stone-100 text-stone-900"
                  : isHovered || isPressed
                    ? "bg-stone-100 text-stone-700"
                    : "text-stone-700"
              } ${isFocusVisible ? "ring-2 ring-inset ring-stone-400" : ""}`}
            >
              <span>{allLabel}</span>
              <Check
                size={14}
                className={normalizedSelectedKeys.length === 0 ? "opacity-100" : "opacity-0"}
              />
            </Button>

            <ListBox
              aria-label={label}
              selectionMode="multiple"
              selectedKeys={normalizedSelectedKeys}
              onSelectionChange={handleSelectionChange}
              className="outline-none"
            >
              {options.map((option) => (
                <ListBoxItem
                  key={option.key}
                  id={option.key}
                  textValue={option.label}
                  className={({ isFocused, isHovered, isSelected, isFocusVisible }) =>
                    `flex cursor-default items-center justify-between px-2.5 py-1.5 text-sm outline-none transition-colors ${
                      isSelected
                        ? "bg-stone-100 text-stone-900"
                        : isFocused || isHovered
                          ? "bg-stone-100 text-stone-700"
                          : "text-stone-700"
                    } ${isFocusVisible ? "ring-2 ring-inset ring-stone-400" : ""}`
                  }
                >
                  {({ isSelected }) => (
                    <>
                      <span className="truncate pr-2">{formatOptionLabel(option)}</span>
                      <Check size={14} className={isSelected ? "opacity-100" : "opacity-0"} />
                    </>
                  )}
                </ListBoxItem>
              ))}
            </ListBox>
          </div>
        </Popover>
      </DialogTrigger>
    </div>
  )
}