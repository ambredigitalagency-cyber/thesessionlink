"use client";

import { Columns3, KanbanSquare, List, Search, SlidersHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/overlays";
import {
  COLUMNS,
  DERIVED_STATUSES,
  LOCKED_COLUMNS,
  hasActiveFilters,
  type BookingFilters,
  type ColumnKey,
  type SortDirection,
  type SortKey,
} from "@/lib/bookings/filters";
import { ACTION_TYPES, type ActionType } from "@/lib/offers/schema";
import { cn } from "@/lib/utils";

export type ViewMode = "list" | "kanban";

const SORT_KEYS: SortKey[] = ["date", "client", "offer", "status", "created"];

export function BookingsToolbar({
  filters,
  onFiltersChange,
  view,
  onViewChange,
  sort,
  onSortChange,
  columns,
  onColumnsChange,
  offerTitles,
  resultCount,
}: {
  filters: BookingFilters;
  onFiltersChange: (next: BookingFilters) => void;
  view: ViewMode;
  onViewChange: (next: ViewMode) => void;
  sort: { key: SortKey; direction: SortDirection };
  onSortChange: (next: { key: SortKey; direction: SortDirection }) => void;
  columns: ColumnKey[];
  onColumnsChange: (next: ColumnKey[]) => void;
  offerTitles: string[];
  resultCount: number;
}) {
  const t = useTranslations("dashboard.bookings");

  function toggle<T>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  }

  const active = hasActiveFilters(filters);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Status is the criterion reached for most often, so it stays inline. */}
        <div className="flex flex-wrap gap-1.5">
          {DERIVED_STATUSES.map((status) => {
            const on = filters.statuses.includes(status);
            return (
              <button
                key={status}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  onFiltersChange({ ...filters, statuses: toggle(filters.statuses, status) })
                }
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors",
                  on
                    ? "border-ink bg-ink text-ink-inverse"
                    : "border-line-strong text-ink-muted hover:border-ink/30 hover:text-ink",
                )}
              >
                {t(`status.${status}` as "status.pending")}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative w-full sm:w-56">
            <Search className="text-ink-subtle absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <input
              value={filters.query}
              onChange={(event) => onFiltersChange({ ...filters, query: event.target.value })}
              placeholder={t("searchPlaceholder")}
              className="border-line-strong bg-surface text-ink placeholder:text-ink-subtle focus:border-ink h-10 w-full rounded-full border pr-3 pl-9 text-[14px] transition-colors focus:outline-none"
            />
          </div>

          <MoreFilters
            filters={filters}
            onFiltersChange={onFiltersChange}
            offerTitles={offerTitles}
            toggle={toggle}
          />

          <SortMenu sort={sort} onSortChange={onSortChange} />

          {view === "list" ? (
            <ColumnsMenu columns={columns} onColumnsChange={onColumnsChange} toggle={toggle} />
          ) : null}

          <div className="border-line bg-surface flex items-center gap-0.5 rounded-full border p-0.5">
            {(["list", "kanban"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={view === mode}
                aria-label={t(`view.${mode}` as "view.list")}
                onClick={() => onViewChange(mode)}
                className={cn(
                  "rounded-full p-2 transition-colors",
                  view === mode
                    ? "bg-ink text-ink-inverse"
                    : "text-ink-muted hover:text-ink hover:bg-ink/5",
                )}
              >
                {mode === "list" ? (
                  <List className="size-4" />
                ) : (
                  <KanbanSquare className="size-4" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {active ? (
        <div className="flex items-center gap-3">
          <p className="text-ink-subtle text-[12.5px]">
            {t("resultCount", { count: resultCount })}
          </p>
          <button
            type="button"
            onClick={() =>
              onFiltersChange({
                statuses: [],
                from: null,
                to: null,
                offers: [],
                actionTypes: [],
                query: "",
              })
            }
            className="text-ink-muted hover:text-ink inline-flex items-center gap-1 text-[12.5px] underline underline-offset-4 transition-colors"
          >
            <X className="size-3" />
            {t("clearFilters")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function MoreFilters({
  filters,
  onFiltersChange,
  offerTitles,
  toggle,
}: {
  filters: BookingFilters;
  onFiltersChange: (next: BookingFilters) => void;
  offerTitles: string[];
  toggle: <T>(list: T[], value: T) => T[];
}) {
  const t = useTranslations("dashboard.bookings");
  const tActions = useTranslations("offers.actions");

  return (
    <Menu>
      <MenuTrigger
        className="border-line-strong text-ink-muted hover:text-ink hover:border-ink/30 flex size-10 items-center justify-center rounded-full border transition-colors"
        aria-label={t("moreFilters")}
      >
        <SlidersHorizontal className="size-4" />
      </MenuTrigger>
      <MenuContent className="w-64">
        <div className="space-y-2 px-3 py-2">
          <p className="text-ink-subtle text-[11.5px] font-medium tracking-wide uppercase">
            {t("dateRange")}
          </p>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.from ?? ""}
              onChange={(event) =>
                onFiltersChange({ ...filters, from: event.target.value || null })
              }
              className="border-line-strong bg-surface text-ink h-9 w-full rounded-[var(--radius-xs)] border px-2 text-[13px]"
            />
            <input
              type="date"
              value={filters.to ?? ""}
              onChange={(event) => onFiltersChange({ ...filters, to: event.target.value || null })}
              className="border-line-strong bg-surface text-ink h-9 w-full rounded-[var(--radius-xs)] border px-2 text-[13px]"
            />
          </div>
        </div>

        <MenuSeparator />

        <p className="text-ink-subtle px-3 pt-1 pb-1 text-[11.5px] font-medium tracking-wide uppercase">
          {t("actionTypeFilter")}
        </p>
        {ACTION_TYPES.map((type) => (
          <MenuItem
            key={type}
            onSelect={(event) => {
              event.preventDefault();
              onFiltersChange({
                ...filters,
                actionTypes: toggle(filters.actionTypes, type as ActionType),
              });
            }}
          >
            <Check on={filters.actionTypes.includes(type as ActionType)} />
            {tActions(`${type}.label` as "calendar_booking.label")}
          </MenuItem>
        ))}

        {offerTitles.length > 0 ? (
          <>
            <MenuSeparator />
            <p className="text-ink-subtle px-3 pt-1 pb-1 text-[11.5px] font-medium tracking-wide uppercase">
              {t("offerFilter")}
            </p>
            {offerTitles.map((title) => (
              <MenuItem
                key={title}
                onSelect={(event) => {
                  event.preventDefault();
                  onFiltersChange({ ...filters, offers: toggle(filters.offers, title) });
                }}
              >
                <Check on={filters.offers.includes(title)} />
                <span className="truncate">{title}</span>
              </MenuItem>
            ))}
          </>
        ) : null}
      </MenuContent>
    </Menu>
  );
}

function SortMenu({
  sort,
  onSortChange,
}: {
  sort: { key: SortKey; direction: SortDirection };
  onSortChange: (next: { key: SortKey; direction: SortDirection }) => void;
}) {
  const t = useTranslations("dashboard.bookings");

  return (
    <Menu>
      <MenuTrigger
        className="border-line-strong text-ink-muted hover:text-ink hover:border-ink/30 flex h-10 items-center gap-1.5 rounded-full border px-3 text-[13px] transition-colors"
        aria-label={t("sortBy")}
      >
        {t(`sort.${sort.key}` as "sort.date")}
        <span aria-hidden="true">{sort.direction === "asc" ? "↑" : "↓"}</span>
      </MenuTrigger>
      <MenuContent className="w-52">
        {SORT_KEYS.map((key) => (
          <MenuItem
            key={key}
            onSelect={() =>
              onSortChange({
                key,
                // Clicking the active column flips it; a new column starts ascending.
                direction: sort.key === key && sort.direction === "asc" ? "desc" : "asc",
              })
            }
          >
            <Check on={sort.key === key} />
            {t(`sort.${key}` as "sort.date")}
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}

function ColumnsMenu({
  columns,
  onColumnsChange,
  toggle,
}: {
  columns: ColumnKey[];
  onColumnsChange: (next: ColumnKey[]) => void;
  toggle: <T>(list: T[], value: T) => T[];
}) {
  const t = useTranslations("dashboard.bookings");

  return (
    <Menu>
      <MenuTrigger
        className="border-line-strong text-ink-muted hover:text-ink hover:border-ink/30 flex size-10 items-center justify-center rounded-full border transition-colors"
        aria-label={t("columns")}
      >
        <Columns3 className="size-4" />
      </MenuTrigger>
      <MenuContent className="w-52">
        {COLUMNS.map((column) => {
          const locked = LOCKED_COLUMNS.includes(column);
          return (
            <MenuItem
              key={column}
              disabled={locked}
              onSelect={(event) => {
                event.preventDefault();
                if (!locked) onColumnsChange(toggle(columns, column));
              }}
            >
              <Check on={columns.includes(column)} />
              {t(`columns_.${column}` as "columns_.offer")}
            </MenuItem>
          );
        })}
      </MenuContent>
    </Menu>
  );
}

function Check({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-[4px] border text-[10px]",
        on ? "border-ink bg-ink text-ink-inverse" : "border-line-strong",
      )}
    >
      {on ? "✓" : ""}
    </span>
  );
}
