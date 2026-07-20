"use client";

import {
  composeAddress,
  formatPhone,
  formatZip,
  parseAddress,
} from "@/lib/format-contact";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

type PhoneInputProps = {
  id: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
};

export function PhoneInput({
  id,
  name,
  defaultValue = "",
  placeholder = "(555) 555-5555",
}: PhoneInputProps) {
  const [value, setValue] = useState(() => formatPhone(defaultValue));

  return (
    <Input
      id={id}
      name={name}
      type="tel"
      inputMode="numeric"
      autoComplete="tel"
      value={value}
      onChange={(event) => setValue(formatPhone(event.target.value))}
      placeholder={placeholder}
    />
  );
}

type AddressFieldsProps = {
  idPrefix: string;
  name: string;
  defaultValue?: string;
  legend?: string;
};

export function AddressFields({
  idPrefix,
  name,
  defaultValue = "",
  legend,
}: AddressFieldsProps) {
  const initial = parseAddress(defaultValue);
  const [street, setStreet] = useState(initial.street);
  const [city, setCity] = useState(initial.city);
  const [state, setState] = useState(initial.state);
  const [zip, setZip] = useState(initial.zip);

  const composed = composeAddress({ street, city, state, zip });

  const fields = (
    <div className="space-y-3">
      <input type="hidden" name={name} value={composed} />
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-street`}>Street address</Label>
        <Input
          id={`${idPrefix}-street`}
          autoComplete="street-address"
          value={street}
          onChange={(event) => setStreet(event.target.value)}
          placeholder="123 Main St"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_5rem_7rem]">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-city`}>City</Label>
          <Input
            id={`${idPrefix}-city`}
            autoComplete="address-level2"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Springfield"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-state`}>State</Label>
          <Input
            id={`${idPrefix}-state`}
            autoComplete="address-level1"
            value={state}
            onChange={(event) =>
              setState(
                event.target.value.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase(),
              )
            }
            placeholder="CA"
            maxLength={2}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-zip`}>ZIP</Label>
          <Input
            id={`${idPrefix}-zip`}
            autoComplete="postal-code"
            inputMode="numeric"
            value={zip}
            onChange={(event) => setZip(formatZip(event.target.value))}
            placeholder="90210"
          />
        </div>
      </div>
    </div>
  );

  if (!legend) return fields;

  return (
    <fieldset className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <legend className="px-1 text-sm font-semibold">{legend}</legend>
      {fields}
    </fieldset>
  );
}
