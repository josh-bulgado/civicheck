import type { ComponentType, SVGProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "~/lib/utils";

const iconTileVariants = cva(
  "flex shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary",
  {
    variants: {
      size: {
        default: "size-11 [&_svg]:size-[22px]",
        lg: "size-[52px] [&_svg]:size-[22px]",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

type IconTileProps = VariantProps<typeof iconTileVariants> & {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  className?: string;
};

/** A decorative icon on the brand's soft tint, for section headers and empty states. */
function IconTile({ icon: Icon, size, className }: IconTileProps) {
  return (
    <span
      aria-hidden="true"
      data-slot="icon-tile"
      className={cn(iconTileVariants({ size }), className)}
    >
      <Icon />
    </span>
  );
}

export { IconTile, iconTileVariants };
