import type { SelectHTMLAttributes } from "react";
import Field, { type FieldProps } from "@/components/ui/fields/Field";

type Props = Omit<FieldProps, "children"> &
  SelectHTMLAttributes<HTMLSelectElement>;

export default function SelectField({
  id,
  label,
  error,
  hint,
  className,
  children,
  ...select
}: Props) {
  return (
    <Field
      id={id}
      label={label}
      error={error}
      hint={hint}
      inputClassName={className}
    >
      {(fieldProps) => (
        <select {...fieldProps} {...select}>
          {children}
        </select>
      )}
    </Field>
  );
}
