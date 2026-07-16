import {
  annualReportPeriod,
  getTrackedObjectiveStats,
} from "@/app/dashboard/checklists/annual-report-stats";
import { NewAnnualReportForm } from "@/app/dashboard/checklists/[clientId]/annual-report/new/new-annual-report-form";
import { ReviewDateField } from "@/app/dashboard/checklists/[clientId]/annual-report/new/review-date-field";
import { createClient } from "@/utils/supabase/server";
import { getSessionProfile } from "@/utils/supabase/session";
import type { Client, Location } from "@/types/db";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

type PageProps = {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ reviewDate?: string }>;
};

function todayParam(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

export default async function NewAnnualReportPage({
  params,
  searchParams,
}: PageProps) {
  const session = await getSessionProfile();
  if (!session) redirect("/");

  const [{ clientId }, { reviewDate: reviewDateParam }] = await Promise.all([
    params,
    searchParams,
  ]);
  const reviewDate = reviewDateParam || todayParam();

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

  const { periodStart, periodEnd } = annualReportPeriod(reviewDate);
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
            href={`/dashboard/checklists/${clientId}/annual-report`}
            className="underline underline-offset-4 hover:text-foreground"
          >
            Annual Reports
          </Link>{" "}
          / New
        </p>
        <h1 className="text-xl font-semibold">
          New Annual Report for {typedClient.full_name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {typedLocation?.name ?? "Unassigned"}
        </p>
      </div>

      <ReviewDateField clientId={clientId} reviewDate={reviewDate} />

      <NewAnnualReportForm
        clientId={clientId}
        reviewDate={reviewDate}
        stats={stats}
      />
    </div>
  );
}
