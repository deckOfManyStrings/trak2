"use server";

import {
  annualReportPeriod,
  getTrackedObjectiveStats,
} from "@/app/dashboard/checklists/annual-report-stats";
import { createClient } from "@/utils/supabase/server";
import { getSessionProfile } from "@/utils/supabase/session";
import type { Client } from "@/types/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type ActionState = {
  error?: string;
};

/**
 * Creates a new Annual Assessment Report. Objective ratings are recomputed
 * here from checklist_entries (rather than trusted from the submitted form)
 * so a saved report always reflects real tracked data for the chosen
 * review date's rolling 12-month period.
 */
export async function createAnnualReport(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSessionProfile();
  if (!session) {
    return { error: "You must be signed in." };
  }

  const clientId = String(formData.get("clientId") ?? "");
  const reviewDate = String(formData.get("reviewDate") ?? "");
  const summary = String(formData.get("summary") ?? "").trim();

  if (!clientId || !reviewDate) {
    return { error: "A review date is required." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .maybeSingle();

  if (!client) {
    return { error: "Client not found." };
  }
  const typedClient = client as Client;

  const { periodStart, periodEnd } = annualReportPeriod(reviewDate);
  const stats = await getTrackedObjectiveStats(
    supabase,
    clientId,
    periodStart,
    periodEnd,
  );

  const { data: report, error: reportError } = await supabase
    .from("annual_reports")
    .insert({
      client_id: clientId,
      owner_id: typedClient.owner_id,
      review_date: reviewDate,
      period_start: periodStart,
      period_end: periodEnd,
      summary: summary || null,
      created_by: session.userId,
    })
    .select("*")
    .single();

  if (reportError || !report) {
    return { error: reportError?.message ?? "Could not create the report." };
  }

  if (stats.length > 0) {
    const { error: objectivesError } = await supabase
      .from("annual_report_objectives")
      .insert(
        stats.map((stat) => ({
          annual_report_id: report.id,
          objective_id: stat.objective_id,
          objective_title: stat.title,
          yes_count: stat.yes_count,
          no_count: stat.no_count,
          tracked_days: stat.tracked_days,
          rating_percent: stat.rating_percent,
          comments:
            String(formData.get(`comment-${stat.objective_id}`) ?? "").trim() ||
            null,
        })),
      );

    if (objectivesError) {
      return { error: objectivesError.message };
    }
  }

  redirect(`/dashboard/checklists/${clientId}/annual-report/${report.id}`);
}
