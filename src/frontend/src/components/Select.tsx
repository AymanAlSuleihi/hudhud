import type {ListBoxItemProps, SelectProps, ValidationResult} from 'react-aria-components'
import {Button, FieldError, Label, ListBox, ListBoxItem, Popover, Select, SelectValue, Text} from 'react-aria-components'
import { CaretUpDown } from "@phosphor-icons/react"

interface MySelectProps<T extends object>
  extends Omit<SelectProps<T>, 'children'> {
  label?: string
  description?: string
  errorMessage?: string | ((validation: ValidationResult) => string)
  items?: Iterable<T>
  children: React.ReactNode | ((item: T) => React.ReactNode)
  buttonClassName?: string
}

export function MySelect<T extends object>(
  { label, description, errorMessage, children, items, className = "", buttonClassName = "", ...props }:
    MySelectProps<T>
) {
  return (
    <Select {...props} className={`min-w-[150px] ${className}  overflow-x-auto`}>
      <Label className="block text-sm font-medium mb-1">{label}</Label>
      <Button className={`w-full border border-gray-400 p-2 rounded text-left flex items-center justify-between group ${buttonClassName}`}>
        <SelectValue />
        <CaretUpDown className="text-gray-500" />
      </Button>
      {description && <Text slot="description">{description}</Text>}
      <FieldError>{errorMessage}</FieldError>
      <Popover className="w-[var(--trigger-width)] cursor-default shadow-lg bg-white rounded-sm ring-1 ring-black/5 max-h-60 overflow-auto">
        <ListBox 
          items={items}
          autoFocus={false}
          className="select-listbox"
        >
          {children}
        </ListBox>
      </Popover>
    </Select>
  )
}

export function MyItem(props: ListBoxItemProps & { id?: string }) {
  const { id, textValue, ...otherProps } = props
  return (
    <ListBoxItem
      {...otherProps}
      id={id}
      textValue={textValue}
      className={({ isFocused, isSelected }) =>
        `my-item ${isFocused ? 'focused' : ''} ${isSelected ? 'selected' : ''}
        px-3 py-1 rounded cursor-default outline-none focus:bg-gray-200/50`}
    />
  )
}