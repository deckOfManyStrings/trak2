"use client";

import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

type ReportPeriodFieldsProps = {
  reviewDate: string;
  periodStart: string;
  periodEnd: string;
  /** Base path for the new-report page, e.g. `/dashboard/checklists/{id}/annual-report/new` */
  basePath: string;
  defaultMonths: number;
  helperText?: string;
};

function buildHref(
  basePath: string,
  reviewDate: string,
  periodStart: string,
  periodEnd: string,
): string {
  const params = new URLSearchParams({
    reviewDate,
    periodStart,
    periodEnd,
  });
  return `${basePath}?${params.toString()}`;
}

const dateInputClassName =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

/**
 * Review date + export period. Changing any field reloads the page so
 * objective ratings recompute server-side for the chosen range.
 * Changing the review date resets the period to the default rolling window
 * ending on that date; adjusting start/end keeps the review date as-is.
 */
export function ReportPeriodFields({
  reviewDate,
  periodStart,
  periodEnd,
  basePath,
  defaultMonths,
  helperText = "Objective ratings below cover the period you select.",
}: ReportPeriodFieldsProps) {
  const router = useRouter();

  return (
    <div className="space-y-4 rounded-lg border bg-white p-4">
      <div className="space-y-1.5">
        <Label htmlFor="review-date">Date of review</Label>
        <input
          id="review-date"
          type="date"
          value={reviewDate}
          onChange={(event) => {
            const nextReview = event.target.value;
            if (!nextReview) return;

            const end = new Date(`${nextReview}T00:00:00`);
            const start = new Date(end);
            if (defaultMonths === 12) {
              start.setFullYear(start.getFullYear() - 1);
            } else {
              start.setMonth(start.getMonth() - defaultMonths);
            }
            start.setDate(start.getDate() + 1);
            const nextStart = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;

            router.push(buildHref(basePath, nextReview, nextStart, nextReview));
          }}
          className={dateInputClassName}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="period-start">Period start</Label>
          <input
            id="period-start"
            type="date"
            value={periodStart}
            max={periodEnd}
            onChange={(event) => {
              if (!event.target.value) return;
              router.push(
                buildHref(basePath, reviewDate, event.target.value, periodEnd),
              );
            }}
            className={dateInputClassName}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="period-end">Period end</Label>
          <input
            id="period-end"
            type="date"
            value={periodEnd}
            min={periodStart}
            onChange={(event) => {
              if (!event.target.value) return;
              router.push(
                buildHref(
                  basePath,
                  reviewDate,
                  periodStart,
                  event.target.value,
                ),
              );
            }}
            className={dateInputClassName}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{helperText}</p>
    </div>
  );
}
