"use client"

import * as React from "react"
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group"
import { cva, type VariantProps } from "class-variance-authority"
import { Check } from "lucide-react"

import { cn } from "~/lib/utils"
import { toggleVariants } from "~/components/ui/toggle"

/*
 * `default` and `outline` are the original shadcn looks: each item is its own
 * Toggle. Every other variant is drawn by the group and its items together,
 * the way TabsList and TabsTrigger do it, so a screen picks a look with one prop.
 * They share one outer height (`size`: sm 32, default 36, lg 40) so a group
 * lines up with an input or select beside it. They are built for a horizontal
 * group.
 */
const toggleGroupVariants = cva(
  "group/toggle-group flex w-fit flex-row items-center gap-[--spacing(var(--gap))] rounded-md [--tg-h:calc(var(--spacing)*9)] data-[size=lg]:[--tg-h:calc(var(--spacing)*10)] data-[size=sm]:[--tg-h:calc(var(--spacing)*8)] data-[spacing=0]:data-[variant=outline]:shadow-xs data-vertical:flex-col data-vertical:items-stretch",
  {
    variants: {
      variant: {
        default: "",
        outline: "",
        // Muted track, raised white tile.
        segmented: "gap-0.5 rounded-xl bg-muted p-[3px] [--tg-pad:3px]",
        // Fully round track, ink-filled tile.
        pill: "gap-0.5 rounded-full bg-muted p-[3px] [--tg-pad:3px]",
        // Hairline track, soft brand tint. Quiet enough to sit beside inputs.
        tinted:
          "gap-0.5 rounded-lg border border-border-strong bg-surface-subtle p-0.5 [--tg-pad:3px]",
        // Muted track, brand-filled tile. Use once per view.
        accent: "gap-0.5 rounded-xl bg-muted p-[3px] [--tg-pad:3px]",
        // Connected buttons with shared borders and no track.
        joined: "gap-0",
        // Equal-width items and one tile that glides between them. The group
        // measures itself (see useSlidingIndicator) and sets --tg-n and --tg-i.
        sliding:
          "relative isolate grid auto-cols-fr grid-flow-col gap-0 rounded-xl bg-muted p-[3px] [--tg-pad:3px] before:pointer-events-none before:absolute before:inset-y-[3px] before:left-[3px] before:w-[calc((100%-6px)/var(--tg-n,3))] before:translate-x-[calc(var(--tg-i,0)*100%)] before:rounded-[9px] before:bg-card before:shadow-sm before:ring-1 before:ring-foreground/10 before:transition-transform before:duration-300 before:ease-[cubic-bezier(0.22,1,0.36,1)] not-data-ready:before:transition-none data-[indicator=off]:before:opacity-0 motion-reduce:before:transition-none",
        // Separate wrapping chips with a check. The one built for multi-select.
        chips: "flex-wrap gap-2",
        // Large options with an icon and a line of help.
        cards:
          "grid w-full grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-2.5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const toggleGroupItemVariants = cva(
  "group/tg-item relative inline-flex h-[calc(var(--tg-h)-2*var(--tg-pad,0px))] shrink-0 items-center justify-center gap-2 rounded-md border border-transparent px-3 text-sm font-medium whitespace-nowrap text-muted-foreground outline-none transition-[color,background-color,border-color,box-shadow,scale] not-data-pressed:hover:text-foreground focus-visible:z-10 focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        segmented:
          "rounded-[9px] data-pressed:bg-card data-pressed:font-semibold data-pressed:text-foreground data-pressed:shadow-sm data-pressed:ring-1 data-pressed:ring-foreground/10",
        pill: "rounded-full px-3.5 font-semibold text-body-2 data-pressed:bg-foreground data-pressed:text-card",
        tinted:
          "rounded-sm data-pressed:bg-primary-soft data-pressed:text-primary data-pressed:ring-1 data-pressed:ring-primary/15 data-pressed:ring-inset",
        accent:
          "rounded-[9px] data-pressed:bg-primary-fill data-pressed:font-semibold data-pressed:text-primary-foreground data-pressed:shadow-sm",
        joined:
          "-ml-px rounded-none border-border-strong bg-card px-4 text-body-2 first:ml-0 first:rounded-l-lg last:rounded-r-lg not-data-pressed:hover:bg-muted data-pressed:z-10 data-pressed:border-primary data-pressed:bg-primary-soft data-pressed:font-semibold data-pressed:text-primary",
        sliding:
          "z-10 rounded-[9px] px-4 data-pressed:font-semibold data-pressed:text-foreground",
        chips:
          "rounded-full border-border-strong bg-card px-3.5 text-body-2 not-data-pressed:hover:bg-muted data-pressed:border-primary/45 data-pressed:bg-primary-soft data-pressed:font-semibold data-pressed:text-primary",
        cards:
          "h-auto flex-col items-start justify-start gap-1 rounded-xl border-border-strong bg-card p-3.5 text-left whitespace-normal text-body-2 not-data-pressed:hover:border-primary/40 data-pressed:border-primary data-pressed:bg-primary-tint data-pressed:text-foreground data-pressed:ring-1 data-pressed:ring-primary",
      },
    },
  }
)

type ToggleGroupVariant = NonNullable<
  VariantProps<typeof toggleGroupVariants>["variant"]
>
type GroupOwnedVariant = Exclude<ToggleGroupVariant, "default" | "outline">

function isGroupOwned(
  variant: ToggleGroupVariant | undefined | null
): variant is GroupOwnedVariant {
  return !!variant && variant !== "default" && variant !== "outline"
}

type ToggleGroupContextValue = {
  variant?: ToggleGroupVariant | null
  size?: VariantProps<typeof toggleVariants>["size"]
  spacing?: number
  orientation?: "horizontal" | "vertical"
}

const ToggleGroupContext = React.createContext<ToggleGroupContextValue>({
  size: "default",
  variant: "default",
  spacing: 2,
  orientation: "horizontal",
})

// Points the sliding tile at the pressed item. Reading the DOM keeps it right
// for controlled and uncontrolled groups alike, and it never re-renders React.
function useSlidingIndicator(
  ref: React.RefObject<HTMLDivElement | null>,
  enabled: boolean
) {
  React.useLayoutEffect(() => {
    const group = ref.current
    if (!enabled || !group) return

    const update = () => {
      const items = Array.from(
        group.querySelectorAll<HTMLElement>('[data-slot="toggle-group-item"]')
      )
      const index = items.findIndex((item) => item.hasAttribute("data-pressed"))
      group.style.setProperty("--tg-n", String(Math.max(items.length, 1)))
      group.style.setProperty("--tg-i", String(Math.max(index, 0)))
      group.dataset.indicator = index >= 0 ? "on" : "off"
    }

    update()
    const observer = new MutationObserver(update)
    observer.observe(group, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-pressed"],
    })
    // Turn the glide on only after the first position is set, so the tile
    // does not slide in from the left on mount.
    const frame = requestAnimationFrame(() =>
      group.setAttribute("data-ready", "")
    )

    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
      group.removeAttribute("data-ready")
    }
  }, [ref, enabled])
}

function ToggleGroup({
  className,
  variant,
  size,
  spacing = 2,
  orientation = "horizontal",
  children,
  ref,
  ...props
}: Omit<ToggleGroupPrimitive.Props, "ref"> & {
  ref?: React.Ref<HTMLDivElement>
  variant?: ToggleGroupVariant | null
  size?: VariantProps<typeof toggleVariants>["size"]
  spacing?: number
  orientation?: "horizontal" | "vertical"
}) {
  const innerRef = React.useRef<HTMLDivElement | null>(null)
  useSlidingIndicator(innerRef, variant === "sliding")

  const setRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      innerRef.current = node
      if (typeof ref === "function") ref(node)
      else if (ref) (ref as React.RefObject<HTMLDivElement | null>).current = node
    },
    [ref]
  )

  return (
    <ToggleGroupPrimitive
      ref={setRef}
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      data-spacing={spacing}
      data-orientation={orientation}
      style={{ "--gap": spacing } as React.CSSProperties}
      className={cn(toggleGroupVariants({ variant }), className)}
      {...props}
    >
      <ToggleGroupContext.Provider
        value={{ variant, size, spacing, orientation }}
      >
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive>
  )
}

function ToggleGroupItem({
  className,
  children,
  variant = "default",
  size = "default",
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  const context = React.useContext(ToggleGroupContext)
  const groupVariant = context.variant

  if (isGroupOwned(groupVariant)) {
    return (
      <TogglePrimitive
        data-slot="toggle-group-item"
        data-variant={groupVariant}
        className={cn(toggleGroupItemVariants({ variant: groupVariant }), className)}
        {...props}
      >
        {groupVariant === "chips" ? (
          // Zero-width until pressed, then opens up. The negative margin cancels
          // the flex gap while it is closed.
          <span
            aria-hidden="true"
            className="-mr-2 inline-flex w-0 overflow-hidden opacity-0 transition-[width,margin,opacity] group-data-pressed/tg-item:mr-0 group-data-pressed/tg-item:w-3.5 group-data-pressed/tg-item:opacity-100 motion-reduce:transition-none"
          >
            <Check className="size-3.5" strokeWidth={3} />
          </span>
        ) : null}
        {children}
        {groupVariant === "cards" ? (
          <span
            aria-hidden="true"
            className="absolute top-3.5 right-3.5 grid size-[18px] place-items-center rounded-full border-[1.5px] border-border-strong text-primary-foreground transition-colors group-data-pressed/tg-item:border-primary-fill group-data-pressed/tg-item:bg-primary-fill"
          >
            <Check
              className="size-2.5 opacity-0 group-data-pressed/tg-item:opacity-100"
              strokeWidth={4}
            />
          </span>
        ) : null}
      </TogglePrimitive>
    )
  }

  const legacyVariant = (groupVariant as "default" | "outline" | null | undefined) || variant

  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      data-variant={legacyVariant}
      data-size={context.size || size}
      data-spacing={context.spacing}
      className={cn(
        "shrink-0 group-data-[spacing=0]/toggle-group:rounded-none group-data-[spacing=0]/toggle-group:px-2 group-data-[spacing=0]/toggle-group:shadow-none focus:z-10 focus-visible:z-10 group-data-[spacing=0]/toggle-group:has-data-[icon=inline-end]:pr-1.5 group-data-[spacing=0]/toggle-group:has-data-[icon=inline-start]:pl-1.5 group-data-horizontal/toggle-group:data-[spacing=0]:first:rounded-l-md group-data-vertical/toggle-group:data-[spacing=0]:first:rounded-t-md group-data-horizontal/toggle-group:data-[spacing=0]:last:rounded-r-md group-data-vertical/toggle-group:data-[spacing=0]:last:rounded-b-md data-[state=on]:bg-muted group-data-horizontal/toggle-group:data-[spacing=0]:data-[variant=outline]:border-l-0 group-data-vertical/toggle-group:data-[spacing=0]:data-[variant=outline]:border-t-0 group-data-horizontal/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-l group-data-vertical/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-t",
        toggleVariants({
          variant: legacyVariant,
          size: context.size || size,
        }),
        className
      )}
      {...props}
    >
      {children}
    </TogglePrimitive>
  )
}

// The icon tile at the top of a `cards` item. It turns brand blue when the
// card is pressed.
function ToggleGroupCardIcon({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden="true"
      data-slot="toggle-group-card-icon"
      className={cn(
        "mb-1.5 grid size-8.5 place-items-center rounded-[9px] bg-muted text-body-2 transition-colors group-data-pressed/tg-item:bg-primary-fill group-data-pressed/tg-item:text-primary-foreground",
        className
      )}
      {...props}
    />
  )
}

export { ToggleGroup, ToggleGroupItem, ToggleGroupCardIcon, toggleGroupVariants }
