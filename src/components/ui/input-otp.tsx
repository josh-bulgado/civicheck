import * as React from "react"
import { OTPInput, OTPInputContext } from "input-otp"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "~/lib/utils"

function InputOTP({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<typeof OTPInput> & {
  containerClassName?: string
}) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn(
        "flex items-center has-disabled:opacity-50",
        containerClassName
      )}
      spellCheck={false}
      className={cn("disabled:cursor-not-allowed", className)}
      {...props}
    />
  )
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn("flex flex-1 items-center gap-1.5", className)}
      {...props}
    />
  )
}

const inputOtpSlotVariants = cva(
  "relative flex min-w-0 flex-1 items-center justify-center border border-border-light bg-card font-semibold text-foreground transition-[border-color,box-shadow] outline-none data-[active=true]:border-primary data-[active=true]:ring-3 data-[active=true]:ring-primary/15 aria-invalid:border-destructive aria-invalid:text-destructive data-[active=true]:aria-invalid:border-destructive data-[active=true]:aria-invalid:ring-destructive/15",
  {
    variants: {
      size: {
        default: "h-9 text-base",
        lg: "h-11.5 text-lg",
      },
      shape: {
        default: "rounded-lg",
        pill: "rounded-full",
      },
    },
    defaultVariants: {
      size: "lg",
      shape: "pill",
    },
  }
)

function InputOTPSlot({
  index,
  className,
  size = "lg",
  shape = "pill",
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof inputOtpSlotVariants> & {
  index: number
}) {
  const inputOTPContext = React.useContext(OTPInputContext)
  const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {}

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      data-size={size}
      data-shape={shape}
      className={cn(inputOtpSlotVariants({ size, shape }), className)}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="civic-caret h-5 w-px bg-primary" />
        </div>
      )}
    </div>
  )
}

export { InputOTP, InputOTPGroup, InputOTPSlot }
