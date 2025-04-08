import { 
  Select as AriaSelect,
  Button,
  ListBox,
  ListBoxItem,
  Label,
  Popover,
  SelectProps as AriaSelectProps,
  Key
} from "react-aria-components"
import { CaretUpDown, X } from "@phosphor-icons/react"

interface Option {
  id: string
  label: string
}

interface SelectProps extends Omit<AriaSelectProps, "children"> {
  label: string
  options: Option[]
  className?: string
}

export function Select({ label, options, className = "", ...props }: SelectProps) {
  const selectedOption = options.find(opt => opt.id === props.selectedKey)
  
  return (
    <AriaSelect 
      {...props} 
      selectedKey={props.selectedKey || ""}
      className={`min-w-[150px] ${className}`}
    >
      <Label className="block text-sm font-medium mb-1">{label}</Label>
      <div className="relative">
        <Button className="w-full border border-gray-400 p-2 rounded text-left flex items-center justify-between group">
          <span>{selectedOption?.label}</span>
          <CaretUpDown className="text-gray-500" />
        </Button>
        {props.selectedKey && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              props.onSelectionChange?.("")
            }}
            className="absolute right-8 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100"
          >
            <X size={14} className="text-gray-500" />
          </button>
        )}
      </div>
      <Popover className="w-[var(--trigger-width)] cursor-default shadow-lg bg-white rounded-sm ring-1 ring-black/5">
        <ListBox>
          {options.map(option => (
            <ListBoxItem 
              key={option.id} 
              id={option.id}
              className="px-3 py-1 rounded cursor-default outline-none focus:bg-gray-200/50"
            >
              {option.label}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </AriaSelect>
  )
}
