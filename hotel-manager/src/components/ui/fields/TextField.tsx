import type { InputHTMLAttributes } from "react";
import Field, { type FieldProps } from "@/components/ui/fields/Field";

type Props = Omit<FieldProps, "children"> &
  InputHTMLAttributes<HTMLInputElement>;

export default function TextField({
  id,
  label,
  error,
  hint,
  className,
  ...input
}: Props) {
  return (
    <Field
      id={id}
      label={label}
      error={error}
      hint={hint}
      inputClassName={className}
    >
      {(fieldProps) => <input {...fieldProps} {...input} />}
    </Field>
  );
}
