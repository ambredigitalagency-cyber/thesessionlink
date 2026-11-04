import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A phone around a page: the editor's live preview, the sign-up's appearance
 * screen and its final screen. The page inside lays out by its own width
 * (container queries), so at 390px it is the page a visitor's phone shows.
 *
 * `scale` shrinks a frame without shrinking the phone it shows: the page is
 * laid out at full size and drawn smaller, so a 250px-wide frame still shows
 * the 390px page rather than a cramped one.
 */
export function PhoneFrame({
  children,
  className,
  screenClassName,
  scale = 1,
}: {
  children: ReactNode;
  className?: string;
  /** The scrolling screen's height, mostly. */
  screenClassName?: string;
  scale?: number;
}) {
  const scaled = scale !== 1;

  return (
    <div className={cn("mx-auto w-full max-w-[390px]", className)}>
      <div className="border-ink/80 relative overflow-hidden rounded-[2.6rem] border-[10px] bg-black shadow-[var(--shadow-pop)]">
        <div
          aria-hidden
          className="absolute top-2 left-1/2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-black"
        />
        <div
          className={cn(
            "h-[min(78dvh,760px)] rounded-[1.9rem] bg-white",
            scaled
              ? "overflow-hidden"
              : "[scrollbar-width:thin] overflow-y-auto overscroll-contain",
            screenClassName,
          )}
        >
          {scaled ? (
            <div
              style={
                {
                  width: `${100 / scale}%`,
                  height: `${100 / scale}%`,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                } as CSSProperties
              }
              className="[scrollbar-width:none] overflow-y-auto overscroll-contain"
            >
              {children}
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}
