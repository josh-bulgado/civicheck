"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "~/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-horizontal/tabs:h-9 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
        editor: "gap-1 rounded-none bg-transparent",
        accent: "bg-muted",
        pill: "gap-1 rounded-full bg-muted p-1 group-data-horizontal/tabs:h-auto",
        // The service editor's section bar: a rounded track, the active tab a raised white tile.
        segmented:
          "max-w-full justify-start gap-0.5 overflow-x-auto rounded-2xl bg-muted p-1 group-data-horizontal/tabs:h-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        // Bare track for a settings sidebar: each tab is its own soft pill.
        sidebar: "w-full gap-1 rounded-none bg-transparent p-0 group-data-horizontal/tabs:h-auto",
        // Equal-width tabs on a hairline, the active one underlined. Settings on a phone.
        underline: "w-full gap-0 rounded-none border-b border-border-light bg-transparent p-0 group-data-horizontal/tabs:h-auto",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-disabled:pointer-events-none aria-disabled:opacity-50 dark:text-muted-foreground dark:hover:text-foreground group-data-[variant=default]/tabs-list:data-active:shadow-sm group-data-[variant=line]/tabs-list:data-active:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:border-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        "data-active:bg-background data-active:text-foreground dark:data-active:border-input dark:data-active:bg-input/30 dark:data-active:text-foreground",
        "group-data-[variant=editor]/tabs-list:rounded-none group-data-[variant=editor]/tabs-list:data-active:bg-transparent group-data-[variant=editor]/tabs-list:data-active:text-primary group-data-[variant=editor]/tabs-list:data-active:shadow-[inset_0_-2px_0_var(--primary)]",
        "group-data-[variant=accent]/tabs-list:data-active:bg-primary group-data-[variant=accent]/tabs-list:data-active:text-primary-foreground group-data-[variant=accent]/tabs-list:data-active:shadow-sm group-data-[variant=accent]/tabs-list:not-data-active:hover:text-foreground group-data-[variant=accent]/tabs-list:data-active:hover:bg-primary group-data-[variant=accent]/tabs-list:data-active:hover:text-primary-foreground",
        "group-data-[variant=pill]/tabs-list:rounded-full group-data-[variant=pill]/tabs-list:font-semibold group-data-[variant=pill]/tabs-list:text-body-2 group-data-[variant=pill]/tabs-list:hover:text-foreground group-data-[variant=pill]/tabs-list:data-active:bg-foreground group-data-[variant=pill]/tabs-list:data-active:text-white group-data-[variant=pill]/tabs-list:data-active:hover:text-white",
        "group-data-[variant=segmented]/tabs-list:h-10 group-data-[variant=segmented]/tabs-list:flex-none group-data-[variant=segmented]/tabs-list:rounded-[10px] group-data-[variant=segmented]/tabs-list:px-2.5 group-data-[variant=segmented]/tabs-list:data-active:bg-card group-data-[variant=segmented]/tabs-list:data-active:font-semibold group-data-[variant=segmented]/tabs-list:data-active:shadow-sm group-data-[variant=segmented]/tabs-list:data-active:ring-1 group-data-[variant=segmented]/tabs-list:data-active:ring-foreground/10",
        "group-data-[variant=sidebar]/tabs-list:h-11group-data-[variant=sidebar]/tabs-list:gap-3 group-data-[variant=sidebar]/tabs-list:rounded-xl group-data-[variant=sidebar]/tabs-list:px-3 group-data-[variant=sidebar]/tabs-list:text-[15px] group-data-[variant=sidebar]/tabs-list:font-medium group-data-[variant=sidebar]/tabs-list:text-body-2 group-data-[variant=sidebar]/tabs-list:hover:bg-white/70 group-data-[variant=sidebar]/tabs-list:hover:text-foreground group-data-[variant=sidebar]/tabs-list:data-active:bg-white group-data-[variant=sidebar]/tabs-list:data-active:font-semibold group-data-[variant=sidebar]/tabs-list:data-active:text-primary group-data-[variant=sidebar]/tabs-list:data-active:shadow-[0_1px_2px_rgba(15,27,45,0.1)] group-data-[variant=sidebar]/tabs-list:data-active:hover:bg-white group-data-[variant=sidebar]/tabs-list:data-active:hover:text-primary",
        "group-data-[variant=underline]/tabs-list:h-12 group-data-[variant=underline]/tabs-list:-mb-px group-data-[variant=underline]/tabs-list:flex-1 group-data-[variant=underline]/tabs-list:rounded-none group-data-[variant=underline]/tabs-list:border-0 group-data-[variant=underline]/tabs-list:border-b-[3px] group-data-[variant=underline]/tabs-list:border-transparent group-data-[variant=underline]/tabs-list:bg-transparent group-data-[variant=underline]/tabs-list:text-[15px] group-data-[variant=underline]/tabs-list:font-medium group-data-[variant=underline]/tabs-list:text-body-2 group-data-[variant=underline]/tabs-list:data-active:border-primary group-data-[variant=underline]/tabs-list:data-active:bg-transparent group-data-[variant=underline]/tabs-list:data-active:font-semibold group-data-[variant=underline]/tabs-list:data-active:text-primary",
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-[-5px] group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-right-1 group-data-vertical/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
