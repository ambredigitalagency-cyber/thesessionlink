import { cn } from "@/lib/utils";

/**
 * Wordmark: the dot is the "link" that everything hangs on.
 *
 * `console` is the same mark on the admin console's rail, which stays dark in
 * both themes: light letters from the rail's own ink, and the dot in the
 * console's steel instead of the product accent — the brand is the same, the
 * colour says which space you are in. Only meaningful under [data-console],
 * where those tokens exist.
 */
export function Logo({
  className,
  tone = "ink",
}: {
  className?: string;
  tone?: "ink" | "inverse" | "console";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-[2px] text-[17px] font-semibold tracking-[-0.03em]",
        tone === "ink" && "text-ink",
        tone === "inverse" && "text-ink-inverse",
        tone === "console" && "text-[var(--console-rail-ink)]",
        className,
      )}
    >
      TheSessionLink
      <span
        className={cn(
          "size-1.5 translate-y-[-1px] rounded-full",
          tone === "console" ? "bg-[var(--console-rail-accent)]" : "bg-[var(--accent)]",
        )}
      />
    </span>
  );
}
