import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

import { Spinner } from "./spinner";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background-color,color,box-shadow,transform] duration-200 ease-[var(--ease-out-expo)] active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-ink text-ink-inverse hover:bg-night-soft shadow-[0_1px_2px_rgb(12_12_13/0.16)]",
        accent:
          "bg-[var(--accent)] text-white hover:brightness-[1.06] shadow-[0_1px_2px_rgb(12_12_13/0.16)]",
        secondary:
          "bg-surface text-ink border border-line-strong hover:border-ink/25 hover:bg-canvas",
        ghost: "text-ink-muted hover:bg-ink/5 hover:text-ink",
        subtle: "bg-ink/5 text-ink hover:bg-ink/10",
        inverse: "bg-surface text-ink hover:bg-white/90",
        danger: "bg-danger text-white hover:brightness-110",
        link: "text-ink underline underline-offset-4 hover:text-ink-muted",
      },
      size: {
        sm: "h-9 rounded-full px-3.5 text-[13px]",
        md: "h-11 rounded-full px-5 text-sm",
        lg: "h-13 rounded-full px-7 text-[15px]",
        icon: "size-10 rounded-full",
        "icon-sm": "size-8 rounded-full",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  block,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={disabled ?? loading}
      data-loading={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <Spinner className="absolute size-4" />
          <span className="inline-flex items-center gap-2 opacity-0">{children}</span>
        </>
      ) : (
        children
      )}
    </Comp>
  );
}

export { buttonVariants };
