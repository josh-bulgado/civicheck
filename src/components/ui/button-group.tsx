import * as React from "react";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonVariantProps } from "~/components/ui/button";
import {
  ButtonGroupStyleContext,
  type ButtonGroupStyle,
} from "~/components/ui/button-group-context";
import { cn } from "~/lib/utils";

import { Separator } from "~/components/ui/separator";

const buttonGroupVariants = cva(
  "flex w-fit items-stretch *:focus-visible:relative *:focus-visible:z-10 has-[>[data-slot=button-group]]:gap-2 has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-md [&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1",
  {
    variants: {
      orientation: {
        horizontal:
          "[&>[data-slot]:not(:last-child)]:rounded-r-none! [&>[data-slot]:not(:first-child)]:rounded-l-none! [&>[data-slot]~[data-slot]]:border-l-0",
        vertical:
          "flex-col [&>[data-slot]:not(:last-child)]:rounded-b-none! [&>[data-slot]:not(:first-child)]:rounded-t-none! [&>[data-slot]~[data-slot]]:border-t-0",
      },
    },
    defaultVariants: {
      orientation: "horizontal",
    },
  },
);

function ButtonGroup({
  className,
  orientation,
  variant = "default",
  size = "lg",
  shape = "pill",
  children,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof buttonGroupVariants> &
  ButtonVariantProps) {
  const style = React.useMemo<ButtonGroupStyle>(
    () => ({ variant, size, shape }),
    [shape, size, variant],
  );

  return (
    <ButtonGroupStyleContext.Provider value={style}>
      <div
        role="group"
        data-slot="button-group"
        data-orientation={orientation}
        data-variant={variant}
        data-size={size}
        data-shape={shape}
        className={cn(buttonGroupVariants({ orientation }), className)}
        {...props}
      >
        {children}
      </div>
    </ButtonGroupStyleContext.Provider>
  );
}

function ButtonGroupText({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div">) {
  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        className: cn(
          "flex items-center gap-2 rounded-md border bg-muted px-2.5 text-sm font-medium shadow-xs [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: "button-group-text",
    },
  });
}

function ButtonGroupSeparator({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="button-group-separator"
      orientation={orientation}
      className={cn(
        "relative self-stretch bg-input data-horizontal:mx-px data-horizontal:w-auto data-vertical:my-px data-vertical:h-auto",
        className,
      )}
      {...props}
    />
  );
}

export {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
  buttonGroupVariants,
};
