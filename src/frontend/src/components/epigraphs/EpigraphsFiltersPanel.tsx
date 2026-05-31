"use client"

import React from "react"
import { X } from "@phosphor-icons/react"
import type { EpigraphFacetSchemaFieldResponse } from "../../client"
import { EpigraphsFilterMultiSelect } from "./EpigraphsFilterMultiSelect"
import { MySlider } from "../Slider"

type FilterValue = string | boolean | string[]
type Filters = Record<string, FilterValue>
type FilterOption = {
  key: string
  label: string
  value: string | boolean | number | string[]
  count?: number
}

interface EpigraphsFiltersPanelProps {
  showFilters: boolean
  facetSchema: EpigraphFacetSchemaFieldResponse[]
  filters: Filters
  periodValues: string[]
  selectedPeriodSummary: string
  selectedPeriodStartIndex: number
  selectedPeriodEndIndex: number
  languageLevel1Options: FilterOption[]
  languageLevel2Options: FilterOption[]
  languageLevel3Options: FilterOption[]
  selectedLanguageLevel1Values: string[]
  selectedLanguageLevel2Values: string[]
  selectedLanguageLevel3Values: string[]
  hasLanguageFilters: boolean
  booleanFacetFields: EpigraphFacetSchemaFieldResponse[]
  genericFacetFields: EpigraphFacetSchemaFieldResponse[]
  getFilterOptions: (fieldKey: string) => FilterOption[]
  getBooleanFilterCount: (fieldKey: string, value: boolean) => number | undefined
  onFilterChange: (filterKey: string, value: string) => void
  onMultiFilterChange: (filterKey: string, values: string[]) => void
  onBooleanFilterChange: (filterKey: string, value: boolean | null) => void
  onPeriodSliderChange: (nextValue: number | number[]) => void
  onClearLanguageFilters: () => void
  formatActiveFilterValue: (fieldKey: string, value: FilterValue) => string
  encodeFilterValue: (value: FilterValue) => string
}

const CHRONOLOGY_FACET_KEYS = ["chronology_conjectural"] as const
const LANGUAGE_SCRIPT_FACET_KEYS = ["alphabet", "script_typology", "script_cursus", "writing_techniques"] as const
const TEXTUAL_TYPOLOGY_FACET_KEYS = [
  "textual_typology",
  "textual_typology_conjectural",
  "royal_inscription",
] as const
const GEOGRAPHIC_FACET_KEYS = [
  "site_modern_name",
  "site_ancient_name",
  "site_geographical_area",
  "site_country",
] as const

const GROUPED_FACET_KEYS = new Set<string>([
  ...CHRONOLOGY_FACET_KEYS,
  ...LANGUAGE_SCRIPT_FACET_KEYS,
  ...TEXTUAL_TYPOLOGY_FACET_KEYS,
  ...GEOGRAPHIC_FACET_KEYS,
])

const isDefinedFacetField = (
  field: EpigraphFacetSchemaFieldResponse | undefined,
): field is EpigraphFacetSchemaFieldResponse => field !== undefined

const formatFacetLabel = (label: string) => label.replace(/^Site:\s*/i, "")

export const EpigraphsFiltersPanel: React.FC<EpigraphsFiltersPanelProps> = ({
  showFilters,
  facetSchema,
  filters,
  periodValues,
  selectedPeriodSummary,
  selectedPeriodStartIndex,
  selectedPeriodEndIndex,
  languageLevel1Options,
  languageLevel2Options,
  languageLevel3Options,
  selectedLanguageLevel1Values,
  selectedLanguageLevel2Values,
  selectedLanguageLevel3Values,
  hasLanguageFilters,
  booleanFacetFields,
  genericFacetFields,
  getFilterOptions,
  getBooleanFilterCount,
  onFilterChange,
  onMultiFilterChange,
  onBooleanFilterChange,
  onPeriodSliderChange,
  onClearLanguageFilters,
  formatActiveFilterValue,
  encodeFilterValue,
}) => {
  const sectionShellClassName = "rounded-lg border border-stone-200 bg-stone-50/70 p-3"
  const cardClassName = "rounded-md border border-stone-200 bg-white p-2.5"
  const chipGroupClassName = "mt-1.5 flex flex-wrap gap-1"

  const normalisePeriodSliderValue = (nextValue: number | number[]): [number, number] | null => {
    if (!Array.isArray(nextValue) || nextValue.length < 2 || periodValues.length === 0) {
      return null
    }

    const [rawStart, rawEnd] = nextValue
    const nextStart = Math.max(0, Math.min(Math.round(rawStart), Math.round(rawEnd)))
    const nextEnd = Math.min(periodValues.length - 1, Math.max(Math.round(rawStart), Math.round(rawEnd)))

    return [nextStart, nextEnd]
  }

  const [periodSliderValue, setPeriodSliderValue] = React.useState<[number, number]>([
    selectedPeriodStartIndex,
    selectedPeriodEndIndex,
  ])

  React.useEffect(() => {
    setPeriodSliderValue((currentValue) => {
      if (
        currentValue[0] === selectedPeriodStartIndex &&
        currentValue[1] === selectedPeriodEndIndex
      ) {
        return currentValue
      }

      return [selectedPeriodStartIndex, selectedPeriodEndIndex]
    })
  }, [selectedPeriodStartIndex, selectedPeriodEndIndex])

  const getSelectedFilterKeys = (filterValue: FilterValue | undefined): string[] => {
    if (Array.isArray(filterValue)) {
      return filterValue.map((value) => encodeFilterValue(value))
    }

    if (filterValue === undefined) {
      return []
    }

    return [encodeFilterValue(filterValue)]
  }

  const handlePeriodSliderValueChange = (nextValue: number | number[]) => {
    const normalisedValue = normalisePeriodSliderValue(nextValue)

    if (!normalisedValue) {
      return
    }

    setPeriodSliderValue(normalisedValue)
  }

  const handlePeriodSliderChangeEnd = (nextValue: number | number[]) => {
    const normalisedValue = normalisePeriodSliderValue(nextValue)

    if (!normalisedValue) {
      return
    }

    setPeriodSliderValue(normalisedValue)
    onPeriodSliderChange(normalisedValue)
  }

  const [periodSliderStartIndex, periodSliderEndIndex] = periodSliderValue
  const periodPreviewValues =
    periodValues.length > 0 ? periodValues.slice(periodSliderStartIndex, periodSliderEndIndex + 1) : []
  const periodSummaryLabel =
    periodValues.length > 0 && periodSliderStartIndex === 0 && periodSliderEndIndex === periodValues.length - 1
      ? "All periods"
      : periodPreviewValues.length > 0
        ? formatActiveFilterValue("period", periodPreviewValues)
        : selectedPeriodSummary
  const hasPeriodFilter = filters.period !== undefined
  const allFacetFields = [...genericFacetFields, ...booleanFacetFields]
  const booleanFieldKeys = new Set(booleanFacetFields.map((field) => field.key))
  const facetFieldMap = new Map(allFacetFields.map((field) => [field.key, field]))
  const chronologyFacetFields = CHRONOLOGY_FACET_KEYS.map((key) => facetFieldMap.get(key)).filter(isDefinedFacetField)
  const languageScriptFacetFields = LANGUAGE_SCRIPT_FACET_KEYS.map((key) => facetFieldMap.get(key)).filter(isDefinedFacetField)
  const textualTypologyFacetFields = TEXTUAL_TYPOLOGY_FACET_KEYS.map((key) => facetFieldMap.get(key)).filter(isDefinedFacetField)
  const geographicFacetFields = GEOGRAPHIC_FACET_KEYS.map((key) => facetFieldMap.get(key)).filter(isDefinedFacetField)
  const ungroupedFacetFields = allFacetFields.filter((field) => !GROUPED_FACET_KEYS.has(field.key))
  const hasChronologySection = periodValues.length > 0 || chronologyFacetFields.length > 0
  const hasLanguageScriptSection = true
  const hasTextualTypologySection = textualTypologyFacetFields.length > 0
  const hasGeographicSection = geographicFacetFields.length > 0
  const hasUngroupedSection = ungroupedFacetFields.length > 0

  const renderActiveFilterChip = (chipKey: string, label: string, onRemove: () => void) => {
    return (
      <button
        key={chipKey}
        type="button"
        onClick={onRemove}
        className="inline-flex min-h-6 items-center gap-1 rounded-md border border-stone-300 bg-stone-50 px-2 py-0.5 text-[11px] font-medium text-stone-700 transition-colors hover:border-stone-500 hover:text-stone-900"
        title="Remove filter"
      >
        <span className="max-w-36 truncate sm:max-w-44">{label}</span>
        <X size={10} className="flex-shrink-0" />
      </button>
    )
  }

  const renderActiveFilterSection = (fieldKey: string) => {
    const filterValue = filters[fieldKey]

    if (filterValue === undefined) {
      return null
    }

    if (fieldKey === "period") {
      return null
    }

    if (Array.isArray(filterValue)) {
      return (
        <div className={chipGroupClassName}>
          {filterValue.map((value) =>
            renderActiveFilterChip(
              `${fieldKey}-${encodeFilterValue(value)}`,
              formatActiveFilterValue(fieldKey, value),
              () => {
                const remainingValues = filterValue.filter((selectedValue) => selectedValue !== value)
                const nextValues = remainingValues.map((selectedValue) => encodeFilterValue(selectedValue))
                onMultiFilterChange(fieldKey, nextValues)
              },
            ),
          )}
        </div>
      )
    }

    if (typeof filterValue === "boolean") {
      return null
    }

    return (
      <div className={chipGroupClassName}>
        {renderActiveFilterChip(
          `${fieldKey}-${encodeFilterValue(filterValue)}`,
          formatActiveFilterValue(fieldKey, filterValue),
          () => onFilterChange(fieldKey, "all"),
        )}
      </div>
    )
  }

  const renderSectionHeader = (title: string, description: string) => {
    return (
      <div className="mb-2.5">
        <div className="text-sm font-semibold text-stone-900">{title}</div>
        <div className="text-xs text-stone-600">{description}</div>
      </div>
    )
  }

  const renderGenericFacetCard = (field: EpigraphFacetSchemaFieldResponse) => {
    const availableValues = getFilterOptions(field.key)

    return (
      <div key={field.key} className={cardClassName}>
        <EpigraphsFilterMultiSelect
          label={formatFacetLabel(field.label)}
          allLabel="All"
          selectedKeys={getSelectedFilterKeys(filters[field.key])}
          onChange={(values) => onMultiFilterChange(field.key, values)}
          options={availableValues.map((option) => ({
            key: option.key,
            label: option.label,
            count: option.count,
          }))}
          buttonClassName="w-full"
          isDisabled={availableValues.length === 0}
        />
        {renderActiveFilterSection(field.key)}
      </div>
    )
  }

  const renderBooleanFacetCard = (field: EpigraphFacetSchemaFieldResponse) => {
    const selectedValue = typeof filters[field.key] === "boolean" ? filters[field.key] : undefined
    const filterChoices = [
      { label: "All", value: null, count: undefined },
      { label: "No", value: false, count: getBooleanFilterCount(field.key, false) },
      { label: "Yes", value: true, count: getBooleanFilterCount(field.key, true) },
    ]

    return (
      <div key={field.key} className={cardClassName}>
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
          {formatFacetLabel(field.label)}
        </div>

        <div className="grid grid-cols-3 gap-1">
          {filterChoices.map((choice) => {
            const isSelected = choice.value === null ? selectedValue === undefined : selectedValue === choice.value

            return (
              <button
                key={`${field.key}-${choice.label}`}
                type="button"
                onClick={() => onBooleanFilterChange(field.key, choice.value)}
                className={`inline-flex min-h-9 items-center justify-center rounded-md border px-2 py-1 text-[13px] font-semibold transition-colors ${
                  isSelected
                    ? "border-stone-900 bg-stone-900 text-stone-50"
                    : "border-stone-300 bg-white text-stone-700 hover:border-stone-500 hover:text-stone-900"
                }`}
              >
                {choice.count !== undefined ? `${choice.label} (${choice.count})` : choice.label}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const renderFacetFieldCard = (field: EpigraphFacetSchemaFieldResponse) => {
    if (booleanFieldKeys.has(field.key)) {
      return renderBooleanFacetCard(field)
    }

    return renderGenericFacetCard(field)
  }

  return (
    <>
      {showFilters && facetSchema.length > 0 && (
        <div className="space-y-3">
          {hasChronologySection && (
            <section className={sectionShellClassName}>
              {renderSectionHeader("Chronology", "Period range and chronology certainty")}

              <div className="grid gap-2 xl:grid-cols-[minmax(0,1.5fr)_minmax(16rem,0.8fr)]">
                {periodValues.length > 0 && (
                  <div className={cardClassName}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
                          Period
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">
                          {periodSummaryLabel}
                        </span>

                        {hasPeriodFilter && (
                          <button
                            type="button"
                            onClick={() => onFilterChange("period", "all")}
                            className="inline-flex h-7 items-center rounded-md border border-stone-300 bg-white px-2 text-xs font-semibold text-stone-700 transition-colors hover:border-stone-500 hover:text-stone-900"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-2.5 px-2 sm:px-3">
                      <MySlider
                        label="Period range"
                        thumbLabels={["Period start", "Period end"]}
                        minValue={0}
                        maxValue={Math.max(periodValues.length - 1, 0)}
                        step={1}
                        value={periodSliderValue}
                        onChange={handlePeriodSliderValueChange}
                        onChangeEnd={handlePeriodSliderChangeEnd}
                      />

                      <div className="relative mt-2.5 min-h-6 text-[10px] font-medium text-stone-600">
                        {periodValues.map((period, index) => {
                          const positionPercentage =
                            periodValues.length === 1 ? 50 : (index / (periodValues.length - 1)) * 100
                          const alignmentClassName =
                            periodValues.length === 1
                              ? "-translate-x-1/2 items-center text-center"
                              : index === 0
                                ? "items-start text-left"
                                : "-translate-x-1/2 items-center text-center"
                          const periodValueTextClassName = index === 0 ? "-translate-x-[2px] break-words" : "break-words"

                          return (
                            <div
                              key={`${period}-${index}`}
                              className={`absolute top-0 flex min-w-0 flex-col gap-1 leading-tight ${alignmentClassName}`}
                              style={{
                                left: `${positionPercentage}%`,
                                width: `${periodValues.length === 1 ? 100 : 100 / periodValues.length}%`,
                              }}
                            >
                              <span aria-hidden className="h-1.5 w-px bg-stone-400" />
                              <span className={periodValueTextClassName}>{period}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {chronologyFacetFields.map((field) => renderFacetFieldCard(field))}
              </div>
            </section>
          )}

          {hasLanguageScriptSection && (
            <section className={sectionShellClassName}>
              {renderSectionHeader("Language and script", "Language hierarchy, alphabet, script features, and writing techniques")}

              <div className="space-y-2">
                <div className={cardClassName}>
                  <div className="mb-2 flex items-center justify-between gap-2">

                    {hasLanguageFilters && (
                      <button
                        type="button"
                        onClick={onClearLanguageFilters}
                        className="inline-flex h-7 items-center rounded-md border border-stone-300 bg-white px-2 text-xs font-semibold text-stone-700 transition-colors hover:border-stone-500 hover:text-stone-900"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="grid gap-2 lg:grid-cols-3">
                    <div>
                      <EpigraphsFilterMultiSelect
                        label="Language Level 1"
                        allLabel="All"
                        selectedKeys={selectedLanguageLevel1Values}
                        onChange={(values) => onMultiFilterChange("language_level_1", values)}
                        options={languageLevel1Options}
                        buttonClassName="w-full"
                        isDisabled={languageLevel1Options.length === 0}
                      />
                      {renderActiveFilterSection("language_level_1")}
                    </div>

                    <div>
                      <EpigraphsFilterMultiSelect
                        label="Language Level 2"
                        allLabel="All"
                        selectedKeys={selectedLanguageLevel2Values}
                        onChange={(values) => onMultiFilterChange("language_level_2", values)}
                        options={languageLevel2Options}
                        buttonClassName="w-full"
                        isDisabled={languageLevel2Options.length === 0}
                      />
                      {renderActiveFilterSection("language_level_2")}
                    </div>

                    <div>
                      <EpigraphsFilterMultiSelect
                        label="Language Level 3"
                        allLabel="All"
                        selectedKeys={selectedLanguageLevel3Values}
                        onChange={(values) => onMultiFilterChange("language_level_3", values)}
                        options={languageLevel3Options}
                        buttonClassName="w-full"
                        isDisabled={languageLevel3Options.length === 0}
                      />
                      {renderActiveFilterSection("language_level_3")}
                    </div>
                  </div>
                </div>

                {languageScriptFacetFields.length > 0 && (
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                    {languageScriptFacetFields.map((field) => renderFacetFieldCard(field))}
                  </div>
                )}
              </div>
            </section>
          )}

          {hasTextualTypologySection && (
            <section className={sectionShellClassName}>
              {renderSectionHeader("Textual typology", "Text class and inscription type")}

              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                {textualTypologyFacetFields.map((field) => renderFacetFieldCard(field))}
              </div>
            </section>
          )}

          {hasGeographicSection && (
            <section className={sectionShellClassName}>
              {renderSectionHeader("Geographic", "Site names, geographical area, and country")}

              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                {geographicFacetFields.map((field) => renderFacetFieldCard(field))}
              </div>
            </section>
          )}

          {hasUngroupedSection && (
            <section className={sectionShellClassName}>
              {renderSectionHeader("Other", "Ungrouped filters exposed by the facet schema")}

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {ungroupedFacetFields.map((field) => renderFacetFieldCard(field))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  )
}