"use client";

import { reassignClientLocation } from "@/app/dashboard/clients/actions";
import {
  assignStaffToLocation,
  removeStaffFromLocation,
} from "@/app/dashboard/staff/actions";
import { cn } from "@/lib/utils";
import type { Client, Location, Profile } from "@/types/db";
import {
  useState,
  useTransition,
  type DragEvent,
  type ReactNode,
} from "react";

type StaffWithLocation = Profile & { locationId: string | null };

type BoardClientProps = {
  locations: Location[];
  staff: StaffWithLocation[];
  clients: Client[];
};

type Tab = "staff" | "clients";

function BoardCard({
  id,
  title,
  subtitle,
  onDragStart,
}: {
  id: string;
  title: string;
  subtitle?: string;
  onDragStart: (id: string) => void;
}) {
  return (
    <div
      draggable
      onDragStart={(event: DragEvent<HTMLDivElement>) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", id);
        onDragStart(id);
      }}
      className="cursor-grab rounded-md border bg-white p-3 text-sm shadow-sm active:cursor-grabbing"
    >
      <p className="font-medium text-foreground">{title}</p>
      {subtitle ? (
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      ) : null}
    </div>
  );
}

function BoardColumn({
  title,
  onDrop,
  children,
}: {
  title: string;
  onDrop: () => void;
  children: ReactNode;
}) {
  const [isOver, setIsOver] = useState(false);

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsOver(false);
        onDrop();
      }}
      className={cn(
        "flex w-64 shrink-0 flex-col gap-2 rounded-lg border bg-muted/30 p-3 transition-colors",
        isOver && "border-foreground bg-muted",
      )}
    >
      <p className="px-1 text-sm font-semibold text-foreground">{title}</p>
      <div className="flex min-h-16 flex-col gap-2">{children}</div>
    </div>
  );
}

export function BoardClient({
  locations,
  staff: initialStaff,
  clients: initialClients,
}: BoardClientProps) {
  const [tab, setTab] = useState<Tab>("staff");
  const [staff, setStaff] = useState(initialStaff);
  const [clients, setClients] = useState(initialClients);
  const [dragId, setDragId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleStaffDrop(locationId: string | null) {
    if (!dragId) return;
    const staffId = dragId;
    setDragId(null);
    setError(null);

    setStaff((prev) =>
      prev.map((member) =>
        member.id === staffId ? { ...member, locationId } : member,
      ),
    );

    startTransition(async () => {
      const result = locationId
        ? await assignStaffToLocation(staffId, locationId)
        : await removeStaffFromLocation(staffId);
      if (result.error) setError(result.error);
    });
  }

  function handleClientDrop(locationId: string) {
    if (!dragId) return;
    const clientId = dragId;
    setDragId(null);
    setError(null);

    setClients((prev) =>
      prev.map((client) =>
        client.id === clientId
          ? { ...client, location_id: locationId }
          : client,
      ),
    );

    startTransition(async () => {
      const result = await reassignClientLocation(clientId, locationId);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setTab("staff")}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            tab === "staff"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Staff
        </button>
        <button
          type="button"
          onClick={() => setTab("clients")}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            tab === "clients"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Clients
        </button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {tab === "staff" ? (
          <>
            {locations.map((location) => (
              <BoardColumn
                key={location.id}
                title={location.name}
                onDrop={() => handleStaffDrop(location.id)}
              >
                {staff
                  .filter((member) => member.locationId === location.id)
                  .map((member) => (
                    <BoardCard
                      key={member.id}
                      id={member.id}
                      title={member.full_name || member.email}
                      subtitle={member.email}
                      onDragStart={setDragId}
                    />
                  ))}
              </BoardColumn>
            ))}
            <BoardColumn title="Unassigned" onDrop={() => handleStaffDrop(null)}>
              {staff
                .filter((member) => !member.locationId)
                .map((member) => (
                  <BoardCard
                    key={member.id}
                    id={member.id}
                    title={member.full_name || member.email}
                    subtitle={member.email}
                    onDragStart={setDragId}
                  />
                ))}
            </BoardColumn>
          </>
        ) : (
          locations.map((location) => (
            <BoardColumn
              key={location.id}
              title={location.name}
              onDrop={() => handleClientDrop(location.id)}
            >
              {clients
                .filter((client) => client.location_id === location.id)
                .map((client) => (
                  <BoardCard
                    key={client.id}
                    id={client.id}
                    title={client.full_name}
                    subtitle={client.status === "inactive" ? "Inactive" : undefined}
                    onDragStart={setDragId}
                  />
                ))}
            </BoardColumn>
          ))
        )}
      </div>
    </div>
  );
}
