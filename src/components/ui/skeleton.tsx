import { cn } from "~/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      // `civic-skeleton` sweeps a highlight across the block instead of fading
      // the whole thing in and out. A moving placeholder reads as progress,
      // where a pulsing one reads as something stuck.
      className={cn("civic-skeleton rounded-md", className)}
      {...props}
    />
  )
}

export { Skeleton }
