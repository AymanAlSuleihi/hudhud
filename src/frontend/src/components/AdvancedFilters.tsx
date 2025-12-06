import { useState } from "react"
import { Button } from "react-aria-components"
import { CaretDown, CaretUp, CaretLeft, CaretRight } from "@phosphor-icons/react"
import { MySelect, MyItem } from "./Select"

interface FilterValues {
  period?: string
  chronology_conjectural?: string
  language_level_1?: string
  language_level_2?: string
  language_level_3?: string
  alphabet?: string
  script_typology?: string
  script_cursus?: string
  textual_typology?: string
  textual_typology_conjectural?: string
  writing_techniques?: string
  royal_inscription?: string
}

interface AdvancedFiltersProps {
  values: FilterValues
  onChange: (values: FilterValues) => void
  fields: Record<string, string[]>
  isCollapsed?: boolean
  onCollapseToggle?: () => void
}

const FILTER_LABELS: Record<string, string> = {
  period: "Period",
  chronology_conjectural: "Chronology (Conjectural)",
  language_level_1: "Language (Level 1)",
  language_level_2: "Language (Level 2)",
  language_level_3: "Language (Level 3)",
  alphabet: "Alphabet",
  script_typology: "Script Typology",
  script_cursus: "Script Cursus",
  textual_typology: "Textual Typology",
  textual_typology_conjectural: "Textual Typology (Conjectural)",
  writing_techniques: "Writing Techniques",
  royal_inscription: "Royal Inscription",
}

const removeEmptyValues = (obj: Record<string, any>) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== "" && value !== null && value !== undefined)
  )
}

export function AdvancedFilters({ 
  values, 
  onChange, 
  fields,
  isCollapsed,
  onCollapseToggle 
}: AdvancedFiltersProps) {
  const [isMobileExpanded, setIsMobileExpanded] = useState(false)

  return (
    <div className="w-full relative">
      <div className="flex items-center justify-between mb-4">
        <Button 
          onPress={() => setIsMobileExpanded(!isMobileExpanded)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 md:hidden"
        >
          {isMobileExpanded ? <CaretUp /> : <CaretDown />}
          Advanced Filters
        </Button>

        <div className="hidden md:flex items-center gap-2">
          <h2 className={`font-medium ${isCollapsed ? "hidden" : "block"}`}>
            Advanced Filters
          </h2>
          <Button
            onPress={onCollapseToggle}
            className="p-1.5 rounded-sm hover:bg-gray-100"
          >
            {isCollapsed ? <CaretRight /> : <CaretLeft />}
          </Button>
        </div>
      </div>

      <div className={`overflow-hidden transition-all duration-75 ${isCollapsed ? "w-0 opacity-0" : "w-full opacity-100"}`}>
        <div className={`
          md:block 
          ${isMobileExpanded ? "block" : "hidden"} 
          transition-all duration-75
          ${isCollapsed ? "-translate-x-full" : "translate-x-0"}
        `}>
          <div className="space-y-4">
            {Object.entries(fields).map(([field, options]) => {
              console.log("Rendering filter:", field, "with options:", options)
              return (
                <MySelect
                  key={field}
                  label={FILTER_LABELS[field]}
                  selectedKey={values[field as keyof FilterValues]}
                  onSelectionChange={(key: React.Key | null) => {
                    if (typeof key === "string") {
                      const selectedItem = options.find(opt => opt === key)
                      const newValues = {
                        ...values,
                        [field]: selectedItem || ""
                      }
                      onChange(removeEmptyValues(newValues))
                    }
                  }}
                >
                  {options.map(opt => {
                    console.log("Rendering option:", opt)
                    return (
                    <MyItem key={opt} textValue={opt} id={opt}>
                      {opt}
                    </MyItem>
                  )})}
                </MySelect>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
