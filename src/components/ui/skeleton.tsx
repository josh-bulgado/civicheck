import { cn } from "~/lib/utils"

function Skeleton({
  className,
  shape = "default",
  ...props
}: React.ComponentProps<"div"> & {
  // `soft` and `split` keep the default `rounded-md`: a skeleton is a small part.
  shape?: "default" | "pill" | "soft" | "split"
}) {
  return (
    <div
      data-slot="skeleton"
      data-shape={shape}
      // `civic-skeleton` sweeps a highlight across the block instead of fading
      // the whole thing in and out. A moving placeholder reads as progress,
      // where a pulsing one reads as something stuck.
      className={cn(
        "civic-skeleton rounded-md data-[shape=pill]:rounded-full",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
