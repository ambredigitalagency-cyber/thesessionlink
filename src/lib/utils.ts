import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** URL-safe slug candidate from any display name. */
export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatPrice(
  price: number | null,
  currency: string,
  locale: string,
  priceType: "fixed" | "from" | "free" | "on_request" = "fixed",
) {
  if (priceType === "free" || price === 0) return { amount: null, type: "free" as const };
  if (priceType === "on_request" || price === null)
    return { amount: null, type: "on_request" as const };

  const amount = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: Number.isInteger(price) ? 0 : 2,
  }).format(price);

  return { amount, type: priceType };
}

/** Digits-only phone number for wa.me links. */
export function whatsappLink(number: string, message?: string) {
  const digits = number.replace(/[^0-9]/g, "");
  const query = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${query}`;
}

export function absoluteUrl(path: string, base: string) {
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}
