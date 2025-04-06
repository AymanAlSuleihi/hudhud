import { useState } from "react"
import { Button } from "react-aria-components"
import { CaretDown, CaretUp } from "@phosphor-icons/react"
import { Select } from "./Select"

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

export function AdvancedFilters({ values, onChange, fields }: AdvancedFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="w-full">
      <Button 
        onPress={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        {isExpanded ? <CaretUp /> : <CaretDown />}
        Advanced Filters
      </Button>

      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
          {Object.entries(fields).map(([field, options]) => (
            <Select
              key={field}
              label={FILTER_LABELS[field]}
              selectedKey={values[field as keyof FilterValues]}
              onSelectionChange={(key) => {
                onChange({
                  ...values,
                  [field]: key?.toString()
                })
              }}
              options={[
                { id: "", label: "Any" },
                ...options.map(opt => ({ 
                  id: opt, 
                  label: opt.toString() 
                }))
              ]}
            />
          ))}
        </div>
      )}
    </div>
  )
}
