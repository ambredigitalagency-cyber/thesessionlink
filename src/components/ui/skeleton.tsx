import { cn } from "@/lib/utils";

/**
 * Placeholder block for content being fetched.
 *
 * The pulse is a plain CSS animation, so the `prefers-reduced-motion` block in
 * globals.css already flattens it to a static tint — no JavaScript involved.
 */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn("bg-ink/[0.06] animate-pulse rounded-[var(--radius-xs)]", className)}
      {...props}
    />
  );
}

/** One row of the dashboard offers list. */
export function OfferRowSkeleton() {
  return (
    <div className="surface-card flex items-center gap-3 p-3">
      <Skeleton className="size-6 rounded-full" />
      <Skeleton className="size-14 shrink-0 rounded-[var(--radius-xs)]" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-3 w-1/5" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  );
}

/** One booking card in the dashboard list. */
export function BookingRowSkeleton() {
  return (
    <div className="surface-card flex items-center gap-3 p-4">
      <Skeleton className="size-11 rounded-[var(--radius-xs)]" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3.5 w-2/5" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>
  );
}
