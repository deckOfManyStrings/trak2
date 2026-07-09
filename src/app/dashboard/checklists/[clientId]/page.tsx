import { ChecklistGrid } from "@/app/dashboard/checklists/[clientId]/checklist-grid";
import { MonthPicker } from "@/app/dashboard/checklists/[clientId]/month-picker";
import { monthDateRange, normalizeMonthParam } from "@/app/dashboard/checklists/data";
import { getOrCreateObjectives } from "@/app/dashboard/checklists/objectives";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";
import { getSessionProfile } from "@/utils/supabase/session";
import type { ChecklistEntry, Client } from "@/types/db";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

type PageProps = {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ month?: string }>;
};

export default async function ClientChecklistPage({
  params,
  searchParams,
}: PageProps) {
  const session = await getSessionProfile();
  if (!session) redirect("/");

  const [{ clientId }, { month: monthParam }] = await Promise.all([
    params,
    searchParams,
  ]);
  const month = normalizeMonthParam(monthParam);

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .maybeSingle();

  if (!client) notFound();

  const typedClient = client as Client;
  const objectives = await getOrCreateObjectives(supabase, typedClient.owner_id);

  const { start, end } = monthDateRange(month);
  const { data: entries } = await supabase
    .from("checklist_entries")
    .select("*")
    .eq("client_id", clientId)
    .gte("entry_date", start)
    .lte("entry_date", end);

  const currentUserName =
    session.profile.full_name || session.profile.email || "You";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link
              href="/dashboard/checklists"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Checklists
            </Link>{" "}
            / {typedClient.full_name}
          </p>
          <h1 className="text-xl font-semibold">{typedClient.full_name}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <MonthPicker clientId={clientId} month={month} />
          <a
            href={`/dashboard/checklists/${clientId}/export?month=${month}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Export to Excel
          </a>
        </div>
      </div>

      <ChecklistGrid
        clientId={clientId}
        month={month}
        objectives={objectives}
        entries={(entries ?? []) as ChecklistEntry[]}
        currentUserName={currentUserName}
      />
    </div>
  );
}
