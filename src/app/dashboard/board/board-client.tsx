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
  moveControl,
}: {
  id: string;
  title: string;
  subtitle?: string;
  onDragStart: (id: string) => void;
  moveControl?: ReactNode;
}) {
  return (
    <div
      draggable
      onDragStart={(event: DragEvent<HTMLDivElement>) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", id);
        onDragStart(id);
      }}
      className="rounded-md border bg-white p-3 text-sm shadow-sm md:cursor-grab md:active:cursor-grabbing"
    >
      <p className="font-medium text-foreground">{title}</p>
      {subtitle ? (
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      ) : null}
      {moveControl ? <div className="mt-3 md:hidden">{moveControl}</div> : null}
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
        "flex w-[min(100%,18rem)] shrink-0 flex-col gap-2 rounded-lg border bg-muted/30 p-3 transition-colors sm:w-64",
        isOver && "border-foreground bg-muted",
      )}
    >
      <p className="px-1 text-sm font-semibold text-foreground">{title}</p>
      <div className="flex min-h-16 flex-col gap-2">{children}</div>
    </div>
  );
}

const selectClassName =
  "h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

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

  function moveStaff(staffId: string, locationId: string | null) {
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

  function moveClient(clientId: string, locationId: string) {
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

  function handleStaffDrop(locationId: string | null) {
    if (!dragId) return;
    const staffId = dragId;
    setDragId(null);
    moveStaff(staffId, locationId);
  }

  function handleClientDrop(locationId: string) {
    if (!dragId) return;
    const clientId = dragId;
    setDragId(null);
    moveClient(clientId, locationId);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 rounded-lg border bg-white p-1">
        <button
          type="button"
          onClick={() => setTab("staff")}
          className={cn(
            "min-h-11 flex-1 rounded-md px-3 text-sm font-medium transition-colors",
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
            "min-h-11 flex-1 rounded-md px-3 text-sm font-medium transition-colors",
            tab === "clients"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Clients
        </button>
      </div>

      <p className="text-sm text-muted-foreground md:hidden">
        Use the location menu on a card to move someone.
      </p>
      <p className="hidden text-sm text-muted-foreground md:block">
        Drag a card to another location column, or use the location menu on
        smaller screens.
      </p>

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
                      moveControl={
                        <select
                          aria-label={`Move ${member.full_name || member.email}`}
                          value={member.locationId ?? ""}
                          onChange={(event) =>
                            moveStaff(member.id, event.target.value || null)
                          }
                          className={selectClassName}
                        >
                          <option value="">Unassigned</option>
                          {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                              {loc.name}
                            </option>
                          ))}
                        </select>
                      }
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
                    moveControl={
                      <select
                        aria-label={`Move ${member.full_name || member.email}`}
                        value=""
                        onChange={(event) =>
                          moveStaff(member.id, event.target.value || null)
                        }
                        className={selectClassName}
                      >
                        <option value="">Unassigned</option>
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name}
                          </option>
                        ))}
                      </select>
                    }
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
                    subtitle={
                      client.status === "inactive" ? "Inactive" : undefined
                    }
                    onDragStart={setDragId}
                    moveControl={
                      <select
                        aria-label={`Move ${client.full_name}`}
                        value={client.location_id}
                        onChange={(event) =>
                          moveClient(client.id, event.target.value)
                        }
                        className={selectClassName}
                      >
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name}
                          </option>
                        ))}
                      </select>
                    }
                  />
                ))}
            </BoardColumn>
          ))
        )}
      </div>
    </div>
  );
}
