"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Avatar, Switch, Tabs } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";

import { cn, initials } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Card                                                                        */
/* -------------------------------------------------------------------------- */

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("surface-card", className)} {...props} />;
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="space-y-1">
        <h2 className="text-ink text-[17px] font-semibold tracking-[-0.02em]">{title}</h2>
        {description ? (
          <p className="text-ink-muted max-w-prose text-[14px] leading-relaxed">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Badge                                                                       */
/* -------------------------------------------------------------------------- */

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium leading-none",
  {
    variants: {
      tone: {
        neutral: "bg-ink/5 text-ink-muted",
        ink: "bg-ink text-ink-inverse",
        accent: "bg-[var(--accent-soft)] text-[var(--accent-ink)]",
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-warning",
        danger: "bg-danger-soft text-danger",
        outline: "border border-line-strong text-ink-muted",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/* -------------------------------------------------------------------------- */
/* Avatar                                                                      */
/* -------------------------------------------------------------------------- */

export function ProfileAvatar({
  src,
  name,
  className,
}: {
  src?: string | null;
  name: string;
  className?: string;
}) {
  return (
    <Avatar.Root
      className={cn(
        "bg-ink/5 relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full select-none",
        className,
      )}
    >
      {src ? <Avatar.Image src={src} alt={name} className="size-full object-cover" /> : null}
      <Avatar.Fallback className="text-ink-muted text-[0.9em] font-medium">
        {initials(name) || "?"}
      </Avatar.Fallback>
    </Avatar.Root>
  );
}

/* -------------------------------------------------------------------------- */
/* Switch                                                                      */
/* -------------------------------------------------------------------------- */

export function Toggle({
  checked,
  onCheckedChange,
  disabled,
  label,
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <Switch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "bg-ink/15 data-[state=checked]:bg-ink relative h-6 w-11 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      <Switch.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-[var(--ease-out-expo)] will-change-transform data-[state=checked]:translate-x-[22px]" />
    </Switch.Root>
  );
}

export function ToggleRow({
  title,
  description,
  ...toggle
}: ComponentProps<typeof Toggle> & { title: ReactNode; description?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-4">
      <div className="space-y-1">
        <p className="text-ink text-[15px] font-medium">{title}</p>
        {description ? (
          <p className="text-ink-muted text-[13px] leading-relaxed">{description}</p>
        ) : null}
      </div>
      <Toggle {...toggle} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Tabs                                                                        */
/* -------------------------------------------------------------------------- */

export function TabsRoot({ className, ...props }: ComponentProps<typeof Tabs.Root>) {
  return <Tabs.Root className={cn("flex flex-col gap-6", className)} {...props} />;
}

export function TabsList({ className, ...props }: ComponentProps<typeof Tabs.List>) {
  return (
    <Tabs.List
      className={cn(
        "border-line bg-surface flex scrollbar-none gap-1 overflow-x-auto rounded-full border p-1",
        className,
      )}
      {...props}
    />
  );
}

export function TabTrigger({ className, ...props }: ComponentProps<typeof Tabs.Trigger>) {
  return (
    <Tabs.Trigger
      className={cn(
        "text-ink-muted hover:text-ink data-[state=active]:bg-ink data-[state=active]:text-ink-inverse rounded-full px-4 py-2 text-[13px] font-medium whitespace-nowrap transition-colors",
        className,
      )}
      {...props}
    />
  );
}

export const TabsContent = Tabs.Content;

/* -------------------------------------------------------------------------- */
/* Empty state                                                                 */
/* -------------------------------------------------------------------------- */

export function EmptyState({
  icon,
  illustration,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  /** A drawing, shown instead of the icon bubble when present. */
  illustration?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-line-strong bg-surface/60 flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-dashed px-6 py-14 text-center",
        className,
      )}
    >
      {illustration ? (
        <div className="mb-1">{illustration}</div>
      ) : icon ? (
        <div className="bg-ink/5 text-ink-muted flex size-11 items-center justify-center rounded-full">
          {icon}
        </div>
      ) : null}
      <p className="text-ink text-[15px] font-medium">{title}</p>
      {description ? (
        <p className="text-ink-muted max-w-sm text-[14px] leading-relaxed">{description}</p>
      ) : null}
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
