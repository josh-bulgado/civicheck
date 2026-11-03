import * as React from "react";

import { cn } from "~/lib/utils";

// Surfaces, one per `variant`. The portal ones (quiet, lifted, tonal, reveal)
// drop the ring for a shadow, so the edge is a hairline or a lift, never a line.
//   quiet   a 5% hairline made of shadow
//   lifted  no edge, a low soft shadow
//   tonal   no edge or shadow; the fill is the card, the footer docks on a band
//   reveal  flat at rest, the hairline and lift appear on hover and focus
// The tint (tile-wash) is not part of any of them: it lays over the fill.
const VARIANT_CLASSES =
  "data-[variant=embedded]:rounded-none data-[variant=embedded]:shadow-none data-[variant=embedded]:ring-0 data-[variant=soft]:rounded-3xl data-[variant=soft]:shadow-portal-panel data-[variant=quiet]:rounded-[20px] data-[variant=quiet]:shadow-portal-hairline data-[variant=quiet]:ring-0 data-[variant=lifted]:rounded-3xl data-[variant=lifted]:shadow-portal-lifted data-[variant=lifted]:ring-0 data-[variant=tonal]:rounded-2xl data-[variant=tonal]:bg-muted data-[variant=tonal]:shadow-none data-[variant=tonal]:ring-0 data-[variant=reveal]:rounded-[20px] data-[variant=reveal]:bg-muted data-[variant=reveal]:shadow-none data-[variant=reveal]:ring-0 data-[variant=reveal]:hover:shadow-portal-hairline-hover data-[variant=reveal]:has-focus-visible:shadow-portal-hairline-hover";

// `row` lays the slots out on one line: header, content, footer as columns. The
// card carries the side padding so the slots do not add their own, and it stacks
// again on a phone.
const ORIENTATION_CLASSES =
  "data-[orientation=row]:grid data-[orientation=row]:grid-cols-[minmax(0,1.2fr)_minmax(9.5rem,1fr)_auto] data-[orientation=row]:items-center data-[orientation=row]:gap-5 data-[orientation=row]:px-(--card-spacing) data-[orientation=row]:*:px-0 data-[orientation=row]:max-md:grid-cols-1 data-[orientation=row]:max-md:gap-3.5";

function Card({
  className,
  size = "default",
  variant = "default",
  orientation = "column",
  ...props
}: React.ComponentProps<"div"> & {
  size?: "default" | "sm"
  variant?:
    | "default"
    | "embedded"
    | "soft"
    | "quiet"
    | "lifted"
    | "tonal"
    | "reveal"
  orientation?: "column" | "row"
}) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-variant={variant}
      data-orientation={orientation}
      className={cn(
        "group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl bg-card py-(--card-spacing) text-sm text-card-foreground shadow-xs ring-1 ring-foreground/10 [--card-spacing:--spacing(6)] has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(4)] *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
        VARIANT_CLASSES,
        ORIENTATION_CLASSES,
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-base leading-normal font-medium group-data-[size=sm]/card:text-sm",
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        // Tonal docks the footer on a band that runs to the card's edges: the
        // negative margin eats the card's bottom padding.
        "flex items-center rounded-b-xl px-(--card-spacing) group-data-[variant=tonal]/card:-mb-(--card-spacing) group-data-[variant=tonal]/card:bg-card/70 group-data-[variant=tonal]/card:pt-3.5 group-data-[variant=tonal]/card:pb-(--card-spacing) [.border-t]:pt-(--card-spacing)",
        className,
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
