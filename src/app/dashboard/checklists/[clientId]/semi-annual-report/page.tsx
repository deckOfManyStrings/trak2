import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";
import { getSessionProfile } from "@/utils/supabase/session";
import type { Client, SemiAnnualReport } from "@/types/db";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

type PageProps = {
  params: Promise<{ clientId: string }>;
};

export default async function SemiAnnualReportListPage({ params }: PageProps) {
  const session = await getSessionProfile();
  if (!session) redirect("/");

  const { clientId } = await params;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .maybeSingle();

  if (!client) notFound();
  const typedClient = client as Client;

  const { data: reports } = await supabase
    .from("semi_annual_reports")
    .select("*")
    .eq("client_id", clientId)
    .order("review_date", { ascending: false });

  const typedReports = (reports ?? []) as SemiAnnualReport[];

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link
              href={`/dashboard/checklists/${clientId}`}
              className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-foreground md:min-h-0"
            >
              {typedClient.full_name}
            </Link>{" "}
            / Semi-Annual Reports
          </p>
          <h1 className="text-xl font-semibold">Semi-Annual Reports</h1>
        </div>

        <Link
          href={`/dashboard/checklists/${clientId}/semi-annual-report/new`}
          className={cn(buttonVariants(), "w-full sm:w-auto")}
        >
          New report
        </Link>
      </div>

      {typedReports.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-white p-6 text-center text-sm text-muted-foreground">
          No Semi-Annual Reports have been generated yet for{" "}
          {typedClient.full_name}.
        </p>
      ) : (
        <ul className="space-y-3">
          {typedReports.map((report) => (
            <li key={report.id}>
              <Link
                href={`/dashboard/checklists/${clientId}/semi-annual-report/${report.id}`}
                className="flex min-h-16 items-center justify-between rounded-lg border bg-white p-4 hover:bg-muted/40 active:bg-muted/40"
              >
                <div>
                  <p className="font-medium text-foreground">
                    Review date: {report.review_date}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Period {report.period_start} to {report.period_end}
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">View &rarr;</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
