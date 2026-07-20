import {
  monthDateRange,
  normalizeMonthParam,
} from "@/app/dashboard/checklists/data";
import { buildMonthlyChecklistSheet } from "@/app/dashboard/checklists/export-checklist-xlsx";
import { getClientObjectives } from "@/app/dashboard/checklists/objectives";
import { createClient } from "@/utils/supabase/server";
import { getSessionProfile } from "@/utils/supabase/session";
import type { ChecklistEntry, Client, Location } from "@/types/db";
import ExcelJS from "exceljs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type RouteParams = {
  params: Promise<{ clientId: string }>;
};

/**
 * Builds one client's monthly checklist as an .xlsx in the classic one-page
 * form layout (company header, Name/Month, per-objective Data/Initials
 * blocks, manager sign-off).
 */
export async function GET(request: Request, { params }: RouteParams) {
  const session = await getSessionProfile();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { clientId } = await params;
  const month = normalizeMonthParam(
    new URL(request.url).searchParams.get("month"),
  );

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .maybeSingle();

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const typedClient = client as Client;
  const [{ data: location }, objectives] = await Promise.all([
    supabase
      .from("locations")
      .select("*")
      .eq("id", typedClient.location_id)
      .maybeSingle(),
    getClientObjectives(supabase, clientId),
  ]);

  const companyName = (location as Location | null)?.name ?? null;

  const { start, end } = monthDateRange(month);
  const { data: entries } = await supabase
    .from("checklist_entries")
    .select("*")
    .eq("client_id", clientId)
    .gte("entry_date", start)
    .lte("entry_date", end);

  const entryByKey = new Map<string, ChecklistEntry>();
  for (const entry of (entries ?? []) as ChecklistEntry[]) {
    entryByKey.set(`${entry.objective_id}:${entry.entry_date}`, entry);
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(month);

  buildMonthlyChecklistSheet({
    sheet,
    month,
    clientName: typedClient.full_name,
    companyName,
    objectives,
    entryByKey,
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const safeName = typedClient.full_name.replace(/[^a-z0-9]+/gi, "-");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${safeName}-${month}.xlsx"`,
    },
  });
}
