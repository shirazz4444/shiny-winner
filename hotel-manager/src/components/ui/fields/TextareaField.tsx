import type { TextareaHTMLAttributes } from "react";
import Field, { type FieldProps } from "@/components/ui/fields/Field";

type Props = Omit<FieldProps, "children"> &
  TextareaHTMLAttributes<HTMLTextAreaElement>;

export default function TextareaField({
  id,
  label,
  error,
  hint,
  className,
  rows = 3,
  ...textarea
}: Props) {
  return (
    <Field
      id={id}
      label={label}
      error={error}
      hint={hint}
      inputClassName={className}
    >
      {(fieldProps) => <textarea rows={rows} {...fieldProps} {...textarea} />}
    </Field>
  );
}
