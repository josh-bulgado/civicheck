import * as React from "react"

import { cn } from "~/lib/utils"

// Same `fieldSize` as Input, so a form can switch both to the touch density.
function Textarea({
  className,
  fieldSize = "default",
  ...props
}: React.ComponentProps<"textarea"> & { fieldSize?: "default" | "touch" }) {
  return (
    <textarea
      data-slot="textarea"
      data-field-size={fieldSize}
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-md border border-input bg-transparent px-2.5 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm data-[field-size=touch]:min-h-[84px] data-[field-size=touch]:rounded-xl data-[field-size=touch]:px-3.5 data-[field-size=touch]:py-3 data-[field-size=touch]:leading-snug data-[field-size=touch]:focus-visible:ring-4 data-[field-size=touch]:focus-visible:ring-ring/25",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
