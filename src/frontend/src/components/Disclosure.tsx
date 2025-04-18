import React from "react"
import {Disclosure, DisclosurePanel, Button, Heading} from "react-aria-components"
import type {DisclosureProps} from "react-aria-components"
import {CaretDown, CaretRight} from "@phosphor-icons/react"

interface MyDisclosureProps extends Omit<DisclosureProps, "children"> {
  title: string,
  children: React.ReactNode
}

export const MyDisclosure: React.FC<MyDisclosureProps> = ({title, children, ...props}) => {
  return (
    <Disclosure {...props}>
      {({isExpanded}) => (
        <>
          <Heading>
            <Button 
              slot="trigger"
              className="flex items-center gap-2 font-medium hover:text-gray-600"
            >
              <span className="text-sm">{isExpanded ? <CaretDown /> : <CaretRight />}</span>
              {title}
            </Button>
          </Heading>
          <DisclosurePanel className="mt-2">
            {children}
          </DisclosurePanel>
        </>
      )}
    </Disclosure>
  )
}
