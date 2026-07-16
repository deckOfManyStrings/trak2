"use client";

import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

type ReviewDateFieldProps = {
  clientId: string;
  reviewDate: string;
};

/**
 * Changing the review date changes the rolling 12-month period used to
 * compute objective ratings, so it reloads the page (server-computed
 * stats) rather than just updating local state.
 */
export function ReviewDateField({ clientId, reviewDate }: ReviewDateFieldProps) {
  const router = useRouter();

  return (
    <div className="space-y-1.5">
      <Label htmlFor="review-date">Date of review</Label>
      <input
        id="review-date"
        type="date"
        value={reviewDate}
        onChange={(event) => {
          if (event.target.value) {
            router.push(
              `/dashboard/checklists/${clientId}/annual-report/new?reviewDate=${event.target.value}`,
            );
          }
        }}
        className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
      />
      <p className="text-xs text-muted-foreground">
        Objective ratings below cover the 12 months ending on this date.
      </p>
    </div>
  );
}
