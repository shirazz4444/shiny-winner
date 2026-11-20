import Link from "next/link";
import Button, { buttonClass } from "@/components/ui/Button";
import TextField from "@/components/ui/fields/TextField";

export default function GuestSearch({ search }: { search: string }) {
  return (
    <form
      key={search}
      action="/guests"
      method="get"
      className="flex flex-wrap items-end gap-4"
    >
      <TextField
        id="search"
        name="search"
        label="Search"
        placeholder="Name, email, or phone"
        defaultValue={search}
      />
      <Button type="submit">Search</Button>
      <Link href="/guests" className={buttonClass("secondary")}>
        Clear
      </Link>
    </form>
  );
}
