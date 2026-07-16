import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";
import { getSessionProfile } from "@/utils/supabase/session";
import type {
  AnnualReport,
  AnnualReportObjective,
  Client,
  Location,
} from "@/types/db";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

type PageProps = {
  params: Promise<{ clientId: string; reportId: string }>;
};

export default async function AnnualReportDetailPage({ params }: PageProps) {
  const session = await getSessionProfile();
  if (!session) redirect("/");

  const { clientId, reportId } = await params;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [{ data: client }, { data: report }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", clientId).maybeSingle(),
    supabase
      .from("annual_reports")
      .select("*")
      .eq("id", reportId)
      .eq("client_id", clientId)
      .maybeSingle(),
  ]);

  if (!client || !report) notFound();
  const typedClient = client as Client;
  const typedReport = report as AnnualReport;

  const [{ data: location }, { data: objectives }] = await Promise.all([
    supabase
      .from("locations")
      .select("*")
      .eq("id", typedClient.location_id)
      .maybeSingle(),
    supabase
      .from("annual_report_objectives")
      .select("*")
      .eq("annual_report_id", reportId),
  ]);

  const typedLocation = location as Location | null;
  const typedObjectives = (objectives ?? []) as AnnualReportObjective[];

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link
              href={`/dashboard/checklists/${clientId}/annual-report`}
              className="underline underline-offset-4 hover:text-foreground"
            >
              Annual Reports
            </Link>{" "}
            / {typedReport.review_date}
          </p>
          <h1 className="text-xl font-semibold">
            Annual Report &mdash; {typedClient.full_name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {typedLocation?.name ?? "Unassigned"} &middot; Review date{" "}
            {typedReport.review_date}
          </p>
        </div>

        <a
          href={`/dashboard/checklists/${clientId}/annual-report/${reportId}/pdf`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Download PDF
        </a>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-1 text-sm font-semibold">Program Overview</h2>
        <p className="text-sm text-muted-foreground">
          {typedLocation?.program_description ?? "No program description on file."}
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Objectives &amp; Annual Progress</h2>
        {typedObjectives.length === 0 ? (
          <p className="rounded-lg border border-dashed bg-white p-4 text-sm text-muted-foreground">
            No objectives had tracked data for this review period.
          </p>
        ) : (
          typedObjectives.map((objective) => (
            <div key={objective.id} className="rounded-lg border bg-white p-4">
              <p className="text-sm font-medium text-foreground">
                {objective.objective_title}
              </p>
              <p className="text-xs text-muted-foreground">
                Achieved on {objective.yes_count} of {objective.tracked_days}{" "}
                tracked days ({objective.rating_percent}%)
              </p>
              {objective.comments ? (
                <p className="mt-2 text-sm text-foreground">
                  {objective.comments}
                </p>
              ) : null}
            </div>
          ))
        )}
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-1 text-sm font-semibold">Annual Summary</h2>
        <p className="text-sm text-muted-foreground">
          {typedReport.summary ?? "No summary provided."}
        </p>
      </div>
    </div>
  );
}
