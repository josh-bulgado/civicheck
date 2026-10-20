import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "~/lib/utils";

// Shared by the service-class variants: the dot is a ::before, tinted per variant.
const CLASS_DOT =
  "gap-1.5 pl-2 before:size-1.5 before:shrink-0 before:rounded-full before:content-['']";

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary-fill text-primary-foreground [a]:hover:bg-primary-fill/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-tone-danger-soft text-tone-danger focus-visible:ring-destructive/20 [a]:hover:bg-destructive/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground",
        link: "text-primary underline-offset-4 hover:underline",

        // Status — ink on its own tint, from the `--tone-*` pairs in app.css
        info: "bg-tone-review-soft text-tone-review",
        progress: "bg-tone-progress-soft text-tone-progress",
        success: "bg-tone-success-soft text-tone-success",
        warning: "bg-tone-warning-soft text-tone-warning",
        neutral: "bg-tone-neutral-soft text-tone-neutral",

        // Service class — soft tint with a leading status dot
        simple: `${CLASS_DOT} bg-tone-success-soft text-tone-success before:bg-health-success-dot`,
        complex: `${CLASS_DOT} bg-tone-warning-soft text-tone-warning before:bg-health-warning-dot`,
        highly_technical: `${CLASS_DOT} bg-tone-danger-soft text-tone-danger before:bg-health-error-dot`,
        unclassified: `${CLASS_DOT} bg-tone-neutral-soft text-tone-neutral before:bg-transparent before:ring-[1.5px] before:ring-inset before:ring-health-neutral-dot`,
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge, badgeVariants };
