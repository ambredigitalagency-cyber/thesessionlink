import type { StaticImageData } from "next/image";

import coach from "./coach.jpg";
import hairdresser from "./hairdresser.jpg";
import realtor from "./realtor.jpg";
import tutor from "./tutor.jpg";

/**
 * One trade photo per example niche, with no recognisable face: the examples
 * illustrate a trade, they do not pretend to be customers. Sources, licence
 * and photographers are in ./CREDITS.md.
 *
 * Static imports, so next/image serves each at the size it is shown, in a
 * modern format, with a blurred placeholder while it loads.
 */
export const NICHE_PHOTOS: Record<"coach" | "realtor" | "hairdresser" | "tutor", StaticImageData> =
  { coach, realtor, hairdresser, tutor };
