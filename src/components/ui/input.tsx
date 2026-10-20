import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "~/lib/utils"

// `size` is already a native input attribute, so the density is `fieldSize`, on
// the same scale as Button: default 36px, lg 40px, touch 44px.
// `inline` is a heading you edit in place: no border until hovered or focused.
function Input({
  className,
  type,
  fieldSize = "default",
  variant = "default",
  ...props
}: React.ComponentProps<"input"> & {
  fieldSize?: "default" | "lg" | "touch"
  variant?: "default" | "inline"
}) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      data-field-size={fieldSize}
      data-variant={variant}
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm data-[field-size=lg]:h-10 data-[field-size=lg]:px-3 data-[field-size=touch]:h-11 data-[field-size=touch]:rounded-xl data-[field-size=touch]:px-3.5 data-[field-size=touch]:focus-visible:ring-4 data-[field-size=touch]:focus-visible:ring-ring/25 data-[variant=inline]:h-10 data-[variant=inline]:border-transparent data-[variant=inline]:px-2.5 data-[variant=inline]:text-xl data-[variant=inline]:font-extrabold data-[variant=inline]:tracking-[-0.02em] data-[variant=inline]:shadow-none data-[variant=inline]:hover:border-input data-[variant=inline]:focus-visible:bg-background data-[variant=inline]:md:text-xl",
        className
      )}
      {...props}
    />
  )
}

export { Input }
