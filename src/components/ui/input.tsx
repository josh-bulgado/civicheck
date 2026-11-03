import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "~/lib/utils";

// `size` is already a native input attribute, so the density is `fieldSize`, on
// the same scale as Button: default 36px, lg 40px, touch 44px.
// `inline` is a heading you edit in place: no border until hovered or focused.
const inputVariants = cva(
  "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm",
  {
    variants: {
      fieldSize: {
        default: "",
        lg: "h-10 px-3",
        touch:
          "h-11 rounded-xl px-3.5 focus-visible:ring-4 focus-visible:ring-ring/25",
      },
      shape: {
        default: "",
        pill: "rounded-full",
        soft: "rounded-xl!",
        split: "rounded-xl!",
      },
      variant: {
        default: "",
        inline:
          "h-10 border-transparent px-2.5 text-xl font-extrabold tracking-[-0.02em] shadow-none hover:border-input focus-visible:bg-background md:text-xl",
      },
    },
    compoundVariants: [
      {
        fieldSize: ["lg", "touch"],
        shape: "soft",
        className: "rounded-2xl!",
      },
    ],
    defaultVariants: {
      fieldSize: "lg",
      shape: "split",
      variant: "default",
    },
  },
);

function Input({
  className,
  type,
  fieldSize = "lg",
  shape = "split",
  variant = "default",
  ...props
}: React.ComponentProps<"input"> & VariantProps<typeof inputVariants>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      data-field-size={fieldSize}
      data-shape={shape}
      data-variant={variant}
      className={cn(inputVariants({ fieldSize, shape, variant }), className)}
      {...props}
    />
  );
}

export { Input, inputVariants };
