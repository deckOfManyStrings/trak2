import { QuarterlyReportDocument } from "@/app/dashboard/checklists/[clientId]/quarterly-report/[reportId]/quarterly-report-document";
import { createClient } from "@/utils/supabase/server";
import { getSessionProfile } from "@/utils/supabase/session";
import type {
  Client,
  Location,
  QuarterlyReport,
  QuarterlyReportObjective,
} from "@/types/db";
import { renderToBuffer } from "@react-pdf/renderer";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type RouteParams = {
  params: Promise<{ clientId: string; reportId: string }>;
};

/**
 * Renders a previously saved Quarterly Assessment Report to a PDF, from
 * the persisted rows rather than recomputing — so the download always
 * matches what was saved, even if checklist data changes afterward.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getSessionProfile();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { clientId, reportId } = await params;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [{ data: client }, { data: report }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", clientId).maybeSingle(),
    supabase
      .from("quarterly_reports")
      .select("*")
      .eq("id", reportId)
      .eq("client_id", clientId)
      .maybeSingle(),
  ]);

  if (!client || !report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const typedClient = client as Client;
  const typedReport = report as QuarterlyReport;

  const [{ data: location }, { data: objectives }] = await Promise.all([
    supabase
      .from("locations")
      .select("*")
      .eq("id", typedClient.location_id)
      .maybeSingle(),
    supabase
      .from("quarterly_report_objectives")
      .select("*")
      .eq("quarterly_report_id", reportId),
  ]);

  const typedLocation = location as Location | null;
  const typedObjectives = (objectives ?? []) as QuarterlyReportObjective[];

  const buffer = await renderToBuffer(
    <QuarterlyReportDocument
      report={typedReport}
      objectives={typedObjectives}
      client={typedClient}
      location={typedLocation}
    />,
  );

  const safeName = typedClient.full_name.replace(/[^a-z0-9]+/gi, "-");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}-quarterly-report-${typedReport.review_date}.pdf"`,
    },
  });
}
