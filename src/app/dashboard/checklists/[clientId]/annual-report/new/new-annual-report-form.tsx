"use client";

import { createAnnualReport, type ActionState } from "@/app/dashboard/checklists/[clientId]/annual-report/new/actions";
import type { ObjectiveStat } from "@/app/dashboard/checklists/annual-report-stats";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useActionState } from "react";

const initialState: ActionState = {};

type NewAnnualReportFormProps = {
  clientId: string;
  reviewDate: string;
  periodStart: string;
  periodEnd: string;
  stats: ObjectiveStat[];
};

export function NewAnnualReportForm({
  clientId,
  reviewDate,
  periodStart,
  periodEnd,
  stats,
}: NewAnnualReportFormProps) {
  const [state, formAction, pending] = useActionState(
    createAnnualReport,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="reviewDate" value={reviewDate} />
      <input type="hidden" name="periodStart" value={periodStart} />
      <input type="hidden" name="periodEnd" value={periodEnd} />

      <div className="space-y-1.5">
        <Label htmlFor="summary">Annual summary</Label>
        <Textarea
          id="summary"
          name="summary"
          placeholder="Overall summary of the client's year, including transportation notes if relevant"
          rows={5}
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Objectives &amp; Annual Progress</h2>
        {stats.length === 0 ? (
          <p className="rounded-lg border border-dashed bg-white p-4 text-sm text-muted-foreground">
            No objectives have tracked progress note data for this client in the
            selected period ({periodStart} to {periodEnd}).
          </p>
        ) : (
          stats.map((stat) => (
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
                  days ({stat.rating_percent}%)
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`comment-${stat.objective_id}`}>Comments</Label>
                <Textarea
                  id={`comment-${stat.objective_id}`}
                  name={`comment-${stat.objective_id}`}
                  placeholder="Summarize progress on this objective for the period"
                  rows={3}
                />
              </div>
            </div>
          ))
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
