"use client";

import {
  createQuarterlyReport,
  type ActionState,
} from "@/app/dashboard/checklists/[clientId]/quarterly-report/new/actions";
import type { ObjectiveStat } from "@/app/dashboard/checklists/annual-report-stats";
import {
  formatReportRating,
  getReportRating,
} from "@/app/dashboard/checklists/report-rating";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useActionState } from "react";

const initialState: ActionState = {};

type NewQuarterlyReportFormProps = {
  clientId: string;
  reviewDate: string;
  periodStart: string;
  periodEnd: string;
  stats: ObjectiveStat[];
};

export function NewQuarterlyReportForm({
  clientId,
  reviewDate,
  periodStart,
  periodEnd,
  stats,
}: NewQuarterlyReportFormProps) {
  const [state, formAction, pending] = useActionState(
    createQuarterlyReport,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="reviewDate" value={reviewDate} />
      <input type="hidden" name="periodStart" value={periodStart} />
      <input type="hidden" name="periodEnd" value={periodEnd} />

      <div className="space-y-1.5">
        <Label htmlFor="summary">Quarterly summary</Label>
        <Textarea
          id="summary"
          name="summary"
          placeholder="Overall summary of the client's quarter, including transportation notes if relevant"
          rows={5}
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">
          Objectives &amp; Quarterly Progress
        </h2>
        {stats.length === 0 ? (
          <p className="rounded-lg border border-dashed bg-white p-4 text-sm text-muted-foreground">
            No objectives have tracked progress note data for this client in the
            selected period ({periodStart} to {periodEnd}).
          </p>
        ) : (
          stats.map((stat) => {
            const rating =
              stat.rating_percent === null
                ? null
                : getReportRating(stat.rating_percent);
            return (
              <div
                key={stat.objective_id}
                className="space-y-2 rounded-lg border bg-white p-4"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {stat.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Achieved on {stat.yes_count} of {stat.tracked_days} tracked
                    days
                  </p>
                  {rating ? (
                    <p className="text-xs font-medium text-foreground">
                      {formatReportRating(stat.rating_percent!)}
                    </p>
                  ) : null}
                </div>
                {rating ? (
                  <p className="text-sm text-foreground">{rating.description}</p>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Generating..." : "Generate report"}
      </Button>
    </form>
  );
}
