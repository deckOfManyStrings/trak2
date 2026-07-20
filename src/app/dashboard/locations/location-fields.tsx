"use client";

import {
  formatLocationServiceType,
  formatRegionalCenter,
  LOCATION_SERVICE_TYPES,
  locationSelectClassName,
  REGIONAL_CENTERS,
} from "@/app/dashboard/locations/location-options";
import {
  AddressFields,
  PhoneInput,
} from "@/components/contact-fields";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Location } from "@/types/db";

type LocationFieldsProps = {
  location?: Location;
  /** Bumps controlled phone/address inputs after a successful create. */
  fieldsKey?: number;
  idPrefix?: string;
  showProgramDescription?: boolean;
};

export function LocationFields({
  location,
  fieldsKey = 0,
  idPrefix = "location",
  showProgramDescription = true,
}: LocationFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-name`}>Location name</Label>
        <Input
          id={`${idPrefix}-name`}
          name="name"
          defaultValue={location?.name ?? ""}
          placeholder="Sunrise Day Center"
          required
        />
      </div>

      <fieldset className="space-y-3 rounded-lg border bg-muted/30 p-3">
        <legend className="px-1 text-sm font-semibold">Contact</legend>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-contact-name`}>Contact name</Label>
          <Input
            id={`${idPrefix}-contact-name`}
            name="contactName"
            defaultValue={location?.contact_name ?? ""}
            placeholder="Person who purchased the app"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-contact-phone`}>Contact phone</Label>
          <PhoneInput
            key={`phone-${idPrefix}-${fieldsKey}`}
            id={`${idPrefix}-contact-phone`}
            name="contactPhone"
            defaultValue={location?.contact_phone ?? ""}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-lg border bg-muted/30 p-3">
        <legend className="px-1 text-sm font-semibold">Service site</legend>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-service-type`}>Service type</Label>
          <select
            id={`${idPrefix}-service-type`}
            name="serviceType"
            defaultValue={location?.service_type ?? ""}
            className={locationSelectClassName}
          >
            <option value="">Select type</option>
            {LOCATION_SERVICE_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <AddressFields
          key={`address-${idPrefix}-${fieldsKey}`}
          idPrefix={`${idPrefix}-address`}
          name="address"
          defaultValue={location?.address ?? ""}
          legend="Address"
        />
      </fieldset>

      <fieldset className="space-y-3 rounded-lg border bg-muted/30 p-3">
        <legend className="px-1 text-sm font-semibold">Vendor</legend>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-vendor-name`}>Vendor name</Label>
          <Input
            id={`${idPrefix}-vendor-name`}
            name="vendorName"
            defaultValue={location?.vendor_name ?? ""}
            placeholder="Vendor / provider name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-vendor-number`}>Vendor number</Label>
          <Input
            id={`${idPrefix}-vendor-number`}
            name="vendorNumber"
            defaultValue={location?.vendor_number ?? ""}
            placeholder="Vendor number"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-regional-center`}>Regional center</Label>
          <select
            id={`${idPrefix}-regional-center`}
            name="regionalCenter"
            defaultValue={location?.regional_center ?? ""}
            className={locationSelectClassName}
          >
            <option value="">Select regional center</option>
            {REGIONAL_CENTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <AddressFields
          key={`vendor-address-${idPrefix}-${fieldsKey}`}
          idPrefix={`${idPrefix}-vendor-address`}
          name="vendorAddress"
          defaultValue={location?.vendor_address ?? ""}
          legend="Vendor address"
        />
      </fieldset>

      <AddressFields
        key={`business-address-${idPrefix}-${fieldsKey}`}
        idPrefix={`${idPrefix}-business-address`}
        name="businessAddress"
        defaultValue={location?.business_address ?? ""}
        legend="Business address"
      />

      {showProgramDescription ? (
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-program-description`}>
            Program description
          </Label>
          <Textarea
            id={`${idPrefix}-program-description`}
            name="programDescription"
            defaultValue={location?.program_description ?? ""}
            placeholder="What this program does, for report Program Overview sections"
            rows={3}
          />
        </div>
      ) : null}
    </div>
  );
}

export function LocationSummary({ location }: { location: Location }) {
  const serviceType = formatLocationServiceType(location.service_type);
  const regionalCenter = formatRegionalCenter(location.regional_center);

  return (
    <div className="min-w-0 space-y-1">
      <p className="font-medium text-foreground">{location.name}</p>
      {serviceType ? (
        <p className="text-sm text-muted-foreground">{serviceType}</p>
      ) : null}
      {location.address ? (
        <p className="text-sm text-muted-foreground">{location.address}</p>
      ) : null}
      {location.contact_name || location.contact_phone ? (
        <p className="text-xs text-muted-foreground">
          Contact
          {location.contact_name ? `: ${location.contact_name}` : ""}
          {location.contact_phone ? ` · ${location.contact_phone}` : ""}
        </p>
      ) : null}
      {location.vendor_name ||
      location.vendor_number ||
      regionalCenter ? (
        <p className="text-xs text-muted-foreground">
          Vendor
          {location.vendor_name ? `: ${location.vendor_name}` : ""}
          {location.vendor_number ? ` · #${location.vendor_number}` : ""}
          {regionalCenter ? ` · ${regionalCenter}` : ""}
        </p>
      ) : null}
      {location.vendor_address ? (
        <p className="text-xs text-muted-foreground">
          Vendor address: {location.vendor_address}
        </p>
      ) : null}
      {location.business_address ? (
        <p className="text-xs text-muted-foreground">
          Business address: {location.business_address}
        </p>
      ) : null}
      {location.program_description ? (
        <p className="text-xs text-muted-foreground">
          {location.program_description}
        </p>
      ) : null}
    </div>
  );
}
