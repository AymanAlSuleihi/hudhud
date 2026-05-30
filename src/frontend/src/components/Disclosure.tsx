import React from "react"
import {Disclosure, DisclosurePanel, Button, Heading} from "react-aria-components"
import type {DisclosureProps} from "react-aria-components"
import {CaretDown, CaretRight} from "@phosphor-icons/react"

interface MyDisclosureProps extends Omit<DisclosureProps, "children"> {
  title: React.ReactNode,
  actions?: React.ReactNode,
  children: React.ReactNode
}

export const MyDisclosure: React.FC<MyDisclosureProps> = ({title, actions, children, ...props}) => {
  return (
    <Disclosure {...props}>
      {({isExpanded}) => (
        <>
          <div className="flex items-center justify-between gap-2">
            <Heading className="min-w-0 flex-1">
              <Button 
                slot="trigger"
                className="flex w-full items-center gap-2 font-medium hover:text-gray-600"
              >
                <span className="text-sm">{isExpanded ? <CaretDown /> : <CaretRight />}</span>
                <span className="min-w-0">{title}</span>
              </Button>
            </Heading>
            {actions ? <div className="shrink-0">{actions}</div> : null}
          </div>
          <DisclosurePanel className="mt-2">
            {children}
          </DisclosurePanel>
        </>
      )}
    </Disclosure>
  )
}
