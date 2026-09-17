import type { ActionType } from "@/lib/offers/schema";

/** The stored statuses. `completed` is never one of them — see DerivedStatus. */
export type StoredStatus = "pending" | "confirmed" | "cancelled";

/**
 * What the pro sees. `completed` is derived, not stored: the database enum only
 * knows pending / confirmed / cancelled, and a session being over is a fact
 * about the clock rather than a state anyone sets.
 */
export type DerivedStatus = StoredStatus | "completed";

export const DERIVED_STATUSES: DerivedStatus[] = ["pending", "confirmed", "completed", "cancelled"];

/** Only these can be reached by dragging a card: `completed` would mean moving a date. */
export const DROPPABLE_STATUSES: StoredStatus[] = ["pending", "confirmed", "cancelled"];

export type FilterableBooking = {
  id: string;
  offer_title: string;
  action_type: ActionType;
  client_name: string;
  client_email: string;
  starts_at: string | null;
  requested_date: string | null;
  status: StoredStatus;
  created_at: string;
};

export function derivedStatus(booking: FilterableBooking, now: number): DerivedStatus {
  if (booking.status === "cancelled") return "cancelled";
  if (booking.status === "pending") return "pending";

  const start = reference(booking);
  return start !== null && start < now ? "completed" : "confirmed";
}

/** The instant a booking is anchored to, falling back to its request date. */
export function reference(booking: FilterableBooking): number | null {
  if (booking.starts_at) return new Date(booking.starts_at).getTime();
  if (booking.requested_date) return new Date(`${booking.requested_date}T00:00:00Z`).getTime();
  return null;
}

export type BookingFilters = {
  /** Empty means "no status filter", not "none of them". */
  statuses: DerivedStatus[];
  /** Local date strings (YYYY-MM-DD), inclusive on both ends. */
  from: string | null;
  to: string | null;
  /** Offer titles to keep; empty means all. */
  offers: string[];
  actionTypes: ActionType[];
  query: string;
};

export const EMPTY_FILTERS: BookingFilters = {
  statuses: [],
  from: null,
  to: null,
  offers: [],
  actionTypes: [],
  query: "",
};

export function hasActiveFilters(filters: BookingFilters): boolean {
  return (
    filters.statuses.length > 0 ||
    filters.offers.length > 0 ||
    filters.actionTypes.length > 0 ||
    filters.from !== null ||
    filters.to !== null ||
    filters.query.trim() !== ""
  );
}

/**
 * Every criterion is combinable and narrows the result further. An unset
 * criterion never excludes anything.
 */
export function applyFilters<T extends FilterableBooking>(
  bookings: T[],
  filters: BookingFilters,
  now: number,
): T[] {
  const search = filters.query.trim().toLowerCase();
  // Compared as timestamps so a booking on the "to" day itself is kept.
  const from = filters.from ? new Date(`${filters.from}T00:00:00`).getTime() : null;
  const to = filters.to ? new Date(`${filters.to}T23:59:59.999`).getTime() : null;

  return bookings.filter((booking) => {
    if (filters.statuses.length > 0 && !filters.statuses.includes(derivedStatus(booking, now))) {
      return false;
    }

    if (filters.offers.length > 0 && !filters.offers.includes(booking.offer_title)) return false;

    if (filters.actionTypes.length > 0 && !filters.actionTypes.includes(booking.action_type)) {
      return false;
    }

    if (from !== null || to !== null) {
      const at = reference(booking);
      // A booking with no date at all cannot satisfy a date range.
      if (at === null) return false;
      if (from !== null && at < from) return false;
      if (to !== null && at > to) return false;
    }

    if (search) {
      const haystack =
        `${booking.client_name} ${booking.client_email} ${booking.offer_title}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    return true;
  });
}

export type SortKey = "date" | "client" | "offer" | "status" | "created";
export type SortDirection = "asc" | "desc";

/** Rank used when sorting by status, from most to least actionable. */
const STATUS_ORDER: Record<DerivedStatus, number> = {
  pending: 0,
  confirmed: 1,
  completed: 2,
  cancelled: 3,
};

export function sortBookings<T extends FilterableBooking>(
  bookings: T[],
  key: SortKey,
  direction: SortDirection,
  now: number,
): T[] {
  const sign = direction === "asc" ? 1 : -1;

  return [...bookings].sort((a, b) => {
    let result: number;

    switch (key) {
      case "client":
        result = a.client_name.localeCompare(b.client_name);
        break;
      case "offer":
        result = a.offer_title.localeCompare(b.offer_title);
        break;
      case "status":
        result = STATUS_ORDER[derivedStatus(a, now)] - STATUS_ORDER[derivedStatus(b, now)];
        break;
      case "created":
        result = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      default: {
        // Undated requests sort after dated ones, whichever direction is asked.
        const aAt = reference(a);
        const bAt = reference(b);
        if (aAt === null && bAt === null) result = 0;
        else if (aAt === null) return 1;
        else if (bAt === null) return -1;
        else result = aAt - bAt;
      }
    }

    // Stable tie-break so equal keys keep a predictable order.
    return result !== 0 ? result * sign : a.id.localeCompare(b.id);
  });
}

export const COLUMNS = ["offer", "client", "date", "status", "quantity"] as const;
export type ColumnKey = (typeof COLUMNS)[number];

/** `client` and `date` carry the row's identity, so they cannot be hidden. */
export const LOCKED_COLUMNS: ColumnKey[] = ["client", "date"];
export const DEFAULT_COLUMNS: ColumnKey[] = ["offer", "client", "date", "status"];
