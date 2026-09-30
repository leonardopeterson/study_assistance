"use client";
import { Switch } from "radix-ui";

export function IntegrationSwitch({
  label,
  checked,
  onCheckedChange,
  disabled,
  description,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  disabled?: boolean;
  description?: string;
}) {
  return (
    <label className="integration-switch">
      <span>
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
      <Switch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={label}
        className="switch-track"
      >
        <Switch.Thumb className="switch-thumb" />
      </Switch.Root>
    </label>
  );
}
