import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "~/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary-fill text-primary-foreground hover:bg-primary-fill/80",
        outline:
          "border-border bg-background shadow-xs hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive focus-visible:ring-destructive/20",
        success:
          "bg-success/10 text-success hover:bg-success/20 focus-visible:border-success focus-visible:ring-success/20",
        // The service editor's primary: a lit top edge on the brand blue.
        raised:
          "border-primary-fill bg-primary-fill bg-linear-to-b from-[color-mix(in_oklch,var(--primary-fill),white_12%)] to-primary-fill text-primary-foreground shadow-[0_1px_2px_color-mix(in_srgb,var(--primary-fill)_35%,transparent),inset_0_1px_0_rgb(255_255_255/0.18)] hover:border-primary-fill-hover hover:bg-primary-fill-hover hover:bg-none",
        link: "text-primary underline-offset-4 hover:underline",
        // A quiet filled button, the portal's search pill. Any secondary action
        // that should not shout. The hover mixes in srgb on purpose: a near-grey
        // mixed in oklch comes out with no hue, and Safari reads that as red.
        tonal:
          "bg-portal-search font-normal text-muted-foreground hover:bg-[color-mix(in_srgb,var(--portal-search),var(--foreground)_6%)] hover:text-foreground aria-expanded:bg-portal-search aria-expanded:text-foreground",
        // Reads as an input: for a button that opens search or a picker.
        field:
          "border-border-strong bg-background font-normal text-muted-foreground shadow-xs hover:border-ring/40 hover:text-foreground aria-expanded:text-foreground",
        // A white card with the portal's soft shadow that rises on hover: the one
        // control on a screen that should read as the main thing to do.
        lifted:
          "border-border-light bg-card font-normal text-portal-ink-2 shadow-portal-pill hover:-translate-y-px hover:text-foreground aria-expanded:text-foreground",
      },
      size: {
        default:
          "h-9 gap-1.5 px-2.5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),8px)] px-2 text-xs in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 rounded-[min(var(--radius-md),10px)] px-2.5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5",
        lg: "h-10 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        // 44px target. With a soft or split shape the corner is 16 like lg
        // (compound rule below); `default` shape keeps its own 12px.
        touch:
          "h-11 gap-2 rounded-xl px-4 in-data-[slot=button-group]:rounded-xl has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5",
        // 50px, the applicant top bar's round bell and seal.
        xl: "h-12.5 gap-3 px-5 text-[15px] has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-9",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),8px)] in-data-[slot=button-group]:rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-8 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-md",
        "icon-lg": "size-10",
        "icon-touch": "size-11",
      },
      // The portal's fully rounded buttons. Important, because every size
      // brings its own radius.
      shape: {
        default: "",
        pill: "rounded-full! in-data-[slot=button-group]:rounded-full!",
        // Not fully round: the radius steps with the height, so a tall button
        // is softer than a short one. `split` is the same on buttons; it only
        // differs on fields, which sit one step lower.
        soft: "",
        split: "",
      },
    },
    compoundVariants: [
      {
        shape: ["soft", "split"],
        size: "xl",
        className: "rounded-3xl! in-data-[slot=button-group]:rounded-3xl!",
      },
      {
        shape: ["soft", "split"],
        size: ["lg", "touch", "icon-lg", "icon-touch"],
        className: "rounded-2xl! in-data-[slot=button-group]:rounded-2xl!",
      },
      {
        shape: ["soft", "split"],
        size: ["default", "icon"],
        className: "rounded-xl! in-data-[slot=button-group]:rounded-xl!",
      },
      {
        shape: ["soft", "split"],
        size: ["sm", "icon-sm"],
        className: "rounded-lg! in-data-[slot=button-group]:rounded-lg!",
      },
      {
        shape: ["soft", "split"],
        size: ["xs", "icon-xs"],
        className: "rounded-md! in-data-[slot=button-group]:rounded-md!",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "lg",
      shape: "soft",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "lg",
  shape = "pill",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, shape, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
