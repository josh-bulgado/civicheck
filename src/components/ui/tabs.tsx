"use client"

import * as React from "react"
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"
import { Check } from "lucide-react"

import { cn } from "~/lib/utils"

/*
 * Variants a screen can pick on <TabsList variant>. The first eight are the
 * originals. The rest are drawn by the list and its triggers together:
 *  - glide    one underline that slides and resizes to the active tab
 *  - counted  underline tabs with a count chip (see TabsCount)
 *  - folder   active tab joins its panel; give TabsContent
 *             "rounded-b-xl border border-t-0 border-border-strong bg-background p-4"
 *  - stages   numbered steps joined by a line (see TabsStepMarker); set
 *             data-step="done" | "current" | "upcoming" on each trigger
 *  - dock     phone bottom bar, icon over label (see TabsDockIcon, max 4 tabs)
 *  - soft     ghost tabs with a tinted active state, wraps when crowded
 *  - rail     vertical list with an edge marker; pass orientation="vertical"
 *             to Tabs so arrow keys move up and down
 */

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
        editor: "gap-1 rounded-none bg-transparent p-0",
        accent: "bg-muted",
        pill: "gap-1 rounded-full bg-muted p-1 group-data-horizontal/tabs:h-auto",
        // The service editor's section bar: a rounded track, the active tab a raised white tile.
        segmented:
          "max-w-full justify-start gap-0.5 overflow-x-auto rounded-2xl bg-muted p-1 group-data-horizontal/tabs:h-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        // Bare track for a settings sidebar: each tab is its own soft pill.
        sidebar: "w-full gap-1 rounded-none bg-transparent p-0 group-data-horizontal/tabs:h-auto",
        // Equal-width tabs on a hairline, the active one underlined. Settings on a phone.
        underline: "w-full gap-0 rounded-none border-b border-border-light bg-transparent p-0 group-data-horizontal/tabs:h-auto",
        glide: "relative w-full justify-start gap-0.5 rounded-none border-b border-border-light bg-transparent p-0 group-data-horizontal/tabs:h-auto",
        counted: "w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-border-light bg-transparent p-0 group-data-horizontal/tabs:h-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        folder: "w-full justify-start gap-1 rounded-none border-b border-border-strong bg-transparent px-2 pb-0 group-data-horizontal/tabs:h-auto",
        stages: "grid w-full auto-cols-fr grid-flow-col rounded-none bg-transparent p-0 group-data-horizontal/tabs:h-auto",
        dock: "grid w-full auto-cols-fr grid-flow-col rounded-[20px] border border-border-strong bg-card p-1.5 group-data-horizontal/tabs:h-auto",
        soft: "w-full flex-wrap justify-start gap-1 rounded-none bg-transparent p-0 group-data-horizontal/tabs:h-auto",
        rail: "w-full flex-col items-stretch justify-start gap-0.5 rounded-none bg-transparent p-0 group-data-horizontal/tabs:h-auto",
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
  children,
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    >
      {children}
      {variant === "glide" ? (
        // Base UI measures the active tab and exposes it as CSS variables.
        <TabsPrimitive.Indicator
          data-slot="tabs-indicator"
          className="absolute bottom-[-1px] left-0 h-0.5 w-(--active-tab-width) translate-x-(--active-tab-left) rounded-full bg-primary transition-[translate,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        />
      ) : null}
    </TabsPrimitive.List>
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "group/tabs-trigger relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-disabled:pointer-events-none aria-disabled:opacity-50 dark:text-muted-foreground dark:hover:text-foreground group-data-[variant=default]/tabs-list:data-active:shadow-sm group-data-[variant=line]/tabs-list:data-active:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:border-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        "data-active:bg-background data-active:text-foreground dark:data-active:border-input dark:data-active:bg-input/30 dark:data-active:text-foreground",
        "group-data-[variant=editor]/tabs-list:h-full group-data-[variant=editor]/tabs-list:rounded-none group-data-[variant=editor]/tabs-list:data-active:border-transparent group-data-[variant=editor]/tabs-list:data-active:bg-transparent group-data-[variant=editor]/tabs-list:data-active:text-primary group-data-[variant=editor]/tabs-list:data-active:shadow-[inset_0_-2px_0_var(--primary)]",
        "group-data-[variant=accent]/tabs-list:data-active:bg-primary-fill group-data-[variant=accent]/tabs-list:data-active:text-primary-foreground group-data-[variant=accent]/tabs-list:data-active:shadow-sm group-data-[variant=accent]/tabs-list:not-data-active:hover:text-foreground group-data-[variant=accent]/tabs-list:data-active:hover:bg-primary-fill group-data-[variant=accent]/tabs-list:data-active:hover:text-primary-foreground",
        "group-data-[variant=pill]/tabs-list:rounded-full group-data-[variant=pill]/tabs-list:font-semibold group-data-[variant=pill]/tabs-list:text-body-2 group-data-[variant=pill]/tabs-list:hover:text-foreground group-data-[variant=pill]/tabs-list:data-active:bg-foreground group-data-[variant=pill]/tabs-list:data-active:text-card group-data-[variant=pill]/tabs-list:data-active:hover:text-card",
        "group-data-[variant=segmented]/tabs-list:h-10 group-data-[variant=segmented]/tabs-list:flex-none group-data-[variant=segmented]/tabs-list:rounded-[10px] group-data-[variant=segmented]/tabs-list:px-2.5 group-data-[variant=segmented]/tabs-list:data-active:bg-card group-data-[variant=segmented]/tabs-list:data-active:font-semibold group-data-[variant=segmented]/tabs-list:data-active:shadow-sm group-data-[variant=segmented]/tabs-list:data-active:ring-1 group-data-[variant=segmented]/tabs-list:data-active:ring-foreground/10",
        "group-data-[variant=sidebar]/tabs-list:h-11 group-data-[variant=sidebar]/tabs-list:gap-3 group-data-[variant=sidebar]/tabs-list:rounded-xl group-data-[variant=sidebar]/tabs-list:px-3 group-data-[variant=sidebar]/tabs-list:text-[15px] group-data-[variant=sidebar]/tabs-list:font-medium group-data-[variant=sidebar]/tabs-list:text-body-2 group-data-[variant=sidebar]/tabs-list:hover:bg-card/70 group-data-[variant=sidebar]/tabs-list:hover:text-foreground group-data-[variant=sidebar]/tabs-list:data-active:bg-card group-data-[variant=sidebar]/tabs-list:data-active:font-semibold group-data-[variant=sidebar]/tabs-list:data-active:text-primary group-data-[variant=sidebar]/tabs-list:data-active:shadow-[0_1px_2px_rgba(15,27,45,0.1)] dark:group-data-[variant=sidebar]/tabs-list:data-active:shadow-none group-data-[variant=sidebar]/tabs-list:data-active:hover:bg-card group-data-[variant=sidebar]/tabs-list:data-active:hover:text-primary",
        "group-data-[variant=underline]/tabs-list:h-12 group-data-[variant=underline]/tabs-list:-mb-px group-data-[variant=underline]/tabs-list:flex-1 group-data-[variant=underline]/tabs-list:rounded-none group-data-[variant=underline]/tabs-list:border-0 group-data-[variant=underline]/tabs-list:border-b-[3px] group-data-[variant=underline]/tabs-list:border-transparent group-data-[variant=underline]/tabs-list:bg-transparent group-data-[variant=underline]/tabs-list:text-[15px] group-data-[variant=underline]/tabs-list:font-medium group-data-[variant=underline]/tabs-list:text-body-2 group-data-[variant=underline]/tabs-list:data-active:border-primary group-data-[variant=underline]/tabs-list:data-active:bg-transparent group-data-[variant=underline]/tabs-list:data-active:font-semibold group-data-[variant=underline]/tabs-list:data-active:text-primary",
        "group-data-[variant=glide]/tabs-list:after:hidden group-data-[variant=counted]/tabs-list:after:hidden group-data-[variant=folder]/tabs-list:after:hidden group-data-[variant=stages]/tabs-list:after:hidden group-data-[variant=dock]/tabs-list:after:hidden group-data-[variant=soft]/tabs-list:after:hidden group-data-[variant=rail]/tabs-list:after:hidden",
        "group-data-[variant=glide]/tabs-list:h-10 group-data-[variant=glide]/tabs-list:flex-none group-data-[variant=glide]/tabs-list:px-3.5 group-data-[variant=glide]/tabs-list:data-active:border-transparent group-data-[variant=glide]/tabs-list:data-active:bg-transparent group-data-[variant=glide]/tabs-list:data-active:font-semibold group-data-[variant=glide]/tabs-list:data-active:text-foreground",
        "group-data-[variant=counted]/tabs-list:-mb-px group-data-[variant=counted]/tabs-list:h-11 group-data-[variant=counted]/tabs-list:flex-none group-data-[variant=counted]/tabs-list:rounded-none group-data-[variant=counted]/tabs-list:border-0 group-data-[variant=counted]/tabs-list:border-b-2 group-data-[variant=counted]/tabs-list:border-transparent group-data-[variant=counted]/tabs-list:px-3 group-data-[variant=counted]/tabs-list:text-body-2 group-data-[variant=counted]/tabs-list:data-active:border-primary group-data-[variant=counted]/tabs-list:data-active:bg-transparent group-data-[variant=counted]/tabs-list:data-active:font-semibold group-data-[variant=counted]/tabs-list:data-active:text-foreground",
        "group-data-[variant=folder]/tabs-list:-mb-px group-data-[variant=folder]/tabs-list:h-10 group-data-[variant=folder]/tabs-list:flex-none group-data-[variant=folder]/tabs-list:rounded-t-[10px] group-data-[variant=folder]/tabs-list:rounded-b-none group-data-[variant=folder]/tabs-list:bg-muted group-data-[variant=folder]/tabs-list:px-4 group-data-[variant=folder]/tabs-list:text-body-2 group-data-[variant=folder]/tabs-list:not-data-active:hover:bg-muted/60 group-data-[variant=folder]/tabs-list:data-active:border-border-strong group-data-[variant=folder]/tabs-list:data-active:border-b-background group-data-[variant=folder]/tabs-list:data-active:bg-background group-data-[variant=folder]/tabs-list:data-active:font-semibold group-data-[variant=folder]/tabs-list:data-active:text-foreground",
        "group-data-[variant=stages]/tabs-list:h-auto group-data-[variant=stages]/tabs-list:flex-col group-data-[variant=stages]/tabs-list:gap-2 group-data-[variant=stages]/tabs-list:rounded-xl group-data-[variant=stages]/tabs-list:border-0 group-data-[variant=stages]/tabs-list:px-1 group-data-[variant=stages]/tabs-list:pt-2.5 group-data-[variant=stages]/tabs-list:pb-3 group-data-[variant=stages]/tabs-list:text-[13px] group-data-[variant=stages]/tabs-list:text-muted-foreground group-data-[variant=stages]/tabs-list:before:absolute group-data-[variant=stages]/tabs-list:before:top-[25px] group-data-[variant=stages]/tabs-list:before:right-[calc(50%+17px)] group-data-[variant=stages]/tabs-list:before:left-[calc(-50%+17px)] group-data-[variant=stages]/tabs-list:before:h-0.5 group-data-[variant=stages]/tabs-list:before:bg-border-strong group-data-[variant=stages]/tabs-list:first:before:hidden group-data-[variant=stages]/tabs-list:data-[step=current]:text-body-2 group-data-[variant=stages]/tabs-list:data-[step=done]:text-body-2 group-data-[variant=stages]/tabs-list:data-[step=current]:before:bg-primary-fill group-data-[variant=stages]/tabs-list:data-[step=done]:before:bg-primary-fill group-data-[variant=stages]/tabs-list:data-active:bg-primary-tint group-data-[variant=stages]/tabs-list:data-active:font-semibold group-data-[variant=stages]/tabs-list:data-active:text-foreground",
        "group-data-[variant=dock]/tabs-list:h-auto group-data-[variant=dock]/tabs-list:flex-col group-data-[variant=dock]/tabs-list:gap-1 group-data-[variant=dock]/tabs-list:rounded-2xl group-data-[variant=dock]/tabs-list:border-0 group-data-[variant=dock]/tabs-list:px-0.5 group-data-[variant=dock]/tabs-list:pt-1.5 group-data-[variant=dock]/tabs-list:pb-2 group-data-[variant=dock]/tabs-list:text-xs group-data-[variant=dock]/tabs-list:data-active:bg-transparent group-data-[variant=dock]/tabs-list:data-active:font-semibold group-data-[variant=dock]/tabs-list:data-active:text-foreground",
        "group-data-[variant=soft]/tabs-list:h-9 group-data-[variant=soft]/tabs-list:flex-none group-data-[variant=soft]/tabs-list:rounded-lg group-data-[variant=soft]/tabs-list:px-3.5 group-data-[variant=soft]/tabs-list:text-body-2 group-data-[variant=soft]/tabs-list:not-data-active:hover:bg-muted group-data-[variant=soft]/tabs-list:data-active:border-transparent group-data-[variant=soft]/tabs-list:data-active:bg-primary-soft group-data-[variant=soft]/tabs-list:data-active:font-semibold group-data-[variant=soft]/tabs-list:data-active:text-primary group-data-[variant=soft]/tabs-list:data-active:shadow-none",
        "group-data-[variant=rail]/tabs-list:h-10 group-data-[variant=rail]/tabs-list:gap-2.5 group-data-[variant=rail]/tabs-list:rounded-[10px] group-data-[variant=rail]/tabs-list:border-0 group-data-[variant=rail]/tabs-list:pr-3 group-data-[variant=rail]/tabs-list:pl-4 group-data-[variant=rail]/tabs-list:text-body-2 group-data-[variant=rail]/tabs-list:not-data-active:hover:bg-muted group-data-[variant=rail]/tabs-list:before:absolute group-data-[variant=rail]/tabs-list:before:inset-y-[11px] group-data-[variant=rail]/tabs-list:before:left-1 group-data-[variant=rail]/tabs-list:before:w-[3px] group-data-[variant=rail]/tabs-list:before:scale-y-40 group-data-[variant=rail]/tabs-list:before:rounded-full group-data-[variant=rail]/tabs-list:before:bg-primary-fill group-data-[variant=rail]/tabs-list:before:opacity-0 group-data-[variant=rail]/tabs-list:before:transition-[opacity,scale] group-data-[variant=rail]/tabs-list:data-active:bg-primary-tint group-data-[variant=rail]/tabs-list:data-active:font-semibold group-data-[variant=rail]/tabs-list:data-active:text-primary group-data-[variant=rail]/tabs-list:data-active:before:scale-y-100 group-data-[variant=rail]/tabs-list:data-active:before:opacity-100",
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

// A count chip for a tab label. `tone="alert"` flags the tab that needs action
// and keeps its warning color when the tab is active.
function TabsCount({
  className,
  tone = "default",
  ...props
}: React.ComponentProps<"span"> & { tone?: "default" | "alert" }) {
  return (
    <span
      data-slot="tabs-count"
      data-tone={tone}
      className={cn(
        "inline-flex min-w-5.5 items-center justify-center rounded-full bg-muted px-1.5 py-1 font-mono text-xs leading-none text-muted-foreground tabular-nums transition-colors group-data-active/tabs-trigger:bg-primary-soft group-data-active/tabs-trigger:text-primary data-[tone=alert]:bg-warning-soft data-[tone=alert]:text-warning-strong group-data-active/tabs-trigger:data-[tone=alert]:bg-warning-soft group-data-active/tabs-trigger:data-[tone=alert]:text-warning-strong",
        className
      )}
      {...props}
    />
  )
}

// The numbered dot for a `stages` trigger. It reads data-step from the trigger,
// shows a check once the step is done, and rings the current one.
function TabsStepMarker({
  className,
  children,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden="true"
      data-slot="tabs-step-marker"
      className={cn(
        "relative z-10 grid size-[30px] place-items-center rounded-full border-2 border-border-strong bg-card font-mono text-[13px] leading-none font-semibold text-muted-foreground group-data-[step=current]/tabs-trigger:border-primary-fill group-data-[step=current]/tabs-trigger:text-primary group-data-[step=done]/tabs-trigger:border-primary-fill group-data-[step=done]/tabs-trigger:bg-primary-fill group-data-[step=done]/tabs-trigger:text-primary-foreground",
        className
      )}
      {...props}
    >
      <span className="group-data-[step=done]/tabs-trigger:hidden">
        {children}
      </span>
      <Check
        className="hidden size-3.5 group-data-[step=done]/tabs-trigger:block"
        strokeWidth={3.5}
      />
    </span>
  )
}

// The icon holder for a `dock` trigger: a soft pill appears behind the icon of
// the active tab. Put a badge inside it if the destination has a count.
function TabsDockIcon({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden="true"
      data-slot="tabs-dock-icon"
      className={cn(
        "relative grid h-[30px] w-14 place-items-center rounded-full transition-colors group-data-active/tabs-trigger:bg-primary-soft group-data-active/tabs-trigger:text-primary",
        className
      )}
      {...props}
    />
  )
}

export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  TabsCount,
  TabsStepMarker,
  TabsDockIcon,
  tabsListVariants,
}
