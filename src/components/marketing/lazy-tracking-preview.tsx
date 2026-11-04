"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

/**
 * The statistics preview — charts, counters, the flow diagram — fetched only
 * when the visitor scrolls near it, so its code is not part of the first load.
 * The placeholder keeps the section's height and dark band, so nothing jumps
 * when it arrives.
 */
const TrackingPreview = dynamic(
  () => import("./tracking-preview").then((module) => module.TrackingPreview),
  { ssr: false, loading: () => <Placeholder /> },
);

export function LazyTrackingPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref}>{near ? <TrackingPreview /> : <Placeholder />}</div>;
}

function Placeholder() {
  return (
    <section
      id="tracking"
      aria-hidden
      className="bg-night min-h-[1400px] scroll-mt-16 md:min-h-[1150px]"
    />
  );
}
