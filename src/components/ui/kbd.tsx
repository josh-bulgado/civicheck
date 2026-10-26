import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "~/lib/utils"

const kbdVariants = cva(
  "pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm px-1 font-sans text-xs font-medium select-none [&_svg:not([class*='size-'])]:size-3",
  {
    variants: {
      variant: {
        default:
          "bg-muted text-muted-foreground in-data-[slot=tooltip-content]:bg-background/20 in-data-[slot=tooltip-content]:text-background",
        ghost: "bg-transparent text-current",
      },
      shape: {
        default: "",
        pill: "rounded-full px-2",
      },
    },
    defaultVariants: {
      variant: "default",
      shape: "default",
    },
  }
)

function Kbd({
  className,
  variant = "default",
  shape = "default",
  ...props
}: React.ComponentProps<"kbd"> & VariantProps<typeof kbdVariants>) {
  return (
    <kbd
      data-slot="kbd"
      data-variant={variant}
      data-shape={shape}
      className={cn(kbdVariants({ variant, shape }), className)}
      {...props}
    />
  )
}

function KbdGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <kbd
      data-slot="kbd-group"
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    />
  )
}

export { Kbd, KbdGroup, kbdVariants }
