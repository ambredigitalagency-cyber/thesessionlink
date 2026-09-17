import { OfferRowSkeleton } from "@/components/ui/skeleton";

export default function LoadingOffers() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((row) => (
        <OfferRowSkeleton key={row} />
      ))}
    </div>
  );
}
