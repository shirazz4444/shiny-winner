import type { ReactNode } from "react";

export type Column<Row> = {
  key: string;
  label: string;
  align?: "left" | "right";
  render?: (row: Row) => ReactNode;
};

type DataTableProps<Row> = {
  caption: string;
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row, index: number) => string;
  emptyMessage?: string;
};

export default function DataTable<Row extends Record<string, unknown>>({
  caption,
  columns,
  rows,
  rowKey,
  emptyMessage = "Nothing to show.",
}: DataTableProps<Row>) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-lg text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border text-sm text-muted-foreground">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`px-3 py-2 font-medium ${
                  col.align === "right" ? "text-right" : ""
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={rowKey(row, index)}
              className="border-b border-border last:border-0"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-3 py-3 ${
                    col.align === "right" ? "text-right tabular-nums" : ""
                  }`}
                >
                  {col.render ? col.render(row) : String(row[col.key] ?? "–")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
