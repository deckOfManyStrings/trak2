import "server-only";

import type { ChecklistEntry, Objective } from "@/types/db";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ObjectiveStat = {
  objective_id: string;
  title: string;
  yes_count: number;
  no_count: number;
  tracked_days: number;
  rating_percent: number | null;
};

function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateParam(value: string | undefined | null): value is string {
  return Boolean(value && DATE_RE.test(value));
}

/**
 * Rolling window ending on (and including) reviewDate. Used as the default
 * when staff have not picked an explicit period start/end.
 */
export function rollingReportPeriod(
  reviewDate: string,
  months: number,
): {
  periodStart: string;
  periodEnd: string;
} {
  const end = new Date(`${reviewDate}T00:00:00`);
  const start = new Date(end);
  if (months === 12) {
    start.setFullYear(start.getFullYear() - 1);
  } else {
    start.setMonth(start.getMonth() - months);
  }
  start.setDate(start.getDate() + 1);

  return { periodStart: toDateString(start), periodEnd: reviewDate };
}

/** @deprecated Prefer rollingReportPeriod(reviewDate, 12) */
export function annualReportPeriod(reviewDate: string) {
  return rollingReportPeriod(reviewDate, 12);
}

/** @deprecated Prefer rollingReportPeriod(reviewDate, 6) */
export function semiAnnualReportPeriod(reviewDate: string) {
  return rollingReportPeriod(reviewDate, 6);
}

export function quarterlyReportPeriod(reviewDate: string) {
  return rollingReportPeriod(reviewDate, 3);
}

/**
 * Resolves the period used for preview/stats on the new-report page.
 * Explicit periodStart/periodEnd from the URL win; otherwise defaults to a
 * rolling window ending on the review date.
 */
export function resolveReportPeriod(options: {
  reviewDate: string;
  periodStart?: string;
  periodEnd?: string;
  defaultMonths: number;
}): {
  reviewDate: string;
  periodStart: string;
  periodEnd: string;
} {
  const { reviewDate, defaultMonths } = options;
  const defaults = rollingReportPeriod(reviewDate, defaultMonths);

  if (
    isValidDateParam(options.periodStart) &&
    isValidDateParam(options.periodEnd) &&
    options.periodStart <= options.periodEnd
  ) {
    return {
      reviewDate,
      periodStart: options.periodStart,
      periodEnd: options.periodEnd,
    };
  }

  return { reviewDate, ...defaults };
}

/**
 * Validates the review + period dates submitted when generating a report.
 */
export function parseSubmittedReportDates(formData: FormData):
  | {
      ok: true;
      reviewDate: string;
      periodStart: string;
      periodEnd: string;
    }
  | { ok: false; error: string } {
  const reviewDate = String(formData.get("reviewDate") ?? "");
  const periodStart = String(formData.get("periodStart") ?? "");
  const periodEnd = String(formData.get("periodEnd") ?? "");

  if (
    !isValidDateParam(reviewDate) ||
    !isValidDateParam(periodStart) ||
    !isValidDateParam(periodEnd)
  ) {
    return {
      ok: false,
      error: "Review date, period start, and period end are required.",
    };
  }

  if (periodStart > periodEnd) {
    return {
      ok: false,
      error: "Period start must be on or before period end.",
    };
  }

  return { ok: true, reviewDate, periodStart, periodEnd };
}

/**
 * Aggregates a client's checklist entries within [periodStart, periodEnd]
 * into a per-objective rating. Only Y/N marks count toward tracked_days -
 * Holiday/No-program/N-A days are excluded from the denominator entirely.
 * Objectives with zero tracked days for this client/period are dropped, so
 * the Annual Report only shows objectives that were actually worked on.
 */
export async function getTrackedObjectiveStats(
  supabase: SupabaseClient,
  clientId: string,
  periodStart: string,
  periodEnd: string,
): Promise<ObjectiveStat[]> {
  const [{ data: objectives }, { data: entries }] = await Promise.all([
    supabase.from("objectives").select("*").eq("client_id", clientId),
    supabase
      .from("checklist_entries")
      .select("*")
      .eq("client_id", clientId)
      .gte("entry_date", periodStart)
      .lte("entry_date", periodEnd)
      .in("value", ["Y", "N"]),
  ]);

  const titleById = new Map(
    ((objectives ?? []) as Objective[]).map((objective) => [
      objective.id,
      objective.title,
    ]),
  );

  const countsByObjective = new Map<string, { yes: number; no: number }>();
  for (const entry of (entries ?? []) as ChecklistEntry[]) {
    const counts = countsByObjective.get(entry.objective_id) ?? {
      yes: 0,
      no: 0,
    };
    if (entry.value === "Y") counts.yes += 1;
    if (entry.value === "N") counts.no += 1;
    countsByObjective.set(entry.objective_id, counts);
  }

  const stats: ObjectiveStat[] = [];
  for (const [objectiveId, counts] of countsByObjective) {
    const trackedDays = counts.yes + counts.no;
    if (trackedDays === 0) continue;

    stats.push({
      objective_id: objectiveId,
      title: titleById.get(objectiveId) ?? "Untitled objective",
      yes_count: counts.yes,
      no_count: counts.no,
      tracked_days: trackedDays,
      rating_percent: Math.round((counts.yes / trackedDays) * 10000) / 100,
    });
  }

  return stats;
}
