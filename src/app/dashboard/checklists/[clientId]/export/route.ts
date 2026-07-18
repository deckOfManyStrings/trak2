import {
  daysInMonth,
  entryDateFor,
  getInitials,
  monthDateRange,
  normalizeMonthParam,
} from "@/app/dashboard/checklists/data";
import { getClientObjectives } from "@/app/dashboard/checklists/objectives";
import { createClient } from "@/utils/supabase/server";
import { getSessionProfile } from "@/utils/supabase/session";
import type { ChecklistEntry, Client } from "@/types/db";
import ExcelJS from "exceljs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type RouteParams = {
  params: Promise<{ clientId: string }>;
};

/**
 * Rebuilds one client's monthly sheet as an .xlsx, matching the layout of
 * the spreadsheet this feature replaces: a title row, a header row of day
 * numbers, and a value + Initials row pair per objective.
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
  const objectives = await getClientObjectives(supabase, clientId);

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

  const totalDays = daysInMonth(month);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(month);

  sheet.mergeCells(1, 1, 1, totalDays + 1);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = `${typedClient.full_name} ${month} Data`;
  titleCell.font = { bold: true, size: 13 };

  const headerRow = sheet.getRow(2);
  headerRow.getCell(1).value = "Objective";
  for (let day = 1; day <= totalDays; day++) {
    headerRow.getCell(day + 1).value = day;
  }
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center" };
    cell.border = { bottom: { style: "thin" } };
  });

  let rowIndex = 3;
  for (const [index, objective] of objectives.entries()) {
    const valueRow = sheet.getRow(rowIndex);
    valueRow.getCell(1).value = `#${index + 1} ${objective.title}`;
    valueRow.getCell(1).font = { bold: true };

    const initialsRow = sheet.getRow(rowIndex + 1);
    initialsRow.getCell(1).value = "Initials";
    initialsRow.getCell(1).font = { italic: true };

    for (let day = 1; day <= totalDays; day++) {
      const entryDate = entryDateFor(month, day);
      const entry = entryByKey.get(`${objective.id}:${entryDate}`);
      const column = day + 1;

      const valueCell = valueRow.getCell(column);
      valueCell.value = entry?.value ?? "";
      valueCell.alignment = { horizontal: "center" };

      const initialsCell = initialsRow.getCell(column);
      initialsCell.value = entry ? getInitials(entry.recorded_by_name) : "";
      initialsCell.alignment = { horizontal: "center" };
    }

    rowIndex += 2;
  }

  sheet.getColumn(1).width = 32;
  for (let day = 1; day <= totalDays; day++) {
    sheet.getColumn(day + 1).width = 5;
  }

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
