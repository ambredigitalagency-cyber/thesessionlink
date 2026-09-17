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

/**
 * The public profile while its data is in flight: avatar, identity block and a
 * couple of offer cards, laid out like the real page so nothing jumps.
 */
export function PublicProfileSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <div className="flex items-center gap-4">
        <Skeleton className="size-20 rounded-full" />
        <div className="flex-1 space-y-2.5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3.5 w-56" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>

      <div className="mt-8 space-y-3">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-4/5" />
      </div>

      <div className="mt-10 space-y-4">
        {[0, 1].map((row) => (
          <div key={row} className="surface-card overflow-hidden">
            <Skeleton className="aspect-[16/9] w-full rounded-none" />
            <div className="space-y-3 p-4">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
              <div className="flex justify-end">
                <Skeleton className="h-8 w-28 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
