import Link from "next/link";
import Button, { buttonClass } from "@/components/ui/Button";
import type { ReactNode } from "react";

type SearchFilterFormProps = {
  action: string;
  formKey: string;
  children: ReactNode;
  submitLabel?: string;
  clearHref?: string;
};

// a shared search/filter form wrapper, doesn't really do anything on its own
export default function SearchFilterForm({
  action,
  formKey,
  children,
  submitLabel = "Apply",
  clearHref,
}: SearchFilterFormProps) {
  return (
    <form
      key={formKey}
      action={action}
      method="get"
      className="flex flex-wrap items-end gap-4"
    >
      {children}

      <Button type="submit">{submitLabel}</Button>

      {clearHref && (
        <Link href={clearHref} className={buttonClass("secondary")}>
          Clear
        </Link>
      )}
    </form>
  );
}
