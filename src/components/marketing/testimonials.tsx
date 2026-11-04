"use client";

import { ArrowLeft, ArrowRight, ArrowUpRight, Quote } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import type { Testimonial } from "@/content/testimonials";

import { SectionHeading } from "./section";

/**
 * Testimonials, as a carousel: cards side by side, scrolled one at a time by
 * swipe or by the arrows, snapping into place. Rendered only with real
 * testimonials (src/content/testimonials.ts) — with none, nothing at all.
 *
 * The cards are an ordinary list scrolled natively, so swiping, the keyboard
 * and screen readers all work without a library; the arrows only appear when
 * there is something to scroll to.
 */
export function Testimonials({ items }: { items: Testimonial[] }) {
  const t = useTranslations("landing.testimonials");
  const still = useReducedMotion();
  const listRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const update = () =>
      setEdges({
        start: list.scrollLeft <= 4,
        end: list.scrollLeft + list.clientWidth >= list.scrollWidth - 4,
      });
    update();
    list.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      list.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  if (items.length === 0) return null;

  function scroll(direction: 1 | -1) {
    const list = listRef.current;
    const card = list?.querySelector("li");
    if (!list || !card) return;
    list.scrollBy({
      left: direction * (card.getBoundingClientRect().width + 16),
      behavior: still ? "auto" : "smooth",
    });
  }

  return (
    <section
      id="testimonials"
      aria-roledescription="carousel"
      aria-label={t("title")}
      className="scroll-mt-20 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading eyebrow={t("eyebrow")} title={t("title")} />
          {edges.start && edges.end ? null : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => scroll(-1)}
                disabled={edges.start}
                aria-label={t("previous")}
                className="border-line-strong text-ink hover:border-ink/30 flex size-10 items-center justify-center rounded-full border transition-[border-color,opacity] disabled:opacity-35"
              >
                <ArrowLeft className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => scroll(1)}
                disabled={edges.end}
                aria-label={t("next")}
                className="border-line-strong text-ink hover:border-ink/30 flex size-10 items-center justify-center rounded-full border transition-[border-color,opacity] disabled:opacity-35"
              >
                <ArrowRight className="size-4" aria-hidden />
              </button>
            </div>
          )}
        </div>

        <ul
          ref={listRef}
          className="mt-10 flex snap-x snap-mandatory [scrollbar-width:none] gap-4 overflow-x-auto overscroll-x-contain pb-2"
        >
          {items.map((item, index) => (
            <li
              key={`${item.name}-${index}`}
              aria-roledescription="slide"
              aria-label={t("position", { index: index + 1, total: items.length })}
              className="surface-card flex w-[85%] shrink-0 snap-start flex-col p-6 sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)]"
            >
              <Quote className="size-5 text-[var(--accent)]" aria-hidden />
              <blockquote className="text-ink mt-4 flex-1 text-[16px] leading-relaxed">
                {item.quote}
              </blockquote>
              <div className="border-line mt-6 border-t pt-4">
                <p className="text-ink text-[14.5px] font-semibold">{item.name}</p>
                <p className="text-ink-muted text-[13px]">{item.trade}</p>
                {item.slug ? (
                  <a
                    href={`/${item.slug}`}
                    className="text-ink mt-2 inline-flex items-center gap-1 text-[13px] font-medium underline underline-offset-4"
                  >
                    {t("viewPage")}
                    <ArrowUpRight className="size-3.5" aria-hidden />
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
