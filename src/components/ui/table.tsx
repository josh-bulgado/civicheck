import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "~/lib/utils"

const tableVariants = cva("w-full caption-bottom text-sm", {
  variants: {
    variant: {
      default: "",
      entity: "text-foreground",
      log: "text-foreground tabular-nums",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

function Table({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"table"> & VariantProps<typeof tableVariants>) {
  return (
    <div
      data-slot="table-container"
      data-table-variant={variant}
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn(tableVariants({ variant }), className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        "[&_tr]:border-b",
        "in-data-[table-variant=entity]:border-b in-data-[table-variant=entity]:border-border in-data-[table-variant=entity]:bg-surface-subtle",
        "in-data-[table-variant=log]:bg-primary-fill in-data-[table-variant=log]:text-primary-foreground in-data-[table-variant=log]:[&_tr]:border-transparent",
        className
      )}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        // Only the background transitions. `transition-colors` also animates
        // border-color, and Safari does not repaint a color transition on a
        // collapsed table border, so after a dark/light switch the row dividers
        // stayed stuck in the previous theme's color.
        "border-b transition-[background-color] hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        "in-data-[table-variant=entity]:hover:bg-surface-subtle",
        "in-data-[table-variant=log]:border-border-lighter in-data-[table-variant=log]:even:bg-[color-mix(in_srgb,var(--primary-tint)_65%,var(--card))] in-data-[table-variant=log]:hover:bg-primary-soft in-data-[table-variant=log]:data-[state=selected]:bg-primary-soft",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
        "in-data-[table-variant=entity]:text-muted-foreground",
        "in-data-[table-variant=log]:font-semibold in-data-[table-variant=log]:text-primary-foreground",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  tableVariants,
}
