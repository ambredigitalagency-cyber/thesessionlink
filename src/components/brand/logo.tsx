import { cn } from "@/lib/utils";

/** Wordmark: the dot is the "link" that everything hangs on. */
export function Logo({
  className,
  tone = "ink",
}: {
  className?: string;
  tone?: "ink" | "inverse";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-[2px] text-[17px] font-semibold tracking-[-0.03em]",
        tone === "ink" ? "text-ink" : "text-ink-inverse",
        className,
      )}
    >
      TheSessionLink
      <span className="size-1.5 translate-y-[-1px] rounded-full bg-[var(--accent)]" />
    </span>
  );
}
