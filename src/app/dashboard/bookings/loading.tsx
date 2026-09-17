import { BookingRowSkeleton } from "@/components/ui/skeleton";

export default function LoadingBookings() {
  return (
    <div className="space-y-3">
      {[0, 1, 2, 3].map((row) => (
        <BookingRowSkeleton key={row} />
      ))}
    </div>
  );
}
