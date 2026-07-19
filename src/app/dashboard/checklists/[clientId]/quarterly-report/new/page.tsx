import {
  getTrackedObjectiveStats,
  isValidDateParam,
  resolveReportPeriod,
} from "@/app/dashboard/checklists/annual-report-stats";
import { NewQuarterlyReportForm } from "@/app/dashboard/checklists/[clientId]/quarterly-report/new/new-quarterly-report-form";
import { ReportPeriodFields } from "@/app/dashboard/checklists/report-period-fields";
import { createClient } from "@/utils/supabase/server";
import { getSessionProfile } from "@/utils/supabase/session";
import type { Client, Location } from "@/types/db";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

type PageProps = {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{
    reviewDate?: string;
    periodStart?: string;
    periodEnd?: string;
  }>;
};

function todayParam(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

export default async function NewQuarterlyReportPage({
  params,
  searchParams,
}: PageProps) {
  const session = await getSessionProfile();
  if (!session) redirect("/");

  const [{ clientId }, search] = await Promise.all([params, searchParams]);
  const reviewDate = isValidDateParam(search.reviewDate)
    ? search.reviewDate
    : todayParam();
  const { periodStart, periodEnd } = resolveReportPeriod({
    reviewDate,
    periodStart: search.periodStart,
    periodEnd: search.periodEnd,
    defaultMonths: 3,
  });

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .maybeSingle();

  if (!client) notFound();
  const typedClient = client as Client;

  const { data: location } = await supabase
    .from("locations")
    .select("*")
    .eq("id", typedClient.location_id)
    .maybeSingle();
  const typedLocation = location as Location | null;

  const stats = await getTrackedObjectiveStats(
    supabase,
    clientId,
    periodStart,
    periodEnd,
  );

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link
            href={`/dashboard/checklists/${clientId}/quarterly-report`}
            className="underline underline-offset-4 hover:text-foreground"
          >
            Quarterly Reports
          </Link>{" "}
          / New
        </p>
        <h1 className="text-xl font-semibold">
          New Quarterly Report for {typedClient.full_name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {typedLocation?.name ?? "Unassigned"}
        </p>
      </div>

      <ReportPeriodFields
        reviewDate={reviewDate}
        periodStart={periodStart}
        periodEnd={periodEnd}
        basePath={`/dashboard/checklists/${clientId}/quarterly-report/new`}
        defaultMonths={3}
        helperText="Defaults to the 3 months ending on the review date. Adjust the period to match a calendar quarter or any custom range."
      />

      <NewQuarterlyReportForm
        clientId={clientId}
        reviewDate={reviewDate}
        periodStart={periodStart}
        periodEnd={periodEnd}
        stats={stats}
      />
    </div>
  );
}
