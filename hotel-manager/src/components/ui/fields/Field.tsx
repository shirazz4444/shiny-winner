import type { ReactNode } from "react";

export const inputClass =
  "w-full rounded-md border border-input bg-card px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-primary";

export type FieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  inputClassName?: string;
  children: (props: {
    id: string;
    "aria-invalid": boolean;
    "aria-describedby": string | undefined;
    className: string;
  }) => ReactNode;
};

export default function Field({
  id,
  label,
  error,
  hint,
  className = "",
  inputClassName = "",
  children,
}: FieldProps) {
  const describedBy =
    [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>

      {children({
        id,
        "aria-invalid": !!error,
        "aria-describedby": describedBy,
        className: `${inputClass} ${inputClassName}`,
      })}

      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}

      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
