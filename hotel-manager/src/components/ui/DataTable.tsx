import type { ReactNode } from "react";

// column properties (label, horizontal alignment, wrapping, and width (weighted) can be manually adjusted)
export type Column<Row> = {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  wrap?: boolean;
  width?: number | "fit";
  render?: (row: Row) => ReactNode;
};

type DataTableProps<Row> = {
  caption: string;
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row, index: number) => string;
  emptyMessage?: string;
};

const ALIGN = {
  left: "text-left",
  center: "text-center",
  right: "text-right tabular-nums",
};

function columnWidths<Row>(columns: Column<Row>[]): string[] | null {
  if (!columns.some((c) => c.width !== undefined)) return null;

  const weights = columns.map((c) => (c.width === "fit" ? 0 : (c.width ?? 1)));
  const total = weights.reduce((sum, w) => sum + w, 0);
  return columns.map((c, i) =>
    c.width === "fit" ? "1%" : `${(weights[i] / total) * 100}%`,
  );
}

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

  const widths = columnWidths(columns);
  const cellClass = (col: Column<Row>) =>
    `${ALIGN[col.align ?? "left"]} ${
      col.wrap === false || col.width === "fit" ? "whitespace-nowrap" : ""
    }`;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-lg text-left">
        <caption className="sr-only">{caption}</caption>
        {widths && (
          <colgroup>
            {widths.map((width, i) => (
              <col key={columns[i].key} style={{ width }} />
            ))}
          </colgroup>
        )}
        <thead>
          <tr className="border-b border-border text-sm text-muted-foreground">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`px-3 py-2 font-medium ${cellClass(col)}`}
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
                <td key={col.key} className={`px-3 py-3 ${cellClass(col)}`}>
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
