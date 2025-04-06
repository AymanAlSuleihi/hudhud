import { 
  Select as AriaSelect,
  Button,
  ListBox,
  ListBoxItem,
  Label,
  Popover,
  SelectProps as AriaSelectProps
} from "react-aria-components"
import { CaretUpDown } from "@phosphor-icons/react"

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
  return (
    <AriaSelect {...props} className={`min-w-[150px] ${className}`}>
      <Label className="block text-sm font-medium mb-1">{label}</Label>
      <Button className="w-full border border-gray-400 p-2 rounded text-left flex items-center justify-between">
        {options.find(opt => opt.id === props.selectedKey)?.label || props.selectedKey}
        <CaretUpDown className="text-gray-500" />
      </Button>
      <Popover className="w-[var(--trigger-width)] cursor-default shadow-lg bg-white rounded-sm ring-1 ring-black/5">
        <ListBox className="p-2">
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
