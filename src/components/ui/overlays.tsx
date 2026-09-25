"use client";

import { X } from "lucide-react";
import { Accordion, Dialog, DropdownMenu } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Modal — centered on desktop, bottom sheet on mobile                          */
/* -------------------------------------------------------------------------- */

/*
 * `scrim`, not `ink/25`: a scrim exists to push what is behind it away, which
 * means darkening it. Built from ink it inverted with the theme and washed the
 * page *white* behind a dark modal.
 */
const overlayClass =
  "fixed inset-0 z-50 bg-scrim backdrop-blur-[2px] data-[state=open]:animate-[fade-in_200ms_ease] data-[state=closed]:animate-[fade-out_150ms_ease]";

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlayClass} />
        <Dialog.Content
          className={cn(
            "border-line bg-surface fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-[var(--radius-xl)] border shadow-[var(--shadow-pop)] outline-none",
            "data-[state=closed]:animate-[slide-down_180ms_ease] data-[state=open]:animate-[slide-up_320ms_var(--ease-out-expo)]",
            "sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[calc(100vw-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[var(--radius-xl)]",
            "sm:data-[state=closed]:animate-[pop-out_160ms_ease] sm:data-[state=open]:animate-[pop-in_280ms_var(--ease-out-expo)]",
            size === "sm" && "sm:max-w-md",
            size === "md" && "sm:max-w-lg",
            size === "lg" && "sm:max-w-2xl",
          )}
        >
          <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-3">
            <div className="space-y-1">
              <Dialog.Title className="text-ink text-[19px] font-semibold tracking-[-0.02em]">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="text-ink-muted text-[14px] leading-relaxed">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close className="text-ink-subtle hover:bg-ink/5 hover:text-ink -mt-1 -mr-1 rounded-full p-2 transition-colors">
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2">{children}</div>
          {footer ? (
            <div className="border-line flex flex-wrap justify-end gap-2 border-t px-6 py-4">
              {footer}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* -------------------------------------------------------------------------- */
/* Sheet — slides in from the right (booking details, offer preview)            */
/* -------------------------------------------------------------------------- */

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlayClass} />
        <Dialog.Content
          className={cn(
            "border-line bg-surface fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-[var(--radius-xl)] border shadow-[var(--shadow-pop)] outline-none",
            "data-[state=closed]:animate-[slide-down_180ms_ease] data-[state=open]:animate-[slide-up_320ms_var(--ease-out-expo)]",
            "sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-none sm:w-full sm:max-w-md sm:rounded-none sm:rounded-l-[var(--radius-xl)]",
            "sm:data-[state=closed]:animate-[slide-out-right_200ms_ease] sm:data-[state=open]:animate-[slide-in-right_320ms_var(--ease-out-expo)]",
            className,
          )}
        >
          <div className="border-line flex items-start justify-between gap-4 border-b px-6 py-5">
            <div className="min-w-0 space-y-1">
              <Dialog.Title className="text-ink truncate text-[17px] font-semibold tracking-[-0.02em]">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="text-ink-muted text-[13px]">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close className="text-ink-subtle hover:bg-ink/5 hover:text-ink -mr-1 rounded-full p-2 transition-colors">
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer ? (
            <div className="border-line flex flex-wrap justify-end gap-2 border-t px-6 py-4">
              {footer}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* -------------------------------------------------------------------------- */
/* Dropdown menu                                                               */
/* -------------------------------------------------------------------------- */

export const Menu = DropdownMenu.Root;
export const MenuTrigger = DropdownMenu.Trigger;

export function MenuContent({
  className,
  align = "end",
  children,
  ...props
}: ComponentProps<typeof DropdownMenu.Content>) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align={align}
        sideOffset={6}
        className={cn(
          "border-line bg-surface z-50 min-w-44 overflow-hidden rounded-[var(--radius-md)] border p-1 shadow-[var(--shadow-float)] data-[state=open]:animate-[pop-in_160ms_var(--ease-out-expo)]",
          className,
        )}
        {...props}
      >
        {children}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  );
}

export function MenuItem({
  className,
  tone = "default",
  ...props
}: ComponentProps<typeof DropdownMenu.Item> & { tone?: "default" | "danger" }) {
  return (
    <DropdownMenu.Item
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-xs)] px-3 py-2 text-[14px] transition-colors outline-none select-none",
        tone === "default"
          ? "text-ink data-[highlighted]:bg-ink/5"
          : "text-danger data-[highlighted]:bg-danger-soft",
        className,
      )}
      {...props}
    />
  );
}

export function MenuSeparator() {
  return <DropdownMenu.Separator className="bg-line my-1 h-px" />;
}

/* -------------------------------------------------------------------------- */
/* Accordion (FAQ)                                                             */
/* -------------------------------------------------------------------------- */

export function FaqAccordion({ items }: { items: { question: string; answer: string }[] }) {
  return (
    <Accordion.Root type="single" collapsible className="divide-line border-line divide-y border-y">
      {items.map((item, index) => (
        <Accordion.Item key={index} value={`item-${index}`} className="group">
          <Accordion.Header>
            <Accordion.Trigger className="text-ink hover:text-ink-muted flex w-full items-center justify-between gap-6 py-6 text-left text-[17px] font-medium tracking-[-0.01em] transition-colors">
              {item.question}
              <span className="relative size-4 shrink-0">
                <span className="bg-ink-muted absolute top-1/2 left-0 h-px w-4 -translate-y-1/2" />
                <span className="bg-ink-muted absolute top-0 left-1/2 h-4 w-px -translate-x-1/2 transition-transform duration-300 ease-[var(--ease-out-expo)] group-data-[state=open]:rotate-90 group-data-[state=open]:opacity-0" />
              </span>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="overflow-hidden data-[state=closed]:animate-[accordion-up_200ms_ease] data-[state=open]:animate-[accordion-down_240ms_var(--ease-out-expo)]">
            <p className="text-ink-muted max-w-2xl pb-6 text-[15px] leading-relaxed">
              {item.answer}
            </p>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
