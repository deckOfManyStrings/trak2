"use client";

import {
  deleteClientRecord,
  reassignClientLocation,
  setClientStatus,
  updateClientRecord,
  type ActionState,
} from "@/app/dashboard/clients/actions";
import {
  AddressFields,
  PhoneInput,
} from "@/components/contact-fields";
import {
  EMERGENCY_CONTACT_RELATIONSHIPS,
  formatEmergencyContactRelationship,
  selectClassName,
} from "@/app/dashboard/clients/emergency-contact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Client, Location } from "@/types/db";
import { useActionState, useRef, useState, useTransition } from "react";

const initialState: ActionState = {};

type ClientRowProps = {
  client: Client;
  location: Location | null;
  locations: Location[];
  canReassign: boolean;
  canDelete: boolean;
};

export function ClientRow({
  client,
  location,
  locations,
  canReassign,
  canDelete,
}: ClientRowProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [updateState, updateAction, updatePending] = useActionState(
    updateClientRecord,
    initialState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteClientRecord,
    initialState,
  );
  const deleteFormRef = useRef<HTMLFormElement>(null);

  if (editing) {
    return (
      <li className="rounded-lg border bg-white p-4">
        <form
          action={(formData) => {
            updateAction(formData);
            setEditing(false);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="clientId" value={client.id} />

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`edit-name-${client.id}`}>Full name</Label>
              <Input
                id={`edit-name-${client.id}`}
                name="fullName"
                defaultValue={client.full_name}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`edit-ucid-${client.id}`}>UCID</Label>
              <Input
                id={`edit-ucid-${client.id}`}
                name="ucid"
                defaultValue={client.ucid ?? ""}
                placeholder="Unique client ID"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`edit-dob-${client.id}`}>Date of birth</Label>
                <Input
                  id={`edit-dob-${client.id}`}
                  name="dateOfBirth"
                  type="date"
                  defaultValue={client.date_of_birth ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`edit-admission-${client.id}`}>
                  Date of admission
                </Label>
                <Input
                  id={`edit-admission-${client.id}`}
                  name="dateOfAdmission"
                  type="date"
                  defaultValue={client.date_of_admission ?? ""}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`edit-allergies-${client.id}`}>Allergies</Label>
              <Textarea
                id={`edit-allergies-${client.id}`}
                name="allergies"
                defaultValue={client.allergies ?? ""}
                placeholder="Known allergies"
                rows={2}
              />
            </div>
          </div>

          <fieldset className="space-y-3 rounded-lg border bg-muted/30 p-3">
            <legend className="px-1 text-sm font-semibold">
              Emergency contact
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`edit-ec-name-${client.id}`}>Name</Label>
                <Input
                  id={`edit-ec-name-${client.id}`}
                  name="emergencyContactName"
                  defaultValue={client.emergency_contact_name ?? ""}
                  placeholder="Alex Rivera"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`edit-ec-relationship-${client.id}`}>
                  Relationship to client
                </Label>
                <select
                  id={`edit-ec-relationship-${client.id}`}
                  name="emergencyContactRelationship"
                  defaultValue={client.emergency_contact_relationship ?? ""}
                  className={selectClassName}
                >
                  <option value="">Select relationship</option>
                  {EMERGENCY_CONTACT_RELATIONSHIPS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`edit-ec-phone-${client.id}`}>Phone</Label>
                <PhoneInput
                  id={`edit-ec-phone-${client.id}`}
                  name="emergencyContactPhone"
                  defaultValue={client.emergency_contact_phone ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`edit-ec-email-${client.id}`}>
                  Email address
                </Label>
                <Input
                  id={`edit-ec-email-${client.id}`}
                  name="emergencyContactEmail"
                  type="email"
                  defaultValue={client.emergency_contact_email ?? ""}
                  placeholder="alex@example.com"
                />
              </div>
            </div>
            <AddressFields
              idPrefix={`edit-ec-${client.id}`}
              name="emergencyContactAddress"
              defaultValue={client.emergency_contact_address ?? ""}
            />
          </fieldset>

          <fieldset className="space-y-3 rounded-lg border bg-muted/30 p-3">
            <legend className="px-1 text-sm font-semibold">
              Service coordinator
            </legend>
            <div className="space-y-1.5">
              <Label htmlFor={`edit-sc-name-${client.id}`}>Name</Label>
              <Input
                id={`edit-sc-name-${client.id}`}
                name="serviceCoordinatorName"
                defaultValue={client.service_coordinator_name ?? ""}
                placeholder="Jordan Lee"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`edit-sc-phone-${client.id}`}>Phone</Label>
                <PhoneInput
                  id={`edit-sc-phone-${client.id}`}
                  name="serviceCoordinatorPhone"
                  defaultValue={client.service_coordinator_phone ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`edit-sc-email-${client.id}`}>Email</Label>
                <Input
                  id={`edit-sc-email-${client.id}`}
                  name="serviceCoordinatorEmail"
                  type="email"
                  defaultValue={client.service_coordinator_email ?? ""}
                  placeholder="coordinator@example.com"
                />
              </div>
            </div>
          </fieldset>

          {updateState.error ? (
            <p className="text-sm text-destructive">{updateState.error}</p>
          ) : null}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={updatePending}>
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </li>
    );
  }

  const toggleStatus = () => {
    setError(null);
    const nextStatus = client.status === "active" ? "inactive" : "active";
    startTransition(async () => {
      const result = await setClientStatus(client.id, nextStatus);
      if (result.error) setError(result.error);
    });
  };

  const handleLocationChange = (locationId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await reassignClientLocation(client.id, locationId);
      if (result.error) setError(result.error);
    });
  };

  const relationshipLabel = formatEmergencyContactRelationship(
    client.emergency_contact_relationship,
  );
  const hasEmergencyContact =
    client.emergency_contact_name ||
    relationshipLabel ||
    client.emergency_contact_phone ||
    client.emergency_contact_address ||
    client.emergency_contact_email;

  return (
    <li className="flex flex-col gap-4 rounded-lg border bg-white p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="truncate font-medium text-foreground">
          {client.full_name}
        </p>
        <p className="text-sm text-muted-foreground">
          {location?.name ?? "Unassigned"}
          {client.status === "inactive" ? " \u00b7 Inactive" : ""}
          {client.ucid ? ` \u00b7 UCID ${client.ucid}` : ""}
        </p>
        {client.date_of_birth || client.date_of_admission ? (
          <p className="text-xs text-muted-foreground">
            {client.date_of_birth ? `DOB ${client.date_of_birth}` : null}
            {client.date_of_birth && client.date_of_admission ? " \u00b7 " : null}
            {client.date_of_admission
              ? `Admitted ${client.date_of_admission}`
              : null}
          </p>
        ) : null}
        {client.allergies ? (
          <p className="text-xs text-muted-foreground">
            Allergies: {client.allergies}
          </p>
        ) : null}
        {hasEmergencyContact ? (
          <div className="text-xs text-muted-foreground">
            <p>
              Emergency contact
              {client.emergency_contact_name
                ? `: ${client.emergency_contact_name}`
                : ""}
              {relationshipLabel ? ` (${relationshipLabel})` : ""}
            </p>
            {client.emergency_contact_phone ||
            client.emergency_contact_email ||
            client.emergency_contact_address ? (
              <p>
                {[
                  client.emergency_contact_phone,
                  client.emergency_contact_email,
                  client.emergency_contact_address,
                ]
                  .filter(Boolean)
                  .join(" \u00b7 ")}
              </p>
            ) : null}
          </div>
        ) : null}
        {client.service_coordinator_name ||
        client.service_coordinator_phone ||
        client.service_coordinator_email ? (
          <p className="text-xs text-muted-foreground">
            Coordinator
            {client.service_coordinator_name
              ? `: ${client.service_coordinator_name}`
              : ""}
            {client.service_coordinator_phone
              ? ` \u00b7 ${client.service_coordinator_phone}`
              : ""}
            {client.service_coordinator_email
              ? ` \u00b7 ${client.service_coordinator_email}`
              : ""}
          </p>
        ) : null}
        {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
        {updateState.error ? (
          <p className="mt-1 text-xs text-destructive">{updateState.error}</p>
        ) : null}
        {deleteState.error ? (
          <p className="mt-1 text-xs text-destructive">{deleteState.error}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 sm:shrink-0 sm:flex-row sm:flex-wrap sm:items-center">
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => setEditing(true)}
        >
          Edit
        </Button>

        {canReassign ? (
          <select
            value={client.location_id}
            disabled={isPending}
            onChange={(event) => handleLocationChange(event.target.value)}
            className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-8 sm:w-auto sm:px-2.5 sm:text-sm dark:bg-input/30"
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        ) : null}

        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          disabled={isPending}
          onClick={toggleStatus}
        >
          {client.status === "active" ? "Mark inactive" : "Mark active"}
        </Button>

        {canDelete ? (
          <form ref={deleteFormRef} action={deleteAction} className="w-full sm:w-auto">
            <input type="hidden" name="clientId" value={client.id} />
            <Button
              type="button"
              variant="destructive"
              className="w-full sm:w-auto"
              disabled={deletePending}
              onClick={() => {
                if (
                  window.confirm(`Remove ${client.full_name}? This can't be undone.`)
                ) {
                  deleteFormRef.current?.requestSubmit();
                }
              }}
            >
              Remove
            </Button>
          </form>
        ) : null}
      </div>
    </li>
  );
}
